// supabase/functions/invite-team-member/index.ts
// Invita a un miembro del equipo via email y crea su perfil con el rol asignado.
// Solo puede ser llamada por usuarios con rol admin.
// Deploy: supabase functions deploy invite-team-member --project-ref dldykrsikwbibiegtyyb

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
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const sbUrl  = Deno.env.get('SUPABASE_URL')!;
  const sbKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // ── Validar que el solicitante es admin ─────────────────────
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'No autorizado' }), { status: 401, headers: corsH });
    }
    const token = auth.replace('Bearer ', '').trim();

    const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: sbKey },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Token inválido' }), { status: 401, headers: corsH });
    }
    const user = await userRes.json();

    const profRes = await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    const profs = await profRes.json();
    if (profs?.[0]?.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Solo el admin puede invitar miembros' }), { status: 403, headers: corsH });
    }

    // ── Leer datos del nuevo miembro ────────────────────────────
    const { email, name, role, color, initials } = await req.json();

    if (!email || !name || !role) {
      return new Response(JSON.stringify({ ok: false, error: 'email, name y role son requeridos' }), { status: 400, headers: corsH });
    }

    const validRoles = ['admin', 'crm', 'creativo', 'finanzas'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: `Rol inválido. Permitidos: ${validRoles.join(', ')}` }), { status: 400, headers: corsH });
    }

    // ── Invitar usuario via Supabase Auth Admin ─────────────────
    const inviteRes = await fetch(`${sbUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        apikey:          sbKey,
        Authorization:   `Bearer ${sbKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        email,
        data: { name, role, color: color || '#C9A96E' },
      }),
    });

    const inviteData = await inviteRes.json();

    if (!inviteRes.ok) {
      const msg = inviteData?.message || inviteData?.error_description || 'Error al invitar usuario';
      // Si ya existe como usuario, intentar solo actualizar el perfil
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        // Buscar el usuario existente y actualizar su perfil
        const findRes = await fetch(`${sbUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
        });
        const findData = await findRes.json();
        const existingUser = findData?.users?.[0];

        if (existingUser?.id) {
          await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${existingUser.id}`, {
            method: 'PATCH',
            headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ role, name, updated_at: new Date().toISOString() }),
          });
          return new Response(JSON.stringify({
            ok: true,
            userId: existingUser.id,
            message: `${name} ya tenía cuenta — rol actualizado a ${role}`,
            updated: true,
          }), { headers: { ...corsH, 'Content-Type': 'application/json' } });
        }
      }
      return new Response(JSON.stringify({ ok: false, error: msg }), { status: 400, headers: corsH });
    }

    const newUserId = inviteData?.id;

    // ── Crear perfil con el rol asignado ────────────────────────
    if (newUserId) {
      await fetch(`${sbUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          apikey: sbKey, Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id:         newUserId,
          name,
          role,
          updated_at: new Date().toISOString(),
        }),
      });

      // ── Guardar en tabla team ────────────────────────────────
      await fetch(`${sbUrl}/rest/v1/team`, {
        method: 'POST',
        headers: {
          apikey: sbKey, Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_id:  newUserId,
          name,
          email,
          role,
          perms:    role,
          color:    color || '#C9A96E',
          initials: initials || name.slice(0, 2).toUpperCase(),
          bg:       (color || '#C9A96E') + '22',
        }),
      });
    }

    console.log(`✓ invite-team-member: ${email} invitado como ${role}`);

    return new Response(JSON.stringify({
      ok:      true,
      userId:  newUserId,
      message: `Invitación enviada a ${email}. Recibirá un email para configurar su contraseña.`,
    }), { headers: { ...corsH, 'Content-Type': 'application/json' } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('invite-team-member ERROR:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsH, 'Content-Type': 'application/json' },
    });
  }
});
