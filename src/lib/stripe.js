import { supabase, isConfigured } from './supabase';

export const stripeConfigured = isConfigured;

// ── DIAGNÓSTICO DE ERRORES ────────────────────────────────────────
// Traduce errores técnicos de Supabase/Stripe a mensajes accionables en español
function parseStripeError(rawError) {
  const msg = String(rawError?.message || rawError || '');

  if (msg.includes('non-2xx status code')) {
    return 'La Edge Function create-payment-link no está desplegada o le falta el secret STRIPE_SECRET_KEY en Supabase.';
  }
  if (msg.includes('Failed to send a request') || msg.includes('NetworkError') || msg.includes('fetch')) {
    return 'No se pudo conectar con Supabase. Verifica tu conexión a internet.';
  }
  if (msg.includes('JWT') || msg.includes('401') || msg.includes('unauthorized')) {
    return 'Sesión expirada. Cierra sesión y vuelve a entrar.';
  }
  if (msg.includes('STRIPE_SECRET_KEY') || msg.includes('stripe_secret')) {
    return 'Falta configurar STRIPE_SECRET_KEY en los secrets de la Edge Function en Supabase.';
  }
  if (msg.includes('FunctionsFetchError') || msg.includes('Edge Function')) {
    return 'La Edge Function de Stripe no respondió. ¿Está desplegada en Supabase?';
  }
  return msg.length > 120 ? msg.slice(0, 120) + '…' : msg || 'Error desconocido al conectar con Stripe.';
}

// ── LINK DEMO (fallback local) ────────────────────────────────────
function buildDemoPaymentLink({ cobro_id, cliente_id, payment_stage, success_url }) {
  const session = `demo_${Date.now()}`;
  const baseSuccess = success_url || `${window.location.origin}/pago-completado?session_id={CHECKOUT_SESSION_ID}`;
  const resolved = baseSuccess.replace('{CHECKOUT_SESSION_ID}', session);
  const url = new URL(resolved, window.location.origin);
  url.searchParams.set('demo', '1');
  if (cobro_id)      url.searchParams.set('cobro_id', cobro_id);
  if (cliente_id)    url.searchParams.set('cliente_id', cliente_id);
  if (payment_stage) url.searchParams.set('payment_stage', payment_stage);
  if (!url.searchParams.get('return_to')) url.searchParams.set('return_to', '/finanzas');
  return { ok: true, url: url.toString(), id: `pl_demo_${Date.now()}`, demo: true };
}

// ── CREAR PAYMENT LINK ────────────────────────────────────────────
export async function createPaymentLink({
  clienteNombre, clienteEmail, monto, tipo,
  cobro_id, payment_stage, application_id,
  proyecto_id, cliente_id, success_url, cancel_url, moneda = 'usd',
}) {
  const payload = {
    clienteNombre, clienteEmail, monto, tipo, cobro_id,
    payment_stage, application_id, proyecto_id, cliente_id,
    success_url, cancel_url, moneda,
  };

  if (process.env.REACT_APP_FORCE_DEMO_PAYMENTS === 'true') {
    return buildDemoPaymentLink(payload);
  }

  if (!isConfigured) {
    return {
      ok: false,
      error: 'Supabase no está configurado. Agrega REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY al .env y reinicia el servidor.',
      needsSetup: true,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-payment-link', { body: payload });

    if (error) return { ok: false, error: parseStripeError(error), raw: error };

    const url = data?.url || data?.payment_link || data?.paymentLink;
    if (!url) {
      return {
        ok: false,
        error: 'La Edge Function respondió pero no devolvió un link de pago. Revisa los logs en Supabase → Edge Functions.',
      };
    }

    return { ok: true, ...data, url };
  } catch (err) {
    console.error('[stripe.js] createPaymentLink error:', err);
    return { ok: false, error: parseStripeError(err), raw: err };
  }
}

// ── GUARDAR LINK EN BD ────────────────────────────────────────────
export async function savePaymentLink(cobro_id, paymentLinkUrl) {
  if (!isConfigured || !cobro_id || !paymentLinkUrl) return;
  try {
    await supabase.from('cobros')
      .update({ stripe_payment_link: paymentLinkUrl, payment_link: paymentLinkUrl })
      .eq('id', cobro_id);
  } catch (error) {
    console.warn('[stripe.js] No se pudo guardar el link:', error?.message || error);
  }
}

// ── ABRIR LINK DE PAGO ────────────────────────────────────────────
export function openPaymentLink(url) {
  if (!url) return;
  const normalized = String(url);
  const isInternal = normalized.startsWith('/') || normalized.startsWith(window.location.origin);
  if (isInternal) { window.location.href = normalized; return; }
  window.open(normalized, '_blank', 'noopener,noreferrer');
}

// ── SPLIT 60/40 ───────────────────────────────────────────────────
export function calcSplit(montoTotal) {
  const sesenta  = Math.round(montoTotal * 0.6);
  const cuarenta = montoTotal - sesenta;
  return { sesenta, cuarenta };
}

// ── FORMATO ───────────────────────────────────────────────────────
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}
