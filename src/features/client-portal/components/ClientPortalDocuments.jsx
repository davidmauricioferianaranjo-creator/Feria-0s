import React from 'react';

export default function ClientPortalDocuments({ cliente, proyecto, briefComplete, aprobacionesComplete, kitUnlocked, onDownloadContract, onDownloadQuote, onDownloadBrief, isDark, accentColor = '#E11D48' }) {
  const gold = accentColor || '#E11D48';
  const text = isDark ? '#EDE8DF' : '#1A1815';
  const textD = isDark ? 'rgba(237,232,223,.48)' : 'rgba(26,24,21,.48)';
  const s2 = isDark ? '#131210' : '#F7F4EF';
  const border = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';

  const docs = [
    { id:'contrato', icon:'✍️', title:'Contrato firmado', sub:'Contrato con firma de Feria Design Studio y firma electrónica del cliente.', status:'Disponible', enabled:true, action:onDownloadContract },
    { id:'cotizacion', icon:'📑', title:'Cotización aprobada', sub:'Resumen del servicio, paquete contratado, condiciones y forma de pago.', status:'Disponible', enabled:true, action:onDownloadQuote },
    { id:'brief', icon:'◉', title:'Brief del proyecto', sub:'Documento PDF con todas tus respuestas del brief.', status: briefComplete ? 'Disponible' : 'Pendiente', enabled:briefComplete, action:onDownloadBrief },
    { id:'brandkit', icon:'✦', title:'Brand Kit final', sub:'Archivos finales, identidad, manual y aplicaciones aprobadas.', status: kitUnlocked ? 'Disponible' : aprobacionesComplete ? 'Pendiente de pago final' : 'Pendiente de aprobación', enabled:kitUnlocked, action:null },
  ];

  return (
    <div style={{ padding:'28px 24px', maxWidth:680, margin:'0 auto' }}>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:text, marginBottom:6 }}>Documentos</div>
      <div style={{ fontSize:12, color:textD, lineHeight:1.6, marginBottom:22 }}>Aquí podrás descargar los documentos oficiales de tu proyecto: contrato, cotización, brief y entregables finales cuando estén aprobados.</div>
      <div style={{ display:'grid', gap:12 }}>
        {docs.map(doc => (
          <div key={doc.id} style={{ display:'flex', gap:14, alignItems:'center', background:s2, border:`1px solid ${doc.enabled ? border : 'rgba(255,255,255,.04)'}`, borderRadius:14, padding:'15px 16px', opacity: doc.enabled ? 1 : .55 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:doc.enabled ? `${gold}12` : 'rgba(128,128,128,.1)', color:doc.enabled ? gold : textD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{doc.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ fontSize:14, color:text, fontWeight:700 }}>{doc.title}</div>
                <span style={{ fontSize:10, color:doc.enabled ? gold : textD, border:`1px solid ${doc.enabled ? gold + '40' : border}`, borderRadius:20, padding:'2px 8px' }}>{doc.status}</span>
              </div>
              <div style={{ fontSize:11, color:textD, lineHeight:1.5, marginTop:3 }}>{doc.sub}</div>
            </div>
            <button disabled={!doc.enabled} onClick={doc.action || (() => {})} style={{ background:doc.enabled ? gold : 'transparent', color:doc.enabled ? '#fff' : textD, border:doc.enabled ? 'none' : `1px solid ${border}`, borderRadius:9, padding:'9px 14px', fontSize:11, fontWeight:700, cursor:doc.enabled ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>Descargar PDF</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop:18, background:isDark?'rgba(255,255,255,.03)':'rgba(0,0,0,.03)', border:`1px solid ${border}`, borderRadius:14, padding:16, fontSize:11, color:textD, lineHeight:1.6 }}>
        Proyecto: <strong style={{ color:text }}>{proyecto?.nombre || cliente?.servicio}</strong><br />Cliente: <strong style={{ color:text }}>{cliente?.nombre}</strong>
      </div>
    </div>
  );
}
