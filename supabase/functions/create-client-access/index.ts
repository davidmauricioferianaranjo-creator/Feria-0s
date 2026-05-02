// supabase/functions/create-client-access/index.ts
// Crea un usuario cliente en Supabase Auth con contraseña definida por el admin.
// Solo puede ser llamada por usuarios con rol admin o crm.
// Deploy: supabase functions deploy create-client-access --project-ref dldykrsikwbibiegtyyb

const ALLOWED_ORIGINS = ['https://feria.design', 'http://localhost:3000'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin || '') ? origin! : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsH  = cors(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsH });
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405 });

  const sbUrl  = Deno.env.get('SUPABASE_URL')!;
  const sbKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // ── Validar que el solicitante es admin o crm ───────────────
    const auth  = req.headers.get('authorization') || '';
    const token = auth.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(JSON.stringify({ ok:false, error:'No autorizado' }), { status:401, headers: corsH });
    }

    const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: sbKey },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ ok:false, error:'Token inválido' }), { status:401, headers: corsH });
    }
    const user = await userRes.json();

    const profRes  = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    const profs = await profRes.json();
    const role  = profs?.[0]?.role;

    if (!['admin', 'crm'].includes(role)) {
      return new Response(JSON.stringify({ ok:false, error:'Solo admin o crm pueden crear accesos de cliente' }), { status:403, headers: corsH });
    }

    // ── Leer datos ──────────────────────────────────────────────
    const { email, password, nombre } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ ok:false, error:'email y password son requeridos' }), { status:400, headers: corsH });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ ok:false, error:'La contraseña debe tener al menos 6 caracteres' }), { status:400, headers: corsH });
    }

    // ── Verificar si el usuario ya existe ────────────────────────
    const checkRes = await fetch(
      `${sbUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const checkData = await checkRes.json();
    const existing  = checkData?.users?.[0];

    let userId: string;

    if (existing?.id) {
      // ── Usuario existe — actualizar contraseña ─────────────
      const updateRes = await fetch(`${sbUrl}/auth/v1/admin/users/${existing.id}`, {
        method:  'PUT',
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password, email_confirm: true }),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err?.message || 'Error al actualizar contraseña');
      }
      userId = existing.id;
      console.log(`✓ create-client-access: contraseña actualizada para ${email}`);
    } else {
      // ── Usuario nuevo — crear con contraseña ───────────────
      const createRes = await fetch(`${sbUrl}/auth/v1/admin/users`, {
        method:  'POST',
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          password,
          email_confirm:   true,
          user_metadata:   { name: nombre || email.split('@')[0] },
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        throw new Error(created?.message || created?.error_description || 'Error al crear usuario');
      }
      userId = created.id;
      console.log(`✓ create-client-access: usuario creado para ${email}`);
    }

    // ── Crear/actualizar perfil con rol cliente ──────────────────
    await fetch(`${sbUrl}/rest/v1/profiles`, {
      method:  'POST',
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body:    JSON.stringify({ id: userId, name: nombre || email.split('@')[0], role: 'cliente', updated_at: new Date().toISOString() }),
    });

    return new Response(JSON.stringify({
      ok:      true,
      userId,
      message: existing ? `Contraseña actualizada para ${email}` : `Acceso creado para ${email}`,
      updated: !!existing,
    }), { headers: { ...corsH, 'Content-Type': 'application/json' } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('create-client-access ERROR:', msg);
    return new Response(JSON.stringify({ ok:false, error: msg }), {
      status: 500, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }
});
