// Helpers para separar operación real, datos demo y seeds legacy.
// Regla: en modo real nunca se muestran datos demo ni seeds antiguos.

export const LEGACY_DEMO_NAMES = [
  'arkes', 'arquez', 'juan pablo', 'tania', 'tanya', 'ulbeck', 'urbe',
  'sultán', 'sultan', 'mónica', 'monica', 'arturo', 'artizwed',
  'lácteos san salvador', 'lacteos san salvador', 'san salvador',
  'hifa', 'enciéndete', 'enciendete', 'newsletter emprendedores',
];

export function normText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isLegacyDemoRecord(row = {}) {
  if (!row) return false;
  if (row.is_demo === true) return true;

  const joined = [
    row.nombre, row.name, row.titulo, row.title, row.empresa, row.cliente,
    row.descripcion, row.desc, row.email, row.asunto, row.concepto,
  ].map(normText).join(' ');

  return LEGACY_DEMO_NAMES.some(name => joined.includes(normText(name)));
}

export function onlyOperationalRows(rows = [], demoMode = false) {
  const list = Array.isArray(rows) ? rows : [];
  return demoMode ? list : list.filter(row => !isLegacyDemoRecord(row));
}

export function monthKey(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthlyFinancialData(cobros = [], gastos = [], months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      name: d.toLocaleDateString('es-ES', { month: 'short' }),
      mes: d.toLocaleDateString('es-ES', { month: 'short' }),
      ingresos: 0,
      gastos: 0,
      total: 0,
    });
  }

  cobros.filter(c => c.status === 'paid').forEach(c => {
    const key = monthKey(c.updated_at || c.fecha_pago || c.created_at || c.fecha);
    const bucket = buckets.find(b => b.key === key);
    if (bucket) {
      const monto = Number(c.monto || 0);
      bucket.ingresos += monto;
      bucket.total += monto;
    }
  });

  gastos.forEach(g => {
    const key = monthKey(g.fecha || g.created_at || g.updated_at);
    const bucket = buckets.find(b => b.key === key);
    if (bucket) bucket.gastos += Number(g.monto || 0);
  });

  return buckets;
}

export const DEMO_IDS = {
  cliente: '00000000-0000-4000-8000-000000000101',
  proyecto: '00000000-0000-4000-8000-000000000102',
  cobro: '00000000-0000-4000-8000-000000000103',
  contrato: '00000000-0000-4000-8000-000000000104',
  brief: '00000000-0000-4000-8000-000000000105',
};

export const DEMO_PUBLICACIONES = [
  { id: 'demo-pub-1', titulo:'Demo · Caso de éxito para Instagram', estado:'publicado', marca:'Feria', responsable:'Selene', inicio:'2026-04-10', entrega:'2026-04-15', publicacion:'2026-04-18', plataforma:'Instagram', prioridad:'alta', tipo:'caso de éxito', is_demo:true },
  { id: 'demo-pub-2', titulo:'Demo · Reel Brand & Legacy', estado:'en_progreso', marca:'Brand & Legacy', responsable:'David', inicio:'2026-04-20', entrega:'2026-04-26', publicacion:'2026-04-28', plataforma:'Instagram', prioridad:'alta', tipo:'reel', is_demo:true },
  { id: 'demo-pub-3', titulo:'Demo · Newsletter comercial', estado:'pendiente', marca:'Feria', responsable:'Selene', inicio:'2026-04-26', entrega:'2026-05-04', publicacion:'2026-05-05', plataforma:'Email', prioridad:'media', tipo:'newsletter', is_demo:true },
];

export const DEMO_MARKETING_CAMPAIGNS = [
  { id: 'demo-camp-1', nombre: 'Demo · Feria Branding Ecuador', canal: 'Meta Ads', estado: 'activa', brand: 'feria', presupuesto: 400, inversion: 340, leads: 18, conversiones: 3, inicio: '01/04', fin: '30/04', objetivo: 'leads', is_demo:true },
  { id: 'demo-camp-2', nombre: 'Demo · B&L Fotógrafos LATAM', canal: 'Meta Ads', estado: 'activa', brand: 'bl', presupuesto: 300, inversion: 210, leads: 31, conversiones: 5, inicio: '10/04', fin: '30/04', objetivo: 'leads', is_demo:true },
  { id: 'demo-camp-3', nombre: 'Demo · Orgánico Reels', canal: 'Orgánico', estado: 'activa', brand: 'bl', presupuesto: 0, inversion: 0, leads: 22, conversiones: 4, inicio: '01/04', fin: '—', objetivo: 'awareness', is_demo:true },
];

export const DEMO_MARKETING_MONTHLY = [
  { mes: 'Ene', inversion: 480, leads: 38, conversiones: 6, ingresos: 11200 },
  { mes: 'Feb', inversion: 620, leads: 52, conversiones: 8, ingresos: 14800 },
  { mes: 'Mar', inversion: 680, leads: 44, conversiones: 7, ingresos: 12600 },
  { mes: 'Abr', inversion: 550, leads: 71, conversiones: 12, ingresos: 0 },
];

const DEMO_MEDIA_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
    <rect width="720" height="720" rx="54" fill="#151515"/>
    <rect x="56" y="56" width="608" height="608" rx="42" fill="#202020" stroke="#C9A96E" stroke-width="3"/>
    <path d="M108 170h255" stroke="#C9A96E" stroke-width="20" stroke-linecap="round"/>
    <path d="M108 240h380" stroke="#7BA7E8" stroke-width="18" stroke-linecap="round"/>
    <path d="M108 310h260" stroke="#5BD6C7" stroke-width="18" stroke-linecap="round"/>
    <text x="108" y="435" fill="#F4F1EA" font-family="Arial, sans-serif" font-size="48" font-weight="700">Referencia visual</text>
    <text x="108" y="505" fill="#C9A96E" font-family="Arial, sans-serif" font-size="28" font-weight="700">Cliente Demo</text>
    <circle cx="560" cy="160" r="42" fill="#D83455"/>
  </svg>
`)}`;

export const DEMO_CONVERSATIONS = [
  { id:'demo-whatsapp-feria', conv_id:'demo-whatsapp-feria', nombre:'Cliente Demo', canal:'whatsapp', brand:'feria', accountName:'Feria Design', etiqueta:'propuesta', ultimoMsg:'Imagen recibida - referencia visual', hora:'10:18', noLeidos:1, telefono:'+593999999999', avatar:'CD', color:'#5B9BD5', media_tipo:'image', mime_type:'image/svg+xml', is_demo:true },
  { id:'demo-instagram-bl', conv_id:'demo-instagram-bl', nombre:'Fotógrafa Demo', canal:'instagram', brand:'bl', accountName:'Brand & Legacy', etiqueta:'caliente', ultimoMsg:'Quiero saber si trabajan con fotógrafos de boda.', hora:'11:04', noLeidos:0, telefono:'', avatar:'FD', color:'#D4537E', is_demo:true },
];

export const DEMO_MESSAGES = {
  'demo-whatsapp-feria': [
    { id:'dm1', from_cliente:true, texto:'Hola, vi el portafolio y me interesa una identidad para mi marca.', timestamp:new Date().toISOString(), is_demo:true },
    { id:'dm1b', from_cliente:true, texto:'Te comparto una referencia visual para que veas el estilo.', media_url:DEMO_MEDIA_IMAGE, media_tipo:'image', mime_type:'image/svg+xml', media_name:'referencia-visual.svg', timestamp:new Date().toISOString(), is_demo:true },
    { id:'dm1c', from_cliente:true, texto:'Tambien tengo este video de referencia para la sesion.', media_tipo:'video', mime_type:'video/mp4', media_name:'video-referencia.mp4', timestamp:new Date().toISOString(), is_demo:true },
    { id:'dm2', from_cliente:false, texto:'Hola, gracias por escribir. Te puedo compartir una ruta de trabajo y una cotización inicial.', timestamp:new Date().toISOString(), is_demo:true },
  ],
  'demo-instagram-bl': [
    { id:'dm3a', from_cliente:true, texto:'Te dejo una nota de voz con el contexto.', media_tipo:'audio', mime_type:'audio/mpeg', media_name:'nota-de-voz.mp3', timestamp:new Date().toISOString(), is_demo:true },
    { id:'dm3', from_cliente:true, texto:'Hola, soy fotógrafa de bodas. ¿Brand & Legacy también incluye web?', timestamp:new Date().toISOString(), is_demo:true },
    { id:'dm4', from_cliente:false, texto:'Sí. Podemos estructurar marca, discurso visual y sitio web según tu posicionamiento.', timestamp:new Date().toISOString(), is_demo:true },
  ],
};
