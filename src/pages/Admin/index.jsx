import React, { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { Card, Button, SectionLabel, BrandPill } from '../../components/UI';
import AdminBriefs       from '../../features/admin/components/AdminBriefs';
import AdminEquipo       from '../../features/admin/components/AdminEquipo';
import AdminAjustes      from '../../features/admin/components/AdminAjustes';
import AdminPermisos     from '../../features/admin/components/AdminPermisos';
import AdminEntidades    from '../../features/admin/components/AdminEntidades';
import AdminIntegraciones from '../../features/admin/components/AdminIntegraciones';
import AdminMensajesAutomaticos from '../../features/admin/components/AdminMensajesAutomaticos';
import AdminAccesoClientes      from '../../features/admin/components/AdminAccesoClientes';

// ── DEFINICIÓN DE ROLES ───────────────────────────────────────────
/* eslint-disable no-unused-vars */
const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    color: 'var(--gold)',
    desc: 'Acceso total al sistema — finanzas, contratos, configuración y equipo.',
    modulos: ['Dashboard','CRM','Mensajes','Calendario','Proyectos','Contratos','Finanzas','Marketing','Post-venta','Inteligencia','Admin','Portal cliente'],
  },
  {
    id: 'crm',
    label: 'CRM',
    color: 'var(--teal)',
    desc: 'Control operativo completo; puede gestionar CRM, proyectos, contratos, cotizaciones, marketing y finanzas según flujo.',
    modulos: ['Dashboard','CRM','Mensajes','Calendario','Proyectos','Contratos','Cotizaciones','Finanzas','Marketing','Post-venta','Portal cliente'],
  },
  {
    id: 'creativo',
    label: 'Creativo',
    color: 'var(--pink)',
    desc: 'Solo ve el dashboard, calendario y sus proyectos asignados en el Kanban.',
    modulos: ['Dashboard','Calendario','Proyectos'],
  },
];

// ── PERMISSION MATRIX DATA ────────────────────────────────────────────────
const MATRIX_COLS = ['CRM', 'Proyectos', 'Finanzas', 'Brand Kit', 'Post-venta', 'Config'];
const MATRIX_ROLES = [
  { rol: 'Director',  color: 'var(--gold)',   vals: ['Total', 'Total', 'Total', 'Total', 'Total', 'Total'] },
  { rol: 'Estrategia',color: 'var(--teal)',   vals: ['Total', 'Lectura', 'Sin acceso', 'Lectura', 'Total', 'Sin acceso'] },
  { rol: 'Diseñador', color: 'var(--pink)',   vals: ['Lectura', 'Sus proyectos', 'Sin acceso', 'Sus proyectos', 'Sin acceso', 'Sin acceso'] },
  { rol: 'Cliente',   color: 'var(--green)',  vals: ['Sin acceso', 'Portal', 'Sin acceso', 'Brand Kit', 'Sin acceso', 'Sin acceso'] },
];

const VAL_COLOR = {
  'Total':         'var(--green)',
  'Lectura':       'var(--gold)',
  'Sus proyectos': 'var(--blue)',
  'Portal':        'var(--teal)',
  'Brand Kit':     'var(--teal)',
  'Sin acceso':    'var(--text-d)',
};

// ── NOTIFICATIONS CONFIG ───────────────────────────────────────────────────
const NOTIF_CONFIG = [
  { title: 'Nuevo lead registrado',      sub: 'Notificar a equipo comercial y dirección', on: true },
  { title: 'Cobro recibido',             sub: 'Notificar a dirección',          on: true },
  { title: 'Proyecto completado',        sub: 'Trigger de cobro 40%',          on: true },
  { title: 'Trigger T−1 día cliente',   sub: 'Enviar link de presentación',    on: true },
  { title: 'Meta mensual en riesgo',     sub: 'Alerta a dirección',             on: true },
  { title: 'Gasto vencido',             sub: 'Alerta urgente a dirección',       on: false },
  { title: 'Review pendiente +24h',      sub: 'Recordatorio al equipo comercial', on: true },
];

// ── TOGGLE COMPONENT ──────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 34, height: 18, borderRadius: 9, flexShrink: 0,
      background: on ? 'var(--gold)' : 'var(--s3)',
      position: 'relative', cursor: 'pointer', transition: 'background .2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </div>
  );
}

// ── MEMBER CARD ───────────────────────────────────────────────────────────
function MemberCard({ member, isOwner, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isOwner ? 'rgba(201,169,110,0.04)' : 'var(--s1)',
        border: `1px solid ${isOwner ? 'rgba(201,169,110,0.3)' : hover ? 'var(--border)' : 'var(--border-s)'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', width: 44, height: 44, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: member.bg, color: member.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, letterSpacing: '-0.02em', fontSize: 16,
        }}>
          {member.initials}
        </div>
        {isOwner && (
          <div style={{ position: 'absolute', top: -6, right: -4, fontSize: 12 }}>♛</div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--green)', border: '2px solid var(--s1)',
        }} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{member.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 8 }}>{member.role}</div>

      {/* Brands */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {member.brands.map(b => <BrandPill key={b} brand={b} />)}
      </div>

      {/* Permissions preview */}
      {Object.entries(member.perms).slice(0, 3).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', borderBottom: '1px solid var(--border-s)' }}>
          <span style={{ color: 'var(--text-d)' }}>{k}</span>
          <span style={{ fontWeight: 500, color: VAL_COLOR[v] || 'var(--text-m)' }}>{v}</span>
        </div>
      ))}

      <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 8 }}>
        {member.proyectos?.length || 0} proyectos activos
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
/* eslint-enable no-unused-vars */

export default function Admin() {
  const { data, showToast, studioLogo, setStudioLogo, accentColor, setAccentColor, theme, toggleTheme, demoMode, setDemoMode, loadDemoFlow, clearDemoFlow, addTeamMember, updateTeamMember, deleteTeamMember } = useApp();
  const [tab, setTab] = useState('equipo');

  // Local permission state — initialized from team data
  const [teamPerms, setTeamPerms] = useState(() =>
    (data.team || []).reduce((acc, m) => ({ ...acc, [m.id]: m.perms || 'creativo' }), {})
  );
  const [, setSavingId] = useState(null);

  // Save permission change to Supabase
  const changePerms = useCallback(async (memberId, memberEmail, newPerms, permissions) => {
    setSavingId(memberId);
    setTeamPerms(prev => ({ ...prev, [memberId]: newPerms }));
    await updateTeamMember(memberId, { perms: newPerms, permissions });

    if (isConfigured && memberEmail) {
      try {
        const { data: profileRows } = await supabase.from('profiles').select('id').eq('email', memberEmail).limit(1);
        if (profileRows?.[0]?.id) await supabase.from('profiles').update({ role: newPerms, permissions }).eq('id', profileRows[0].id);
        showToast('Permisos actualizados', '✓');
      } catch (err) {
        showToast('Permisos guardados en equipo. Revisa profiles si el usuario Auth ya existe.', '⚠');
      }
    } else {
      showToast('Permisos actualizados', '✓');
    }
    setSavingId(null);
  }, [showToast, updateTeamMember]);

  const tabs = [
    { id: 'equipo',       label: 'Equipo' },
    { id: 'permisos',     label: 'Permisos' },
    { id: 'marcas',       label: 'Sub-marcas' },
    { id: 'briefs',       label: 'Briefs' },
    { id: 'entidades',    label: 'Entidades legales' },
    { id: 'integraciones',label: 'Integraciones' },
    { id: 'mensajes_auto',   label: 'Plantillas de mensajes' },
    { id: 'acceso_clientes', label: 'Acceso clientes' },
    { id: 'ajustes',         label: 'Ajustes' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)' }}>
        <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18 }}>
          Administración <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>· Feria OS</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <Button variant="ghost" onClick={() => setDemoMode(!demoMode)}>{demoMode ? 'Volver a modo real' : 'Activar modo prueba'}</Button>
          <Button variant="ghost" onClick={loadDemoFlow}>Cargar demo</Button>
          <Button variant="danger" onClick={clearDemoFlow}>Limpiar demo</Button>
          <Button variant="gold" onClick={() => showToast('Configuración guardada', '✓')}>Guardar cambios</Button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', padding: '0 20px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 11, fontWeight: 500, padding: '10px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
            color: tab === t.id ? 'var(--gold)' : 'var(--text-d)',
            borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
            background: 'transparent', border: 'none', fontFamily: 'inherit', transition: 'color .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>

        {/* ══ EQUIPO ══ */}
        {tab === 'equipo' && (
          <AdminEquipo
            data={data}
            onAddMember={addTeamMember}
            onUpdateMember={updateTeamMember}
            onDeleteMember={deleteTeamMember}
            showToast={showToast}
          />
        )}
        {/* ══ PERMISOS ══ */}
        {tab === 'permisos' && (
          <AdminPermisos
            data={data}
            teamPerms={teamPerms}
            onChangePerms={changePerms}
            showToast={showToast}
          />
        )}

        {tab === 'marcas' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              {data.studio.brands.map(b => {
                const isBL = b.id === 'bl';
                const clientes = data.clientes.filter(c => c.brand === b.id);
                const proyectos = data.proyectos.filter(p => clientes.some(c => c.id === p.clienteId || p.cliente_id));
                const ingresos = data.cobros.filter(co => co.status === 'paid' && clientes.some(c => c.id === co.clienteId)).reduce((a, co) => a + co.monto, 0);
                const miembros = data.team.filter(t => t.brands.includes(b.id));
                return (
                  <Card key={b.id} style={{ borderTop: `3px solid ${b.color}`, paddingTop: 16 }}>
                    <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, color: b.color, marginBottom: 4 }}>
                      {isBL ? 'B&L' : 'F✦'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-d)', lineHeight: 1.5, marginBottom: 14 }}>
                      {isBL ? 'Branding premium para fotógrafos y videógrafos · LATAM · USA' : 'Branding estratégico para empresas · Ecuador · LATAM · USA · Europa'}
                    </div>
                    {[
                      { l: 'Clientes activos',   v: clientes.length },
                      { l: 'Proyectos en curso', v: proyectos.length },
                      { l: 'Ingresos mes',       v: `$${ingresos.toLocaleString()}` },
                    ].map(s => (
                      <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-s)' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-d)' }}>{s.l}</span>
                        <span style={{ fontSize: 11, fontWeight: 500 }}>{s.v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {miembros.map(m => (
                        <span key={m.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: m.bg, color: m.color }}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>

            <SectionLabel>Presencia en módulos</SectionLabel>
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {['CRM', 'Kanban', 'Finanzas', 'Portal cliente', 'Brand Kit', 'Post-venta'].map(m => (
                  <div key={m} style={{ background: 'var(--s2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>{m}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <BrandPill brand="feria" />
                      <BrandPill brand="bl" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ══ ENTIDADES ══ */}
        {/* ══ BRIEFS ══ */}
        {tab === 'briefs' && (
          <AdminBriefs showToast={showToast} />
        )}

        {tab === 'entidades' && (
          <AdminEntidades showToast={showToast} />
        )}

        {/* ══ INTEGRACIONES ══ */}
        {tab === 'integraciones' && (
          <AdminIntegraciones showToast={showToast} />
        )}

        {/* ══ AJUSTES ══ */}
        {tab === 'mensajes_auto' && (
          <AdminMensajesAutomaticos showToast={showToast} />
        )}

        {tab === 'acceso_clientes' && (
          <AdminAccesoClientes
            data={data}
            showToast={showToast}
          />
        )}

        {tab === 'ajustes' && (
          <AdminAjustes
            studioLogo={studioLogo}
            setStudioLogo={setStudioLogo}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            theme={theme}
            toggleTheme={toggleTheme}
            showToast={showToast}
          />
        )}

      </div>
    </div>
  );
}
