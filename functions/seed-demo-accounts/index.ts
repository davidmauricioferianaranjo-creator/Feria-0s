// supabase/functions/seed-demo-accounts/index.ts
// v73.1 — crea cuentas demo por rol con siembra mínima y tolerante a diferencias de esquema.
// Deploy:
// supabase functions deploy seed-demo-accounts --no-verify-jwt --project-ref dldykrsikwbibiegtyyb

const DEMO_PASSWORD = 'FeriaDemo2026!';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const accounts = [
  { key: 'admin', name: 'David Demo', email: 'admin.demo@feria.design', role: 'admin', permissions: { modules: ['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','admin','portal'], brands: ['feria','bl'] } },
  { key: 'crm', name: 'Selena Demo', email: 'selena.demo@feria.design', role: 'crm', permissions: { modules: ['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','portal'], brands: ['feria','bl'] } },
  { key: 'designer', name: 'Diseñadora Demo', email: 'disenador.demo@feria.design', role: 'creativo', permissions: { modules: ['dashboard','calendario','kanban'], brands: ['feria','bl'] } },
  { key: 'finance', name: 'Finanzas Demo', email: 'finanzas.demo@feria.design', role: 'finanzas', permissions: { modules: ['dashboard','finanzas'], brands: ['feria','bl'] } },
  { key: 'client', name: 'Cliente Demo', email: 'cliente.demo@feria.design', role: 'cliente', permissions: { modules: ['client_portal'], brands: ['feria','bl'] } },
];

const teamIds: Record<string, string> = {
  admin: '00000000-0000-4000-8000-000000000401',
  crm: '00000000-0000-4000-8000-000000000402',
  designer: '00000000-0000-4000-8000-000000000403',
  finance: '00000000-0000-4000-8000-000000000404',
};

const ids = {
  cliente: '00000000-0000-4000-8000-000000000101',
  proyecto: '00000000-0000-4000-8000-000000000102',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function authHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

async function readBody(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function missingColumn(message: string): string | null {
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column "([^"]+)" does not exist/i,
    /column "([^"]+)" of relation/i,
    /record "new" has no field "([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function removeKey(payload: Record<string, unknown> | Record<string, unknown>[], key: string) {
  if (Array.isArray(payload)) {
    return payload.map((item) => {
      const copy = { ...item };
      delete copy[key];
      return copy;
    });
  }
  const copy = { ...payload };
  delete copy[key];
  return copy;
}

async function safeRestPost(sbUrl: string, key: string, table: string, payload: Record<string, unknown> | Record<string, unknown>[], options: { conflict?: string; optional?: boolean } = {}) {
  const warnings: string[] = [];
  let body = payload;
  const conflict = options.conflict || 'id';

  for (let attempt = 0; attempt < 10; attempt++) {
    const url = `${sbUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeaders(key),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(body),
    });
    const data = await readBody(res);
    if (res.ok) return { data, warnings };

    const message = String(data?.message || data?.error || data?.raw || res.status);

    if (/relation .* does not exist/i.test(message) || /Could not find the table/i.test(message)) {
      if (options.optional) {
        warnings.push(`${table}: tabla no existe, omitida.`);
        return { data: null, warnings };
      }
    }

    const col = missingColumn(message);
    if (col) {
      body = removeKey(body, col);
      warnings.push(`${table}: columna '${col}' no existe, omitida.`);
      continue;
    }

    if (/there is no unique or exclusion constraint/i.test(message)) {
      if (options.optional) {
        warnings.push(`${table}: on_conflict no compatible, omitida.`);
        return { data: null, warnings };
      }
    }

    throw new Error(`${table}: ${message}`);
  }

  throw new Error(`${table}: demasiados reintentos.`);
}

async function listAuthUsers(sbUrl: string, key: string) {
  const res = await fetch(`${sbUrl}/auth/v1/admin/users?page=1&per_page=100`, { headers: authHeaders(key) });
  const data = await readBody(res);
  if (!res.ok) throw new Error(`No pude listar usuarios Auth: ${data?.message || data?.error || data?.raw || res.status}`);
  return Array.isArray(data?.users) ? data.users : [];
}

async function createOrUpdateAuthUser(sbUrl: string, key: string, account: typeof accounts[number], authUsers: any[]) {
  const existing = authUsers.find((u) => String(u?.email || '').toLowerCase() === account.email.toLowerCase());

  if (existing?.id) {
    const res = await fetch(`${sbUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: authHeaders(key),
      body: JSON.stringify({
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: account.name, role: account.role, is_demo: true },
        app_metadata: { role: account.role, is_demo: true },
      }),
    });
    const data = await readBody(res);
    if (!res.ok) throw new Error(`Auth update ${account.email}: ${data?.message || data?.msg || data?.error || data?.raw || res.status}`);
    return { id: existing.id, status: 'updated' };
  }

  const res = await fetch(`${sbUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders(key),
    body: JSON.stringify({
      email: account.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: account.name, role: account.role, is_demo: true },
      app_metadata: { role: account.role, is_demo: true },
    }),
  });
  const data = await readBody(res);
  if (!res.ok) throw new Error(`Auth create ${account.email}: ${data?.message || data?.msg || data?.error || data?.raw || res.status}`);
  return { id: data?.id || data?.user?.id, status: 'created' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido.' }, 405);

  try {
    const sbUrl = Deno.env.get('SUPABASE_URL');
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const configuredToken = Deno.env.get('DEMO_SETUP_TOKEN') || '';
    const body = await req.json().catch(() => ({}));
    const incomingToken = body?.setup_token || body?.token;

    if (!sbUrl || !sbKey) return json({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.' }, 500);
    if (configuredToken && incomingToken !== configuredToken) return json({ ok: false, error: 'Token de demo incorrecto.' }, 403);
    if (!configuredToken) return json({ ok: false, error: 'Configura DEMO_SETUP_TOKEN.' }, 403);

    const authUsers = await listAuthUsers(sbUrl, sbKey);
    const resultAccounts: any[] = [];
    const warnings: string[] = [];

    for (const account of accounts) {
      const auth = await createOrUpdateAuthUser(sbUrl, sbKey, account, authUsers);
      resultAccounts.push({ ...account, user_id: auth.id, status: auth.status });

      const profilePayload = {
        id: auth.id,
        name: account.name,
        nombre: account.name,
        email: account.email,
        role: account.role,
        rol: account.role,
        permissions: account.permissions,
        is_demo: true,
        updated_at: new Date().toISOString(),
      };
      const profileRes = await safeRestPost(sbUrl, sbKey, 'profiles', profilePayload, { conflict: 'id', optional: true });
      warnings.push(...profileRes.warnings);
    }

    const now = new Date().toISOString();

    const teamPayload = resultAccounts
      .filter((a) => a.role !== 'cliente')
      .map((a) => ({
        id: teamIds[a.key],
        name: a.name,
        nombre: a.name,
        email: a.email,
        initials: a.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
        role: a.role,
        rol: a.role,
        perms: a.role,
        permissions: a.permissions,
        brand: 'feria',
        brands: ['feria', 'bl'],
        is_active: true,
        is_demo: true,
      }));
    const teamRes = await safeRestPost(sbUrl, sbKey, 'team', teamPayload, { conflict: 'id', optional: true });
    warnings.push(...teamRes.warnings);

    const client = resultAccounts.find((a) => a.email === 'cliente.demo@feria.design');
    const clienteRes = await safeRestPost(sbUrl, sbKey, 'clientes', {
      id: ids.cliente,
      nombre: 'Cliente Demo',
      name: 'Cliente Demo',
      email: 'cliente.demo@feria.design',
      telefono: '+593999999999',
      whatsapp: '+593999999999',
      empresa: 'Marca Cliente Demo',
      servicio: 'Branding para Fotógrafos',
      service_type: 'branding_fotografos',
      stage: 5,
      brand: 'feria',
      portal_user_id: client?.user_id || null,
      portal_access_status: 'activo',
      portal_access_created_at: now,
      is_demo: true,
      created_at: now,
      updated_at: now,
    }, { conflict: 'id', optional: true });
    warnings.push(...clienteRes.warnings);

    const proyectoRes = await safeRestPost(sbUrl, sbKey, 'proyectos', {
      id: ids.proyecto,
      cliente_id: ids.cliente,
      nombre: 'Cliente Demo — Branding',
      name: 'Cliente Demo — Branding',
      estado: 'En producción',
      fase: 4,
      pct_interno: 25,
      pct_cliente: 35,
      internal_due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      client_due_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      package_name: 'Paquete 2',
      package_app_limit: 5,
      service_type: 'branding_fotografos',
      creativo_id: teamIds.designer,
      production_status: 'asignado',
      designer_assigned_at: now,
      brand: 'feria',
      is_demo: true,
      created_at: now,
      updated_at: now,
    }, { conflict: 'id', optional: true });
    warnings.push(...proyectoRes.warnings);

    return json({
      ok: true,
      password: DEMO_PASSWORD,
      accounts: resultAccounts.map((a) => ({ email: a.email, role: a.role, status: a.status })),
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('seed-demo-accounts error:', message);
    return json({ ok: false, error: message }, 400);
  }
});
