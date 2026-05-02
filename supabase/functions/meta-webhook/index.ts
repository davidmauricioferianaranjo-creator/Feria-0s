// supabase/functions/meta-webhook/index.ts
// CLASIFICACIÓN: PÚBLICA — por diseño del protocolo Meta Webhooks
//
// Por qué es pública:
//   Meta invoca este endpoint desde sus servidores sin JWT ni sesión de Supabase.
//   No hay forma de requerir autenticación Supabase en el receptor de un webhook.
//
// Cómo se protege:
//   1. GET: verifica hub.verify_token antes de confirmar el handshake
//   2. POST: solo escribe en DB via service role — no expone datos
//   3. No devuelve información sensible en ningún caso
//
// Deploy: supabase functions deploy meta-webhook --project-ref dldykrsikwbibiegtyyb --no-verify-jwt

const cors = {
  // Meta no envía Origin header en webhooks POST — solo necesitamos CORS para el GET de verificación
  'Access-Control-Allow-Origin': 'https://www.facebook.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obtener URL de descarga desde Meta
async function getMediaUrl(mediaId: string, token: string): Promise<string> {
  try {
    const res  = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    return data.url || '';
  } catch { return ''; }
}

function extractMessage(msg: any): { texto: string; tipo: string; mediaId?: string } {
  switch (msg.type) {
    case 'text':     return { texto: msg.text?.body || '', tipo: 'text' };
    case 'audio':    return { texto: '🎤 Nota de voz', tipo: 'audio',    mediaId: msg.audio?.id };
    case 'voice':    return { texto: '🎤 Nota de voz', tipo: 'audio',    mediaId: msg.voice?.id };
    case 'image':    return { texto: msg.image?.caption || '🖼 Imagen',   tipo: 'image',    mediaId: msg.image?.id };
    case 'video':    return { texto: msg.video?.caption || '🎥 Video',    tipo: 'video',    mediaId: msg.video?.id };
    case 'document': return { texto: `📄 ${msg.document?.filename || 'Documento'}`, tipo: 'document', mediaId: msg.document?.id };
    case 'sticker':  return { texto: '😊 Sticker', tipo: 'sticker', mediaId: msg.sticker?.id };
    case 'location': return { texto: `📍 ${msg.location?.name || `${msg.location?.latitude},${msg.location?.longitude}`}`, tipo: 'location' };
    default:         return { texto: `📎 Mensaje (${msg.type})`, tipo: msg.type };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    const url       = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verify    = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'feria-os-webhook-2026';
    if (mode === 'subscribe' && token === verify) return new Response(challenge, { status: 200 });
    return new Response('Token inválido', { status: 403 });
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method === 'POST') {
    try {
      const body     = await req.json();
      const sbUrl    = Deno.env.get('SUPABASE_URL')!;
      const sbKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const wpToken  = Deno.env.get('WHATSAPP_TOKEN')!;
      const feriaPageId = Deno.env.get('META_PAGE_ID_FERIA') || '1662332247378413';
      const feriaIgId = Deno.env.get('META_IG_ID_FERIA') || '';
      const blIgId = Deno.env.get('META_IG_ID_BL') || '';

      for (const entry of body.entry || []) {

        // ── WHATSAPP ───────────────────────────────────────────
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const val = change.value;
            for (const msg of val?.messages || []) {
              const contact = val.contacts?.find((c: any) => c.wa_id === msg.from);
              const nombre  = contact?.profile?.name || msg.from;
              const { texto, tipo, mediaId } = extractMessage(msg);

              // Obtener URL real del media si existe
              let mediaUrl = '';
              let mimeType = '';
              if (mediaId) {
                try {
                  const mRes  = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
                    headers: { 'Authorization': `Bearer ${wpToken}` },
                  });
                  const mData = await mRes.json();
                  mediaUrl = mData.url || '';
                  mimeType = mData.mime_type || '';
                } catch {}
              }

              await saveMessage(sbUrl, sbKey, {
                conv_id: `wa_${msg.from}`, canal: 'whatsapp',
                nombre, telefono: msg.from, texto, tipo,
                media_id: mediaId, media_url: mediaUrl, mime_type: mimeType,
                from_cliente: true,
                timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
                meta_msg_id: msg.id,
                brand: 'feria',
                account_name: 'Feria Design',
              });
            }
          }
        }

        // ── MESSENGER ──────────────────────────────────────────
        for (const messaging of entry.messaging || []) {
          const attach   = messaging.message?.attachments?.[0];
          const texto    = messaging.message?.text ||
            (attach?.type === 'audio'  ? '🎤 Nota de voz' :
             attach?.type === 'image'  ? '🖼 Imagen' :
             attach?.type === 'video'  ? '🎥 Video'  :
             attach?.type === 'file'   ? `📄 Archivo` : null);
          if (!texto) continue;

          const senderId = messaging.sender?.id;
          const marca    = entry.id === feriaPageId ? 'feria' : 'bl';
          const accountName = marca === 'feria' ? 'Feria Design' : 'Brand & Legacy';
          await saveMessage(sbUrl, sbKey, {
            conv_id: `fb_${senderId}_${marca}`, canal: 'facebook',
            nombre: senderId, telefono: null,
            texto, tipo: attach?.type || 'text',
            media_url: attach?.payload?.url || '',
            from_cliente: true,
            timestamp: new Date().toISOString(),
            meta_msg_id: messaging.message?.mid,
            brand: marca,
            account_name: accountName,
          });
        }

        // ── INSTAGRAM ──────────────────────────────────────────
        for (const change of entry.changes || []) {
          if (change.value?.messaging_product === 'instagram') {
            for (const msg of change.value?.messages || []) {
              const { texto, tipo, mediaId } = extractMessage(msg);
              const marca = entry.id === blIgId ? 'bl' : entry.id === feriaIgId ? 'feria' : 'feria';
              const accountName = marca === 'bl' ? 'Brand & Legacy' : 'Feria Design';
              await saveMessage(sbUrl, sbKey, {
                conv_id: `ig_${msg.from}`, canal: 'instagram',
                nombre: msg.from, telefono: null,
                texto, tipo, media_id: mediaId,
                from_cliente: true,
                timestamp: new Date().toISOString(),
                meta_msg_id: msg.id,
                brand: marca,
                account_name: accountName,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 400, headers: cors,
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

async function saveMessage(sbUrl: string, sbKey: string, data: any) {
  const h = { 'apikey': data.sbKey || '', 'Authorization': `Bearer ${data.sbKey || ''}`, 'Content-Type': 'application/json' };
  const hh = { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' };

  await fetch(`${sbUrl}/rest/v1/conversaciones`, {
    method: 'POST',
    headers: { ...hh, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      conv_id: data.conv_id, canal: data.canal, nombre: data.nombre,
      telefono: data.telefono, ultimo_mensaje: data.texto,
      ultimo_mensaje_at: data.timestamp, updated_at: data.timestamp,
      brand: data.brand || 'feria', account_name: data.account_name || (data.brand === 'bl' ? 'Brand & Legacy' : 'Feria Design'),
    }),
  });

  await fetch(`${sbUrl}/rest/v1/mensajes_meta`, {
    method: 'POST',
    headers: { ...hh, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      conv_id: data.conv_id, canal: data.canal, nombre: data.nombre,
      texto: data.texto, tipo: data.tipo || 'text',
      media_id: data.media_id || null, media_url: data.media_url || null,
      mime_type: data.mime_type || null,
      from_cliente: data.from_cliente,
      timestamp: data.timestamp, meta_msg_id: data.meta_msg_id, leido: false,
      brand: data.brand || 'feria', account_name: data.account_name || (data.brand === 'bl' ? 'Brand & Legacy' : 'Feria Design'),
    }),
  });

  await fetch(`${sbUrl}/rest/v1/rpc/increment_unread`, {
    method: 'POST',
    headers: hh,
    body: JSON.stringify({ p_conv_id: data.conv_id }),
  });
}
