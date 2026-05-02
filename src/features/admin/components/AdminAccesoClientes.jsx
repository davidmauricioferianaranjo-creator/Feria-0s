import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';
import { Badge, Button } from '../../../components/UI';

function generarPassword() {
  const palabras = ['Feria','Marca','Brand','Arte','Color','Forma','Luz','Vision'];
  const numeros  = Math.floor(100 + Math.random() * 900);
  const simbolos = ['!','@','#','$','*'][Math.floor(Math.random() * 5)];
  const palabra  = palabras[Math.floor(Math.random() * palabras.length)];
  return `${palabra}${numeros}${simbolos}`;
}

export default function AdminAccesoClientes({ data, showToast }) {
  const [clientes,   setClientes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [resetting,  setResetting]  = useState(null);
  const [busqueda,   setBusqueda]   = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [creando,    setCreando]    = useState(false);
  const [credencial, setCredencial] = useState(null);
  const [form, setForm] = useState({ nombre:'', email:'', password: generarPassword() });

  const loadClientes = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .eq('role', 'cliente')
        .order('created_at', { ascending: false });

      const enriched = (profiles || []).map(p => {
        const crm = (data?.clientes || []).find(c => c.email?.toLowerCase() === p.email?.toLowerCase());
        return { ...p, nombreCRM: crm?.nombre || p.name || p.email?.split('@')[0] || '—', proyectoCRM: crm?.proyecto || crm?.servicio || null, tieneProyecto: !!crm };
      });
      setClientes(enriched);
    } catch (err) { showToast('Error: ' + err.message, '⚠'); }
    finally { setLoading(false); }
  }, [data?.clientes, showToast]);

  useEffect(() => { loadClientes(); }, [loadClientes]);

  const handleCrearAcceso = async () => {
    if (!form.email.trim()) { showToast('Email obligatorio', '⚠'); return; }
    if (!form.password.trim()) { showToast('Contraseña obligatoria', '⚠'); return; }
    setCreando(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('create-client-access', {
        body: { email: form.email.trim().toLowerCase(), password: form.password.trim(), nombre: form.nombre.trim() || form.email.split('@')[0] },
      });
      if (error || !resp?.ok) {
        showToast(resp?.error || 'Despliega create-client-access para usar esta función', '⚠');
        setCreando(false); return;
      }
      setCredencial({ nombre: form.nombre.trim() || form.email.split('@')[0], email: form.email.trim().toLowerCase(), password: form.password.trim() });
      setShowForm(false);
      setForm({ nombre:'', email:'', password: generarPassword() });
      showToast('Acceso creado ✓', '✓');
      setTimeout(loadClientes, 1500);
    } catch (err) { showToast('Error: ' + err.message, '⚠'); }
    finally { setCreando(false); }
  };

  const handleReset = async (email) => {
    setResetting(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
      if (error) showToast('Error: ' + error.message, '⚠');
      else showToast(`Link enviado a ${email}`, '✉');
    } catch (err) { showToast(err.message, '⚠'); }
    finally { setResetting(null); }
  };

  const copiar = async (texto, label = 'Copiado') => {
    try { await navigator.clipboard.writeText(texto); showToast(label, '📋'); }
    catch { showToast(texto, '📋'); }
  };

  const enviarWA = (cred) => {
    const msg = `Hola ${cred.nombre} 👋\n\nTu acceso al portal de *Feria Design Studio* está listo:\n\n🔗 *URL:* ${window.location.origin}/login\n📧 *Email:* ${cred.email}\n🔑 *Contraseña:* ${cred.password}\n\nPuedes cambiar tu contraseña desde tu perfil después del primer ingreso.\n\n— Feria Design Studio`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const filtrados = clientes.filter(c => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return c.nombreCRM?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const iS = { width:'100%', padding:'9px 12px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' };
  const lS = { fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 };

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:500 }}>Accesos de clientes</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2 }}>Crea, consulta y gestiona las credenciales de acceso al portal.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={loadClientes} style={{ background:'transparent', border:'1px solid var(--border-s)', color:'var(--text-m)', borderRadius:8, padding:'7px 12px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>⟳ Actualizar</button>
          <Button variant="gold" onClick={() => { setForm({ nombre:'', email:'', password: generarPassword() }); setShowForm(true); }}>+ Crear acceso cliente</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        {[{ label:'Total accesos', value: clientes.length, color:'var(--text)' }, { label:'Con proyecto CRM', value: clientes.filter(c=>c.tieneProyecto).length, color:'var(--gold)' }, { label:'Sin proyecto CRM', value: clientes.filter(c=>!c.tieneProyecto).length, color:'var(--text-d)' }].map(s => (
          <div key={s.label} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:22, fontWeight:300, fontFamily:'var(--font-serif)', color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-d)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o email…"
        style={{ width:'100%', padding:'9px 12px', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit', marginBottom:12 }} />

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:'center', color:'var(--text-d)', fontSize:12, padding:32 }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign:'center', color:'var(--text-d)', fontSize:12, padding:32 }}>{busqueda ? 'Sin resultados.' : 'No hay clientes con acceso al portal todavía.'}</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtrados.map(c => (
            <div key={c.id} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(201,169,110,.12)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                {(c.nombreCRM||'?').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombreCRM}</div>
                <div style={{ fontSize:11, color:'var(--text-d)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</div>
                {c.proyectoCRM && <div style={{ fontSize:10, color:'var(--teal)', marginTop:2 }}>{c.proyectoCRM}</div>}
              </div>
              <div style={{ fontSize:10, color:'var(--text-d)', flexShrink:0, textAlign:'right' }}>
                <div>Creado</div>
                <div>{c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—'}</div>
              </div>
              <div style={{ flexShrink:0 }}>{c.tieneProyecto ? <Badge color="teal">En CRM</Badge> : <Badge color="gray">Sin CRM</Badge>}</div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={() => copiar(c.email,'Email copiado')} title="Copiar email"
                  style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--text-d)', cursor:'pointer', fontFamily:'inherit' }}>📋</button>
                <button onClick={() => handleReset(c.email)} disabled={resetting===c.email}
                  style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--text-d)', cursor:'pointer', fontFamily:'inherit', opacity:resetting===c.email?0.6:1 }}>
                  {resetting===c.email?'⏳':'🔑 Reset'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear acceso */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:220, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div style={{ width:480, background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:24 }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Crear acceso a portal cliente</div>
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:20 }}>Define las credenciales y envíalas por WhatsApp al instante.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div><div style={lS}>Nombre del cliente</div>
                <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Eduardo Cruz" style={iS} /></div>
              <div><div style={lS}>Email *</div>
                <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="eduardo@empresa.com" style={iS} /></div>
              <div>
                <div style={{ ...lS, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>Contraseña temporal *</span>
                  <button onClick={()=>setForm(f=>({...f,password:generarPassword()}))}
                    style={{ background:'transparent', border:'none', color:'var(--gold)', fontSize:11, cursor:'pointer', fontFamily:'inherit', padding:0 }}>↻ Generar nueva</button>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    style={{ ...iS, flex:1, fontFamily:'monospace', letterSpacing:'0.08em', fontSize:15, fontWeight:700, color:'var(--gold)' }} />
                  <button onClick={()=>copiar(form.password,'Contraseña copiada')}
                    style={{ background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'0 14px', fontSize:14, cursor:'pointer', color:'var(--text-m)' }}>📋</button>
                </div>
                <div style={{ fontSize:10, color:'var(--text-d)', marginTop:6 }}>El cliente puede cambiarla desde su perfil.</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
              <Button variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Button>
              <Button variant="gold" onClick={handleCrearAcceso} disabled={creando}>{creando?'Creando…':'✓ Crear acceso'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Credenciales listas */}
      {credencial && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:230, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ width:460, background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28 }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:600 }}>Acceso creado para {credencial.nombre}</div>
              <div style={{ fontSize:11, color:'var(--text-d)', marginTop:4 }}>Comparte estas credenciales con el cliente</div>
            </div>
            <div style={{ background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:10, padding:16, marginBottom:16 }}>
              {[{label:'URL de acceso',value:`${window.location.origin}/login`,mono:false},{label:'Email',value:credencial.email,mono:false},{label:'Contraseña',value:credencial.password,mono:true}].map(row=>(
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border-s)' }}>
                  <div>
                    <div style={{ fontSize:10, color:'var(--text-d)' }}>{row.label}</div>
                    <div style={{ fontSize:row.mono?16:12, fontFamily:row.mono?'monospace':'inherit', fontWeight:row.mono?700:400, letterSpacing:row.mono?'0.1em':0, color:row.mono?'var(--gold)':'var(--text)', marginTop:2 }}>{row.value}</div>
                  </div>
                  <button onClick={()=>copiar(row.value,`${row.label} copiado`)}
                    style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', color:'var(--text-d)', fontFamily:'inherit', marginLeft:10, flexShrink:0 }}>📋</button>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={()=>enviarWA(credencial)}
                style={{ background:'#25D366', color:'#fff', border:'none', borderRadius:8, padding:'13px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                💬 Enviar credenciales por WhatsApp
              </button>
              <button onClick={()=>copiar(`URL: ${window.location.origin}/login\nEmail: ${credencial.email}\nContraseña: ${credencial.password}`,'Credenciales copiadas')}
                style={{ background:'var(--s3)', color:'var(--text-m)', border:'1px solid var(--border-s)', borderRadius:8, padding:'10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                📋 Copiar todo
              </button>
              <button onClick={()=>setCredencial(null)}
                style={{ background:'transparent', color:'var(--text-d)', border:'none', fontSize:11, cursor:'pointer', fontFamily:'inherit', paddingTop:4 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
