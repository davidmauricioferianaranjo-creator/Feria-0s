// supabase/functions/send-meta-message/index.ts
// CLASIFICACIÓN: INTERNA — autenticada, rol admin/crm obligatorio
// Deploy: supabase functions deploy send-meta-message --project-ref dldykrsikwbibiegtyyb

const ALLOWED_ORIGINS = ['https://feria.design', 'http://localhost:3000'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

async function validateRole(
  req: Request, sbUrl: string, sbKey: string,
): Promise<{ ok: boolean; email?: string; role?: string }> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return { ok: false };

  const token   = auth.replace('Bearer ', '').trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (token === anonKey) return { ok: false };

  const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: sbKey },
  });
  if (!userRes.ok) return { ok: false };

  const user    = await userRes.json();
  const profRes = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  const profiles = await profRes.json();
  const role     = profiles?.[0]?.role;
  return { ok: ['admin', 'crm'].includes(role), email: user.email, role };
}

// ── Construir body WhatsApp según tipo de media ───────────────────
function buildWhatsAppBody(destinatario: string, texto: string, mediaUrl?: string, mediaTipo?: string) {
  const to = destinatario.replace(/\D/g, '');

  if (mediaUrl && mediaTipo) {
    const tipoWA = mediaTipo === 'document' ? 'document'
                 : mediaTipo === 'video'    ? 'video'
                 : mediaTipo === 'audio'    ? 'audio'
                 : 'image';

    const mediaObj: Record<string, unknown> = { link: mediaUrl };
    if (texto && tipoWA !== 'audio') mediaObj.caption = texto; // caption en imagen/video/doc

    return {
      messaging_product: 'whatsapp',
      to,
      type: tipoWA,
      [tipoWA]: mediaObj,
    };
  }

  // Mensaje de texto puro
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: texto },
  };
}

// ── Construir body Instagram/Facebook ────────────────────────────
function buildIGBody(destinatario: string, texto: string, mediaUrl?: string, mediaTipo?: string) {
  if (mediaUrl && mediaTipo === 'image') {
    return {
      recipient: { id: destinatario },
      message:   { attachment: { type: 'image', payload: { url: mediaUrl, is_reusable: true } } },
    };
  }
  if (mediaUrl && mediaTipo === 'video') {
    return {
      recipient: { id: destinatario },
      message:   { attachment: { type: 'video', payload: { url: mediaUrl, is_reusable: true } } },
    };
  }
  if (mediaUrl && mediaTipo === 'audio') {
    return {
      recipient: { id: destinatario },
      message:   { attachment: { type: 'audio', payload: { url: mediaUrl, is_reusable: true } } },
    };
  }
  if (mediaUrl && mediaTipo === 'document') {
    return {
      recipient: { id: destinatario },
      message:   { attachment: { type: 'file',  payload: { url: mediaUrl, is_reusable: true } } },
    };
  }
  return { recipient: { id: destinatario }, message: { text: texto } };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const { ok, email, role } = await validateRole(req, sbUrl, sbKey);
  if (!ok) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No autorizado — se requiere rol admin o crm' }),
      { status: 403, headers: { ...corsH, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const {
      canal, destinatario, texto = '', conv_id, nombre, page_id,
      media_url, media_tipo,
    } = await req.json();

    if (!canal || !destinatario) throw new Error('canal y destinatario son requeridos');
    if (!texto && !media_url)    throw new Error('Se requiere texto o media_url');

    const wpToken     = Deno.env.get('WHATSAPP_TOKEN')      || '';
    const wpPhoneId   = Deno.env.get('WHATSAPP_PHONE_ID')   || '';
    const igToken     = Deno.env.get('META_INSTAGRAM_TOKEN')|| '';
    const feriaToken  = Deno.env.get('META_PAGE_TOKEN_FERIA')|| '';
    const blToken     = Deno.env.get('META_PAGE_TOKEN_BL')  || '';
    const feriaPageId = Deno.env.get('META_PAGE_ID_FERIA')  || '';

    let ok2      = false;
    let metaMsgId: string | null = null;

    // ── WhatsApp ───────────────────────────────────────────────
    if (canal === 'whatsapp') {
      const body   = buildWhatsAppBody(destinatario, texto, media_url, media_tipo);
      const res    = await fetch(`https://graph.facebook.com/v19.0/${wpPhoneId}/messages`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${wpToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data   = await res.json();
      ok2          = res.ok;
      metaMsgId    = data?.messages?.[0]?.id;
      if (!ok2) throw new Error(data?.error?.message || `WhatsApp error: ${res.status}`);
    }

    // ── Instagram ──────────────────────────────────────────────
    if (canal === 'instagram') {
      const body = buildIGBody(destinatario, texto, media_url, media_tipo);
      const res  = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${igToken}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      ok2        = res.ok;
      metaMsgId  = data?.message_id;
      if (!ok2) throw new Error(data?.error?.message || `Instagram error: ${res.status}`);
    }

    // ── Facebook / Messenger ───────────────────────────────────
    if (canal === 'facebook') {
      const pageToken = page_id === feriaPageId ? feriaToken : blToken;
      const body = buildIGBody(destinatario, texto, media_url, media_tipo);
      const res  = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      ok2        = res.ok;
      metaMsgId  = data?.message_id;
      if (!ok2) throw new Error(data?.error?.message || `Facebook error: ${res.status}`);
    }

    // ── Guardar en Supabase ────────────────────────────────────
    if (ok2) {
      const resumen = media_url
        ? (media_tipo === 'image' ? '🖼 Imagen' : media_tipo === 'video' ? '🎥 Video' : media_tipo === 'audio' ? '🎵 Audio' : '📎 Adjunto')
        : texto;

      const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' };

      await fetch(`${sbUrl}/rest/v1/mensajes_meta`, {
        method:  'POST',
        headers: { ...h, Prefer: 'return=minimal' },
        body:    JSON.stringify({
          conv_id, canal, nombre: 'Feria Design',
          texto:       texto || resumen,
          media_url:   media_url || null,
          media_tipo:  media_tipo || null,
          from_cliente: false,
          timestamp:   new Date().toISOString(),
          meta_msg_id: metaMsgId,
          leido:       true,
        }),
      });

      await fetch(`${sbUrl}/rest/v1/conversaciones?conv_id=eq.${conv_id}`, {
        method:  'PATCH',
        headers: h,
        body:    JSON.stringify({
          ultimo_mensaje:    resumen,
          ultimo_mensaje_at: new Date().toISOString(),
        }),
      });

      console.log(`✓ send-meta-message [${role}/${email}]: ${canal} → ${destinatario}${media_url ? ' [media]' : ''}`);
    }

    return new Response(JSON.stringify({ ok: ok2, metaMsgId }), {
      headers: { ...corsH, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('send-meta-message ERROR:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }
});
