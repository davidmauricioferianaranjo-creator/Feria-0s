export const PROJECT_BRANDING_QUESTIONS = [
  { active: true, text: 'Nombre del proyecto\n¿Cuál es el nombre del proyecto?' },
  { active: true, text: 'País y ciudad\n¿En qué país y ciudad se desarrolla el proyecto?' },
  { active: true, text: 'Fecha\n¿Cuál es la fecha de inicio o registro de este brief?' },
  { active: true, text: 'Dirección\n¿Cuál es la dirección física o comercial del proyecto?' },
  { active: true, text: 'Historia del proyecto\n¿Cuál es la historia de tu proyecto?' },
  { active: true, text: 'Misión\n¿Cuál es la misión de tu proyecto?' },
  { active: true, text: 'Metas principales\n¿Cuáles son las metas más importantes que quieres alcanzar?\nOrdénalas de mayor a menor importancia.' },
  { active: true, text: 'Productos o servicios\n¿Qué productos o servicios ofrece tu proyecto?' },
  { active: true, text: 'Pasión por el proyecto\n¿Qué es lo que más te apasiona de este proyecto?' },
  { active: true, text: 'Frase síntesis\nDefine tu proyecto en una sola frase.' },
  { active: true, text: 'Mercado objetivo\n¿Cuál es tu mercado objetivo?' },
  { active: true, text: 'Percepción de marca\n¿Cómo quieres que tu marca sea percibida por tus usuarios o clientes?' },
  { active: true, text: 'Razón de preferencia\n¿Por qué tus clientes deberían preferir tu producto o servicio sobre otros?' },
  { active: true, text: 'Competidores\n¿Quiénes son tus principales competidores o referentes similares?' },
  { active: true, text: 'Ventajas competitivas\n¿Cuáles son tus ventajas frente a la competencia?' },
  { active: true, text: 'Desventajas competitivas\n¿Cuáles son tus desventajas frente a la competencia?' },
  { active: true, text: 'Marcas o proyectos que admiras\n¿Existe alguna empresa, marca o proyecto que admires?\n¿Cuál es y por qué?' },
  { active: true, text: 'Medición de efectividad\n¿Tienes alguna forma de medir la efectividad de tu producto, servicio o marca?\n¿Cuál?' },
  { active: true, text: 'Riesgos del proyecto\n¿Existe algún factor que pueda perjudicar a la empresa o proyecto?' },
];

export const BRIEF_TYPES = {
  branding: {
    nombre: 'Brief de Branding',
    descripcion: 'Para identidad visual, estrategia de marca y sistemas visuales.',
    servicioMatch: ['branding', 'brand identity', 'brand starter', 'identidad'],
    preguntas: PROJECT_BRANDING_QUESTIONS,
  },
  branding_fotografos: {
    nombre: 'Brief de Branding para Fotógrafos',
    descripcion: 'Para fotógrafos, videógrafos y marcas personales visuales. Usa el brief base de branding para capturar estrategia completa del proyecto.',
    servicioMatch: ['fotógrafo', 'fotografo', 'fotografía', 'fotografia', 'brand & legacy', 'legacy'],
    preguntas: PROJECT_BRANDING_QUESTIONS,
  },
  web: {
    nombre: 'Brief de Web',
    descripcion: 'Para sitio web, landing page, portafolio o ecommerce.',
    servicioMatch: ['web', 'landing', 'sitio', 'ecommerce', 'tienda'],
    preguntas: [
      { active: true, text: '¿Cuál es el objetivo principal del sitio web?' },
      { active: true, text: '¿Qué acción principal debe realizar el visitante?' },
      { active: true, text: '¿Qué secciones necesita tener el sitio?' },
      { active: true, text: '¿Ya tienes textos, fotografías, videos o productos listos?' },
      { active: true, text: '¿Qué sitios web te gustan como referencia?' },
      { active: true, text: '¿Cómo vas a medir que el sitio funcionó?' },
    ],
  },
  naming: {
    nombre: 'Brief de Naming',
    descripcion: 'Para creación o validación de nombre de marca.',
    servicioMatch: ['naming', 'nombre'],
    preguntas: [
      { active: true, text: '¿Qué debe comunicar el nombre de la marca?' },
      { active: true, text: '¿Qué palabras, ideas o territorios quieres evitar?' },
      { active: true, text: '¿En qué países o mercados se usará el nombre?' },
      { active: true, text: '¿Prefieres un nombre descriptivo, evocador, abstracto o inventado?' },
      { active: true, text: '¿Qué nombres de marcas te gustan y por qué?' },
      { active: true, text: '¿El nombre debe funcionar también como dominio o usuario en redes?' },
    ],
  },
  consultoria: {
    nombre: 'Brief de Consultoría',
    descripcion: 'Para diagnóstico, estrategia y acompañamiento de marca.',
    servicioMatch: ['consultoría', 'consultoria', 'asesoría', 'asesoria', 'estrategia'],
    preguntas: [
      { active: true, text: '¿Cuál es el reto principal que necesitas resolver ahora?' },
      { active: true, text: '¿Qué has intentado antes y qué resultado obtuviste?' },
      { active: true, text: '¿Qué decisión necesitas poder tomar al terminar la consultoría?' },
      { active: true, text: '¿Cuál es el estado actual de tu marca, equipo y operación?' },
      { active: true, text: '¿Qué información o indicadores tienes disponibles?' },
      { active: true, text: '¿En qué plazo necesitas ver avances concretos?' },
    ],
  },
};

function normalizeQuestion(q) {
  if (typeof q === 'string') return { active: true, text: q };
  return { active: q?.active !== false, text: q?.text || '' };
}

export function normalizeBriefs(saved) {
  const out = { ...BRIEF_TYPES };
  Object.keys(out).forEach(key => {
    const stored = saved?.[key];
    if (!stored) return;
    const preguntas = (stored.preguntas || []).map(normalizeQuestion).filter(q => String(q.text || '').trim());

    // Seguridad v76: el brief de Branding y Branding para Fotógrafos deben mantener
    // las 19 preguntas base si una versión antigua quedó guardada en localStorage.
    const needsFullBrandingBrief = ['branding', 'branding_fotografos'].includes(key);
    const finalQuestions = needsFullBrandingBrief && preguntas.length < PROJECT_BRANDING_QUESTIONS.length
      ? PROJECT_BRANDING_QUESTIONS
      : (preguntas.length ? preguntas : out[key].preguntas);

    out[key] = { ...out[key], ...stored, preguntas: finalQuestions };
  });
  return out;
}

export function getBriefTypeFromService(service = '') {
  const s = String(service || '').toLowerCase();
  const match = Object.entries(BRIEF_TYPES).find(([, brief]) => brief.servicioMatch.some(token => s.includes(token)));
  return match?.[0] || 'branding';
}

export function getBriefQuestionsForService(service = '') {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('feria_briefs') || 'null'); } catch {}
  const all = normalizeBriefs(saved);
  const type = getBriefTypeFromService(service);
  const questions = (all[type]?.preguntas || []).filter(q => q.active !== false && String(q.text || '').trim());
  return questions.map((q, i) => ({
    letra: String(i + 1),
    full: `Pregunta ${i + 1}`,
    pregunta: q.text,
    placeholder: 'Tu respuesta…',
  }));
}
