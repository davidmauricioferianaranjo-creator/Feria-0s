// supabase/functions/process-reminders/index.ts
// Cron cada 5min — procesa recordatorios pendientes
// Deploy: supabase functions deploy process-reminders --project-ref dldykrsikwbibiegtyyb
// Nota: esta function es interna — NO debe ser pública

const cors = {
  'Access-Control-Allow-Origin': 'https://dldykrsikwbibiegtyyb.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const sbUrl  = Deno.env.get('SUPABASE_URL')!;
  const sbKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const now = new Date().toISOString();

    // Obtener recordatorios pendientes cuyo enviar_at ya pasó
    const res = await fetch(
      `${sbUrl}/rest/v1/recordatorios?enviado=eq.false&enviar_at=lte.${now}&select=*`,
      { headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` } }
    );
    const recordatorios = await res.json();

    let enviados = 0;
    for (const rec of recordatorios) {
      try {
        // Enviar email si tiene templateId
        if (rec.cliente_email) {
          await fetch(`${sbUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: rec.tipo?.includes('postventa') ? 'postventa' : 'recordatorio_24h',
              to: rec.cliente_email,
              params: { nombre: rec.cliente_nombre, mensaje: rec.mensaje_email },
            }),
          });
        }
        // Enviar WhatsApp si tiene número
        if (rec.cliente_whatsapp) {
          await fetch(`${sbUrl}/functions/v1/send-meta-message`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              canal: 'whatsapp',
              destinatario: rec.cliente_whatsapp,
              texto: rec.mensaje_wp || rec.mensaje_email,
              conv_id: `wa_${rec.cliente_whatsapp}`,
              nombre: rec.cliente_nombre,
            }),
          });
        }
        // Marcar como enviado
        await fetch(`${sbUrl}/rest/v1/recordatorios?id=eq.${rec.id}`, {
          method: 'PATCH',
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ enviado: true }),
        });
        enviados++;
      } catch (e) {
        console.error(`Error procesando recordatorio ${rec.id}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, procesados: recordatorios.length, enviados }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: cors,
    });
  }
});
