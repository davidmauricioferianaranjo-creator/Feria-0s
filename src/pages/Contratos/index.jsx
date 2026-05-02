import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, Badge, Button, SectionLabel, BrandPill } from '../../components/UI';
import { Plus } from 'lucide-react';

function pdfEscape(str) {
  return String(str ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0020-\u007E]/g, (char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 ? char : '';
    });
}

function wrapPdfLine(line, maxChars = 92) {
  const clean = pdfEscape(line);
  if (!clean.trim()) return [''];
  const words = clean.split(/\s+/);
  const out = [];
  let current = '';
  words.forEach(word => {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) out.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  });
  if (current) out.push(current);
  return out;
}

function toPdfString(str) {
  return `(${pdfEscape(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

function downloadContrato(cliente, contrato, suffix = 'contrato') {
  const safeName = (cliente?.nombre || 'cliente').toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
  const filename = `${suffix}-${safeName || 'cliente'}.pdf`;
  const rawLines = [
    'CONTRATO DE SERVICIOS - FERIA DESIGN STUDIO',
    `Cliente: ${cliente?.nombre || 'Cliente'}`,
    `Fecha de descarga: ${new Date().toLocaleDateString('es-ES')}`,
    '',
    ...(String(contrato || '').split('\n')),
    '',
    'FIRMA DEL ESTUDIO',
    'David Mauricio Feria Naranjo - CEO Fundador · Feria Design Studio',
    '',
    'FIRMA ELECTRONICA DEL CLIENTE',
    cliente?.client_signature_name || cliente?.firmante || cliente?.nombre || 'Cliente',
    cliente?.fecha_firma ? 'Fecha de firma: ' + new Date(cliente.fecha_firma).toLocaleString('es-ES') : 'Fecha de firma: registrada en Feria OS',
    cliente?.hash_firma ? 'Hash SHA-256: ' + cliente.hash_firma : '',
  ];
  const lines = [];
  rawLines.forEach(line => lines.push(...wrapPdfLine(line)));
  const objects = [];
  const pages = [];
  const pageWidth = 595.28, pageHeight = 841.89, marginX = 48, startY = 790, lineH = 14, maxLines = 52;
  for (let i = 0; i < lines.length; i += maxLines) pages.push(lines.slice(i, i + maxLines));
  if (!pages.length) pages.push(['']);
  const fontObjId = 3 + pages.length * 2;
  pages.forEach((pageLines, pageIndex) => {
    const content = ['BT', `/F1 ${pageIndex === 0 ? 11 : 10} Tf`, '1 0 0 1 0 0 Tm', '0 g'];
    pageLines.forEach((line, idx) => {
      const y = startY - idx * lineH;
      if (pageIndex === 0 && idx === 0) content.push('/F1 14 Tf');
      if (pageIndex === 0 && idx === 1) content.push('/F1 10.5 Tf');
      content.push(`1 0 0 1 ${marginX} ${y} Tm ${toPdfString(line)} Tj`);
    });
    content.push('ET');
    const stream = content.join('\n');
    const contentId = 3 + pageIndex * 2;
    const pageId = contentId + 1;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });
  const pageRefs = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`;
  objects[fontObjId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  const maxObj = fontObjId;
  for (let i = 1; i <= maxObj; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxObj; i++) pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob = new Blob([pdf], { type:'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// ── TIPOS DE EMPRESA / INDUSTRIA ──────────────────────────────────
const INDUSTRIAS = [
  'Arquitectura y diseño de interiores','Clínica y salud','Restaurante y gastronomía',
  'Bar, cafetería o discoteca','Moda y retail','Consultoría y coaching',
  'Educación e instituciones','Fotografía y video','Tecnología y startups',
  'Bienes raíces e inmobiliaria','Deporte y bienestar','Arte y cultura',
  'Legal y servicios jurídicos','Finanzas y contabilidad','Turismo y hospitalidad',
  'Industria y manufactura','Otro',
];

const PAQUETES_ENTREGABLES = {
  'Brand Identity': `Fase de Análisis: análisis de información recibida, estudio cromático, tipográfico y morfológico.
Fase de Diseño: diseño de ícono, diseño de tipografía (logotipo), selección tipográfica secundaria y gráfica complementaria.
Manual de Marca: sustento de marca, estructura tipográfica, características de la forma, factor x y proporciones, variaciones, tipografías complementarias, colores corporativos, usos correctos e incorrectos, fondos permitidos, tamaños mínimos, sistema visual completo, combinaciones de color y cinco (5) aplicativos.`,
  'Brand & Legacy': `Identidad visual completa para fotógrafos y videógrafos: logotipo, sistema visual, paleta cromática, manual de marca y Brand Kit Portal digital personalizado con galería y descarga de assets.`,
  'Brand Starter': `Identidad visual esencial: logotipo, paleta de 3 colores, tipografías primaria y secundaria, y guía de uso básica en formato digital.`,
  'Dirección de Arte': `Dirección de arte y estrategia creativa: análisis conceptual, definición del concepto creativo, lineamientos de storytelling, construcción de Concept Board y guía creativa para el equipo de producción.`,
  'Naming': `Brief de naming, análisis y desarrollo de 5 propuestas, búsqueda fonética de 3 nombres seleccionados, análisis SENADI y entrega de informe final con elección del nombre.`,
};

// ── GENERADOR DEL CONTRATO REAL ────────────────────────────────────
function emptyContractClient(brand = 'feria') {
  return {
    nombre: '',
    cedula: '',
    razonSocial: '',
    razon_social: '',
    ruc: '',
    empresa: '',
    responsableLegal: '',
    email: '',
    telefono: '',
    whatsapp: '',
    direccionFacturacion: '',
    direccion_facturacion: '',
    pais: 'Ecuador',
    metodoPago: 'transferencia',
    metodo_pago: 'transferencia',
    giro: '',
    tipoEmpresa: '',
    servicio: 'Brand Identity',
    monto: 0,
    ciudad: 'Riobamba',
    stage: 1,
    brand,
    color: brand === 'bl' ? '#D4537E' : '#5B9BD5',
  };
}

function camposToCliente(campos, base = {}, brand = 'feria') {
  const monto = Number(campos.monto || 0);
  const normalizedBrand = base.brand || brand || 'feria';
  return {
    ...base,
    nombre: campos.nombre || base.nombre || 'Cliente sin nombre',
    cedula: campos.cedula || '',
    empresa: campos.empresa || '',
    responsableLegal: campos.responsableLegal || '',
    email: campos.email || '',
    telefono: campos.telefono || '',
    whatsapp: campos.whatsapp || campos.telefono || '',
    razonSocial: campos.razonSocial || '',
    razon_social: campos.razonSocial || '',
    ruc: campos.ruc || '',
    direccionFacturacion: campos.direccionFacturacion || '',
    direccion_facturacion: campos.direccionFacturacion || '',
    pais: campos.pais || 'Ecuador',
    metodoPago: campos.metodoPago || 'transferencia',
    metodo_pago: campos.metodoPago || 'transferencia',
    giro: campos.giro || '',
    tipoEmpresa: campos.tipoEmpresa || '',
    tipo: campos.tipoEmpresa || campos.empresa || base.tipo || '',
    servicio: campos.paquete || 'Brand Identity',
    monto,
    ciudad: campos.ciudad || 'Riobamba',
    stage: Math.max(Number(base.stage || 1), 1),
    brand: normalizedBrand,
    color: base.color || (normalizedBrand === 'bl' ? '#D4537E' : '#5B9BD5'),
    master_data_completed: Boolean(
      campos.nombre &&
      campos.email &&
      (campos.telefono || campos.whatsapp) &&
      (campos.cedula || campos.ruc) &&
      campos.direccionFacturacion &&
      campos.pais
    ),
    master_data_source: 'contrato',
    updated_at: new Date().toISOString(),
  };
}

function generarContrato(campos, data) {
  const {
    nombre = '_______________', cedula = '_______________',
    empresa = '', responsableLegal = '', email = '',
    telefono = '', whatsapp = '', razonSocial = '', ruc = '',
    direccionFacturacion = '', pais = '', metodoPago = 'stripe',
    giro = '', tipoEmpresa = '',
    monto = 0, paquete = 'Brand Identity',
    ciudad = 'Riobamba',
  } = campos;

  const entregables = PAQUETES_ENTREGABLES[paquete] || PAQUETES_ENTREGABLES['Brand Identity'];
  const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const monto60 = Math.round(monto * 0.6);
  const monto40 = Math.round(monto * 0.4);
  const actividadDesc = giro || `actividades relacionadas con ${tipoEmpresa || 'su industria'}`;
  const nombreLegal = razonSocial || empresa;
  const documentoLegal = ruc || cedula;
  const metodoPagoLabel = metodoPago === 'transferencia' ? 'transferencia bancaria' : 'Stripe / tarjeta';

  return `CONTRATO PRESTACIÓN DE SERVICIOS DE BRANDING Y PROPIEDAD INTELECTUAL

Se celebra el presente contrato civil de prestación de servicios de branding y propiedad intelectual al tenor de las siguientes cláusulas:

Primera. - Partes: Comparecen, por una parte, el/la Sr./Sra. ${nombre.toUpperCase()}${documentoLegal ? `, con documento/RUC número ${documentoLegal}` : ''}${nombreLegal ? `, actuando por ${nombreLegal}` : ''}${responsableLegal ? ` en calidad de ${responsableLegal}` : ''}, a quien en adelante se denominará "EL CLIENTE", y, por otra parte, el señor DAVID MAURICIO FERIA NARANJO, en calidad de representante legal de FERIA DESIGN STUDIO, con RUC número 0503486938001, a quien en adelante se denominará "EL DISEÑADOR".

Datos legales y de facturación registrados para el proceso: ${nombreLegal ? `razón social ${nombreLegal}` : 'sin razón social registrada'}${documentoLegal ? ` · documento/RUC ${documentoLegal}` : ''}${pais ? ` · país ${pais}` : ''}${direccionFacturacion ? ` · dirección ${direccionFacturacion}` : ''}.

Las partes, en conjunto, podrán ser referidas como "LAS PARTES".

Segunda. – Antecedentes: Este contrato tiene por antecedentes los que seguidamente se detallan:

• El DISEÑADOR es un estudio de carácter privado cuyo principal objetivo es la prestación de servicios profesionales para el desarrollo de identidad de marca, diseño y estrategia de branding.

• El CLIENTE${nombreLegal ? `, representado por ${nombre} en calidad de ${responsableLegal || 'titular'},` : ''} se dedica a las actividades relacionadas con ${actividadDesc}${tipoEmpresa ? ` (industria: ${tipoEmpresa})` : ''}, y requiere de los servicios profesionales del DISEÑADOR para el desarrollo de su identidad visual y branding.

Tercera. – Objeto: Este contrato tiene como objeto establecer las condiciones aplicables al desarrollo y a la propiedad intelectual sobre las producciones creadas para el CLIENTE, así como otros aspectos de la relación entre LAS PARTES.

Cuarta. – Entregables: El DISEÑADOR se obliga a desarrollar para el CLIENTE los entregables descritos en el paquete ${paquete} contratado, que incluye en sus respectivas fases lo siguiente:

${entregables}

Quinta. – Naturaleza civil y ausencia de relación laboral: El presente contrato tiene naturaleza civil y se celebra al amparo de lo dispuesto en el Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación (COESCCI) como una contratación de obra por encargo. Las partes manifiestan expresamente que no existe entre ellas relación de dependencia laboral alguna.

Sexta. – Precio u honorario y forma de pago:

El valor del servicio es de USD ${monto.toLocaleString()} (${monto === 0 ? 'a definir' : 'dólares americanos'}) más IVA, el cual se cancelará de la siguiente manera:

— Un anticipo del 60% (USD ${monto60.toLocaleString()}) al momento de la firma del presente contrato; y,
— El 40% restante (USD ${monto40.toLocaleString()}) con la entrega de los entregables acordados.

El método de pago acordado para este cliente es: ${metodoPagoLabel}. Esta definición alimenta los cobros, facturas y notificaciones posteriores del proceso.

Séptima. – Plazo: El presente contrato tendrá una duración de cuarenta y cinco (45) días hábiles, contados a partir de la firma de este documento. Este plazo podrá extenderse únicamente por mutuo acuerdo expreso entre ambas partes.

Octava. – Cronograma de trabajo:

Fase 1 – Brief y recolección de información (Días 1–4)
Fase 2 – Desarrollo conceptual (Días 6–11): elaboración del concepto de marca, presentación de 2 propuestas visuales.
Fase 3 – Diseño de aplicaciones visuales (Días 12–30)
Fase 4 – Manual de Marca (Días 31–40)
Fase 5 – Ajustes finales y entrega (Día 41): notificación formal al CLIENTE. Plazo de 5 días para pago del 40%.
Fase 6 – Entrega final (Día 45): el proyecto se considerará finalizado y aceptado tácitamente si el CLIENTE no presenta observaciones por escrito dentro de los 4 días laborables siguientes.

Novena. – Reunión de post-seguimiento: Una vez entregado todo el material, LAS PARTES se comprometen a realizar una reunión de post-seguimiento en un plazo máximo de una semana posterior a la entrega.

Décima. – Obligaciones de las partes: (Ver versión completa en documento adjunto)

Décima Primera. – Derechos de propiedad intelectual y registro: Todos los derechos patrimoniales de autor pertenecerán al CLIENTE. Esta cláusula constituye el "pacto en contrario" previsto en el artículo 115 del COESCCI.

FIRMA DEL ESTUDIO:

FERIA DESIGN STUDIO firma este contrato como parte oferente y prestadora del servicio. La firma del cliente completará la aceptación del acuerdo.

Firma del estudio: David Mauricio Feria Naranjo — Representante de Feria Design Studio

Décima Segunda. – Solución de conflictos: Las partes se someten a mediación ante el Centro de Mediación GEA, Riobamba, y en última instancia a la justicia ordinaria civil de la ciudad de ${ciudad}.

Décima Tercera. – Protección de datos personales: En cumplimiento de la Ley Orgánica de Protección de Datos Personales del Ecuador, el DISEÑADOR utilizará los datos del CLIENTE exclusivamente para la ejecución del presente contrato, emisión de facturas, acceso al portal y notificaciones operativas del proyecto.${email || telefono || whatsapp || direccionFacturacion || pais ? `\n\nDatos maestros del CLIENTE: ${email ? `correo ${email}` : ''}${telefono ? ` · teléfono ${telefono}` : ''}${whatsapp ? ` · WhatsApp ${whatsapp}` : ''}${pais ? ` · país ${pais}` : ''}${direccionFacturacion ? ` · dirección de facturación ${direccionFacturacion}` : ''}. Estos datos son la fuente para contrato, facturas, portal del cliente y notificaciones del proyecto.` : ''}

Décima Cuarta. – Unicidad del acuerdo de voluntades: Este contrato constituye el acuerdo total entre las partes.

Y para constancia de todo lo cual, las partes aceptan este contrato electrónicamente el ${hoy} en la ciudad de ${ciudad}.

FIRMA DEL ESTUDIO
David Mauricio Feria Naranjo
CEO Fundador · Feria Design Studio
RUC: 0503486938001
Firma digital integrada en el documento emitido por el estudio.

FIRMA DEL CLIENTE
La firma electrónica del CLIENTE se agregará automáticamente al momento de aceptar este contrato desde la plataforma Feria OS.`;
}

// ── VISTA DE FIRMA DEL CLIENTE ─────────────────────────────────────
function ContractRichText({ text }) {
  const lines = String(text || '').split('\n');
  const headingRegex = /^(CONTRATO|FIRMA DEL ESTUDIO|FIRMA DEL CLIENTE|Datos legales|Datos maestros|El valor del servicio|Fase\s+\d|—|â€”)/i;
  const clauseRegex = /^(Primera|Segunda|Tercera|Cuarta|Quinta|Sexta|S.ptima|Octava|Novena|D.cima(?:\s+Primera|\s+Segunda|\s+Tercera|\s+Cuarta)?)\.\s*/i;
  const strongParts = /("EL CLIENTE"|"EL DISEÑADOR"|"EL DISEÃ‘ADOR"|"LAS PARTES"|FERIA DESIGN STUDIO|David Mauricio Feria Naranjo|DAVID MAURICIO FERIA NARANJO|COESCCI|USD\s[\d,.]+|60%|40%|Datos maestros del CLIENTE)/g;
  const strongMatch = /^(?:"EL CLIENTE"|"EL DISEÑADOR"|"EL DISEÃ‘ADOR"|"LAS PARTES"|FERIA DESIGN STUDIO|David Mauricio Feria Naranjo|DAVID MAURICIO FERIA NARANJO|COESCCI|USD\s[\d,.]+|60%|40%|Datos maestros del CLIENTE)$/;
  const inline = (value) => String(value || '').split(strongParts).filter(Boolean).map((part, idx) => (
    strongMatch.test(part)
      ? <strong key={idx} style={{ color:'var(--text)', fontWeight:850 }}>{part}</strong>
      : <React.Fragment key={idx}>{part}</React.Fragment>
  ));

  return (
    <div style={{ display:'grid', gap:8 }}>
      {lines.map((raw, index) => {
        const line = raw.trim();
        if (!line) return <div key={index} style={{ height:4 }} />;
        const isClause = clauseRegex.test(line);
        const colonIndex = line.indexOf(':');
        if (isClause && colonIndex > 0 && colonIndex < 120) {
          return (
            <p key={index} style={{ margin:0, lineHeight:1.78, color:'var(--text-m)' }}>
              <strong style={{ color:'var(--text)', fontWeight:900 }}>{line.slice(0, colonIndex + 1)}</strong>{inline(line.slice(colonIndex + 1))}
            </p>
          );
        }
        if (isClause || headingRegex.test(line)) {
          return <p key={index} style={{ margin:0, lineHeight:1.78, color:'var(--text)', fontWeight:850 }}>{inline(line)}</p>;
        }
        return <p key={index} style={{ margin:0, lineHeight:1.78, color:'var(--text-m)' }}>{inline(line)}</p>;
      })}
    </div>
  );
}

function ClientSigningView({ cliente, campos, contrato, onSigned }) {
  const [step, setStep]     = useState('review');
  const [scrolled, setScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signName, setSignName] = useState('');
  const [signing, setSigning]   = useState(false);

  const handleSign = async () => {
    if (!accepted || !signName.trim()) return;
    setSigning(true);
    const texto      = `${cliente.nombre}|${signName}|${new Date().toISOString()}|${contrato.slice(0, 200)}`;
    const buf        = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    const hash       = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const fecha      = new Date().toISOString();
    setSigning(false);
    setStep('done');
    onSigned(hash, fecha, signName.trim());
  };

  const ts = new Date().toLocaleString('es-ES', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div style={{ background:'var(--dark)', minHeight:'100%', color:'var(--text)' }}>
      <div style={{ padding:'14px 24px', background:'var(--s1)', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:16, color:'var(--gold)' }}>Feria <em>Design</em></div>
        <div style={{ fontSize:11, color:'var(--text-d)' }}>Contrato de servicios · firma digital</div>
      </div>

      <div style={{ padding:'16px 24px', display:'flex', alignItems:'center', gap:8 }}>
        {[{id:'review',label:'Revisar'},{id:'sign',label:'Firmar'},{id:'done',label:'Confirmado'}].map((s,i,arr) => {
          const isActive = s.id===step;
          const isDone   = arr.findIndex(x=>x.id===step)>i;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', fontSize:10, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', background:isDone?'var(--green)':isActive?'var(--gold)':'var(--border-m)', color:isDone||isActive?'var(--dark)':'var(--text-d)' }}>
                  {isDone?'✓':i+1}
                </div>
                <div style={{ fontSize:11, color:isActive?'var(--text)':'var(--text-d)', fontWeight:isActive?500:400 }}>{s.label}</div>
              </div>
              {i<arr.length-1 && <div style={{ flex:1, height:1, background:'var(--border-m)' }} />}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ padding:'0 24px 40px' }}>
        {step==='review' && (
          <>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:22, fontWeight:300, marginBottom:4 }}>Revisa tu <em style={{ color:'var(--gold)' }}>contrato</em></div>
              <div style={{ fontSize:11, color:'var(--text-m)', lineHeight:1.6 }}>Lee el contrato completo antes de firmar. Desplázate hasta el final para continuar.</div>
            </div>
            <div onScroll={e => { const el=e.target; if(el.scrollHeight-el.scrollTop-el.clientHeight<60) setScrolled(true); }}
              style={{ background:'var(--s1)', borderRadius:12, padding:'28px 32px', maxHeight:360, overflowY:'auto', fontSize:11.5, lineHeight:1.85, marginBottom:14, border:'1px solid rgba(201,169,110,0.2)' }}>
              <div style={{ fontWeight:600, fontSize:18, marginBottom:4 }}>Contrato de Servicios de Branding</div>
              <div style={{ fontSize:10, color:'var(--text-m)', marginBottom:20, letterSpacing:'.06em', textTransform:'uppercase' }}>Feria Design Studio · {campos.nombre || cliente.nombre}</div>
              <div style={{ fontSize:11.5, lineHeight:1.85, color:'var(--text-d)' }}><ContractRichText text={contrato} /></div>
            </div>
            {!scrolled && <div style={{ textAlign:'center', fontSize:11, color:'var(--text-d)', marginBottom:10 }}>↓ Desplázate para leer el contrato completo</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => downloadContrato(cliente, contrato, 'contrato-preview')} style={{ background:'transparent', color:'var(--text-d)', fontSize:11, padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.06)', cursor:'pointer', fontFamily:'inherit' }}>↓ Descargar PDF</button>
              <button disabled={!scrolled} onClick={() => setStep('sign')}
                style={{ background:scrolled?'var(--gold)':'var(--gold-faint)', color:scrolled?'var(--dark)':'var(--text-d)', fontSize:11, fontWeight:600, padding:'8px 20px', borderRadius:8, border:'none', cursor:scrolled?'pointer':'not-allowed', fontFamily:'inherit', transition:'all .2s' }}>
                Continuar →
              </button>
            </div>
          </>
        )}

        {step==='sign' && (
          <>
            <div style={{ fontSize:22, fontWeight:300, marginBottom:16 }}>Firma tu <em style={{ color:'var(--gold)' }}>contrato</em></div>
            <div style={{ background:'var(--s2)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:10 }}>Resumen</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  {l:'Cliente', v:campos.nombre||cliente.nombre},
                  {l:'Servicio', v:campos.paquete||cliente.servicio},
                  {l:'Monto total', v:`$${(campos.monto||cliente.monto||0).toLocaleString()} USD`},
                  {l:'Anticipo 60%', v:`$${Math.round((campos.monto||cliente.monto||0)*0.6).toLocaleString()} USD`},
                ].map(d=>(
                  <div key={d.l}><div style={{ fontSize:10, color:'var(--text-d)', marginBottom:2 }}>{d.l}</div><div style={{ fontSize:12, fontWeight:500 }}>{d.v}</div></div>
                ))}
              </div>
            </div>
            <div style={{ background:'var(--s2)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'16px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:500, marginBottom:12 }}>Tu firma digital</div>
              <input value={signName} onChange={e=>setSignName(e.target.value)} placeholder={`Escribe tu nombre: ${campos.nombre||cliente.nombre}`}
                style={{ width:'100%', background:'var(--s1)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'10px 14px', fontSize:20, fontStyle:'italic', color:'var(--gold)', outline:'none', fontFamily:'inherit' }} />
              {signName && <div style={{ marginTop:10, padding:'8px 12px', background:'var(--s3)', borderRadius:6 }}>
                <div style={{ fontSize:10, color:'var(--text-d)', marginBottom:4 }}>Vista previa</div>
                <div style={{ fontStyle:'italic', fontSize:22, color:'var(--gold)' }}>{signName}</div>
              </div>}
            </div>
            <div style={{ background:'var(--s2)', border:'1px solid rgba(255,255,255,.04)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:10, color:'var(--text-d)', lineHeight:1.7 }}>
              <div>📅 Fecha: {ts}</div>
              <div>🔒 Documento sellado con hash SHA-256 · audit trail completo</div>
            </div>
            <div onClick={()=>setAccepted(a=>!a)}
              style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'var(--gold-faint)', border:`1px solid ${accepted?'var(--gold-dim)':'var(--border-s)'}`, borderRadius:8, cursor:'pointer', marginBottom:16 }}>
              <div style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${accepted?'var(--gold)':'var(--border-m)'}`, background:accepted?'var(--gold)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                {accepted && <span style={{ fontSize:10, color:'var(--dark)', fontWeight:700 }}>✓</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--text-m)', lineHeight:1.6 }}>
                Acepto firmar este contrato electrónicamente con plena validez legal conforme a la <strong style={{ color:'var(--text)' }}>Ley de Comercio Electrónico de Ecuador</strong> y el <strong style={{ color:'var(--text)' }}>ESIGN Act (USA)</strong>.
              </div>
            </div>
            <button onClick={handleSign} disabled={!accepted||!signName.trim()||signing}
              style={{ width:'100%', padding:'14px', borderRadius:10, border:'none', cursor:accepted&&signName.trim()?'pointer':'not-allowed', background:accepted&&signName.trim()?'var(--gold)':'var(--gold-faint)', color:accepted&&signName.trim()?'var(--dark)':'var(--text-d)', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all .2s' }}>
              {signing ? 'Sellando contrato…' : '✍ Firmar contrato digitalmente'}
            </button>
          </>
        )}

        {step==='done' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(52,211,153,0.15)', border:'2px solid #7BC67A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 20px' }}>✓</div>
            <div style={{ fontSize:26, fontWeight:300, marginBottom:8 }}>Contrato <em style={{ color:'var(--green)' }}>firmado</em></div>
            <div style={{ fontSize:11, color:'var(--text-m)', lineHeight:1.7, maxWidth:380, margin:'0 auto 24px' }}>
              Tu contrato ha sido firmado digitalmente y sellado con hash SHA-256. Recibirás una copia en tu email junto con el audit trail y el link para pagar el anticipo del 60%.
            </div>
            <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.6 }}>El equipo de Feria ha sido notificado.<br />El cobro del 60% ya quedó activado en Finanzas. Revisa tu correo para realizar el pago.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODAL EDITAR CAMPOS DEL CONTRATO ──────────────────────────────
function ModalCampos({ cliente, data, onSave, onClose, mode = 'edit' }) {
  const [campos, setCampos] = useState({
    nombre:          cliente.nombre        || '',
    cedula:          cliente.cedula        || '',
    empresa:         cliente.empresa       || cliente.tipo || '',
    responsableLegal:cliente.responsableLegal || '',
    email:           cliente.email         || '',
    telefono:        cliente.telefono      || '',
    whatsapp:        cliente.whatsapp      || cliente.telefono || '',
    razonSocial:     cliente.razonSocial   || cliente.razon_social || '',
    ruc:             cliente.ruc           || '',
    direccionFacturacion: cliente.direccionFacturacion || cliente.direccion_facturacion || '',
    pais:            cliente.pais          || 'Ecuador',
    metodoPago:      cliente.metodoPago    || cliente.metodo_pago || 'transferencia',
    giro:            cliente.giro          || '',
    tipoEmpresa:     cliente.tipoEmpresa   || '',
    monto:           cliente.monto         || 0,
    paquete:         cliente.servicio      || 'Brand Identity',
    ciudad:          cliente.ciudad        || 'Riobamba',
  });
  const set = (k, v) => setCampos(p => ({ ...p, [k]: v }));

  const labelStyle = { fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 };
  const inputStyle = { width:'100%', padding:'9px 13px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:680, maxWidth:'93vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--gold)', marginBottom:4 }}>{mode === 'new' ? 'Nuevo contrato · ficha maestra' : 'Datos del contrato'}</div>
        <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:12 }}>El equipo comercial registra estos datos una sola vez. Desde aqui se reutilizan para contrato, facturas, portal del cliente y notificaciones por email/WhatsApp.</div>
        <div style={{ padding:'10px 12px', background:'rgba(91,155,213,.10)', border:'1px solid rgba(91,155,213,.22)', borderRadius:10, fontSize:11, color:'var(--text-m)', lineHeight:1.55, marginBottom:18 }}>
          Fuente maestra del cliente: evita volver a pedir correo, telefono, razon social, RUC, direccion o metodo de pago mas adelante.
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <div style={labelStyle}>Nombre completo del cliente *</div>
            <input value={campos.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Nombre completo" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Número de cédula</div>
            <input value={campos.cedula} onChange={e=>set('cedula',e.target.value)} placeholder="0000000000" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Razón social / nombre fiscal</div>
            <input value={campos.razonSocial} onChange={e=>set('razonSocial',e.target.value)} placeholder="Razón social para factura" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>RUC / TAX ID</div>
            <input value={campos.ruc} onChange={e=>set('ruc',e.target.value)} placeholder="RUC, EIN o identificacion fiscal" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Empresa / marca comercial</div>
            <input value={campos.empresa} onChange={e=>set('empresa',e.target.value)} placeholder="Nombre de la empresa" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Responsable legal</div>
            <input value={campos.responsableLegal} onChange={e=>set('responsableLegal',e.target.value)} placeholder="Cargo o rol legal" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Correo electrónico</div>
            <input type="email" value={campos.email} onChange={e=>set('email',e.target.value)} placeholder="email@cliente.com" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Número de teléfono</div>
            <input value={campos.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="+593 99 000 0000" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>WhatsApp de notificaciones</div>
            <input value={campos.whatsapp} onChange={e=>set('whatsapp',e.target.value)} placeholder="+593 99 000 0000" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>País</div>
            <input value={campos.pais} onChange={e=>set('pais',e.target.value)} placeholder="Ecuador" style={inputStyle} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Dirección de facturación</div>
            <input value={campos.direccionFacturacion} onChange={e=>set('direccionFacturacion',e.target.value)} placeholder="Dirección completa para facturas y documentos" style={inputStyle} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <div style={labelStyle}>Giro de negocio (descripción de actividad)</div>
            <input value={campos.giro} onChange={e=>set('giro',e.target.value)} placeholder="Ej: operación de establecimientos de alimentos y bebidas, coctelería…" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Tipo de empresa / industria</div>
            <select value={campos.tipoEmpresa} onChange={e=>set('tipoEmpresa',e.target.value)} style={inputStyle}>
              <option value="">— Selecciona —</option>
              {INDUSTRIAS.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Ciudad del contrato</div>
            <input value={campos.ciudad} onChange={e=>set('ciudad',e.target.value)} placeholder="Riobamba" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Paquete / servicio</div>
            <select value={campos.paquete} onChange={e=>set('paquete',e.target.value)} style={inputStyle}>
              {Object.keys(PAQUETES_ENTREGABLES).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Monto total (USD)</div>
            <input type="number" value={campos.monto} onChange={e=>set('monto',parseFloat(e.target.value)||0)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Método de pago acordado</div>
            <select value={campos.metodoPago} onChange={e=>set('metodoPago',e.target.value)} style={inputStyle}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="stripe">Stripe / tarjeta</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop:16, padding:'12px 14px', background:'var(--s3)', borderRadius:8, fontSize:11, color:'var(--text-d)', lineHeight:1.6 }}>
          <strong style={{ color:'var(--text-m)' }}>Firma digital:</strong> La plataforma genera la firma con hash SHA-256 y audit trail completo, con validez legal en Ecuador (Ley de Comercio Electrónico) y USA (ESIGN Act). No se requiere DocuSign para proyectos nacionales — el sistema actual es suficiente. Para contratos internacionales con clientes que exigen DocuSign, se puede integrar en una fase posterior.
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
          <button onClick={() => onSave(campos)} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{mode === 'new' ? 'Crear y generar contrato' : 'Generar contrato'}</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function Contratos() {
  const { data, updateCliente, addCliente, firmarContrato, showToast, activeBrand } = useApp();
  const [view, setView]           = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [camposEdit, setCamposEdit] = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [contratoTexto, setContratoTexto] = useState('');
  const [draftCliente, setDraftCliente] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const defaultBrand = activeBrand === 'bl' ? 'bl' : 'feria';
  const cliente = data.clientes.find(c => c.id === selectedId) || draftCliente;
  const contractClients = useMemo(() => data.clientes.filter(c => Number(c.stage || 0) >= 1), [data.clientes]);
  const categoryOptions = useMemo(() => {
    const values = new Set(contractClients.map(c => c.servicio || c.paquete || 'Sin categoría'));
    return Array.from(values).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
  }, [contractClients]);
  const filteredContractClients = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return contractClients.filter(c => {
      const category = c.servicio || c.paquete || 'Sin categoría';
      if (categoryFilter !== 'all' && category !== categoryFilter) return false;
      const rawDate = c.fecha_firma || c.contract_signed_at || c.created_at || c.updated_at;
      if ((from || to) && !rawDate) return false;
      if (rawDate) {
        const date = new Date(rawDate);
        if (from && date < from) return false;
        if (to && date > to) return false;
      }
      return true;
    });
  }, [contractClients, categoryFilter, dateFrom, dateTo]);

  const estadoContrato = (stage) => {
    if (stage < 2)  return { label:'Pendiente', color:'gold' };
    if (stage === 2) return { label:'Enviado',   color:'blue' };
    if (stage >= 3)  return { label:'Firmado',   color:'green' };
    return { label:'Pendiente', color:'gray' };
  };

  const datosMaestrosCompletos = (c = {}) => {
    const required = [
      c.nombre,
      c.email,
      c.telefono || c.whatsapp,
      c.cedula || c.ruc,
      c.direccionFacturacion || c.direccion_facturacion,
      c.pais,
    ];
    return required.filter(Boolean).length >= required.length;
  };

  const handleNuevoContrato = () => {
    const draft = emptyContractClient(defaultBrand);
    setDraftCliente(draft);
    setSelectedId(null);
    setCamposEdit(null);
    setContratoTexto('');
    setShowModal(true);
    setView('list');
  };

  const handleGenerarContrato = async (campos) => {
    const texto = generarContrato(campos, data);
    const payload = camposToCliente(campos, selectedId ? (cliente || {}) : {}, defaultBrand);
    setCamposEdit(campos);
    setContratoTexto(texto);
    setShowModal(false);
    setView('preview');
    if (selectedId) {
      updateCliente(selectedId, payload);
      setDraftCliente(null);
    } else {
      const created = await addCliente({ ...payload, created_at: new Date().toISOString() });
      setSelectedId(created.id);
      setDraftCliente(created);
      showToast('Contrato creado con ficha maestra', '+');
    }
  };

  // Vista firma del cliente
  if (view === 'signing' && cliente) {
    const campos = camposEdit || {
      nombre: cliente.nombre, cedula: cliente.cedula || '', empresa: cliente.empresa || cliente.tipo || '',
      responsableLegal: cliente.responsableLegal || '', email: cliente.email || '',
      telefono: cliente.telefono || '', whatsapp: cliente.whatsapp || cliente.telefono || '',
      razonSocial: cliente.razonSocial || cliente.razon_social || '', ruc: cliente.ruc || '',
      direccionFacturacion: cliente.direccionFacturacion || cliente.direccion_facturacion || '',
      pais: cliente.pais || 'Ecuador', metodoPago: cliente.metodoPago || cliente.metodo_pago || 'transferencia',
      giro: cliente.giro || '', tipoEmpresa: cliente.tipoEmpresa || '',
      monto: cliente.monto || 0, paquete: cliente.servicio || 'Brand Identity', ciudad: 'Riobamba',
    };
    const contrato = contratoTexto || generarContrato(campos, data);
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', flexShrink:0 }}>
          <button onClick={() => setView('list')} style={{ fontSize:11, color:'var(--text-d)', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>← Volver</button>
          <div style={{ fontSize:11, color:'var(--text-d)' }}>Vista del cliente · {campos.nombre}</div>
          <div style={{ marginLeft:'auto', fontSize:10, padding:'2px 10px', background:'rgba(91,155,213,0.1)', color:'var(--blue)', borderRadius:8 }}>Vista simulada</div>
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          <ClientSigningView cliente={cliente} campos={campos} contrato={contrato}
            onSigned={async (hash, fechaFirma, signName) => {
              await firmarContrato?.(cliente.id, {
                firmante: signName,
                hash,
                fecha_firma: fechaFirma,
                stage: Math.max(cliente.stage, 3),
                contenido: contrato,
                monto: campos.monto || cliente.monto || 0,
                paquete: campos.paquete || cliente.servicio || '',
                email: campos.email || cliente.email || '',
                telefono: campos.telefono || cliente.telefono || '',
                whatsapp: campos.whatsapp || cliente.whatsapp || '',
                ruc: campos.ruc || cliente.ruc || '',
                direccion_facturacion: campos.direccionFacturacion || cliente.direccion_facturacion || '',
                pais: campos.pais || cliente.pais || '',
                metodo_pago: campos.metodoPago || cliente.metodo_pago || '',
              });
              showToast(`${signName} firmó el contrato`, '✍');
              setTimeout(() => setView('list'), 1800);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', gap:12, flexWrap:'wrap' }}>
        <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:18 }}>
          Contratos <span style={{ color:'var(--gold)', fontStyle:'italic' }}>· Firma digital</span>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Button variant="gold" onClick={handleNuevoContrato}><Plus size={13} strokeWidth={2} /> Nuevo contrato</Button>
          <Button variant="ghost" onClick={() => showToast('Exportando contratos…','◌')}>Exportar</Button>
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'18px 20px' }}>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap:8, marginBottom:18 }}>
          {[
            {l:'Firmados',   v:data.clientes.filter(c=>c.stage>=3).length, c:'var(--green)'},
            {l:'Enviados',   v:data.clientes.filter(c=>c.stage===2).length, c:'var(--blue)'},
            {l:'Pendientes', v:data.clientes.filter(c=>c.stage===1).length, c:'var(--gold)'},
            {l:'Valor total', v:`$${data.clientes.filter(c=>c.stage>=3).reduce((a,c)=>a+c.monto,0).toLocaleString()}`, c:'var(--teal)'},
          ].map(s=>(
            <Card key={s.l} style={{ textAlign:'center', padding:'12px 14px' }}>
              <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:22, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{s.l}</div>
            </Card>
          ))}
        </div>

        {/* INFO */}
        <div style={{ background:'var(--gold-faint)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:11, color:'var(--text-m)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--gold)' }}>Flujo:</strong> Selecciona un cliente → completa los campos del contrato → genera el documento → envía al cliente para firma digital. El sistema usa hash SHA-256 con plena validez legal en Ecuador y USA. <strong>No se requiere DocuSign</strong> para contratos nacionales.
        </div>

        <div style={{ background:'rgba(91,155,213,.08)', border:'1px solid rgba(91,155,213,.25)', borderRadius:10, padding:'10px 14px', margin:'-6px 0 16px', fontSize:11, color:'var(--text-m)', lineHeight:1.6 }}>
          <strong style={{ color:'var(--blue)' }}>Ficha maestra del cliente:</strong> El equipo comercial captura datos personales, legales, facturacion, WhatsApp y metodo de pago una sola vez. Esa ficha alimenta contrato, cobros, facturas, portal y notificaciones durante todo el proceso.
        </div>

        {/* LISTA */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:10 }}>
          <SectionLabel>Contratos por cliente</SectionLabel>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="Filtrar contratos desde"
              style={{ background:'var(--s2)', border:'1px solid var(--border-s)', color:'var(--text)', borderRadius:9, padding:'8px 10px', fontFamily:'inherit', fontSize:11 }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="Filtrar contratos hasta"
              style={{ background:'var(--s2)', border:'1px solid var(--border-s)', color:'var(--text)', borderRadius:9, padding:'8px 10px', fontFamily:'inherit', fontSize:11 }} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filtrar contratos por categoría"
              style={{ background:'var(--s2)', border:'1px solid var(--border-s)', color:'var(--text)', borderRadius:9, padding:'8px 10px', fontFamily:'inherit', fontSize:11, minWidth:170 }}>
              <option value="all">Todas las categorías</option>
              {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {(dateFrom || dateTo || categoryFilter !== 'all') && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setCategoryFilter('all'); }} style={{ background:'transparent', border:'1px solid var(--border-s)', color:'var(--text-d)', borderRadius:9, padding:'8px 10px', fontSize:11, fontFamily:'inherit', cursor:'pointer' }}>
                Limpiar
              </button>
            )}
          </div>
        </div>
        {filteredContractClients.map(c => {
          const estado = estadoContrato(c.stage);
          const isSigned = c.stage >= 3;
          const masterReady = c.master_data_completed || datosMaestrosCompletos(c);
          return (
            <Card key={c.id} style={{ padding:'14px 16px', marginBottom:8, display:'grid', gridTemplateColumns:'auto auto minmax(0,1fr)', alignItems:'center', gap:12 }}>
              <div style={{ width:3, height:44, borderRadius:2, background:c.color, flexShrink:0 }} />
              <div style={{ width:36, height:36, borderRadius:'50%', background:`${c.color}22`, color:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>
                {c.nombre.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap', minWidth:0 }}>
                  <span style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</span>
                  <BrandPill brand={c.brand} />
                  <Badge color={masterReady ? 'green' : 'warning'}>{masterReady ? 'Ficha maestra' : 'Faltan datos'}</Badge>
                  {c.cedula && <span style={{ fontSize:9, color:'var(--text-d)', background:'var(--s3)', padding:'1px 6px', borderRadius:10, border:'1px solid var(--border-s)' }}>CI {c.cedula}</span>}
                </div>
                <div style={{ fontSize:10, color:'var(--text-d)', display:'flex', gap:8, flexWrap:'wrap', minWidth:0 }}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:190 }}>{c.servicio}</span><span>·</span>
                  <span>${c.monto?.toLocaleString()} USD</span>
                  {c.email && <><span>·</span><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{c.email}</span></>}
                </div>
              </div>
              <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end', flexWrap:'wrap', minWidth:0 }}>
                <Badge color={estado.color}>{estado.label}</Badge>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedId(c.id);
                  setDraftCliente(null);
                  setCamposEdit(null);
                  setContratoTexto('');
                  setShowModal(true);
                }}>
                  {isSigned ? 'Ver contrato' : 'Completar datos'}
                </Button>
                {!isSigned && contratoTexto && selectedId===c.id && (
                  <Button variant="gold" size="sm" onClick={() => setView('signing')}>Enviar a firma</Button>
                )}
                {isSigned && (
                  <Button variant="ghost" size="sm" onClick={() => downloadContrato(c, generarContrato({
                    nombre:c.nombre, cedula:c.cedula||'', empresa:c.empresa||c.tipo||'', email:c.email||'',
                    telefono:c.telefono||'', whatsapp:c.whatsapp||c.telefono||'', razonSocial:c.razonSocial||c.razon_social||'',
                    ruc:c.ruc||'', direccionFacturacion:c.direccionFacturacion||c.direccion_facturacion||'',
                    pais:c.pais||'Ecuador', metodoPago:c.metodoPago||c.metodo_pago||'transferencia',
                    monto:c.monto||0, paquete:c.servicio||'Brand Identity', ciudad:c.ciudad||'Riobamba',
                  }, data), 'contrato-firmado')}>↓ Descargar PDF</Button>
                )}
              </div>
            </Card>
          );
        })}

        {filteredContractClients.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-d)', fontSize:13 }}>
            No hay contratos que coincidan con los filtros activos.<br/>Crea un contrato nuevo desde la ficha maestra cuando el equipo ya tenga los datos completos.
            <div style={{ marginTop:14 }}>
              <Button variant="gold" onClick={handleNuevoContrato}><Plus size={13} strokeWidth={2} /> Nuevo contrato</Button>
            </div>
          </div>
        )}

        {/* PREVIEW MODAL */}
        {view==='preview' && cliente && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={e => e.target===e.currentTarget && setView('list')}>
            <Card style={{ width:600, maxWidth:'92vw', maxHeight:'88vh', display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border-s)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>Contrato · {camposEdit?.nombre || cliente.nombre}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)' }}>
                    {camposEdit?.paquete} · ${(camposEdit?.monto||0).toLocaleString()} USD
                    {camposEdit?.cedula && ` · CI ${camposEdit.cedula}`}
                  </div>
                </div>
                <button onClick={() => setView('list')} style={{ background:'transparent', border:'none', color:'var(--text-d)', fontSize:18, cursor:'pointer' }}>×</button>
              </div>
              <div style={{ flex:1, overflow:'auto', padding:'20px 24px', background:'var(--s1)', color:'var(--text)', fontSize:11.5, lineHeight:1.85 }}>
                <div style={{ fontWeight:600, fontSize:18, marginBottom:4 }}>Contrato de Servicios de Branding</div>
                <div style={{ fontSize:10, color:'var(--text-m)', marginBottom:18, letterSpacing:'.06em', textTransform:'uppercase' }}>
                  Feria Design Studio · {camposEdit?.nombre || cliente.nombre}
                </div>
                <ContractRichText text={contratoTexto} />
              </div>
              <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border-s)', display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
                <button onClick={() => { setCamposEdit(null); setShowModal(true); }}
                  style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 14px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>
                  ← Editar campos
                </button>
                <div style={{ display:'flex', gap:8 }}>
                  <Button variant="ghost" onClick={() => downloadContrato(cliente, contratoTexto, 'contrato-preview')}>↓ Descargar PDF</Button>
                  <Button variant="gold" onClick={() => setView('signing')}>Abrir vista de firma</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* MODAL CAMPOS */}
      {showModal && cliente && (
        <ModalCampos
          cliente={cliente}
          data={data}
          mode={selectedId ? 'edit' : 'new'}
          onSave={handleGenerarContrato}
          onClose={() => {
            setShowModal(false);
            if (!selectedId) setDraftCliente(null);
          }}
        />
      )}
    </div>
  );
}
