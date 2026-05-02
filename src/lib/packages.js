// ── src/lib/packages.js ────────────────────────────────────────────────────
// Fuente de verdad de categorías y paquetes de cotización.
// visible: false → no aparece en el landing del cliente (admin puede ocultar).
// featured: true → se muestra primero con badge "Plan recomendado".
// El orden en el array define el orden de aparición en el landing.

// ── CONFIGURACIÓN DEL ESTUDIO ─────────────────────────────────────────────
export const ESTUDIO_WHATSAPP = '593980250889'; // Sin + ni espacios

// ── PRECIOS POR MERCADO ───────────────────────────────────────────────────
// nacional     = Ecuador · precios en USD
// internacional = LATAM · USA · Europa · precios más altos (mercado global)
export const PRECIOS_INTERNACIONAL = {
  // Branding Corporativo
  branding_starter:  1800,   // nacional $1,200
  branding_identity: 3900,   // nacional $2,800
  branding_legacy:   5800,   // nacional $4,200
  // Brand & Legacy
  bl_esencial:       2200,   // nacional $1,500
  bl_signature:      3800,   // nacional $2,500
  bl_legacy:         5500,   // nacional $3,800
  // Dirección de Arte
  arte_conceptual:   1900,   // nacional $1,250
};
export const CALENDLY_LINK    = 'https://calendly.com/feria-design';
export const AGENDAR_LINK     = CALENDLY_LINK; // alias para compatibilidad
export const PACKAGE_CONFIG_STORAGE_KEY = 'feria_package_config_v1';

function readPackageConfig(defaultApplications, defaultRules) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { applications: defaultApplications, rules: defaultRules };
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(PACKAGE_CONFIG_STORAGE_KEY) || 'null');
    if (!saved) return { applications: defaultApplications, rules: defaultRules };

    const savedApps = Array.isArray(saved.applications) ? saved.applications : [];
    const appsById = new Map(savedApps.map(app => [app.id, app]));
    const applications = [
      ...defaultApplications.map(app => ({ ...app, ...(appsById.get(app.id) || {}) })),
      ...savedApps.filter(app => app?.id && !defaultApplications.some(def => def.id === app.id)),
    ];

    const savedRules = saved.rules && typeof saved.rules === 'object' ? saved.rules : {};
    const rules = Object.fromEntries(
      Object.entries(defaultRules).map(([name, rule]) => [name, { ...rule, ...(savedRules[name] || {}) }])
    );

    Object.entries(savedRules).forEach(([name, rule]) => {
      if (!rules[name]) rules[name] = rule;
    });

    return { applications, rules };
  } catch {
    return { applications: defaultApplications, rules: defaultRules };
  }
}

// ── CATEGORÍAS DE SERVICIO ────────────────────────────────────────────────
export const CATEGORIAS = [
  {
    id:          'branding',
    nombre:      'Branding Corporativo',
    subtitulo:   'Identidad visual para empresas y marcas',
    brand:       'feria',
    color:       'var(--gold)',
    icono:       '◈',
    orden:       1,
  },
  {
    id:          'bl',
    nombre:      'Brand & Legacy',
    subtitulo:   'Branding para fotógrafos y videógrafos',
    brand:       'bl',
    color:       'var(--purple)',
    icono:       '◉',
    orden:       2,
  },
  {
    id:          'arte',
    nombre:      'Dirección de Arte',
    subtitulo:   'Concepto creativo para campañas y lanzamientos',
    brand:       'feria',
    color:       'var(--teal)',
    icono:       '◇',
    orden:       3,
  },
];

// ── PAQUETES POR CATEGORÍA ────────────────────────────────────────────────
export const PAQUETES = [

  // ── BRANDING CORPORATIVO ─────────────────────────────────────────────
  {
    id:        'branding_starter',
    categoria: 'branding',
    nombre:    'Brand Starter',
    subtitulo: 'Para marcas que inician con bases sólidas',
    precio:    1200,
    duracion:  '20 días hábiles',
    visible:   true,
    featured:  false,
    orden:     3,
    items: [
      'Brief de proyecto',
      'Análisis de información',
      'Logotipo principal (1 propuesta)',
      'Paleta de colores (3 tonos)',
      'Tipografías corporativas',
      'Guía de uso básica (PDF)',
      '3 aplicativos de marca',
    ],
  },
  {
    id:        'branding_identity',
    categoria: 'branding',
    nombre:    'Brand Identity',
    subtitulo: 'Para marcas que buscan profesionalizar su identidad',
    precio:    2800,
    duracion:  '45 días hábiles',
    visible:   true,
    featured:  true,
    orden:     2,
    items: [
      'Brief estratégico de proyecto',
      'Estudio cromático, tipográfico y morfológico',
      'Diseño de ícono y logotipo',
      'Tipografía complementaria',
      'Gráfica de apoyo',
      'Manual de marca completo (13 secciones)',
      '5 aplicativos de marca',
      'Entrega en formatos editables',
    ],
  },
  {
    id:        'branding_legacy',
    categoria: 'branding',
    nombre:    'Brand Legacy',
    subtitulo: 'El sistema de marca corporativo más completo',
    precio:    4200,
    duracion:  '60 días hábiles',
    visible:   true,
    featured:  false,
    orden:     1,
    items: [
      'Todo lo incluido en Brand Identity',
      'Estrategia de posicionamiento de marca',
      'Análisis de competencia y mercado',
      'Sistema visual completo con submarca',
      'Manual de marca avanzado (20 secciones)',
      '10 aplicativos de marca',
      'Estrategia de comunicación y tono de voz',
      'Acompañamiento al lanzamiento (1 mes)',
      'Sesión de revisión mensual (3 meses)',
    ],
  },

  // ── BRAND & LEGACY (FOTÓGRAFOS / VIDEÓGRAFOS) ─────────────────────────
  {
    id:        'bl_esencial',
    categoria: 'bl',
    nombre:    'B&L Esencial',
    subtitulo: 'Para fotógrafos que inician su marca personal',
    precio:    1500,
    duracion:  '25 días hábiles',
    visible:   true,
    featured:  false,
    orden:     3,
    items: [
      'Brief de marca personal',
      'Logotipo principal y monograma',
      'Paleta de colores y tipografías',
      'Guía de uso básica',
      'Firma de correo con marca',
      '2 plantillas para redes sociales',
      'Watermark para fotografías',
    ],
  },
  {
    id:        'bl_signature',
    categoria: 'bl',
    nombre:    'B&L Signature',
    subtitulo: 'La identidad completa para fotógrafos profesionales',
    precio:    2500,
    duracion:  '40 días hábiles',
    visible:   true,
    featured:  true,
    orden:     2,
    items: [
      'Brief estratégico de marca personal',
      'Logotipo principal, secundario y monograma',
      'Sistema visual completo',
      'Manual de marca compacto',
      'Pack de plantillas para Instagram (6 piezas)',
      'Presets de color de marca (Lightroom)',
      'Watermark y elementos de marca',
      'Portafolio digital (estructura y layout)',
    ],
  },
  {
    id:        'bl_legacy',
    categoria: 'bl',
    nombre:    'B&L Legacy',
    subtitulo: 'El sistema de marca más completo para fotógrafos',
    precio:    3800,
    duracion:  '55 días hábiles',
    visible:   true,
    featured:  false,
    orden:     1,
    items: [
      'Todo lo incluido en B&L Signature',
      'Estrategia de posicionamiento para fotógrafos',
      'Brand Kit Portal digital personalizado',
      'Galería de marca con descarga de assets',
      'Pack completo de redes sociales (12 piezas)',
      'Guía de pricing y propuesta de valor',
      'Sesión de dirección de arte fotográfica',
      'Acompañamiento mensual (3 meses)',
    ],
  },

  // ── DIRECCIÓN DE ARTE ────────────────────────────────────────────────
  {
    id:        'arte_conceptual',
    categoria: 'arte',
    nombre:    'Dirección de Arte',
    subtitulo: 'Concepto creativo para campañas y lanzamientos',
    precio:    1250,
    duracion:  '10 días hábiles',
    visible:   true,
    featured:  false,
    orden:     1,
    items: [
      'Análisis conceptual de la marca',
      'Definición del concepto creativo central',
      'Lineamientos de storytelling',
      'Construcción de Concept Board',
      'Referencias visuales y audiovisuales',
      'Guía creativa para equipo de producción',
    ],
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────

/** Precio según mercado — 'nacional' | 'internacional' */
export function getPrecio(paqueteId, mercado = 'internacional') {
  if (mercado === 'nacional') {
    const pkg = PAQUETES.find(p => p.id === paqueteId);
    return pkg?.precio || 0;
  }
  return PRECIOS_INTERNACIONAL[paqueteId] || PAQUETES.find(p => p.id === paqueteId)?.precio || 0;
}

/** Paquetes de una categoría, ordenados, opcionalmente solo los visibles */
export function paquetesPorCategoria(categoriaId, soloVisibles = false) {
  return PAQUETES
    .filter(p => p.categoria === categoriaId && (!soloVisibles || p.visible))
    .sort((a, b) => a.orden - b.orden);
}

/** Categoría por id */
export function categoriaById(id) {
  return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[0];
}

/** Paquete por id */
export function paqueteById(id) {
  return PAQUETES.find(p => p.id === id);
}

/** Genera el link de WhatsApp pre-escrito para un paquete */
export function buildWALink(paquete, clienteNombre = '') {
  const saludo = clienteNombre ? `Hola Feria 👋\n\n` : `Hola Feria 👋\n\n`;
  const msg = `${saludo}Acabo de ver la propuesta de *Feria Design Studio* y me interesa el plan *${paquete.nombre}* ($${paquete.precio.toLocaleString()} USD).\n\n¿Podemos conversar?`;
  return `https://wa.me/${ESTUDIO_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

// ── COMPAT: PAQUETES_BASE (alias para código existente) ──────────────────
// Mantiene compatibilidad con el código actual de Cotizaciones que usa PAQUETES_BASE.
export const PAQUETES_BASE = PAQUETES.map(p => ({
  id:       p.id,
  nombre:   p.nombre,
  precio:   p.precio,
  duracion: p.duracion,
  brand:    CATEGORIAS.find(c => c.id === p.categoria)?.brand || 'feria',
  color:    CATEGORIAS.find(c => c.id === p.categoria)?.color || 'var(--gold)',
  subtitulo: p.subtitulo,
  featured: p.featured,
  visible:  p.visible,
  categoria: p.categoria,
  items:    p.items,
}));

// ── APPLICATION CATALOG (sin cambios) ────────────────────────────────────
export const DEFAULT_APPLICATION_CATALOG = [
  { id: 'logo_principal',         name: 'Logotipo principal',               category: 'Identidad',   basePrice: 0   },
  { id: 'variaciones_marca',      name: 'Variaciones de marca',             category: 'Identidad',   basePrice: 0   },
  { id: 'manual_marca',           name: 'Manual de marca',                  category: 'Identidad',   basePrice: 0   },
  { id: 'tarjeta_presentacion',   name: 'Tarjeta de presentación',          category: 'Papelería',   basePrice: 80  },
  { id: 'firma_correo',           name: 'Firma de correo',                  category: 'Papelería',   basePrice: 60  },
  { id: 'hoja_membretada',        name: 'Hoja membretada',                  category: 'Papelería',   basePrice: 75  },
  { id: 'carpeta_corporativa',    name: 'Carpeta corporativa',              category: 'Papelería',   basePrice: 120 },
  { id: 'plantilla_post',         name: 'Plantilla de post Instagram',      category: 'Social',      basePrice: 95  },
  { id: 'plantilla_story',        name: 'Plantilla de historia Instagram',  category: 'Social',      basePrice: 75  },
  { id: 'portada_destacados',     name: 'Portadas de destacados',           category: 'Social',      basePrice: 70  },
  { id: 'presentacion_comercial', name: 'Presentación comercial',           category: 'Comercial',   basePrice: 220 },
  { id: 'brochure',               name: 'Brochure / dossier',               category: 'Comercial',   basePrice: 240 },
  { id: 'landing_visual',         name: 'Landing page visual',              category: 'Digital',     basePrice: 280 },
  { id: 'empaque',                name: 'Diseño de empaque',                category: 'Producto',    basePrice: 320 },
  { id: 'etiqueta',               name: 'Etiqueta de producto',             category: 'Producto',    basePrice: 180 },
  { id: 'menu',                   name: 'Menú / carta',                     category: 'Gastronomía', basePrice: 180 },
  { id: 'uniforme',               name: 'Aplicación en uniforme',           category: 'Experiencia', basePrice: 150 },
  { id: 'senaletica',             name: 'Señalética básica',                category: 'Experiencia', basePrice: 220 },
  { id: 'sticker',                name: 'Sticker / sello',                  category: 'Experiencia', basePrice: 65  },
  { id: 'watermark',              name: 'Watermark de marca',               category: 'Fotografía',  basePrice: 60  },
  { id: 'preset_lightroom',       name: 'Preset Lightroom de marca',        category: 'Fotografía',  basePrice: 120 },
  { id: 'portafolio_digital',     name: 'Portafolio digital (layout)',      category: 'Fotografía',  basePrice: 280 },
];

export const DEFAULT_PACKAGE_RULES = {
  'Brand Starter':     { label: 'Brand Starter',    includedApplications: 3,  defaultService: 'Branding',              price: 1200 },
  'Brand Identity':    { label: 'Brand Identity',   includedApplications: 5,  defaultService: 'Branding',              price: 2800 },
  'Brand Legacy':      { label: 'Brand Legacy',     includedApplications: 10, defaultService: 'Branding',              price: 4200 },
  'B&L Esencial':      { label: 'B&L Esencial',     includedApplications: 3,  defaultService: 'Brand & Legacy',        price: 1500 },
  'B&L Signature':     { label: 'B&L Signature',    includedApplications: 6,  defaultService: 'Brand & Legacy',        price: 2500 },
  'B&L Legacy':        { label: 'B&L Legacy',       includedApplications: 8,  defaultService: 'Brand & Legacy',        price: 3800 },
  'Dirección de Arte': { label: 'Dirección de Arte', includedApplications: 0, defaultService: 'Dirección de Arte',     price: 1250 },
  'Naming':            { label: 'Naming',            includedApplications: 0, defaultService: 'Naming',                price: 900  },
  'Web':               { label: 'Web',               includedApplications: 3, defaultService: 'Web',                   price: 2400 },
};

const packageConfig = readPackageConfig(DEFAULT_APPLICATION_CATALOG, DEFAULT_PACKAGE_RULES);
export const APPLICATION_CATALOG = packageConfig.applications;
export const PACKAGE_RULES = packageConfig.rules;

export function getPackageRule(packageName = 'Brand Starter') {
  return PACKAGE_RULES[packageName] || PACKAGE_RULES['Brand Starter'];
}

export function applicationById(id) {
  return APPLICATION_CATALOG.find(app => app.id === id) || { id, name: id, category: 'Aplicación', basePrice: 0 };
}

export function defaultApplicationsForPackage(packageName) {
  const rule = getPackageRule(packageName);
  const suggestedIds = Array.isArray(rule.suggestedApplicationIds) && rule.suggestedApplicationIds.length
    ? rule.suggestedApplicationIds
    : APPLICATION_CATALOG.slice(0, Math.max(0, rule.includedApplications)).map(app => app.id);
  const suggestedApps = suggestedIds
    .map(id => APPLICATION_CATALOG.find(app => app.id === id))
    .filter(Boolean);
  const includedCount = Number.isFinite(Number(rule.includedApplications))
    ? Math.max(0, Number(rule.includedApplications))
    : suggestedApps.length;

  return suggestedApps.slice(0, includedCount).map((app, index) => ({
    application_id: app.id,
    name:           app.name,
    category:       app.category,
    status:         'pendiente',
    is_extra:       false,
    extra_status:   'incluida',
    sort_order:     index + 1,
  }));
}
