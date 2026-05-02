// ── EMAIL TRIGGERS — Feria OS ─────────────────────────────────────────────
// Usa Resend (resend.com) para enviar emails transaccionales
// En producción, los emails se envían desde Supabase Edge Functions
// para no exponer la API key en el frontend.
//
// Activar: npm install resend + configurar Edge Function en Supabase

const RESEND_CONFIGURED = Boolean(process.env.REACT_APP_RESEND_KEY);

// ── BASE INVOKE ───────────────────────────────────────────────────────────
async function invokeEmailFunction(templateId, payload) {
  if (!RESEND_CONFIGURED) {
    console.log(`[EMAIL DEMO] ${templateId}:`, payload);
    return { ok: true, demo: true };
  }

  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { templateId, ...payload },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Email error:', err);
    return { ok: false, error: err.message };
  }
}

// ── PLANTILLAS ────────────────────────────────────────────────────────────

// 1. Email de bienvenida + link de pago 60%
export function emailBienvenida({ clienteNombre, clienteEmail, servicio, monto, paymentLink }) {
  return invokeEmailFunction('bienvenida', {
    to:      clienteEmail,
    subject: `Tu proyecto con Feria Design comienza ahora ✦`,
    data: {
      clienteNombre,
      servicio,
      monto60: Math.round(monto * 0.6),
      paymentLink: paymentLink || '#',
    },
  });
}

// 2. Brief de proyecto — enviado tras confirmar el pago 60%
export function emailBrief({ clienteNombre, clienteEmail, briefLink }) {
  return invokeEmailFunction('brief', {
    to:      clienteEmail,
    subject: `Antes de diseñar, necesitamos escucharte — Brief Feria`,
    data: { clienteNombre, briefLink: briefLink || '#' },
  });
}

// 3. Agradecimiento post-reunión EL ORIGEN
export function emailGracias({ clienteNombre, clienteEmail }) {
  return invokeEmailFunction('gracias_reunion', {
    to:      clienteEmail,
    subject: `Gracias por compartir tu historia — Feria Design`,
    data: { clienteNombre },
  });
}

// 4. Trigger T-1 — link de presentación
export function emailPresentacion({ clienteNombre, clienteEmail, reunionLink }) {
  return invokeEmailFunction('presentacion', {
    to:      clienteEmail,
    subject: `Tu marca está lista para ser revelada — Mañana ✦`,
    data: { clienteNombre, reunionLink: reunionLink || '#' },
  });
}

// 5. Entrega final + link Brand Kit Portal
export function emailEntrega({ clienteNombre, clienteEmail, brandKitLink, monto40, paymentLink }) {
  return invokeEmailFunction('entrega', {
    to:      clienteEmail,
    subject: `Tu marca ya existe en el mundo ✦ — Feria Design`,
    data: { clienteNombre, brandKitLink: brandKitLink || '#', monto40, paymentLink: paymentLink || '#' },
  });
}

// 6. Solicitud de review
export function emailReview({ clienteNombre, clienteEmail, googleLink }) {
  return invokeEmailFunction('review', {
    to:      clienteEmail,
    subject: `¿Nos regalas tu opinión? — Feria Design`,
    data: { clienteNombre, googleLink: googleLink || '#' },
  });
}

// 7. NPS
export function emailNPS({ clienteNombre, clienteEmail, npsLink }) {
  return invokeEmailFunction('nps', {
    to:      clienteEmail,
    subject: `Una sola pregunta — Feria Design`,
    data: { clienteNombre, npsLink: npsLink || '#' },
  });
}

// 8. Oferta de mantenimiento
export function emailMantenimiento({ clienteNombre, clienteEmail }) {
  return invokeEmailFunction('mantenimiento', {
    to:      clienteEmail,
    subject: `Tu marca crece contigo — Planes de mantenimiento`,
    data: { clienteNombre },
  });
}

// 9. Referido
export function emailReferido({ clienteNombre, clienteEmail, refLink }) {
  return invokeEmailFunction('referido', {
    to:      clienteEmail,
    subject: `¿Conoces a alguien que necesite su marca? — Feria`,
    data: { clienteNombre, refLink: refLink || '#' },
  });
}

// ── ORQUESTADOR DE FLUJO POST-VENTA ──────────────────────────────────────
// Dispara la secuencia completa cuando un proyecto se completa
export async function iniciarSecuenciaPostVenta({ clienteNombre, clienteEmail, brandKitLink, monto40, paymentLink }) {
  // Día 0 — email de entrega
  await emailEntrega({ clienteNombre, clienteEmail, brandKitLink, monto40, paymentLink });

  // Los siguientes se programan como delayed jobs en la Edge Function
  // Día 1 → review, Día 2 → NPS, Día 7 → mantenimiento, Día 14 → referido
  return invokeEmailFunction('schedule_sequence', {
    clienteNombre, clienteEmail,
    sequence: ['review:1', 'nps:2', 'mantenimiento:7', 'referido:14'],
  });
}

// ── HELPER: disparar email según cambio de stage ──────────────────────────
export async function triggerEmailByStage(stage, cliente) {
  const { nombre, email, monto } = cliente;
  switch (stage) {
    case 3: // Contrato firmado → bienvenida + pago 60%
      return emailBienvenida({ clienteNombre: nombre, clienteEmail: email, servicio: cliente.servicio, monto });
    case 4: // Pago 60% confirmado → brief
      return emailBrief({ clienteNombre: nombre, clienteEmail: email, briefLink: `${window.location.origin}/portal/brief/${cliente.id}` });
    case 6: // Post-reunión
      return emailGracias({ clienteNombre: nombre, clienteEmail: email });
    case 9: // Brand Kit desbloqueado → entrega
      return emailEntrega({ clienteNombre: nombre, clienteEmail: email, brandKitLink: `${window.location.origin}/portal/brandkit/${cliente.id}`, monto40: Math.round(monto * 0.4) });
    case 10: // Post-venta iniciado
      return iniciarSecuenciaPostVenta({ clienteNombre: nombre, clienteEmail: email, brandKitLink: `${window.location.origin}/portal/brandkit/${cliente.id}`, monto40: Math.round(monto * 0.4) });
    default:
      return null;
  }
}
