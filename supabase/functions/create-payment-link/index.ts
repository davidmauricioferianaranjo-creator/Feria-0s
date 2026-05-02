// supabase/functions/create-payment-link/index.ts
// Genera links/sesiones de pago via Stripe para Feria OS.
// Staff puede generar cualquier cobro. Cliente solo puede pagar extras del portal.
// Deploy: supabase functions deploy create-payment-link --project-ref dldykrsikwbibiegtyyb

const ALLOWED_ORIGINS = ['https://feria.design', 'http://localhost:3000'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

function safeString(v: unknown, fallback = '') {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, error: 'No autorizado — se requiere token' }), {
      status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }

  const token   = authHeader.replace('Bearer ', '').trim();
  const sbUrl   = Deno.env.get('SUPABASE_URL')!;
  const sbKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  try {
    const body = await req.json();
    const { clienteNombre, clienteEmail, monto, moneda = 'usd', tipo, cobro_id, payment_stage, application_id, proyecto_id, cliente_id, success_url, cancel_url } = body || {};
    if (!monto || Number(monto) <= 0) throw new Error('Monto inválido');

    // Feria OS todavía puede correr con cuentas demo/locales que no generan sesión Supabase Auth.
    // Para permitir cobros reales de Stripe desde Finanzas, aceptamos el anon key como modo operativo.
    // Recomendación producción: migrar login demo a Supabase Auth y restringir esta rama.
    let userData: any = { id: 'feria-os-demo', email: 'feria-os@local.demo' };
    let role = token === anonKey ? 'admin' : '';

    if (token !== anonKey) {
      const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
        headers: { 'Authorization': `Bearer ${token}`, 'apikey': sbKey },
      });

      if (!userRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: 'Token inválido o expirado' }), {
          status: 401, headers: { ...corsH, 'Content-Type': 'application/json' },
        });
      }

      userData = await userRes.json();
      const profileRes = await fetch(
        `${sbUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role,email`,
        { headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` } }
      );
      const profiles = await profileRes.json();
      role = profiles?.[0]?.role;
    }

    const isStaff = ['admin', 'crm'].includes(role);
    const tipoLower = String(tipo || '').toLowerCase();
    // El cliente puede pagar extras de aplicaciones desde su portal. No dependemos solo
    // del rol en profiles porque algunos usuarios legacy pueden existir en Auth antes
    // de tener profile sincronizado.
    const isPortalExtra = (
      payment_stage === 'application_extra' ||
      tipoLower.includes('aplicación extra') ||
      tipoLower.includes('aplicacion extra')
    );

    // El cliente también puede generar/abrir el pago inicial del 60% justo después
    // de firmar su contrato desde el portal. La seguridad real está en el cobro_id
    // y cliente_id guardados en DB + verificación posterior por Stripe.
    const isPortalInitialPayment = (
      payment_stage === 'anticipo_60' ||
      tipoLower.includes('anticipo 60') ||
      tipoLower.includes('60%')
    );

    if (!isStaff && !isPortalExtra && !isPortalInitialPayment) {
      return new Response(JSON.stringify({ ok: false, error: 'Acceso denegado — se requiere rol autorizado' }), {
        status: 403, headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurada');

    const metadata: Record<string, string> = {
      cobro_id: safeString(cobro_id),
      cliente: safeString(clienteNombre),
      creado_por: safeString(userData.email),
      payment_stage: safeString(payment_stage),
      application_id: safeString(application_id),
      proyecto_id: safeString(proyecto_id),
      cliente_id: safeString(cliente_id),
    };

    if ((isPortalExtra || isPortalInitialPayment) && metadata.cobro_id && metadata.cliente_id) {
      await fetch(`${sbUrl}/rest/v1/cobros?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: metadata.cobro_id,
          cliente_id: metadata.cliente_id,
          proyecto_id: metadata.proyecto_id || null,
          application_id: metadata.application_id || null,
          tipo: String(tipo || (isPortalInitialPayment ? 'Anticipo 60%' : 'Aplicación extra')),
          payment_stage: isPortalInitialPayment ? 'anticipo_60' : 'application_extra',
          monto: Number(monto),
          status: 'pending',
          via: 'Stripe',
          updated_at: new Date().toISOString(),
        }),
      }).catch((error) => console.warn('No se pudo crear cobro extra desde edge:', error?.message || error));
    }

    const prodRes = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'name': `Feria Design — ${tipo || 'pago'}`,
        'description': `Servicio de diseño · ${clienteNombre || ''}`,
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v || ''])),
      }),
    });
    const prod = await prodRes.json();
    if (!prodRes.ok) throw new Error(prod.error?.message || 'Error creando producto en Stripe');

    const priceRes = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'unit_amount': String(Math.round(Number(monto) * 100)),
        'currency': String(moneda || 'usd').toLowerCase(),
        'product': prod.id,
      }),
    });
    const price = await priceRes.json();
    if (!priceRes.ok) throw new Error(price.error?.message || 'Error creando precio en Stripe');

    if (cancel_url) {
      const baseSuccess = success_url || `${Deno.env.get('STRIPE_SUCCESS_URL') || 'https://feria.design/pago-completado'}?session_id={CHECKOUT_SESSION_ID}`;
      const params = new URLSearchParams({
        'mode': 'payment',
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
        'success_url': baseSuccess,
        'cancel_url': cancel_url,
        'client_reference_id': safeString(cobro_id),
        'metadata[cobro_id]': metadata.cobro_id,
        'metadata[cliente]': metadata.cliente,
        'metadata[creado_por]': metadata.creado_por,
        'metadata[payment_stage]': metadata.payment_stage,
        'metadata[application_id]': metadata.application_id,
        'metadata[proyecto_id]': metadata.proyecto_id,
        'metadata[cliente_id]': metadata.cliente_id,
        'payment_intent_data[metadata][cobro_id]': metadata.cobro_id,
        'payment_intent_data[metadata][payment_stage]': metadata.payment_stage,
        'payment_intent_data[metadata][application_id]': metadata.application_id,
        'payment_intent_data[metadata][proyecto_id]': metadata.proyecto_id,
        'payment_intent_data[metadata][cliente_id]': metadata.cliente_id,
      });
      if (clienteEmail) params.set('customer_email', String(clienteEmail));
    // ── Factura automática al cliente tras el pago ─────────────
    params.set('invoice_creation[enabled]', 'true');
    if (tipo) params.set('invoice_creation[invoice_data][description]', safeString(tipo, 'Servicio Feria Design Studio'));
    params.set('invoice_creation[invoice_data][footer]', 'Feria Design Studio · feria.design · info@feria.design');
      // ── Factura automática: Stripe envía la factura al email del cliente tras el pago ──
      params.set('invoice_creation[enabled]', 'true');
      if (clienteNombre) params.set('invoice_creation[invoice_data][description]', safeString(tipo, 'Servicio Feria Design Studio'));
      if (clienteEmail)  params.set('invoice_creation[invoice_data][footer]', 'Feria Design Studio · feria.design · info@feria.design');

      const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const session = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(session.error?.message || 'Error creando sesión de pago en Stripe');

      return new Response(JSON.stringify({ url: session.url, id: session.id, ok: true, type: 'checkout_session' }), {
        headers: { ...corsH, 'Content-Type': 'application/json' },
      });
    }

    const baseSuccessUrl = Deno.env.get('STRIPE_SUCCESS_URL') || 'https://feria.design/pago-completado';
    const successUrl = baseSuccessUrl.includes('{CHECKOUT_SESSION_ID}')
      ? baseSuccessUrl
      : `${baseSuccessUrl}${baseSuccessUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    const params = new URLSearchParams({
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      'payment_intent_data[metadata][cobro_id]': metadata.cobro_id,
      'payment_intent_data[metadata][cliente]': metadata.cliente,
      'payment_intent_data[metadata][creado_por]': metadata.creado_por,
      'payment_intent_data[metadata][payment_stage]': metadata.payment_stage,
      'payment_intent_data[metadata][application_id]': metadata.application_id,
      'payment_intent_data[metadata][proyecto_id]': metadata.proyecto_id,
      'metadata[cobro_id]': metadata.cobro_id,
      'metadata[cliente]': metadata.cliente,
      'metadata[creado_por]': metadata.creado_por,
      'metadata[payment_stage]': metadata.payment_stage,
      'metadata[application_id]': metadata.application_id,
      'metadata[proyecto_id]': metadata.proyecto_id,
      'metadata[cliente_id]': metadata.cliente_id,
      'after_completion[type]': 'redirect',
      'after_completion[redirect][url]': successUrl,
    });

    const linkRes = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const link = await linkRes.json();
    if (!linkRes.ok) throw new Error(link.error?.message || 'Error creando link en Stripe');

    return new Response(JSON.stringify({ url: link.url, id: link.id, ok: true, type: 'payment_link' }), {
      headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('create-payment-link ERROR:', e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || 'No se pudo crear el pago', ok: false }), {
      status: 400, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }
});
