// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email --project-ref dldykrsikwbibiegtyyb
// Esta function puede recibir requests autenticadas (JWT) o desde otras Edge Functions (service role)

const ALLOWED_ORIGINS = [
  'https://feria.design',
  'https://feriaos.feria.design',
  'http://localhost:3000',
];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const FROM = 'Feria Design Studio <hola@feria.design>';

const TEMPLATES: Record<string, (p: any) => { subject: string; html: string }> = {

  bienvenida: (p) => ({
    subject: `✦ Bienvenido a Feria Design, ${p.nombre}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:26px;color:#C9A96E;font-weight:300">Hola ${p.nombre}, <em>bienvenido.</em></h1>
      <p>Es un placer comenzar este proceso contigo. En breve nos pondremos en contacto.</p>
      ${btn(p.portalUrl || '#', 'Acceder a mi portal')}
    `),
  }),

  brief: (p) => ({
    subject: `📋 Tu Brief está listo — ${p.nombre}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#C9A96E;font-weight:300">Es hora de comenzar, ${p.nombre}.</h1>
      <p>Tu Brief está disponible en tu portal. Este proceso de descubrimiento es el corazón del Método Ψ.</p>
      ${btn(p.portalUrl || '#', 'Completar mi Brief')}
    `),
  }),

  contrato_firmado: (p) => ({
    subject: `✍ Contrato firmado — ${p.proyecto || 'Brand Identity'}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#C9A96E;font-weight:300">Contrato firmado. Comenzamos.</h1>
      <p>Hola ${p.nombre}, hemos recibido la firma. El proyecto está oficialmente en marcha.</p>
      <div style="background:#1A1815;border-radius:10px;padding:16px;margin:20px 0;">
        <div style="font-size:11px;color:#EDE8DF50;margin-bottom:4px">Hash de firma</div>
        <div style="font-size:12px;color:#C9A96E;font-family:monospace">${p.hash || '—'}</div>
      </div>
      ${btn(p.portalUrl || '#', 'Ver mi portal')}
    `),
  }),

  cobro_link: (p) => ({
    subject: `💳 Link de pago — ${p.tipo || 'Cobro'} · $${p.monto}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#C9A96E;font-weight:300">Tu link de pago está listo.</h1>
      <div style="background:#1A1815;border-radius:10px;padding:16px;margin:20px 0;">
        <table style="width:100%">
          <tr><td style="color:#EDE8DF50;font-size:11px">Concepto</td><td style="color:#EDE8DF;font-size:13px;text-align:right">${p.tipo || '—'}</td></tr>
          <tr><td style="color:#EDE8DF50;font-size:11px;padding-top:8px">Monto</td><td style="color:#C9A96E;font-size:18px;font-weight:600;text-align:right">$${p.monto}</td></tr>
        </table>
      </div>
      ${btn(p.paymentLink || '#', '💳 Realizar pago')}
    `),
  }),

  cobro_confirmado: (p) => ({
    subject: `✅ Pago confirmado — $${p.monto}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#7BC67A;font-weight:300">Pago recibido. Gracias, ${p.nombre}.</h1>
      <p>Hemos confirmado tu pago de <strong>$${p.monto}</strong>.</p>
      ${btn(p.portalUrl || '#', 'Ver mi proyecto')}
    `),
  }),

  reunion_confirmada: (p) => ({
    subject: `🗓 Reunión confirmada — ${p.fecha} ${p.hora}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#C9A96E;font-weight:300">Tu reunión está confirmada.</h1>
      <div style="background:#1A1815;border-radius:10px;padding:16px;margin:20px 0;">
        <table style="width:100%">
          <tr><td style="color:#EDE8DF50;font-size:11px">Fecha</td><td style="color:#EDE8DF;font-size:14px;text-align:right;font-weight:500">${p.fecha}</td></tr>
          <tr><td style="color:#EDE8DF50;font-size:11px;padding-top:8px">Hora</td><td style="color:#EDE8DF;font-size:14px;text-align:right;font-weight:500">${p.hora}</td></tr>
          <tr><td style="color:#EDE8DF50;font-size:11px;padding-top:8px">Modalidad</td><td style="color:#C9A96E;font-size:13px;text-align:right">${p.tipo === 'virtual' ? '🎥 Virtual' : '📍 Presencial'}</td></tr>
        </table>
      </div>
      ${p.zoomLink ? btn(p.zoomLink, '🎥 Unirse a la reunión') : ''}
    `),
  }),

  recordatorio_24h: (p) => ({
    subject: `📅 Recordatorio — Tu reunión es mañana ${p.fecha}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:22px;color:#C9A96E;font-weight:300">Tu reunión es mañana.</h1>
      <p>Hola ${p.nombre}, te recordamos que tienes una reunión mañana <strong>${p.fecha}</strong> a las <strong>${p.hora}</strong>.</p>
      ${p.zoomLink ? btn(p.zoomLink, '🎥 Link de reunión') : ''}
    `),
  }),

  recordatorio_15min: (p) => ({
    subject: `⏰ Tu reunión empieza en 15 minutos`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:22px;color:#C9A96E;font-weight:300">En 15 minutos.</h1>
      <p>Hola ${p.nombre}, tu reunión comienza en 15 minutos.</p>
      ${p.zoomLink ? btn(p.zoomLink, '🎥 Unirse ahora') : ''}
    `),
  }),

  brandkit_listo: (p) => ({
    subject: `✦ Tu Brand Kit está listo — ${p.nombre}`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#C9A96E;font-weight:300">Tu marca ya tiene alma.</h1>
      <p>Hola ${p.nombre}, tu Brand Kit está disponible en tu portal.</p>
      ${btn(p.portalUrl || '#', '✦ Ver mi Brand Kit')}
    `),
  }),

  postventa: (p) => ({
    subject: `🌟 ¿Cómo va tu marca? — Feria Design`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:22px;color:#C9A96E;font-weight:300">¿Cómo va todo, ${p.nombre}?</h1>
      <p>Han pasado ${p.dias || 30} días desde que entregamos tu marca.</p>
      ${btn(p.portalUrl || '#', 'Escribirnos')}
    `),
  }),

  cotizacion: (p) => ({
    subject: `📄 Cotización ${p.paquete} — Feria Design Studio`,
    html: base(`
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#C9A96E;font-weight:300">Hola, <em>${p.nombre}</em> : )</h1>
      <p>Aquí te presentamos nuestra propuesta personalizada.</p>
      <div style="background:#1A1815;border-radius:12px;padding:20px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
          <div>
            <div style="font-size:18px;font-weight:600;color:#EDE8DF;margin-bottom:4px">${p.paquete}</div>
            <div style="font-size:11px;color:#EDE8DF50">${p.duracion || '45 días'} · Validez ${p.validez || '10 días'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:26px;font-weight:700;color:#C9A96E">$${p.total}</div>
            <div style="font-size:10px;color:#EDE8DF50">USD · sin IVA</div>
          </div>
        </div>
        ${(p.items || []).map((item: string) => `<div style="padding:4px 0;font-size:12px;color:#EDE8DF90"><span style="color:#7BC67A">✓</span> ${item}</div>`).join('')}
      </div>
      <div style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.2);border-radius:10px;padding:14px 16px;margin:16px 0;">
        <div style="font-size:12px;font-weight:500;color:#C9A96E;margin-bottom:10px">Forma de pago</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span style="color:#EDE8DF60">Anticipo 60%</span><span style="color:#EDE8DF;font-weight:500">$${p.anticipo60}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#EDE8DF60">Saldo 40%</span><span style="color:#EDE8DF;font-weight:500">$${p.saldo40}</span></div>
      </div>
      ${btn(p.agendarLink || 'https://calendly.com/feria-design', '📅 Agendar cita gratuita')}
    `),
  }),
};

function base(content: string) {
  return `<div style="font-family:'DM Sans',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0C0B09;padding:40px 32px;border-radius:16px;">
    <div style="font-family:Georgia,serif;font-size:26px;color:#C9A96E;margin-bottom:6px">Feria <em>Design</em></div>
    <div style="height:1px;background:#ffffff15;margin-bottom:28px"></div>
    ${content}
    <div style="height:1px;background:#ffffff10;margin:28px 0 16px"></div>
    <div style="font-size:10px;color:#EDE8DF25">Feria Design Studio · Ecuador · feria.design</div>
  </div>`;
}

function btn(url: string, label: string) {
  return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="background:#C9A96E;color:#0a0a0a;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">${label}</a></div>`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY no configurada');

    const { templateId, to, params } = await req.json();
    if (!templateId || !to) throw new Error('templateId y to son requeridos');

    const template = TEMPLATES[templateId];
    if (!template) throw new Error(`Template "${templateId}" no existe. Disponibles: ${Object.keys(TEMPLATES).join(', ')}`);

    const { subject, html } = template(params || {});

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');

    console.log(`✓ Email "${templateId}" → ${to}`);
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsH, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('send-email error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400, headers: corsH,
    });
  }
});
