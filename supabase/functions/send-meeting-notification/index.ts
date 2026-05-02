// supabase/functions/send-meeting-notification/index.ts
// Envía notificación al crear una reunión: email + WhatsApp al cliente, Zoom si aplica
// Deploy: supabase functions deploy send-meeting-notification --project-ref dldykrsikwbibiegtyyb

const ALLOWED_ORIGINS = ['https://feria.design', 'http://localhost:3000'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  try {
    const body = await req.json();
    const { clienteNombre, clienteEmail, clienteTelefono, fecha, hora, tipo, titulo, zoomLink } = body;

    const sbUrl = Deno.env.get('SUPABASE_URL')!;
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wpToken   = Deno.env.get('WHATSAPP_TOKEN');
    const wpPhoneId = Deno.env.get('WHATSAPP_PHONE_ID');

    const results: string[] = [];

    // ── Email de confirmación ─────────────────────────────────────
    if (clienteEmail) {
      try {
        const emailRes = await fetch(`${sbUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: 'reunion_confirmada',
            to: clienteEmail,
            params: { nombre: clienteNombre, fecha, hora, tipo, zoomLink },
          }),
        });
        if (emailRes.ok) results.push('email');
      } catch (e) { console.warn('Email failed:', e.message); }
    }

    // ── WhatsApp de confirmación ───────────────────────────────────
    if (clienteTelefono && wpToken && wpPhoneId) {
      try {
        const msg = `✦ *Feria Design Studio*\n\nHola ${clienteNombre}, tu reunión está confirmada.\n\n📅 *${fecha}* a las *${hora}*\n📍 ${tipo === 'virtual' ? 'Virtual' : 'Presencial'}${zoomLink ? `\n🔗 ${zoomLink}` : ''}`;
        const wpRes = await fetch(`https://graph.facebook.com/v19.0/${wpPhoneId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${wpToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: clienteTelefono.replace(/\D/g, ''),
            type: 'text',
            text: { body: msg },
          }),
        });
        if (wpRes.ok) results.push('whatsapp');
      } catch (e) { console.warn('WhatsApp failed:', e.message); }
    }

    console.log(`✓ Notificación reunión enviada: ${results.join(', ')} → ${clienteNombre}`);
    return new Response(JSON.stringify({ ok: true, enviado: results }), {
      headers: { ...corsH, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('send-meeting-notification error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400, headers: corsH,
    });
  }
});
