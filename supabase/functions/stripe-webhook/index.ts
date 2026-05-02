// supabase/functions/stripe-webhook/index.ts
import { ensureClientPortalAccess } from '../_shared/client-access.ts';
// Webhook Stripe → Feria OS.
// Producción: requiere STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY y STRIPE_SECRET_KEY.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const enc = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) throw new Error('Falta stripe-signature');
  const parts = signatureHeader.split(',').map(x => x.trim());
  const timestamp = parts.find(x => x.startsWith('t='))?.slice(2);
  const signatures = parts.filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!timestamp || !signatures.length) throw new Error('Firma Stripe inválida');

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error('Firma Stripe expirada');

  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = toHex(digest);
  if (!signatures.some(sig => safeEqual(sig, expected))) throw new Error('Firma Stripe no coincide');
}

async function stripeGet(path: string, stripeKey: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) console.warn('Stripe lookup falló:', path, json?.error?.message || res.status);
  return json;
}

function serviceTypeFromService(servicio = '') {
  const s = String(servicio).toLowerCase();
  if (s.includes('fot')) return 'branding_fotografos';
  if (s.includes('web')) return 'web';
  if (s.includes('naming')) return 'naming';
  if (s.includes('consult')) return 'consultoria';
  return 'branding';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!sbUrl || !sbKey || !stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Faltan variables de entorno del webhook Stripe' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.text();
    await verifyStripeSignature(rawBody, req.headers.get('stripe-signature'), webhookSecret);

    const event = JSON.parse(rawBody);
    const type = event.type;
    const obj = event.data?.object || {};

    if (!['checkout.session.completed', 'payment_intent.succeeded'].includes(type)) {
      return new Response(JSON.stringify({ ok: true, ignored: type }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'checkout.session.completed' && obj?.payment_status && obj.payment_status !== 'paid') {
      return new Response(JSON.stringify({ ok: true, pending: true, payment_status: obj.payment_status }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let cobroId = obj?.metadata?.cobro_id || obj?.client_reference_id;

    if (!cobroId && type === 'checkout.session.completed' && obj?.payment_intent) {
      const pi = await stripeGet(`payment_intents/${obj.payment_intent}`, stripeKey);
      cobroId = pi?.metadata?.cobro_id;
    }

    if (!cobroId && type === 'checkout.session.completed' && obj?.payment_link) {
      const pl = await stripeGet(`payment_links/${obj.payment_link}`, stripeKey);
      cobroId = pl?.metadata?.cobro_id;
    }

    if (!cobroId) {
      return new Response(JSON.stringify({ ok: true, warning: 'Evento recibido sin cobro_id metadata' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const amount = obj?.amount_total ? obj.amount_total / 100 : obj?.amount ? obj.amount / 100 : null;
    const stripeId = obj?.payment_intent || obj?.id || null;

    const updateRes = await fetch(`${sbUrl}/rest/v1/cobros?id=eq.${encodeURIComponent(cobroId)}&select=*`, {
      method: 'PATCH',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: 'paid',
        stripe_id: stripeId,
        stripe_session_id: type === 'checkout.session.completed' ? obj?.id : null,
        stripe_payment_link_id: obj?.payment_link || null,
        fecha_pago: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    const updatedCobros = await updateRes.json().catch(() => []);
    if (!updateRes.ok) throw new Error(`No se pudo actualizar cobro ${cobroId}`);
    const cobro = updatedCobros?.[0];

    if (cobro?.payment_stage === 'application_extra' || cobro?.application_id) {
      const appPatch: Record<string, unknown> = {
        extra_status: 'pagada',
        status: 'pendiente',
        paid_at: new Date().toISOString(),
        payment_cobro_id: cobroId,
        updated_at: new Date().toISOString(),
      };
      const filters: string[] = [];
      if (cobro?.proyecto_id) filters.push(`proyecto_id=eq.${encodeURIComponent(cobro.proyecto_id)}`);
      if (cobro?.application_id) filters.push(`application_id=eq.${encodeURIComponent(cobro.application_id)}`);
      const filterQuery = filters.length ? `?${filters.join('&')}` : `?cobro_id=eq.${encodeURIComponent(cobroId)}`;
      await fetch(`${sbUrl}/rest/v1/project_applications${filterQuery}`, {
        method: 'PATCH',
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(appPatch),
      }).catch(() => null);
    }

    let portalAccess = null;

    if (cobro?.cliente_id) {
      const clienteRes = await fetch(`${sbUrl}/rest/v1/clientes?id=eq.${encodeURIComponent(cobro.cliente_id)}&select=id,nombre,email,servicio,service_type,stage`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      });
      const clientes = await clienteRes.json().catch(() => []);
      const cliente = clientes?.[0];
      const serviceType = cliente?.service_type || serviceTypeFromService(cliente?.servicio);

      await fetch(`${sbUrl}/rest/v1/clientes?id=eq.${encodeURIComponent(cobro.cliente_id)}`, {
        method: 'PATCH',
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: Math.max(Number(cliente?.stage || 0), 4), service_type: serviceType, updated_at: new Date().toISOString() }),
      });

      await fetch(`${sbUrl}/rest/v1/briefs?on_conflict=cliente_id`, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          cliente_id: cobro.cliente_id,
          respuestas: null,
          completado: false,
          service_type: serviceType,
          template_key: serviceType,
          activo: true,
          updated_at: new Date().toISOString(),
        }),
      });

      portalAccess = await ensureClientPortalAccess({
        sbUrl,
        sbKey,
        clienteId: cobro.cliente_id,
        source: 'stripe-webhook',
      });
    }

    await fetch(`${sbUrl}/rest/v1/notificaciones`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'cobro',
        titulo: `Pago confirmado · ${amount ? `$${amount} USD` : 'Stripe'}`,
        descripcion: `Cobro ${cobroId} actualizado como pagado y brief activado si corresponde.`,
        tiempo: 'Ahora',
        leida: false,
      }),
    });

    return new Response(JSON.stringify({ ok: true, cobro_id: cobroId, portal_access: portalAccess }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('stripe-webhook error:', e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Webhook error' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
