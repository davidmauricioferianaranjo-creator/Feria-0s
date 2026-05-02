import React from 'react';

const SCREENS = [
  { id: 'progreso',     icon: '◈', label: 'Mi progreso'    },
  { id: 'brief',        icon: 'Ψ', label: 'Brief'          },
  { id: 'reunion',      icon: '◎', label: 'Presentación'   },
  { id: 'aprobaciones', icon: '✦', label: 'Aprobaciones'   },
  { id: 'brandkit',     icon: '⊕', label: 'Brand Kit'      },
  { id: 'mensajes',     icon: '◌', label: 'Mensajes'       },
];

export default function ClientPortalProgress({ activeScreen, setActiveScreen, briefComplete, aprobacionesComplete, kitUnlocked, isDark }) {
  const text   = isDark ? '#EDE8DF' : '#1A1815';
  const textD  = isDark ? 'rgba(237,232,223,.35)' : 'rgba(26,24,21,.35)';
  const border = isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)';

  const isLocked = (id) => {
    if (id === 'aprobaciones') return !briefComplete;
    if (id === 'brandkit') return !aprobacionesComplete;
    return false;
  };

  const pct = Math.round(
    ([briefComplete, aprobacionesComplete, kitUnlocked].filter(Boolean).length / 3) * 100
  );

  return (
    <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${border}`, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Progress bar */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ fontSize: 10, color: textD, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Tu progreso</div>
        <div style={{ height: 4, background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#C9A96E', borderRadius: 2, transition: 'width .6s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#C9A96E', fontWeight: 500 }}>{pct}% completado</div>
      </div>

      {SCREENS.map(s => {
        const locked  = isLocked(s.id);
        const active  = activeScreen === s.id;
        return (
          <button key={s.id} onClick={() => !locked && setActiveScreen(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              background: active ? 'rgba(201,169,110,0.08)' : 'transparent',
              border: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
              borderLeft: active ? '2px solid #C9A96E' : '2px solid transparent',
              cursor: locked ? 'not-allowed' : 'pointer',
              opacity: locked ? 0.4 : 1,
              fontFamily: 'inherit', width: '100%', textAlign: 'left',
              transition: 'all .15s',
            }}>
            <span style={{ fontSize: 14, color: active ? '#C9A96E' : textD }}>{locked ? '🔒' : s.icon}</span>
            <span style={{ fontSize: 12, color: active ? '#C9A96E' : text, fontWeight: active ? 500 : 400 }}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
