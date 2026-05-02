import React, { useState } from 'react';
import { Button, Badge, SectionLabel } from '../../../components/UI';
import { ROLE_PRESETS, initialsFromName } from '../../../lib/permissions';
import { supabase } from '../../../lib/supabase';
import { KeyRound, LoaderCircle, MailPlus, Pencil, Trash2, UserRoundPlus } from 'lucide-react';

const COLORS = ['#C9A96E', '#4ECDC4', '#D4537E', '#60A5FA', '#34D399', '#C084FC'];

// ── Rol → color del badge ──────────────────────────────────────
const rolColor = (perms) => ({
  admin: 'gold', crm: 'teal', finanzas: 'blue', creativo: 'pink',
}[perms] || 'gray');

export default function AdminEquipo({ data, onAddMember, onUpdateMember, onDeleteMember, showToast }) {
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [inviting,   setInviting]   = useState(false);
  const [resetEmail, setResetEmail] = useState(null); // email en proceso de reset

  const [form, setForm] = useState({
    name: '', email: '', role: '', perms: 'creativo',
    brands: ['feria', 'bl'], color: COLORS[0],
    sendInvite: true, // ← nuevo: enviar email de invitación
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', role: '', perms: 'creativo', brands: ['feria', 'bl'], color: COLORS[0], sendInvite: true });
    setShowForm(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      name:        m.name   || '',
      email:       m.email  || '',
      role:        m.role   || '',
      perms:       m.perms  || 'creativo',
      brands:      Array.isArray(m.brands) ? m.brands : ['feria'],
      color:       m.color  || COLORS[0],
      sendInvite:  false, // al editar no reenviar invitación por defecto
    });
    setShowForm(true);
  };

  const toggleBrand = (brand) => {
    setForm(f => ({
      ...f,
      brands: f.brands.includes(brand)
        ? f.brands.filter(b => b !== brand)
        : [...f.brands, brand],
    }));
  };

  // ── Guardar miembro (+ invitar si es nuevo) ──────────────────
  const save = async () => {
    if (!form.name.trim()) { showToast('Escribe el nombre del miembro', '⚠'); return; }
    if (!editing && !form.email.trim()) { showToast('El email es obligatorio para invitar', '⚠'); return; }

    const payload = {
      ...form,
      initials: initialsFromName(form.name, form.email),
      bg: form.color + '22',
      permissions: ROLE_PRESETS[form.perms]?.modules
        ? { modules: ROLE_PRESETS[form.perms].modules, brands: form.brands }
        : { modules: [], brands: form.brands },
    };

    // ── Si es nuevo Y tiene email → invitar via Edge Function ──
    if (!editing && form.sendInvite && form.email.trim()) {
      setInviting(true);
      try {
        const { data: resp, error } = await supabase.functions.invoke('invite-team-member', {
          body: {
            email:    form.email.trim(),
            name:     form.name.trim(),
            role:     form.perms,
            color:    form.color,
            initials: initialsFromName(form.name, form.email),
          },
        });

        if (error || !resp?.ok) {
          showToast(resp?.error || error?.message || 'Error al invitar', '⚠');
          setInviting(false);
          return;
        }

        showToast(resp.message || `Invitación enviada a ${form.email}`, '✉');
      } catch (err) {
        showToast('Error al enviar invitación: ' + err.message, '⚠');
        setInviting(false);
        return;
      } finally {
        setInviting(false);
      }
    }

    // ── Guardar en la lista local de equipo ────────────────────
    if (editing?.id) {
      await onUpdateMember(editing.id, payload);
      if (!form.sendInvite) showToast('Miembro actualizado', '✓');
    } else {
      await onAddMember(payload);
    }

    setShowForm(false);
  };

  // ── Enviar email de reset de contraseña ──────────────────────
  const sendPasswordReset = async (email) => {
    if (!email) return;
    setResetEmail(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) showToast('Error: ' + error.message, '⚠');
      else showToast(`Email de recuperación enviado a ${email}`, '✉');
    } catch (err) {
      showToast('Error: ' + err.message, '⚠');
    } finally {
      setResetEmail(null);
    }
  };

  const remove = async (m) => {
    const ok = window.confirm(`Eliminar a ${m.name} del equipo? Esto no borra el usuario de Supabase Auth; solo lo retira de la app.`);
    if (!ok) return;
    await onDeleteMember(m.id);
    showToast('Miembro eliminado de Feria OS', '🗑');
  };

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap', marginBottom:16 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:500 }}>Equipo de Feria OS</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2 }}>
            Invita, edita y asigna roles. El miembro recibe un email para crear su contraseña.
          </div>
        </div>
        <Button variant="gold" onClick={openNew}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
            <UserRoundPlus size={15} strokeWidth={2} /> Invitar miembro
          </span>
        </Button>
      </div>

      {/* Cards de miembros */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap:12 }}>
        {(data.team || []).map(m => {
          const role = ROLE_PRESETS[m.perms] || ROLE_PRESETS.creativo;
          return (
            <div key={m.id} style={{ padding:16, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, minWidth:0 }}>
              {/* Avatar + nombre */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:m.bg || `${m.color}22`, color:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                  {m.initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-d)', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {m.email || 'sin email'}
                  </div>
                </div>
                <Badge color={rolColor(m.perms)}>{role.label}</Badge>
              </div>

              {/* Descripción del rol */}
              <div style={{ fontSize:11, color:'var(--text-m)', marginBottom:10 }}>
                {m.role || role.desc}
              </div>

              {/* Marcas */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {(m.brands || ['feria']).map(b => (
                  <Badge key={b} color={b === 'bl' ? 'pink' : 'blue'}>
                    {b === 'bl' ? 'Brand & Legacy' : 'Feria Design'}
                  </Badge>
                ))}
              </div>

              {/* Acciones */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><Pencil size={13} strokeWidth={1.8} /> Editar</span>
                </Button>
                {m.email && (
                  <button
                    onClick={() => sendPasswordReset(m.email)}
                    disabled={resetEmail === m.email}
                    style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--text-d)', cursor:'pointer', fontFamily:'inherit', opacity: resetEmail === m.email ? 0.6 : 1, display:'inline-flex', alignItems:'center', gap:5 }}>
                    {resetEmail === m.email ? <LoaderCircle size={13} strokeWidth={1.8} /> : <KeyRound size={13} strokeWidth={1.8} />} Reset pwd
                  </button>
                )}
                <Button size="sm" variant="danger" onClick={() => remove(m)}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><Trash2 size={13} strokeWidth={1.8} /> Eliminar</span>
                </Button>
              </div>
            </div>
          );
        })}

        {/* Tarjeta vacía si no hay equipo */}
        {(data.team || []).length === 0 && (
          <div style={{ gridColumn:'1/-1', padding:32, textAlign:'center', background:'var(--s2)', border:'1px dashed var(--border-m)', borderRadius:12, color:'var(--text-d)', fontSize:12 }}>
            No hay miembros del equipo. Haz clic en <strong>"+ Invitar miembro"</strong> para agregar el primero.
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div style={{ marginTop:18, padding:'12px 14px', background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, fontSize:11, color:'var(--text-d)', lineHeight:1.6 }}>
        <strong style={{ color:'var(--text-m)' }}>Cómo funciona:</strong> al invitar un miembro nuevo se envía un email a su correo con un link para crear su contraseña. El rol que asignes aquí define qué módulos puede ver desde el primer login.
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', zIndex:220, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ width:560, maxWidth:'96vw', background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:24, maxHeight:'90vh', overflowY:'auto' }}>

            <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>
              {editing ? 'Editar miembro' : 'Invitar nuevo miembro'}
            </div>
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:18 }}>
              {editing
                ? 'Actualiza nombre, rol y marcas asignadas.'
                : 'El miembro recibirá un email con un link para crear su contraseña y acceder a Feria OS.'}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

              <Field label="Nombre completo">
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Anthea García"
                  style={inputStyle}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="anthea@feriadesign.com"
                  disabled={!!editing}
                  style={{ ...inputStyle, opacity: editing ? 0.6 : 1 }}
                />
              </Field>

              <Field label="Cargo visible (opcional)">
                <input
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="Diseñadora Senior, Finanzas…"
                  style={inputStyle}
                />
              </Field>

              <Field label="Rol de acceso">
                <select
                  value={form.perms}
                  onChange={e => setForm(f => ({ ...f, perms: e.target.value }))}
                  style={inputStyle}>
                  {Object.entries(ROLE_PRESETS)
                    .filter(([id]) => id !== 'cliente' && id !== 'custom')
                    .map(([id, r]) => (
                      <option key={id} value={id}>{r.label} — {r.desc.slice(0, 40)}…</option>
                    ))}
                </select>
              </Field>

              {/* Descripción del rol seleccionado */}
              <div style={{ gridColumn:'1/-1', background:'var(--s3)', borderRadius:8, padding:'10px 12px', fontSize:11, color:'var(--text-m)', lineHeight:1.6 }}>
                <strong>{ROLE_PRESETS[form.perms]?.label}:</strong> {ROLE_PRESETS[form.perms]?.desc}
              </div>

              {/* Marcas */}
              <div style={{ gridColumn:'1/-1' }}>
                <SectionLabel style={{ marginBottom:8 }}>Marcas asignadas</SectionLabel>
                <div style={{ display:'flex', gap:8 }}>
                  {['feria', 'bl'].map(b => (
                    <button key={b} onClick={() => toggleBrand(b)}
                      style={{ ...chipStyle, borderColor: form.brands.includes(b) ? 'var(--gold)' : 'var(--border-s)', color: form.brands.includes(b) ? 'var(--gold)' : 'var(--text-m)' }}>
                      {b === 'bl' ? 'Brand & Legacy' : 'Feria Design'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div style={{ gridColumn:'1/-1' }}>
                <SectionLabel style={{ marginBottom:8 }}>Color de avatar</SectionLabel>
                <div style={{ display:'flex', gap:8 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width:28, height:28, borderRadius:'50%', background:c, border: form.color === c ? '2px solid var(--text)' : '2px solid transparent', cursor:'pointer' }} />
                  ))}
                </div>
              </div>

              {/* Toggle de invitación */}
              {!editing && (
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 12px', background: form.sendInvite ? 'rgba(37,211,102,0.06)' : 'var(--s3)', border:`1px solid ${form.sendInvite ? 'rgba(37,211,102,.25)' : 'var(--border-s)'}`, borderRadius:8, transition:'all .15s' }}>
                    <input
                      type="checkbox"
                      checked={form.sendInvite}
                      onChange={e => setForm(f => ({ ...f, sendInvite: e.target.checked }))}
                    />
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color: form.sendInvite ? '#25D366' : 'var(--text-m)' }}>
                        Enviar email de invitación
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-d)', marginTop:1 }}>
                        El miembro recibirá un link para crear su contraseña y acceder a Feria OS.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:22 }}>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="gold" onClick={save} disabled={inviting}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                  {inviting ? <LoaderCircle size={14} strokeWidth={1.8} /> : <MailPlus size={14} strokeWidth={1.8} />}
                  {inviting ? 'Enviando invitación...' : editing ? 'Guardar cambios' : 'Invitar miembro'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width:'100%', padding:'9px 12px',
  background:'var(--s3)', border:'1px solid var(--border-s)',
  borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit',
};

const chipStyle = {
  padding:'8px 12px', background:'var(--s3)',
  border:'1px solid var(--border-s)', borderRadius:999,
  cursor:'pointer', fontSize:11, fontFamily:'inherit',
};
