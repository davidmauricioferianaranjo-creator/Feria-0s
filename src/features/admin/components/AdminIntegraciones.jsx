import React from 'react';
import { Card, SectionLabel, Divider } from '../../../components/UI';

const INTEGRACIONES = [
  { icon:'$', name:'Stripe',        desc:'Cobros con tarjeta · USD',        color:'var(--blue)',   bg:'rgba(91,155,213,0.15)',   status:'connected', cfg:'2.9% + $0.30/tx' },
  { icon:'W', name:'Wise Business', desc:'Transferencias USD · EUR',         color:'var(--green)',  bg:'rgba(123,198,122,0.15)', status:'connected', cfg:'~1% comisión' },
  { icon:'T', name:'Tydical',       desc:'Agendamiento de reuniones',        color:'var(--purple)', bg:'rgba(167,139,250,0.15)', status:'connected', cfg:'Plan actual' },
  { icon:'G', name:'Google Drive',  desc:'Almacenamiento de archivos',       color:'var(--coral)',  bg:'rgba(232,131,106,0.15)', status:'connected', cfg:'Business Starter' },
  { icon:'Z', name:'Zoom / Jitsi',  desc:'Videollamadas · EL ORIGEN',        color:'var(--blue)',   bg:'rgba(91,155,213,0.15)',  status:'connected', cfg:'Plan actual' },
  { icon:'D', name:'DocuSign',      desc:'Firma digital avanzada · Europa',  color:'var(--gold)',   bg:'rgba(201,169,110,0.15)', status:'optional',  cfg:'Fase 3' },
];

const IntItem = ({ i, badge, badgeColor, badgeBg, onClick }) => (
  <div onClick={onClick}
    style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
    onMouseEnter={e => e.currentTarget.style.borderColor='var(--border)'}
    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-s)'}>
    <div style={{ width:36, height:36, borderRadius:9, background:i.bg, color:i.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{i.icon}</div>
    <div style={{ flex:1 }}>
      <div style={{ fontSize:12, fontWeight:500 }}>{i.name}</div>
      <div style={{ fontSize:10, color:'var(--text-d)' }}>{i.desc} · {i.cfg}</div>
    </div>
    <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:6, background:badgeBg, color:badgeColor, flexShrink:0 }}>{badge}</span>
  </div>
);

export default function AdminIntegraciones({ showToast }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      <div>
        <SectionLabel>Herramientas conectadas</SectionLabel>
        {INTEGRACIONES.filter(i => i.status === 'connected').map(i => (
          <IntItem key={i.name} i={i} badge="Conectado" badgeColor="var(--green)" badgeBg="rgba(123,198,122,0.15)" onClick={() => showToast(`Configurar ${i.name}`, '⚙')} />
        ))}
      </div>
      <div>
        <SectionLabel>Disponibles</SectionLabel>
        {INTEGRACIONES.filter(i => i.status === 'optional').map(i => (
          <IntItem key={i.name} i={i} badge={i.cfg} badgeColor="var(--gold)" badgeBg="rgba(201,169,110,0.15)" onClick={() => showToast(`Conectar ${i.name}`, '⊙')} />
        ))}
        <Divider />
        <SectionLabel>API Feria OS</SectionLabel>
        <Card>
          <div style={{ fontSize:12, fontWeight:500, marginBottom:6 }}>Acceso API para desarrolladores</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:10, lineHeight:1.5 }}>Cuando Feria OS sea SaaS, los estudios clientes podrán conectar sus propias herramientas vía API.</div>
          <div style={{ background:'var(--s2)', borderRadius:6, padding:'8px 10px', fontFamily:'monospace', fontSize:10, color:'var(--text-m)' }}>POST api.feriaos.com/v1/webhooks</div>
          <div style={{ marginTop:8 }}>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(138,128,112,0.15)', color:'var(--text-m)' }}>Fase 3 · SaaS</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
