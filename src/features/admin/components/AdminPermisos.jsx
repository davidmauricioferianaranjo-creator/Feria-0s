import React from 'react';
import { Card, SectionLabel, Button, Badge } from '../../../components/UI';
import { ROLE_PRESETS, MODULES, normalizePermissions } from '../../../lib/permissions';

const ROLE_IDS = ['admin', 'crm', 'creativo', 'finanzas', 'custom', 'cliente'];
const STAFF_MODULES = MODULES;

export default function AdminPermisos({ data, teamPerms, onChangePerms, showToast }) {
  const [customByMember, setCustomByMember] = React.useState(() =>
    (data.team || []).reduce((acc, m) => ({ ...acc, [m.id]: normalizePermissions(m.perms, m.permissions).modules }), {})
  );

  const updateRole = (member, role) => {
    const presetModules = ROLE_PRESETS[role]?.modules || [];
    const modules = role === 'custom' ? (customByMember[member.id] || []) : presetModules;
    setCustomByMember(prev => ({ ...prev, [member.id]: modules }));
    onChangePerms(member.id, member.email, role, { modules, brands: member.brands || ['feria', 'bl'] });
  };

  const toggleModule = (member, moduleId) => {
    const current = customByMember[member.id] || [];
    const next = current.includes(moduleId) ? current.filter(id => id !== moduleId) : [...current, moduleId];
    setCustomByMember(prev => ({ ...prev, [member.id]: next }));
    onChangePerms(member.id, member.email, 'custom', { modules: next, brands: member.brands || ['feria', 'bl'] });
  };

  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 20, lineHeight: 1.6 }}>
        Admin conserva control total. CRM tiene control operativo amplio. Para diseñadores, finanzas u otros perfiles, usa <strong style={{ color:'var(--text-m)' }}>Personalizado</strong> y marca solo los módulos que deben ver.
      </div>

      <SectionLabel>Roles y acceso por miembro</SectionLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:22 }}>
        {(data.team || []).map((member) => {
          const currentRole = teamPerms[member.id] || member.perms || 'creativo';
          const isCustom = currentRole === 'custom';
          const modules = isCustom ? (customByMember[member.id] || []) : (ROLE_PRESETS[currentRole]?.modules || []);
          return (
            <Card key={member.id} style={{ padding:0, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border-s)' }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:(member.bg || `${member.color || '#5B9BD5'}22`), color:member.color || 'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{member.initials}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{member.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-d)' }}>{member.email || 'sin email'} · {member.role || 'Colaborador'}</div>
                </div>
                <select value={currentRole} onChange={e => updateRole(member, e.target.value)} style={inputStyle}>
                  {ROLE_IDS.map(id => <option key={id} value={id}>{ROLE_PRESETS[id].label}</option>)}
                </select>
              </div>

              <div style={{ padding:'14px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:11, color:'var(--text-d)' }}>{ROLE_PRESETS[currentRole]?.desc}</div>
                  <Badge color={isCustom ? 'purple' : currentRole === 'admin' ? 'gold' : currentRole === 'crm' ? 'teal' : 'gray'}>{modules.length} módulos</Badge>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:8 }}>
                  {STAFF_MODULES.map(mod => {
                    const active = modules.includes(mod.id);
                    return (
                      <button key={mod.id} disabled={currentRole === 'admin'} onClick={() => toggleModule(member, mod.id)} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
                        padding:'9px 10px', borderRadius:8, border:`1px solid ${active ? 'var(--gold)' : 'var(--border-s)'}`,
                        background: active ? 'var(--gold-faint)' : 'var(--s3)', color: active ? 'var(--gold)' : 'var(--text-m)',
                        cursor: currentRole === 'admin' ? 'not-allowed' : 'pointer', fontSize:11, fontFamily:'inherit', opacity: currentRole === 'admin' ? .72 : 1,
                      }}>
                        <span>{mod.label}</span><span>{active ? '✓' : '—'}</span>
                      </button>
                    );
                  })}
                </div>
                {currentRole !== 'custom' && currentRole !== 'admin' && (
                  <div style={{ marginTop:10, fontSize:10, color:'var(--text-d)' }}>Para editar módulo por módulo, cambia el rol a Personalizado.</div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <SectionLabel>Matriz de referencia</SectionLabel>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead>
            <tr>
              <th style={th}>Rol</th>
              <th style={th}>Uso recomendado</th>
              <th style={th}>Módulos incluidos</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_IDS.map((id, i) => {
              const role = ROLE_PRESETS[id];
              return (
                <tr key={id} style={{ background: i % 2 === 0 ? 'var(--s2)' : 'var(--s1)' }}>
                  <td style={td}><strong>{role.label}</strong></td>
                  <td style={{ ...td, color:'var(--text-d)' }}>{role.desc}</td>
                  <td style={td}>{role.modules.length ? role.modules.join(', ') : 'Definido por admin'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:14 }}>
        <Button variant="ghost" onClick={() => showToast('La matriz está alineada con el menú y el bloqueo de rutas', '✓')}>Verificar matriz</Button>
      </div>
    </>
  );
}

const inputStyle = { background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 10px', fontSize:11, color:'var(--text)', fontFamily:'inherit' };
const th = { fontSize:10, color:'var(--text-d)', textAlign:'left', padding:'8px 12px', fontWeight:500 };
const td = { padding:'10px 12px', fontSize:11, borderTop:'1px solid var(--border-s)' };
