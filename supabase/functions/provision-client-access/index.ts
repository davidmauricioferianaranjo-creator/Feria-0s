// supabase/functions/provision-client-access/index.ts
// Crea acceso del cliente cuando ya existen contrato firmado + pago confirmado.
// Uso interno desde el panel después de firmar contrato o desde acciones admin/crm.
// Deploy: supabase functions deploy provision-client-access

import { ensureClientPortalAccess } from '../_shared/client-access.ts';

const ALLOWED_ORIGINS = ['https://feria.design', 'https://feriaos.feria.design', 'http://localhost:3000'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

function response(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function validateStaff(req: Request, sbUrl: string, sbKey: string) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return { ok: false, error: 'No autorizado — falta sesión' };

  const token = authHeader.replace('Bearer ', '').trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!token || token === anonKey) return { ok: false, error: 'No autorizado — token inválido' };

  const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: sbKey },
  });
  if (!userRes.ok) return { ok: false, error: 'Sesión inválida o expirada' };

  const user = await userRes.json();
  const profileRes = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role,email`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  const profiles = await profileRes.json().catch(() => []);
  const role = profiles?.[0]?.role;
  if (!['admin', 'crm'].includes(role)) return { ok: false, error: 'Acceso denegado — solo admin o CRM pueden crear accesos' };

  return { ok: true, user, role };
}

async function hasPaidCobro(sbUrl: string, sbKey: string, clienteId: string) {
  const res = await fetch(`${sbUrl}/rest/v1/cobros?cliente_id=eq.${encodeURIComponent(clienteId)}&status=eq.paid&select=id,monto,status&limit=1`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  const rows = await res.json().catch(() => []);
  if (!res.ok) throw new Error('No se pudo verificar cobro pagado');
  return rows?.[0] || null;
}

Deno.serve(async (req) => {
  const corsH = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });
  if (req.method !== 'POST') return response({ ok: false, error: 'Método no permitido' }, 405, corsH);

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!sbUrl || !sbKey) return response({ ok: false, error: 'Faltan variables Supabase' }, 500, corsH);

  try {
    const staff = await validateStaff(req, sbUrl, sbKey);
    if (!staff.ok) return response({ ok: false, error: staff.error }, 403, corsH);

    const { cliente_id } = await req.json();
    if (!cliente_id) throw new Error('cliente_id es requerido');

    const paid = await hasPaidCobro(sbUrl, sbKey, cliente_id);
    if (!paid) {
      return response({ ok: true, status: 'waiting_payment', message: 'Contrato firmado; falta pago confirmado para crear acceso.' }, 200, corsH);
    }

    const portalAccess = await ensureClientPortalAccess({
      sbUrl,
      sbKey,
      clienteId: cliente_id,
      source: 'provision-client-access',
    });

    return response({ ok: true, portal_access: portalAccess }, 200, corsH);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('provision-client-access error:', message);
    return response({ ok: false, error: message }, 400, corsH);
  }
});
