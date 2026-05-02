import React, { useState } from 'react';

// ── CONSTANTES ────────────────────────────────────────────────────
const GASTO_CATS   = ['Software / Suscripciones','Publicidad / Ads','Equipo / Hardware','Servicios profesionales','Nómina / Freelancers','Oficina / Espacios','Impuestos / Contabilidad','Formación / Cursos','Marketing','Otros'];
const GASTO_ESTADOS = ['pagado','pendiente','recurrente'];
const METODOS_PAGO  = ['Stripe','Transferencia'];

// ── MODAL NUEVO COBRO ─────────────────────────────────────────────
export function ModalNuevoCobro({ data, addCobro, showToast, onClose }) {
  const [form, setForm] = useState({
    nombre: '', clienteId: '', tipo: 'Anticipo 60%', monto: '',
    vence: '', via: 'Stripe', status: 'pending',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre || !form.monto) { showToast('Nombre y monto son obligatorios', '⚠'); return; }
    await addCobro({ ...form, monto: parseFloat(form.monto), created_at: new Date().toISOString() });
    showToast('Cobro registrado correctamente', '✦');
    onClose();
  };

  const labelStyle = { fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 };
  const inputStyle = { width:'100%', padding:'9px 13px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:500, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--gold)', marginBottom:4 }}>Nuevo cobro</div>
        <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:22 }}>Registra un cobro pendiente o realizado</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Descripción</div>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Anticipo 60% · ARKES" style={inputStyle} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Cliente</div>
            <select value={form.clienteId} onChange={e => set('clienteId', e.target.value)} style={inputStyle}>
              <option value="">— Sin asociar —</option>
              {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Tipo de cobro</div>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
              {['Anticipo 60%','Saldo 40%','Pago completo','Mantenimiento','Otro'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Estado</div>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>Monto (USD)</div>
            <input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Fecha de vencimiento</div>
            <input type="date" value={form.vence} onChange={e => set('vence', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Método de pago</div>
            <div style={{ display:'flex', gap:8 }}>
              {['Stripe','Transferencia'].map(m => (
                <button key={m} onClick={() => set('via', m)}
                  style={{ flex:1, padding:'10px 12px', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight: form.via === m ? 600 : 400, transition:'all .15s',
                    background: form.via === m ? (m === 'Stripe' ? 'rgba(99,91,255,.12)' : 'rgba(201,169,110,.1)') : 'var(--s3)',
                    border: `1px solid ${form.via === m ? (m === 'Stripe' ? 'rgba(99,91,255,.4)' : 'var(--gold)') : 'var(--border-s)'}`,
                    color: form.via === m ? (m === 'Stripe' ? '#7C73FF' : 'var(--gold)') : 'var(--text-m)' }}>
                  {m === 'Stripe' ? '💳 Stripe' : '🏦 Transferencia'}
                </button>
              ))}
            </div>
            {form.via === 'Transferencia' && (
              <div style={{ marginTop:10, background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:11, fontWeight:600, marginBottom:8, color:'var(--text-m)' }}>Datos para la transferencia</div>
                {[['Banco','Banco Pichincha'],['Tipo','Cuenta de ahorros'],['Número','2201062504'],['Titular','David Mauricio Feria Naranjo']].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border-s)', fontSize:11 }}>
                    <span style={{ color:'var(--text-d)' }}>{l}</span>
                    <span style={{ fontWeight:600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize:10, color:'var(--text-d)', marginTop:8, lineHeight:1.6 }}>
                  ⚠ Algunas entidades bancarias pueden demorar hasta 48h. El estudio confirmará el depósito.
                </div>
              </div>
            )}
            {form.via === 'Stripe' && (
              <div style={{ marginTop:8, fontSize:10, color:'var(--text-d)', lineHeight:1.5 }}>
                Se generará un link de pago seguro. El cliente paga con tarjeta y recibe la factura automáticamente.
              </div>
            )}
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
          <button onClick={handleSave} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Registrar cobro</button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL NUEVO GASTO ─────────────────────────────────────────────
export function ModalNuevoGasto({ data, addGasto, showToast, onClose }) {
  const [form, setForm] = useState({
    nombre: '', cat: 'Software / Suscripciones', fecha: new Date().toISOString().slice(0,10),
    monto: '', via: 'Tarjeta de crédito', responsable: '', clienteId: '', status: 'pendiente',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre || !form.monto) { showToast('Descripción y monto son obligatorios', '⚠'); return; }
    await addGasto({ ...form, monto: parseFloat(form.monto), id: Date.now().toString(), created_at: new Date().toISOString() });
    showToast('Gasto registrado', '✦');
    onClose();
  };

  const labelStyle = { fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 };
  const inputStyle = { width:'100%', padding:'9px 13px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:500, maxWidth:'92vw', maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--gold)', marginBottom:4 }}>Nuevo gasto</div>
        <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:22 }}>Registra un gasto del estudio</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Descripción del gasto</div>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Adobe CC, Hostinger, Canva Pro…" style={inputStyle} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Categoría</div>
            <select value={form.cat} onChange={e => set('cat', e.target.value)} style={inputStyle}>
              {GASTO_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Estado</div>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              {GASTO_ESTADOS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Monto (USD)</div>
            <input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Fecha</div>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Método de pago</div>
            <select value={form.via} onChange={e => set('via', e.target.value)} style={inputStyle}>
              {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Responsable</div>
            <select value={form.responsable} onChange={e => set('responsable', e.target.value)} style={inputStyle}>
              <option value="">— Opcional —</option>
              {data.team.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Cliente relacionado</div>
            <select value={form.clienteId} onChange={e => set('clienteId', e.target.value)} style={inputStyle}>
              <option value="">— Sin asociar —</option>
              {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
          <button onClick={handleSave} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Registrar gasto</button>
        </div>
      </div>
    </div>
  );
}
