import React from 'react';

export default function ClientPortalHeader({ cliente, portalTheme, setPortalTheme, signOut }) {
  const isDark = portalTheme === 'dark';
  const bgH    = isDark ? '#131210' : '#EDE8DF';
  const border = isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)';
  const text   = isDark ? '#EDE8DF' : '#1A1815';
  const textD  = isDark ? 'rgba(237,232,223,.35)' : 'rgba(26,24,21,.35)';

  return (
    <div style={{ padding:'12px 24px', background:bgH, borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
      <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:16, color:'#C9A96E' }}>Feria <em>Design</em></div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:textD }}>Portal del cliente</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:`${cliente?.color || '#C9A96E'}22`, color:cliente?.color || '#C9A96E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>
            {(cliente?.nombre || '??').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:text }}>{cliente?.nombre}</div>
            <div style={{ fontSize:9, color:textD }}>{cliente?.servicio}</div>
          </div>
        </div>
        <button onClick={() => setPortalTheme(t => t === 'dark' ? 'light' : 'dark')}
          style={{ background:'transparent', border:`1px solid ${isDark?'rgba(255,255,255,.1)':'rgba(0,0,0,.1)'}`, color:textD, borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>
          {isDark ? '☀' : '☽'}
        </button>
        <button onClick={signOut} style={{ background:'transparent', border:`1px solid ${isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)'}`, color:textD, borderRadius:7, padding:'5px 12px', cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>
          Salir
        </button>
      </div>
    </div>
  );
}
