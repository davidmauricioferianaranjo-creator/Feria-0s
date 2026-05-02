import React, { useRef, useState } from 'react';
import { SectionLabel, Button } from '../../../components/UI';

export default function AdminAjustes({ studioLogo, setStudioLogo, accentColor, setAccentColor, theme, toggleTheme, showToast }) {
  const fileRef = useRef();
  const [customColor, setCustomColor] = useState(accentColor || '#C9A96E');

  const applyAccent = (value, name = 'Personalizado') => {
    setAccentColor(value);
    setCustomColor(value);
    showToast(`Color guardado: ${name}`, '◉');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen (PNG, SVG, JPG)', '⚠'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setStudioLogo(ev.target.result); showToast('Logo actualizado', '✦'); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {/* Logo */}
      <div>
        <SectionLabel>Logo del estudio</SectionLabel>
        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
            <div style={{ width:80, height:48, borderRadius:8, background:'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'1px solid var(--border-s)' }}>
              {studioLogo
                ? <img src={studioLogo} alt="logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                : <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:14, color:'var(--gold)' }}>Feria</div>
              }
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>Logotipo del estudio</div>
              <div style={{ fontSize:10, color:'var(--text-d)' }}>PNG, SVG o JPG · Recomendado 240×80px</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
          <div style={{ display:'flex', gap:8 }}>
            <Button variant="gold" size="sm" onClick={() => fileRef.current?.click()}>↑ Subir logo</Button>
            {studioLogo && <Button variant="ghost" size="sm" onClick={() => { setStudioLogo(null); showToast('Logo restablecido', '✦'); }}>Restablecer</Button>}
          </div>
        </div>
      </div>

      {/* Color */}
      <div>
        <SectionLabel>Color principal</SectionLabel>
        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:14, lineHeight:1.5 }}>
            Define el color corporativo de la plataforma con un selector personalizado. Esta versión retira la paleta preestablecida para evitar confusión y trabajar con un color real del estudio.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'72px 1fr auto', gap:10, alignItems:'center' }}>
            <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
              style={{ width:72, height:44, padding:0, border:'1px solid var(--border-s)', borderRadius:10, background:'transparent', cursor:'pointer' }} />
            <input value={customColor} onChange={e => setCustomColor(e.target.value)} placeholder="#C9A96E"
              style={{ width:'100%', padding:'11px 12px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:10, color:'var(--text)', fontSize:12, fontFamily:'inherit' }} />
            <Button variant="gold" size="sm" onClick={() => applyAccent(customColor, 'Personalizado')}>Guardar color</Button>
          </div>
          <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:accentColor, border:'1px solid var(--border)' }} />
            <div style={{ fontSize:10, color:'var(--text-d)' }}>Color actual: <span style={{ color:'var(--text-m)', fontWeight:500 }}>{accentColor}</span></div>
          </div>
        </div>
      </div>

      {/* Apariencia */}
      <div style={{ gridColumn:'1 / -1' }}>
        <SectionLabel>Apariencia</SectionLabel>
        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:14, lineHeight:1.5 }}>
            Cambia la interfaz entre modo oscuro y modo claro según el contexto de trabajo.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button
              onClick={() => { toggleTheme?.('dark'); showToast('Modo oscuro activado', '◐'); }}
              style={{ background: theme === 'dark' ? 'var(--s3)' : 'transparent', border:`1px solid ${theme === 'dark' ? 'var(--gold)' : 'var(--border-s)'}`, borderRadius:10, padding:'14px 12px', cursor:'pointer', color:'var(--text)', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
            >
              <div style={{ fontSize:18, marginBottom:8 }}>🌙</div>
              <div style={{ fontSize:12, fontWeight:600 }}>Oscuro</div>
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:3 }}>Premium, profundo y concentrado</div>
            </button>
            <button
              onClick={() => { toggleTheme?.('light'); showToast('Modo claro activado', '☀'); }}
              style={{ background: theme === 'light' ? 'var(--s3)' : 'transparent', border:`1px solid ${theme === 'light' ? 'var(--gold)' : 'var(--border-s)'}`, borderRadius:10, padding:'14px 12px', cursor:'pointer', color:'var(--text)', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
            >
              <div style={{ fontSize:18, marginBottom:8 }}>☀️</div>
              <div style={{ fontSize:12, fontWeight:600 }}>Claro</div>
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:3 }}>Limpio, editorial y luminoso</div>
            </button>
          </div>
          <div style={{ marginTop:12, fontSize:10, color:'var(--text-d)' }}>
            Tema actual: <span style={{ color:'var(--gold)', fontWeight:500 }}>{theme === 'light' ? 'Claro' : 'Oscuro'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
