// supabase/functions/seed-demo-accounts/index.ts
// Crea/actualiza las cuentas demo de Feria OS y carga datos demo vinculados.
// Deploy: supabase functions deploy seed-demo-accounts --no-verify-jwt

const ALLOWED_ORIGINS = ['https://feria.design', 'https://feriaos.feria.design', 'http://localhost:3000'];
const DEMO_PASSWORD = 'FeriaDemo2026!';

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

function response(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function jsonHeaders(sbKey: string) {
  return { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' };
}

async function restGet(sbUrl: string, sbKey: string, path: string) {
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(`REST GET ${path} falló: ${data?.message || res.status}`);
  return data;
}

async function restPost(sbUrl: string, sbKey: string, path: string, body: unknown) {
  const headers: Record<string, string> = jsonHeaders(sbKey);
  headers.Prefer = 'resolution=merge-duplicates,return=representation';
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`REST POST ${path} falló: ${data?.message || res.status}`);
  return data;
}

async function restPatch(sbUrl: string, sbKey: string, path: string, body: unknown) {
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { method: 'PATCH', headers: jsonHeaders(sbKey), body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`REST PATCH ${path} falló: ${data?.message || res.status}`);
  return data;
}

async function createAuthUser(sbUrl: string, sbKey: string, account: DemoAccount) {
  const res = await fetch(`${sbUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: jsonHeaders(sbKey),
    body: JSON.stringify({
      email: account.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: account.name, role: account.role, is_demo: true },
      app_metadata: { role: account.role, is_demo: true },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.msg || data?.message || data?.error_description || data?.error || `Auth create failed ${res.status}`));
  return data?.id || data?.user?.id;
}

async function updateAuthUserPassword(sbUrl: string, sbKey: string, userId: string, account: DemoAccount) {
  const res = await fetch(`${sbUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: jsonHeaders(sbKey),
    body: JSON.stringify({
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: account.name, role: account.role, is_demo: true },
      app_metadata: { role: account.role, is_demo: true },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.msg || data?.message || data?.error_description || data?.error || `Auth update failed ${res.status}`));
}

type DemoAccount = {
  key: string;
  name: string;
  email: string;
  role: 'admin' | 'crm' | 'creativo' | 'finanzas' | 'cliente';
  permissions: Record<string, unknown>;
};

const ACCOUNTS: DemoAccount[] = [
  { key: 'admin', name: 'David Demo', email: 'admin.demo@feria.design', role: 'admin', permissions: { modules: ['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','admin','portal'], brands: ['feria','bl'] } },
  { key: 'crm', name: 'Selena Demo', email: 'selena.demo@feria.design', role: 'crm', permissions: { modules: ['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','portal'], brands: ['feria','bl'] } },
  { key: 'designer', name: 'Diseñadora Demo', email: 'disenador.demo@feria.design', role: 'creativo', permissions: { modules: ['dashboard','calendario','kanban'], brands: ['feria','bl'] } },
  { key: 'finance', name: 'Finanzas Demo', email: 'finanzas.demo@feria.design', role: 'finanzas', permissions: { modules: ['dashboard','finanzas'], brands: ['feria','bl'] } },
  { key: 'client', name: 'Cliente Demo', email: 'cliente.demo@feria.design', role: 'cliente', permissions: { modules: ['client_portal'], brands: ['feria','bl'] } },
];

const TEAM_IDS = {
  admin: '00000000-0000-4000-8000-000000000401',
  crm: '00000000-0000-4000-8000-000000000402',
  designer: '00000000-0000-4000-8000-000000000403',
  finance: '00000000-0000-4000-8000-000000000404',
};
const IDS = {
  cliente: '00000000-0000-4000-8000-000000000101',
  proyecto: '00000000-0000-4000-8000-000000000102',
  cobro: '00000000-0000-4000-8000-000000000103',
  contrato: '00000000-0000-4000-8000-000000000104',
  brief: '00000000-0000-4000-8000-000000000105',
};

async function ensureAccount(sbUrl: string, sbKey: string, account: DemoAccount) {
  const existing = await restGet(sbUrl, sbKey, `profiles?email=ilike.${encodeURIComponent(account.email)}&select=id,email,role&limit=1`);
  let userId = existing?.[0]?.id;
  let status = 'updated';
  if (userId) {
    await updateAuthUserPassword(sbUrl, sbKey, userId, account);
  } else {
    try {
      userId = await createAuthUser(sbUrl, sbKey, account);
      status = 'created';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retry = await restGet(sbUrl, sbKey, `profiles?email=ilike.${encodeURIComponent(account.email)}&select=id,email,role&limit=1`);
      userId = retry?.[0]?.id;
      if (!userId) throw new Error(`${account.email}: Auth puede existir sin profile. Elimina ese usuario en Supabase Auth o crea su profile. Detalle: ${msg}`);
      await updateAuthUserPassword(sbUrl, sbKey, userId, account);
      status = 'updated';
    }
  }
  await restPost(sbUrl, sbKey, 'profiles?on_conflict=id', { id: userId, name: account.name, email: account.email, role: account.role, permissions: account.permissions, updated_at: new Date().toISOString() });
  return { ...account, user_id: userId, status };
}

async function seedDemoData(sbUrl: string, sbKey: string, accountsResult: Array<Record<string, unknown>>) {
  const now = new Date().toISOString();
  const team = [
    { id: TEAM_IDS.admin, name:'David Demo', initials:'DD', role:'Director demo', email:'admin.demo@feria.design', color:'#C9A96E', bg:'rgba(201,169,110,0.15)', brands:['feria','bl'], perms:'admin', permissions: ACCOUNTS[0].permissions, is_demo:true },
    { id: TEAM_IDS.crm, name:'Selena Demo', initials:'SD', role:'CRM / Ventas demo', email:'selena.demo@feria.design', color:'#4ECDC4', bg:'rgba(78,205,196,0.15)', brands:['feria','bl'], perms:'crm', permissions: ACCOUNTS[1].permissions, is_demo:true },
    { id: TEAM_IDS.designer, name:'Diseñadora Demo', initials:'DI', role:'Diseñadora demo', email:'disenador.demo@feria.design', color:'#D4537E', bg:'rgba(212,83,126,0.15)', brands:['feria','bl'], perms:'creativo', permissions: ACCOUNTS[2].permissions, is_demo:true },
    { id: TEAM_IDS.finance, name:'Finanzas Demo', initials:'FI', role:'Finanzas demo', email:'finanzas.demo@feria.design', color:'#7BC67A', bg:'rgba(123,198,122,0.15)', brands:['feria','bl'], perms:'finanzas', permissions: ACCOUNTS[3].permissions, is_demo:true },
  ];
  await restPost(sbUrl, sbKey, 'team?on_conflict=id', team);

  const clientUser = accountsResult.find(a => a.email === 'cliente.demo@feria.design');
  await restPost(sbUrl, sbKey, 'clientes?on_conflict=id', {
    id: IDS.cliente, nombre:'Cliente Demo', email:'cliente.demo@feria.design', telefono:'+593999999999', whatsapp:'+593999999999', empresa:'Marca Cliente Demo', servicio:'Branding para Fotógrafos', service_type:'branding_fotografos', monto:2800, stage:5, brand:'feria', color:'#5B9BD5', portal_user_id: clientUser?.user_id || null, portal_access_status:'activo', portal_access_created_at:now, is_demo:true, created_at:now, updated_at:now,
  });
  await restPost(sbUrl, sbKey, 'proyectos?on_conflict=id', {
    id: IDS.proyecto, cliente_id:IDS.cliente, nombre:'Cliente Demo — Branding', estado:'EL ORIGEN', fase:4, pct_interno:25, pct_cliente:35, dias_entrega:45, dias_ejecucion:8, client_due_date:new Date(Date.now()+45*86400000).toISOString().slice(0,10), internal_due_date:new Date(Date.now()+30*86400000).toISOString().slice(0,10), package_name:'Paquete 2', package_app_limit:5, creativo_id:TEAM_IDS.designer, production_status:'asignado', designer_assigned_at:now, brand:'feria', is_demo:true, created_at:now,
  });
  await restPost(sbUrl, sbKey, 'cobros?on_conflict=id', { id: IDS.cobro, cliente_id:IDS.cliente, nombre:'Anticipo 60% · Demo', monto:1680, tipo:'Anticipo 60%', status:'paid', via:'Stripe', is_demo:true, created_at:now, updated_at:now });
  await restPost(sbUrl, sbKey, 'contratos?on_conflict=id', { id: IDS.contrato, cliente_id:IDS.cliente, firmante:'Cliente Demo', firmante_doc:'Demo', contenido:'Contrato demo · Branding para Fotógrafos', status:'firmado', fecha_firma:now, service_type:'branding_fotografos', estudio_firmado:true, is_demo:true, created_at:now });
  await restPost(sbUrl, sbKey, 'briefs?on_conflict=cliente_id', { id: IDS.brief, cliente_id:IDS.cliente, respuestas:null, completado:false, service_type:'branding_fotografos', template_key:'branding_fotografos', activo:true, is_demo:true, updated_at:now });
  await restPost(sbUrl, sbKey, 'portal_progreso?on_conflict=cliente_id', { cliente_id:IDS.cliente, sentir_data:[], aprobaciones:[], reunion_confirmada:{}, is_demo:true, updated_at:now });
  await restPost(sbUrl, sbKey, 'notificaciones', { tipo:'demo', titulo:'Cuentas demo listas', descripcion:'Ya puedes ingresar como admin, CRM, diseñador, finanzas y cliente demo.', leida:false, is_demo:true, created_at:now });
}

Deno.serve(async (req) => {
  const corsH = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });
  if (req.method !== 'POST') return response({ ok: false, error: 'Método no permitido' }, 405, corsH);

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!sbUrl || !sbKey) return response({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' }, 500, corsH);

  const configuredToken = Deno.env.get('DEMO_SETUP_TOKEN') || '';
  const publicSetup = Deno.env.get('DEMO_ACCOUNTS_PUBLIC_SETUP') === 'true';
  const body = await req.json().catch(() => ({}));
  if (!publicSetup && configuredToken && body?.setup_token !== configuredToken) {
    return response({ ok: false, error: 'Token de preparación demo incorrecto.' }, 403, corsH);
  }
  if (!publicSetup && !configuredToken) {
    return response({ ok: false, error: 'Configura DEMO_SETUP_TOKEN o DEMO_ACCOUNTS_PUBLIC_SETUP=true para preparar cuentas demo.' }, 403, corsH);
  }

  try {
    const accounts = [];
    for (const account of ACCOUNTS) accounts.push(await ensureAccount(sbUrl, sbKey, account));
    await seedDemoData(sbUrl, sbKey, accounts);
    return response({ ok: true, password: DEMO_PASSWORD, accounts: accounts.map(a => ({ email: a.email, role: a.role, status: a.status })) }, 200, corsH);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('seed-demo-accounts error:', message);
    return response({ ok: false, error: message }, 400, corsH);
  }
});
