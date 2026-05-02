import React from 'react';
import { Card, SectionLabel } from '../../../components/UI';

const ENTIDADES = [
  { flag:'EC', name:'Feria Design EC',  type:'Persona Natural · Ecuador', status:'main', statusLabel:'Principal activa', details:[{l:'RUC',v:'1714...'},{l:'Moneda',v:'USD'},{l:'Mercado',v:'Ecuador · LATAM'}] },
  { flag:'US', name:'Feria Design LLC', type:'LLC · Delaware, USA',        status:'active', statusLabel:'Activa USA',       details:[{l:'EIN',v:'Pendiente'},{l:'Moneda',v:'USD'},{l:'Mercado',v:'USA · Internacional'}] },
];

export default function AdminEntidades({ showToast }) {
  return (
    <>
      <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:16, lineHeight:1.6 }}>
        Cada contrato y factura se emite desde la entidad legal correcta segun el mercado del cliente. El sistema la selecciona automaticamente.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap:10, marginBottom:16 }}>
        {ENTIDADES.map(e => {
          const isMain = e.status === 'main';
          return (
            <Card key={e.name} highlight={isMain} onClick={() => showToast(`${e.name} - configurar entidad`, 'ok')}>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:'.04em', marginBottom:8, color:isMain?'var(--gold)':'var(--blue)' }}>{e.flag}</div>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{e.name}</div>
              <div style={{ fontSize:10, color:'var(--text-d)', marginBottom:10 }}>{e.type}</div>
              {e.details.map(d => (
                <div key={d.l} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'5px 0', borderBottom:'1px solid var(--border-s)' }}>
                  <span style={{ fontSize:10, color:'var(--text-d)' }}>{d.l}</span>
                  <span style={{ fontSize:10, fontWeight:500, textAlign:'right' }}>{d.v}</span>
                </div>
              ))}
              <div style={{ marginTop:10 }}>
                <span style={{ fontSize:10, fontWeight:500, padding:'2px 9px', borderRadius:8, background:isMain?'rgba(201,169,110,0.15)':'rgba(123,198,122,0.15)', color:isMain?'var(--gold)':'var(--green)' }}>
                  {e.statusLabel}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap:14 }}>
        <div>
          <SectionLabel>Asignacion automatica</SectionLabel>
          <Card>
            {[{mercado:'Ecuador · LATAM',entidad:'Feria Design EC',color:'var(--gold)'},{mercado:'USA · internacional',entidad:'Feria Design LLC',color:'var(--blue)'}].map(r => (
              <div key={r.mercado} style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border-s)' }}>
                <span style={{ fontSize:11 }}>{r.mercado}</span>
                <div style={{ fontSize:11, fontWeight:500, color:r.color, textAlign:'right' }}>{r.entidad}</div>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <SectionLabel>Facturacion este mes</SectionLabel>
          <Card>
            {[{ent:'Feria EC',ingresos:'$4,420',facturas:6,color:'var(--gold)'},{ent:'Feria LLC',ingresos:'$3,980',facturas:4,color:'var(--blue)'}].map(e => (
              <div key={e.ent} style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border-s)' }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:e.color }}>{e.ent}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)' }}>{e.facturas} facturas</div>
                </div>
                <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:16 }}>{e.ingresos}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
