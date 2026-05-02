// supabase/functions/claude-proxy/index.ts
// CLASIFICACIÓN: INTERNA — autenticada, solo equipo autorizado (admin/crm/creativo)
// ACCESO: JWT obligatorio + validación manual de rol/modelo/tokens
// Deploy: supabase functions deploy claude-proxy --project-ref dldykrsikwbibiegtyyb
// IMPORTANTE: NO usar --no-verify-jwt en este deploy

const ALLOWED_ORIGINS = [
  'https://feria.design',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3003',
  'http://localhost:3010',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3010',
];

const ALLOWED_ROLES = ['admin', 'crm', 'creativo'];

// Modelos permitidos. DEFAULT_MODEL debe coincidir con lo que envía Inteligencia/index.jsx.
const ALLOWED_MODELS = [
  'claude-sonnet-4-6',        // ← modelo principal (Inteligencia, informes)
  'claude-opus-4-6',          // ← modelo premium
  'claude-haiku-4-5-20251001',// ← modelo rápido (sugerencias en Mensajes)
  'claude-haiku-4-5',         // ← alias corto del haiku
  'claude-3-5-sonnet',        // ← compat hacia atrás
  'claude-3-5-haiku',         // ← compat hacia atrás
  'claude-sonnet-4-20250514', // ← compat hacia atrás (versiones anteriores del app)
];

const DEFAULT_MODEL   = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP  = 4096;

const cors = (origin: string | null) => {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '')
    ? origin!
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};

function jsonResponse(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function validateStaff(
  req: Request,
  sbUrl: string,
  serviceRoleKey: string,
): Promise<{ ok: boolean; role?: string; reason?: string }> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return { ok: false, reason: 'Missing Bearer token' };

  const token   = auth.replace('Bearer ', '').trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!token || token === anonKey) return { ok: false, reason: 'Invalid user token' };

  const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceRoleKey },
  });
  if (!userRes.ok) return { ok: false, reason: `Invalid JWT: ${userRes.status}` };

  const user = await userRes.json();
  if (!user?.id) return { ok: false, reason: 'User not found from JWT' };

  const profileRes = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!profileRes.ok) return { ok: false, reason: `Profile lookup failed: ${profileRes.status}` };

  const profiles = await profileRes.json();
  const role = profiles?.[0]?.role;
  if (!ALLOWED_ROLES.includes(role)) {
    return { ok: false, role, reason: `Role not allowed: ${role || 'none'}` };
  }
  return { ok: true, role };
}

function normalizeModel(model?: unknown) {
  return typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL;
}

function isModelAllowed(model: string) {
  return ALLOWED_MODELS.some((allowed) => model.startsWith(allowed));
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });
  if (req.method !== 'POST')    return jsonResponse({ error: 'Método no permitido' }, 405, corsH);

  try {
    const sbUrl          = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY');

    if (!sbUrl)          throw new Error('SUPABASE_URL no configurada');
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
    if (!anthropicKey)   throw new Error('ANTHROPIC_API_KEY no configurada — agrégala en Supabase → Edge Functions → Secrets');

    const staff = await validateStaff(req, sbUrl, serviceRoleKey);
    if (!staff.ok) {
      console.warn(`claude-proxy DENIED: ${staff.reason}`);
      return jsonResponse(
        { error: 'No autorizado — se requiere sesión de equipo', reason: staff.reason },
        403, corsH,
      );
    }

    const body      = await req.json();
    const model     = normalizeModel(body.model);
    const maxTokens = Math.min(Number(body.max_tokens || 1000), MAX_TOKENS_CAP);

    if (!isModelAllowed(model)) {
      throw new Error(`Modelo no permitido: ${model}. Permitidos: ${ALLOWED_MODELS.join(', ')}`);
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          anthropicKey,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages:   body.messages || [],
        system:     body.system,
      }),
    });

    const anthropicData = await anthropicRes.json();

    if (!anthropicRes.ok) {
      const msg = anthropicData?.error?.message || `Claude API error: ${anthropicRes.status}`;
      throw new Error(msg);
    }

    console.log(`✓ claude-proxy [${staff.role}] ${model} → ${anthropicData.usage?.output_tokens || '?'} output tokens`);
    return jsonResponse(anthropicData, 200, corsH);

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('claude-proxy ERROR:', message);
    return jsonResponse({ error: message }, 400, corsH);
  }
});
