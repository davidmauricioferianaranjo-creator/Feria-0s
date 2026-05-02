// supabase/functions/verify-payment-session/index.ts
// v87: verificación Stripe robusta para pagos normales y aplicaciones extra.
// Regla UX: si Stripe confirmó el pago, la página nunca debe quedar bloqueada por un error menor de sincronización.
// Deploy: supabase functions deploy verify-payment-session --no-verify-jwt --project-ref dldykrsikwbibiegtyyb

import { ensureClientPortalAccess } from '../_shared/client-access.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StripeSession = Record<string, any>;

function cleanString(value: unknown) {
  return String(value || '').trim();
}

function splitIds(value: unknown) {
  return cleanString(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanString(value));
}

async function stripeGet(path: string, stripeKey: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Stripe lookup falló: ${path}`);
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

async function restFetch(sbUrl: string, sbKey: string, path: string, init: RequestInit = {}) {
  const headers = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  } as Record<string, string>;
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { ...init, headers });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data, error: !res.ok ? (data?.message || data?.error || `${res.status}`) : null };
}

async function getCobro(sbUrl: string, sbKey: string, cobroId: string) {
  if (!isUuid(cobroId)) return null;
  const result = await restFetch(sbUrl, sbKey, `cobros?id=eq.${encodeURIComponent(cobroId)}&select=*&limit=1`);
  if (!result.ok) return null;
  return Array.isArray(result.data) ? result.data[0] : null;
}

async function upsertCobroIfNeeded(sbUrl: string, sbKey: string, cobroId: string, session: StripeSession, amount: number | null) {
  if (!isUuid(cobroId)) return null;
  const metadata = session?.metadata || {};
  const existing = await getCobro(sbUrl, sbKey, cobroId);
  if (existing) return existing;

  const body: Record<string, unknown> = {
    id: cobroId,
    nombre: metadata.payment_stage === 'application_extra' ? 'Aplicaciones extra' : 'Pago Stripe',
    tipo: metadata.payment_stage === 'application_extra' ? 'Aplicaciones extra' : 'Pago Stripe',
    monto: amount || (session?.amount_total ? session.amount_total / 100 : 0),
    status: 'pending',
    via: 'Stripe',
    payment_stage: metadata.payment_stage || null,
    application_id: metadata.application_id || null,
    cliente_id: isUuid(metadata.cliente_id) ? metadata.cliente_id : null,
    proyecto_id: isUuid(metadata.proyecto_id) ? metadata.proyecto_id : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const created = await restFetch(sbUrl, sbKey, 'cobros?on_conflict=id&select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  });

  if (!created.ok) {
    console.warn('verify-payment-session: no se pudo crear cobro faltante:', created.error);
    return null;
  }
  return Array.isArray(created.data) ? created.data[0] : null;
}

async function patchCobroPaid(sbUrl: string, sbKey: string, cobroId: string, stripeId: string | null, sessionId: string) {
  if (!isUuid(cobroId)) {
    return { cobro: null, warning: `cobro_id no es UUID válido: ${cobroId}` };
  }

  const attempts: Record<string, unknown>[] = [
    {
      status: 'paid',
      stripe_id: stripeId,
      stripe_session_id: sessionId,
      fecha_pago: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      status: 'paid',
      stripe_id: stripeId,
      fecha_pago: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      status: 'paid',
      fecha_pago: new Date().toISOString(),
    },
    { status: 'paid' },
  ];

  let lastError = '';
  for (const body of attempts) {
    const result = await restFetch(sbUrl, sbKey, `cobros?id=eq.${encodeURIComponent(cobroId)}&select=*`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    if (result.ok) {
      const cobro = Array.isArray(result.data) ? result.data[0] : null;
      return { cobro, warning: cobro ? null : 'El cobro no existía o no devolvió filas al actualizar.' };
    }
    lastError = result.error || String(result.status);
  }

  return { cobro: null, warning: `No se pudo actualizar cobro ${cobroId}: ${lastError}` };
}

async function markApplicationsPaid(sbUrl: string, sbKey: string, metadata: Record<string, any>, cobroId: string) {
  const proyectoId = cleanString(metadata.proyecto_id);
  const appIds = splitIds(metadata.application_id);
  if (!proyectoId || !appIds.length) return { updated: 0, warning: null };

  let updated = 0;
  const warnings: string[] = [];

  for (const appId of appIds) {
    const result = await restFetch(
      sbUrl,
      sbKey,
      `project_applications?proyecto_id=eq.${encodeURIComponent(proyectoId)}&application_id=eq.${encodeURIComponent(appId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          extra_status: 'pagada',
          status: 'pendiente',
          paid_at: new Date().toISOString(),
          payment_cobro_id: isUuid(cobroId) ? cobroId : null,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (result.ok) updated += 1;
    else warnings.push(`${appId}: ${result.error}`);
  }

  return { updated, warning: warnings.length ? warnings.join(' · ') : null };
}

async function markCobroPaid(sbUrl: string, sbKey: string, cobroId: string, stripeId: string | null, sessionId: string, amount: number | null, session: StripeSession) {
  const warnings: string[] = [];
  const metadata = session?.metadata || {};

  await upsertCobroIfNeeded(sbUrl, sbKey, cobroId, session, amount).catch((e) => {
    warnings.push(`No se pudo crear cobro faltante: ${e?.message || e}`);
    return null;
  });

  const patched = await patchCobroPaid(sbUrl, sbKey, cobroId, stripeId, sessionId);
  let cobro = patched.cobro;
  if (patched.warning) warnings.push(patched.warning);
  if (!cobro) cobro = await getCobro(sbUrl, sbKey, cobroId).catch(() => null);

  const paymentStage = cobro?.payment_stage || metadata.payment_stage || '';
  const isApplicationExtra = paymentStage === 'application_extra' || Boolean(metadata.application_id);

  if (isApplicationExtra) {
    const appResult = await markApplicationsPaid(sbUrl, sbKey, metadata, cobroId).catch((e) => ({ updated: 0, warning: e?.message || String(e) }));
    if (appResult.warning) warnings.push(`Aplicaciones: ${appResult.warning}`);
    // Para extras no intentamos crear acceso al portal ni briefs. Solo confirmamos pago y regresamos al portal.
    return { cobro, portalAccess: null, warnings, payment_stage: 'application_extra' };
  }

  let portalAccess = null;

  if (cobro?.cliente_id) {
    const clienteRes = await restFetch(sbUrl, sbKey, `clientes?id=eq.${encodeURIComponent(cobro.cliente_id)}&select=id,nombre,email,servicio,service_type,stage&limit=1`);
    const cliente = Array.isArray(clienteRes.data) ? clienteRes.data[0] : null;
    const serviceType = cliente?.service_type || serviceTypeFromService(cliente?.servicio);

    if (cliente) {
      await restFetch(sbUrl, sbKey, `clientes?id=eq.${encodeURIComponent(cobro.cliente_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: Math.max(Number(cliente?.stage || 0), 4), service_type: serviceType, updated_at: new Date().toISOString() }),
      }).catch(() => null);

      await restFetch(sbUrl, sbKey, 'briefs?on_conflict=cliente_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          cliente_id: cobro.cliente_id,
          respuestas: null,
          completado: false,
          service_type: serviceType,
          template_key: serviceType,
          activo: true,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => null);

      portalAccess = await ensureClientPortalAccess({ sbUrl, sbKey, clienteId: cobro.cliente_id, source: 'verify-payment-session' });
    }
  }

  await restFetch(sbUrl, sbKey, 'notificaciones', {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'cobro',
      titulo: `Pago confirmado · ${amount ? `$${amount} USD` : 'Stripe'}`,
      descripcion: `Cobro ${cobroId} actualizado desde página de pago completado.${warnings.length ? ` Avisos: ${warnings.join(' | ')}` : ''}`,
      tiempo: 'Ahora',
      leida: false,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => null);

  return { cobro, portalAccess, warnings, payment_stage: paymentStage || 'standard' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!sbUrl || !sbKey || !stripeKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Faltan variables de entorno para verificar Stripe' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id || !String(session_id).startsWith('cs_')) throw new Error('session_id inválido');

    const session = await stripeGet(`checkout/sessions/${encodeURIComponent(session_id)}`, stripeKey);
    const paid = session?.payment_status === 'paid' || session?.status === 'complete';
    if (!paid) {
      return new Response(JSON.stringify({ ok: false, pending: true, status: session?.status, payment_status: session?.payment_status }), {
        status: 202,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let cobroId = session?.metadata?.cobro_id || null;

    if (!cobroId && session?.payment_intent) {
      const pi = await stripeGet(`payment_intents/${session.payment_intent}`, stripeKey);
      cobroId = pi?.metadata?.cobro_id || null;
    }

    if (!cobroId && session?.payment_link) {
      const pl = await stripeGet(`payment_links/${session.payment_link}`, stripeKey);
      cobroId = pl?.metadata?.cobro_id || null;
    }

    if (!cobroId) {
      // Stripe confirmó el pago, pero falta metadata. No bloqueamos al cliente: devolvemos 200 con advertencia.
      return new Response(JSON.stringify({ ok: true, payment_verified: true, warning: 'Pago verificado, pero no tiene cobro_id en metadata', session_id }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const amount = session?.amount_total ? session.amount_total / 100 : null;
    const result = await markCobroPaid(sbUrl, sbKey, cobroId, session?.payment_intent || session?.id || null, session_id, amount, session);

    return new Response(JSON.stringify({
      ok: true,
      payment_verified: true,
      cobro_id: cobroId,
      cobro: result.cobro,
      portal_access: result.portalAccess,
      payment_stage: result.payment_stage,
      warnings: result.warnings || [],
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('verify-payment-session error:', e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'No se pudo verificar la sesión de pago' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
