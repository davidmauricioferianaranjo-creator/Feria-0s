// supabase/functions/_shared/client-access.ts
// v70: crea acceso del cliente cuando contrato firmado + pago confirmado.
// Envía usuario/contraseña por correo y WhatsApp usando plantillas editables.

type AccessResult = {
  ok: boolean;
  status: 'created' | 'reset' | 'already_active' | 'waiting_contract' | 'missing_email' | 'error';
  email?: string;
  password?: string;
  user_id?: string;
  login_url?: string;
  message?: string;
  email_sent?: boolean;
  whatsapp_sent?: boolean;
};

const PORTAL_LOGIN_URL = Deno.env.get('PORTAL_LOGIN_URL') || 'https://feria.design/login';

function jsonHeaders(sbKey: string) {
  return { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' };
}

function normalizeEmail(email?: string | null) { return String(email || '').trim().toLowerCase(); }
function isValidEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function randomToken(size = 18) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, 'x').replace(/\//g, 'y').replace(/=+$/g, '');
}
function generateTemporaryPassword() { return `Feria-${randomToken(14)}!`; }
function escapeHtml(value: string) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function renderVariables(text: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((out, [key, value]) => out.split(key).join(value), text || '');
}
function toHtml(text: string) { return escapeHtml(text).replace(/\n/g, '<br/>'); }
function normalizePhone(phone?: string | null) {
  const clean = String(phone || '').replace(/\D/g, '');
  return clean.startsWith('00') ? clean.slice(2) : clean;
}

async function restGet(sbUrl: string, sbKey: string, path: string) {
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(`REST GET ${path} falló: ${data?.message || res.status}`);
  return data;
}
async function restPatch(sbUrl: string, sbKey: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { method: 'PATCH', headers: jsonHeaders(sbKey), body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`REST PATCH ${path} falló: ${data?.message || res.status}`);
  return data;
}
async function restPost(sbUrl: string, sbKey: string, path: string, body: Record<string, unknown>) {
  const headers: Record<string, string> = jsonHeaders(sbKey);
  headers.Prefer = path.includes('on_conflict') ? 'resolution=merge-duplicates,return=representation' : 'return=representation';
  const res = await fetch(`${sbUrl}/rest/v1/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`REST POST ${path} falló: ${data?.message || res.status}`);
  return data;
}
async function createAuthUser(sbUrl: string, sbKey: string, payload: Record<string, unknown>) {
  const res = await fetch(`${sbUrl}/auth/v1/admin/users`, { method: 'POST', headers: jsonHeaders(sbKey), body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.msg || data?.message || data?.error_description || data?.error || `Auth create failed ${res.status}`));
  return data;
}
async function updateAuthUserPassword(sbUrl: string, sbKey: string, userId: string, password: string, name: string, clienteId: string) {
  const res = await fetch(`${sbUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT', headers: jsonHeaders(sbKey),
    body: JSON.stringify({ password, email_confirm: true, user_metadata: { name, role: 'cliente', cliente_id: clienteId }, app_metadata: { role: 'cliente', cliente_id: clienteId } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.msg || data?.message || data?.error_description || data?.error || `Auth update failed ${res.status}`));
  return data;
}
async function loadTemplate(sbUrl: string, sbKey: string, key: string) {
  try {
    const rows = await restGet(sbUrl, sbKey, `automatic_message_templates?template_key=eq.${encodeURIComponent(key)}&select=template_key,label,channel,subject,body,required_variables,active&limit=1`);
    return rows?.[0] || null;
  } catch (_) { return null; }
}

const DEFAULT_EMAIL_TEMPLATE = {
  subject: 'Tu acceso al portal de Feria Design Studio',
  body: `Hola, {{nombre_cliente}}.\n\nTu proyecto con {{nombre_estudio}} ya está activo.\n\nHemos creado tu acceso al portal, donde podrás completar tu brief, revisar información importante de tu proyecto y avanzar con las siguientes etapas.\n\nPuedes ingresar aquí:\n{{portal_url}}\n\nUsuario:\n{{email_cliente}}\n\nContraseña temporal:\n{{password_temporal}}\n\nPor seguridad, te recomendamos cambiar tu contraseña después de ingresar por primera vez.\n\nCon cariño,\n{{nombre_estudio}}`,
};
const DEFAULT_WHATSAPP_TEMPLATE = {
  body: `Hola, {{nombre_cliente}}. Tu acceso al portal de {{nombre_estudio}} ya está listo.\n\nIngresa aquí:\n{{portal_url}}\n\nUsuario: {{email_cliente}}\nContraseña temporal: {{password_temporal}}\n\nTe recomendamos cambiar tu contraseña después de ingresar por primera vez.`,
};

function templateVars(nombre: string, email: string, password: string) {
  return {
    '{{nombre_cliente}}': nombre,
    '{{email_cliente}}': email,
    '{{password_temporal}}': password,
    '{{portal_url}}': PORTAL_LOGIN_URL,
    '{{nombre_estudio}}': Deno.env.get('STUDIO_NAME') || 'Feria Design Studio',
    '{{whatsapp_estudio}}': Deno.env.get('STUDIO_WHATSAPP') || '',
  };
}

async function sendPortalAccessEmail(params: { sbUrl: string; sbKey: string; to: string; nombre: string; password: string }) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return false;
  const template = await loadTemplate(params.sbUrl, params.sbKey, 'portal_access_email') || DEFAULT_EMAIL_TEMPLATE;
  const vars = templateVars(params.nombre, params.to, params.password);
  const subject = renderVariables(template.subject || DEFAULT_EMAIL_TEMPLATE.subject, vars);
  const body = renderVariables(template.body || DEFAULT_EMAIL_TEMPLATE.body, vars);
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0C0B09;color:#EDE8DF;padding:36px 30px;border-radius:16px"><div style="font-family:Georgia,serif;font-size:26px;color:#C9A96E;margin-bottom:20px">Feria <em>Design</em></div><div style="font-size:14px;line-height:1.7;color:#EDE8DFCC">${toHtml(body)}</div><div style="text-align:center;margin:26px 0"><a href="${PORTAL_LOGIN_URL}" style="background:#C9A96E;color:#0C0B09;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700;display:inline-block">Entrar a mi portal</a></div></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('RESEND_FROM') || 'Feria Design Studio <hola@feria.design>', to: [params.to], subject, html }),
  });
  if (!res.ok) { const data = await res.json().catch(() => ({})); console.warn('No se pudo enviar email de acceso portal:', data?.message || res.status); return false; }
  return true;
}

async function sendPortalAccessWhatsApp(params: { sbUrl: string; sbKey: string; phone?: string | null; nombre: string; email: string; password: string }) {
  const phone = normalizePhone(params.phone);
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!phone || !token || !phoneId) return false;
  const template = await loadTemplate(params.sbUrl, params.sbKey, 'portal_access_whatsapp') || DEFAULT_WHATSAPP_TEMPLATE;
  const texto = renderVariables(template.body || DEFAULT_WHATSAPP_TEMPLATE.body, templateVars(params.nombre, params.email, params.password));
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: texto } }),
  });
  if (!res.ok) { const data = await res.json().catch(() => ({})); console.warn('No se pudo enviar WhatsApp de acceso portal:', data?.error?.message || res.status); return false; }
  return true;
}

export async function ensureClientPortalAccess(args: { sbUrl: string; sbKey: string; clienteId: string; source?: string }): Promise<AccessResult> {
  const { sbUrl, sbKey, clienteId, source = 'payment_confirmed' } = args;
  try {
    const clientes = await restGet(sbUrl, sbKey, `clientes?id=eq.${encodeURIComponent(clienteId)}&select=id,nombre,email,telefono,whatsapp,servicio,service_type,portal_user_id,portal_access_created_at,portal_access_status,is_demo&limit=1`);
    const cliente = clientes?.[0];
    if (!cliente) throw new Error(`Cliente ${clienteId} no encontrado`);
    const email = normalizeEmail(cliente.email);
    if (!email || !isValidEmail(email)) return { ok: false, status: 'missing_email', message: 'Cliente sin correo válido para crear usuario.' };

    const contratos = await restGet(sbUrl, sbKey, `contratos?cliente_id=eq.${encodeURIComponent(clienteId)}&select=id,status,fecha_firma,firmante&order=created_at.desc&limit=1`);
    const contrato = contratos?.[0];
    const signed = Boolean(contrato && String(contrato.status || '').toLowerCase() === 'firmado');
    if (!signed) {
      await restPatch(sbUrl, sbKey, `clientes?id=eq.${encodeURIComponent(clienteId)}`, { portal_access_status: 'esperando_contrato', updated_at: new Date().toISOString() });
      return { ok: true, status: 'waiting_contract', email, message: 'Pago confirmado; falta contrato firmado para crear el acceso.' };
    }

    if (cliente.portal_access_created_at && cliente.portal_user_id) {
      return { ok: true, status: 'already_active', email, user_id: cliente.portal_user_id, login_url: PORTAL_LOGIN_URL, message: 'El acceso del cliente ya estaba activo.' };
    }

    const password = generateTemporaryPassword();
    const name = cliente.nombre || email.split('@')[0];
    const permissions = { modules: ['client_portal'], brands: ['feria', 'bl'] };
    let userId = '';
    let status: AccessResult['status'] = 'created';

    const existingProfiles = await restGet(sbUrl, sbKey, `profiles?email=ilike.${encodeURIComponent(email)}&select=id,email,role&limit=1`);
    const existingProfile = existingProfiles?.[0];
    if (existingProfile?.id) {
      userId = existingProfile.id;
      status = 'reset';
      await updateAuthUserPassword(sbUrl, sbKey, userId, password, name, clienteId);
    } else {
      try {
        const created = await createAuthUser(sbUrl, sbKey, { email, password, email_confirm: true, user_metadata: { name, role: 'cliente', cliente_id: clienteId }, app_metadata: { role: 'cliente', cliente_id: clienteId } });
        userId = created?.id || created?.user?.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const profilesRetry = await restGet(sbUrl, sbKey, `profiles?email=ilike.${encodeURIComponent(email)}&select=id,email,role&limit=1`);
        const profileRetry = profilesRetry?.[0];
        if (!profileRetry?.id) throw new Error(`El usuario ya puede existir en Auth, pero no hay profile para ${email}: ${msg}`);
        userId = profileRetry.id;
        status = 'reset';
        await updateAuthUserPassword(sbUrl, sbKey, userId, password, name, clienteId);
      }
    }

    if (!userId) throw new Error('Auth no devolvió user_id para el cliente.');
    await restPost(sbUrl, sbKey, 'profiles?on_conflict=id', { id: userId, name, email, role: 'cliente', permissions, updated_at: new Date().toISOString() });

    const emailSent = await sendPortalAccessEmail({ sbUrl, sbKey, to: email, nombre: name, password });
    const whatsappSent = await sendPortalAccessWhatsApp({ sbUrl, sbKey, phone: cliente.whatsapp || cliente.telefono, nombre: name, email, password });

    await restPatch(sbUrl, sbKey, `clientes?id=eq.${encodeURIComponent(clienteId)}`, {
      portal_user_id: userId,
      portal_access_created_at: new Date().toISOString(),
      portal_access_sent_at: emailSent ? new Date().toISOString() : null,
      portal_access_whatsapp_sent_at: whatsappSent ? new Date().toISOString() : null,
      portal_password_must_change: true,
      portal_access_status: 'activo',
      updated_at: new Date().toISOString(),
    });

    await restPost(sbUrl, sbKey, 'notificaciones', {
      tipo: 'portal',
      titulo: 'Acceso de cliente creado',
      descripcion: `${name} ya puede entrar al portal con ${email}. Email: ${emailSent ? 'enviado' : 'pendiente'} · WhatsApp: ${whatsappSent ? 'enviado' : 'pendiente'}. Origen: ${source}.`,
      tiempo: 'Ahora', leida: false, is_demo: Boolean(cliente.is_demo), created_at: new Date().toISOString(),
    });

    return { ok: true, status, email, password, user_id: userId, login_url: PORTAL_LOGIN_URL, email_sent: emailSent, whatsapp_sent: whatsappSent, message: status === 'created' ? 'Acceso creado correctamente.' : 'Acceso existente actualizado con nueva contraseña temporal.' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('ensureClientPortalAccess error:', message);
    return { ok: false, status: 'error', message };
  }
}
