import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { db } from '../lib/db';
import { normalizePermissions, initialsFromName } from '../lib/permissions';
import { onlyOperationalRows, DEMO_IDS } from '../lib/operationalData';
import { defaultApplicationsForPackage, applicationById, getPackageRule } from '../lib/packages';
import { emailBienvenida, emailBrief } from '../lib/emails';
import { createPaymentLink, savePaymentLink } from '../lib/stripe';

const AppContext = createContext(null);

function applyTheme(theme) {
  const r = document.documentElement;
  if (theme === 'light') {
    // Light Mode Premium: Blancos puros y grises ultra-suaves (estilo Vercel/Linear)
    r.style.setProperty('--dark',      '#ffffff'); // Sidebar
    r.style.setProperty('--s1',        '#fafafa'); // Main content bg
    r.style.setProperty('--s2',        '#ffffff'); // Cards
    r.style.setProperty('--s3',        '#f4f4f5'); // Hover states
    r.style.setProperty('--s4',        '#e4e4e7'); // Elements/Scrollbars
    r.style.setProperty('--border-s',  'rgba(0,0,0,0.06)');
    r.style.setProperty('--border-m',  'rgba(0,0,0,0.1)');
    r.style.setProperty('--border',    'rgba(0,0,0,0.15)');
    r.style.setProperty('--text',      '#18181b'); // Zinc 900
    r.style.setProperty('--text-m',    '#52525b'); // Zinc 600
    r.style.setProperty('--text-d',    '#a1a1aa'); // Zinc 400
    r.style.setProperty('--gold-faint','rgba(225, 29, 72, 0.08)');
  } else {
    // Dark Mode Premium: OLED blacks y grises neutros
    r.style.setProperty('--dark',      '#000000');
    r.style.setProperty('--s1',        '#0a0a0a');
    r.style.setProperty('--s2',        '#121212');
    r.style.setProperty('--s3',        '#1a1a1a');
    r.style.setProperty('--s4',        '#262626');
    r.style.setProperty('--border-s',  'rgba(255,255,255,0.05)');
    r.style.setProperty('--border-m',  'rgba(255,255,255,0.08)');
    r.style.setProperty('--border',    'rgba(255,255,255,0.12)');
    r.style.setProperty('--text',      '#d4d4d8');
    r.style.setProperty('--text-m',    '#a1a1aa');
    r.style.setProperty('--text-d',    '#71717a');
    r.style.setProperty('--gold-faint','rgba(225, 29, 72, 0.1)');
  }
}

// En producción REACT_APP_USE_SEED debe ser undefined (no 'true')
// En desarrollo local puedes poner REACT_APP_USE_SEED=true en .env para usar datos de ejemplo
const USE_SEED = process.env.NODE_ENV === 'test' || process.env.REACT_APP_USE_SEED === 'true';

function normalizeTeamMember(m = {}) {
  const brandList = Array.isArray(m.brands) ? m.brands : (m.brand ? [m.brand] : ['feria', 'bl']);
  const roleId = m.perms || m.role_id || m.access_role || 'creativo';
  return {
    ...m,
    name: m.name || m.nombre || m.email || 'Nuevo miembro',
    initials: m.initials || initialsFromName(m.name || m.nombre, m.email),
    perms: roleId,
    role: m.role || m.cargo || 'Colaborador',
    brands: brandList.length ? brandList : ['feria'],
    permissions: normalizePermissions(roleId, m.permissions),
    bg: m.bg || (m.color || '#5B9BD5') + '22',
  };
}

function hideDemo(rows = [], demoMode = false) {
  return onlyOperationalRows(rows, demoMode);
}

const SEED = {
  studio: {
    name: 'Feria Design Studio',
    brands: [
      { id: 'feria', name: 'Feria Design',   color: '#5B9BD5' },
      { id: 'bl',    name: 'Brand & Legacy', color: '#D4537E' },
    ],
    // diasRestantes calculado dinámicamente — nunca hardcodeado
    meta: { objetivo: 14000, actual: 0, diasRestantes: 0 },
  },

  team: [
    { id: 1, name: 'David',  initials: 'DA', role: 'Director',         color: '#C9A96E', bg: 'rgba(201,169,110,0.15)', brands: ['feria','bl'], perms: 'admin',    proyectos: [] },
    { id: 2, name: 'Selene', initials: 'SE', role: 'Estrategia · leads',color: '#4ECDC4', bg: 'rgba(78,205,196,0.15)',  brands: ['feria','bl'], perms: 'crm',      proyectos: [] },
    { id: 3, name: 'Anthea', initials: 'AN', role: 'Diseñadora',        color: '#D4537E', bg: 'rgba(212,83,126,0.15)', brands: ['bl'],         perms: 'creativo', proyectos: [] },
  ],

  clientes:      [],
  proyectos:     [],
  cobros:        [],
  gastos:        [],
  leads:         [],
  notificaciones:[],
  reuniones:     [],
  projectUpdates:[],
  projectApplications:[],
  projectChatMessages:[],
  projectUpdateComments:[],
  marketingPerformance:[],
  deudas:        [],
};

// ── STAGE LABELS ──────────────────────────────────────────────────────────
export const STAGE_LABELS = [
  'Captación', 'Propuesta', 'Contrato', 'Cobro 60%',
  'Brief', 'Reunión', 'Producción', 'Aprobación',
  'Cobro 40%', 'Brand Kit', 'Post-venta',
];

export const KANBAN_COLS = [
  { id: 'origen',       label: 'El Origen',    color: '#8A8070' },
  { id: 'exploracion',  label: 'Exploración',  color: '#5B9BD5' },
  { id: 'refinamiento', label: 'Refinamiento', color: '#C9A96E' },
  { id: 'entrega',      label: 'Entrega',      color: '#7BC67A' },
  { id: 'completado',   label: 'Completado',   color: '#4ECDC4' },
];


function addDaysISO(days = 3) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildPortalAccess(cliente = {}) {
  const email = cliente.email || cliente.clientEmail || '';
  const passwordSeed = String(cliente.id || email || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return {
    portal_url: `${window.location.origin}/portal`,
    portal_email: email,
    portal_password: cliente.portal_password || `Feria-${passwordSeed || '2026'}!`,
    portal_access_status: 'activo',
    portal_credentials_sent_at: new Date().toISOString(),
  };
}

// ── PROVIDER ──────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [data, setData] = useState(SEED);
  const [activeBrand, setActiveBrand] = useState('all');
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('feria_theme') || 'dark');
  const [accentColor, setAccentColorState] = useState(() => localStorage.getItem('feria_accent_color') || '#E11D48');
  const [studioLogo, setStudioLogo] = useState(null);
  const studioIdRef = React.useRef(null); // UUID real del studio en DB — usado en updateMeta
  const [dbReady, setDbReady] = useState(false);
  const [demoMode, setDemoModeState] = useState(() => localStorage.getItem('feria_demo_mode') === 'true');

  // ── CALCULAR DÍAS RESTANTES EN EL MES ─────────────────────────
  function calcDiasRestantes() {
    const hoy  = new Date();
    const fin  = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return fin.getDate() - hoy.getDate();
  }

  // ── CARGAR DESDE SUPABASE ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured) {
      // Sin Supabase: al menos calcula diasRestantes correctamente
      setData(d => ({ ...d, studio: { ...d.studio, meta: { ...d.studio.meta, diasRestantes: calcDiasRestantes() } } }));
      return;
    }

    async function loadFromDB() {
      if (USE_SEED) {
        setDbReady(true);
        setData(d => ({ ...d, studio: { ...d.studio, meta: { ...d.studio.meta, diasRestantes: calcDiasRestantes() } } }));
        return;
      }
      try {
        const [clientesRows, cobrosRows, gastosRows, leadsRows, notifsRows, proyectosRows, studioRows, teamRows, reunionesRows, projectUpdatesRows, projectApplicationsRows, projectChatRows, projectCommentsRows, marketingPerformanceRows] = await Promise.all([
          db.clientes.getAll(),
          db.cobros.getAll(),
          db.gastos.getAll(),
          db.leads.getAll(),
          db.notificaciones.getAll(),
          db.proyectos.getAll(),
          supabase.from('studio').select('*').limit(1),
          supabase.from('team').select('*'),
          supabase.from('reuniones').select('*').order('fecha', { ascending: true }),
          supabase.from('project_updates').select('*').order('created_at', { ascending: false }),
          supabase.from('project_applications').select('*').order('sort_order', { ascending: true }),
          supabase.from('project_chat_messages').select('*').order('created_at', { ascending: true }),
          supabase.from('project_update_comments').select('*').order('created_at', { ascending: true }),
          supabase.from('marketing_performance').select('*').order('period_start', { ascending: false }),
        ]);

        const diasRestantes = calcDiasRestantes();
        const studioData    = studioRows.data?.[0];
        if (studioData?.id) studioIdRef.current = studioData.id;
        const teamData      = teamRows.data || [];

        setData(prev => ({
          ...prev,
          clientes:  clientesRows.length  ? hideDemo(clientesRows, demoMode)  : prev.clientes,
          cobros:    cobrosRows.length    ? hideDemo(cobrosRows, demoMode).map(c => ({ ...c, clienteId: c.cliente_id })) : prev.cobros,
          gastos:    gastosRows.length    ? hideDemo(gastosRows, demoMode)    : prev.gastos,
          leads:     leadsRows.length     ? hideDemo(leadsRows, demoMode)     : prev.leads,
          proyectos: proyectosRows.length ? hideDemo(proyectosRows, demoMode).map(p => ({ ...p, clienteId: p.cliente_id, creativo: p.creativo_id, pctInterno: p.pct_interno, pctCliente: p.pct_cliente, diasEntrega: p.dias_entrega, diasEjecucion: p.dias_ejecucion, fechaEntregaCliente: p.client_due_date, fechaEntregaInterna: p.internal_due_date, paquete: p.package_name, aplicacionesIncluidas: p.package_app_limit })) : prev.proyectos,
          notificaciones: notifsRows.length ? hideDemo(notifsRows, demoMode).map(n => ({ ...n, desc: n.descripcion })) : prev.notificaciones,
          reuniones: reunionesRows.data?.length ? hideDemo(reunionesRows.data, demoMode) : prev.reuniones || [],
          projectUpdates: projectUpdatesRows.data?.length ? hideDemo(projectUpdatesRows.data, demoMode) : prev.projectUpdates || [],
          projectApplications: projectApplicationsRows.data?.length ? hideDemo(projectApplicationsRows.data, demoMode) : prev.projectApplications || [],
          projectChatMessages: projectChatRows.data?.length ? hideDemo(projectChatRows.data, demoMode) : prev.projectChatMessages || [],
          projectUpdateComments: projectCommentsRows.data?.length ? hideDemo(projectCommentsRows.data, demoMode) : prev.projectUpdateComments || [],
          marketingPerformance: marketingPerformanceRows.data?.length ? hideDemo(marketingPerformanceRows.data, demoMode) : prev.marketingPerformance || [],
          studio: {
            ...prev.studio,
            meta: {
              objetivo:     studioData?.meta_objetivo ?? prev.studio.meta.objetivo,
              actual:       0,
              diasRestantes,
            },
          },
          team: teamData.length ? hideDemo(teamData, demoMode).map(normalizeTeamMember) : prev.team.map(normalizeTeamMember),
        }));
        setDbReady(true);
      } catch (err) {
        console.warn('DB no disponible, usando datos locales', err);
        setData(d => ({ ...d, studio: { ...d.studio, meta: { ...d.studio.meta, diasRestantes: calcDiasRestantes() } } }));
      }
    }

    loadFromDB();

    // Realtime: escuchar cambios en cobros
    const channel = supabase
      .channel('cobros-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cobros' }, (payload) => {
        const updated = payload.new;
        setData(d => ({
          ...d,
          cobros: d.cobros.map(c => c.id === updated.id ? { ...c, ...updated, clienteId: updated.cliente_id } : c),
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () => {
        db.notificaciones.getAll().then(rows => {
          if (rows.length) setData(d => ({ ...d, notificaciones: hideDemo(rows, demoMode).map(n => ({ ...n, desc: n.descripcion })) }));
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [demoMode]);

  const toggleTheme = useCallback((t) => {
    const next = t || (theme === 'dark' ? 'light' : 'dark');
    setTheme(next);
    localStorage.setItem('feria_theme', next);
    applyTheme(next);
  }, [theme]);

  const setAccentColor = useCallback((color) => {
    setAccentColorState(color);
    localStorage.setItem('feria_accent_color', color);
    const r = document.documentElement;
    r.style.setProperty('--gold', color);
    r.style.setProperty('--gold-faint', color + '18');
  }, []);

  useEffect(() => {
    applyTheme(theme);
    setAccentColor(accentColor);
  }, [theme, accentColor, setAccentColor]);

  const showToast = useCallback((msg, icon = '✦') => {
    setToast({ msg, icon, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const addNotification = useCallback(async (notification = {}) => {
    const createdAt = notification.created_at || new Date().toISOString();
    const generatedId = crypto.randomUUID?.();
    const row = {
      id: generatedId || `${Date.now()}-notification`,
      tipo: notification.tipo || 'interno',
      titulo: notification.titulo || 'Notificación interna',
      desc: notification.desc || notification.descripcion || '',
      descripcion: notification.descripcion || notification.desc || '',
      leida: notification.leida ?? false,
      created_at: createdAt,
      ...notification,
    };

    setData(d => ({ ...d, notificaciones: [row, ...(d.notificaciones || [])] }));

    if (isConfigured) {
      const dbRow = {
        ...(generatedId ? { id: generatedId } : {}),
        tipo: row.tipo,
        titulo: row.titulo,
        descripcion: row.descripcion || row.desc || '',
        leida: row.leida,
        created_at: row.created_at,
      };
      try { await supabase.from('notificaciones').insert([dbRow]); } catch (_) {}
    }

    return row;
  }, []);

  const setDemoMode = useCallback((on, { silent = false } = {}) => {
    const next = Boolean(on);
    setDemoModeState(next);
    localStorage.setItem('feria_demo_mode', String(next));
    if (!next) {
      setData(d => ({
        ...d,
        clientes: d.clientes.filter(x => !x.is_demo),
        proyectos: d.proyectos.filter(x => !x.is_demo),
        cobros: d.cobros.filter(x => !x.is_demo),
        gastos: d.gastos.filter(x => !x.is_demo),
        leads: d.leads.filter(x => !x.is_demo),
        notificaciones: d.notificaciones.filter(x => !x.is_demo),
        reuniones: (d.reuniones || []).filter(x => !x.is_demo),
        projectUpdates: (d.projectUpdates || []).filter(x => !x.is_demo),
        projectApplications: (d.projectApplications || []).filter(x => !x.is_demo),
        projectChatMessages: (d.projectChatMessages || []).filter(x => !x.is_demo),
        projectUpdateComments: (d.projectUpdateComments || []).filter(x => !x.is_demo),
        marketingPerformance: (d.marketingPerformance || []).filter(x => !x.is_demo),
        team: (d.team || []).filter(x => !x.is_demo),
      }));
    }
    if (!silent) {
      showToast(next ? 'Modo prueba activo' : 'Modo real activo', next ? '🧪' : '✓');
    }
  }, [showToast]);

  const loadDemoFlow = useCallback(async ({ silent = false } = {}) => {
    const clienteId = DEMO_IDS.cliente;
    const proyectoId = DEMO_IDS.proyecto;
    const cobroId = DEMO_IDS.cobro;
    const contratoId = DEMO_IDS.contrato;
    const briefId = DEMO_IDS.brief;
    const now = new Date().toISOString();
    const teamIds = {
      admin: '00000000-0000-4000-8000-000000000401',
      crm: '00000000-0000-4000-8000-000000000402',
      designer: '00000000-0000-4000-8000-000000000403',
      finance: '00000000-0000-4000-8000-000000000404',
    };
    const demoTeam = [
      { id: teamIds.admin, name:'David Demo', initials:'DD', role:'Director demo', email:'admin.demo@feria.design', color:'#C9A96E', bg:'rgba(201,169,110,0.15)', brands:['feria','bl'], perms:'admin', permissions:{ modules:['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','admin','portal'], brands:['feria','bl'] }, is_demo:true },
      { id: teamIds.crm, name:'Selena Demo', initials:'SD', role:'CRM / Ventas demo', email:'selena.demo@feria.design', color:'#4ECDC4', bg:'rgba(78,205,196,0.15)', brands:['feria','bl'], perms:'crm', permissions:{ modules:['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','portal'], brands:['feria','bl'] }, is_demo:true },
      { id: teamIds.designer, name:'Diseñadora Demo', initials:'DI', role:'Diseñadora demo', email:'disenador.demo@feria.design', color:'#D4537E', bg:'rgba(212,83,126,0.15)', brands:['feria','bl'], perms:'creativo', permissions:{ modules:['dashboard','calendario','kanban'], brands:['feria','bl'] }, is_demo:true },
      { id: teamIds.finance, name:'Finanzas Demo', initials:'FI', role:'Finanzas demo', email:'finanzas.demo@feria.design', color:'#7BC67A', bg:'rgba(123,198,122,0.15)', brands:['feria','bl'], perms:'finanzas', permissions:{ modules:['dashboard','finanzas'], brands:['feria','bl'] }, is_demo:true },
    ].map(normalizeTeamMember);
    const cliente = { id: clienteId, nombre: 'Cliente Demo', email: 'cliente.demo@feria.design', telefono: '+593999999999', whatsapp: '+593999999999', empresa: 'Marca Cliente Demo', servicio: 'Branding para Fotógrafos', service_type: 'branding_fotografos', monto: 2800, stage: 5, brand: 'feria', color: '#5B9BD5', portal_access_status:'activo', is_demo: true, created_at: now };
    const proyecto = { id: proyectoId, clienteId, cliente_id: clienteId, nombre: 'Cliente Demo — Branding', estado: 'EL ORIGEN', fase: 4, pctInterno: 25, pctCliente: 35, diasEntrega: 45, diasEjecucion: 8, fechaEntregaCliente: new Date(Date.now()+45*86400000).toISOString().slice(0,10), fechaEntregaInterna: new Date(Date.now()+30*86400000).toISOString().slice(0,10), paquete:'Paquete 2', aplicacionesIncluidas:5, package_name:'Paquete 2', package_app_limit:5, creativo: teamIds.designer, creativo_id: teamIds.designer, production_status:'asignado', designer_assigned_at: now, brand: 'feria', is_demo: true, created_at: now };
    const cobro = { id: cobroId, clienteId, cliente_id: clienteId, nombre: 'Anticipo 60% · Demo', monto: 1680, tipo: 'Anticipo 60%', status: 'paid', via: 'Stripe', is_demo: true, created_at: now, updated_at: now };
    const contrato = { id: contratoId, cliente_id: clienteId, firmante: 'Cliente Demo', firmante_doc: 'Demo', contenido: 'Contrato demo · Branding para Fotógrafos', status: 'firmado', fecha_firma: now, service_type: 'branding_fotografos', estudio_firmado:true, is_demo: true, created_at: now };
    const brief = { id: briefId, cliente_id: clienteId, respuestas: null, completado: false, service_type: 'branding_fotografos', template_key:'branding_fotografos', activo:true, is_demo: true, updated_at: now };
    const lead = { id: '00000000-0000-4000-8000-000000000107', nombre:'Lead Demo', origen:'Instagram', status:'caliente', dias:1, brand:'feria', valor_estimado:2800, is_demo:true, created_at:now };
    const gasto = { id: '00000000-0000-4000-8000-000000000108', nombre:'Suscripción demo · Software', categoria:'Software / Suscripciones', monto:120, status:'pagado', is_demo:true, created_at:now };
    const reunion = { id: '00000000-0000-4000-8000-000000000109', titulo:'Reunión demo · Presentación de marca', tipo:'presentacion', cliente:'Cliente Demo', cliente_id:clienteId, fecha:new Date(Date.now()+2*86400000).toISOString(), duracion:60, link:'https://zoom.us/j/demo', notas:'Revisión del flujo de agenda y seguimiento.', confirmada:true, solicitud_cliente:false, is_demo:true };
    const notificacion = { id: '00000000-0000-4000-8000-000000000106', tipo: 'demo', titulo: 'Flujo demo cargado', desc: 'Cuentas demo, cliente, proyecto asignado, contrato, cobro, brief, reunión y lead listos para probar Feria OS.', leida: false, is_demo: true, created_at: now };
    const projectUpdate = { id:'00000000-0000-4000-8000-000000000110', proyecto_id:proyectoId, tipo:'avance', titulo:'Demo · primera exploración visual', descripcion:'Archivo demo subido para simular revisión interna.', archivo_url:'https://feria.design', status:'pendiente_revision', version_label:'V1', file_type:'pdf', created_by:teamIds.designer, reviewer_id:teamIds.admin, is_demo:true, created_at:now };
    const demoApplications = defaultApplicationsForPackage('Paquete 2').map((app, index) => ({ id:'00000000-0000-4000-8000-0000000002' + String(index).padStart(2,'0'), proyecto_id:proyectoId, ...app, is_demo:true, created_at:now }));
    const demoExtraApp = { id:'00000000-0000-4000-8000-000000000299', proyecto_id:proyectoId, application_id:'presentacion_comercial', name:'Presentación comercial', category:'Comercial', status:'pendiente', is_extra:true, extra_price:220, extra_status:'pendiente_pago', selected_by:'cliente', sort_order:99, is_demo:true, created_at:now };
    const demoChat = { id:'00000000-0000-4000-8000-000000000301', proyecto_id:proyectoId, sender_name:'David Demo', sender_id:teamIds.admin, message:'@Diseñadora Demo sube la ruta 2 para revisión y prioriza la versión más sobria.', mentions:['Diseñadora Demo'], is_demo:true, created_at:now };
    const demoComment = { id:'00000000-0000-4000-8000-000000000302', update_id:projectUpdate.id, proyecto_id:proyectoId, page_ref:'Página 3', body:'Bajar peso visual del símbolo y probar una composición más editorial.', is_demo:true, created_at:now };
    const marketingPerformance = { id:'00000000-0000-4000-8000-000000000303', responsable:'Selena Demo', brand:'feria', channel:'Meta Ads', campaign_name:'Demo · captación fotógrafos', period_start:new Date().toISOString().slice(0,10), period_end:new Date().toISOString().slice(0,10), amount_spent:300, leads:18, clients_converted:3, revenue_generated:4200, notes:'Campaña demo para medir conversión de pauta.', is_demo:true, created_at:now };
    setData(d => ({
      ...d,
      clientes: [cliente, ...d.clientes.filter(x => x.id !== clienteId)],
      proyectos: [proyecto, ...d.proyectos.filter(x => x.id !== proyectoId)],
      cobros: [cobro, ...d.cobros.filter(x => x.id !== cobroId)],
      leads: [lead, ...d.leads.filter(x => x.id !== lead.id)],
      gastos: [gasto, ...d.gastos.filter(x => x.id !== gasto.id)],
      reuniones: [reunion, ...(d.reuniones || []).filter(x => x.id !== reunion.id)],
      projectUpdates: [projectUpdate, ...(d.projectUpdates || []).filter(x => x.id !== projectUpdate.id)],
      projectApplications: [...demoApplications, demoExtraApp, ...(d.projectApplications || []).filter(x => String(x.proyecto_id) !== String(proyectoId))],
      projectChatMessages: [demoChat, ...(d.projectChatMessages || []).filter(x => x.id !== demoChat.id)],
      projectUpdateComments: [demoComment, ...(d.projectUpdateComments || []).filter(x => x.id !== demoComment.id)],
      notificaciones: [notificacion, ...d.notificaciones.filter(x => !x.is_demo)],
      marketingPerformance: [marketingPerformance, ...(d.marketingPerformance || []).filter(x => x.id !== marketingPerformance.id)],
      team: [...demoTeam, ...(d.team || []).filter(x => !demoTeam.some(m => String(m.id) === String(x.id)))],
    }));
    setDemoMode(true, { silent });
    if (isConfigured) {
      try {
        await supabase.from('team').upsert(demoTeam);
        await supabase.from('clientes').upsert(cliente);
        await supabase.from('proyectos').upsert({ ...proyecto, cliente_id: clienteId, creativo_id: teamIds.designer, pct_interno: proyecto.pctInterno, pct_cliente: proyecto.pctCliente, dias_entrega: proyecto.diasEntrega, dias_ejecucion: proyecto.diasEjecucion, client_due_date: proyecto.fechaEntregaCliente, internal_due_date: proyecto.fechaEntregaInterna });
        await supabase.from('cobros').upsert(cobro);
        await supabase.from('contratos').upsert(contrato);
        await supabase.from('briefs').upsert(brief, { onConflict: 'cliente_id' });
        await supabase.from('leads').upsert(lead);
        await supabase.from('gastos').upsert(gasto);
        await supabase.from('reuniones').upsert(reunion);
        await supabase.from('project_updates').upsert(projectUpdate);
        await supabase.from('project_applications').upsert([...demoApplications, demoExtraApp]);
        await supabase.from('project_chat_messages').upsert(demoChat);
        await supabase.from('project_update_comments').upsert(demoComment);
        await supabase.from('marketing_performance').upsert(marketingPerformance);
      } catch (e) { console.warn('Demo DB insert skipped:', e.message); }
    }
  }, [setDemoMode]);

  const clearDemoFlow = useCallback(async () => {
    setData(d => ({
      ...d,
      clientes: d.clientes.filter(x => !x.is_demo),
      proyectos: d.proyectos.filter(x => !x.is_demo),
      cobros: d.cobros.filter(x => !x.is_demo),
      gastos: d.gastos.filter(x => !x.is_demo),
      leads: d.leads.filter(x => !x.is_demo),
      notificaciones: d.notificaciones.filter(x => !x.is_demo),
      reuniones: (d.reuniones || []).filter(x => !x.is_demo),
        projectUpdates: (d.projectUpdates || []).filter(x => !x.is_demo),
        projectApplications: (d.projectApplications || []).filter(x => !x.is_demo),
        projectChatMessages: (d.projectChatMessages || []).filter(x => !x.is_demo),
        projectUpdateComments: (d.projectUpdateComments || []).filter(x => !x.is_demo),
        marketingPerformance: (d.marketingPerformance || []).filter(x => !x.is_demo),
        team: (d.team || []).filter(x => !x.is_demo),
    }));
    setDemoMode(false);
    if (isConfigured) {
      for (const table of ['clientes','proyectos','cobros','gastos','leads','notificaciones','contratos','briefs','reuniones','conversaciones','mensajes_meta','tareas','project_updates','project_applications','project_chat_messages','project_update_comments','marketing_performance','team']) {
        try { await supabase.from(table).delete().eq('is_demo', true); } catch (_) {}
      }
    }
    showToast('Datos demo limpiados', '🧹');
  }, [setDemoMode, showToast]);

  useEffect(() => {
    const hasDemoCliente = (data.clientes || []).some(c => c.is_demo || c.id === DEMO_IDS.cliente);
    if (!demoMode || hasDemoCliente || (!USE_SEED && isConfigured)) return;

    loadDemoFlow({ silent: true }).catch(error => {
      console.warn('No se pudo restaurar el flujo demo:', error);
    });
  }, [demoMode, data.clientes, loadDemoFlow]);

  const updateCliente = useCallback(async (id, changes) => {
    setData(d => ({ ...d, clientes: d.clientes.map(c => c.id === id ? { ...c, ...changes } : c) }));
    if (isConfigured) {
      await supabase.from('clientes').update(changes).eq('id', id);
    }
  }, []);

  const addProyecto = useCallback(async (proyecto) => {
    const newProy = {
      ...proyecto,
      id: proyecto.id || crypto.randomUUID?.() || Date.now().toString(),
      created_at: new Date().toISOString(),
      pctInterno: 0, pctCliente: 0,
      paquete: proyecto.paquete || proyecto.package_name || 'Paquete 1',
      aplicacionesIncluidas: proyecto.aplicacionesIncluidas ?? getPackageRule(proyecto.paquete || proyecto.package_name || 'Paquete 1').includedApplications,
      package_price: proyecto.package_price ?? proyecto.precioPaquete ?? getPackageRule(proyecto.paquete || proyecto.package_name || 'Paquete 1').price ?? 0,
      fechaEntregaCliente: proyecto.fechaEntregaCliente || proyecto.fechaEntrega,
      fechaEntregaInterna: proyecto.fechaEntregaInterna,
      production_status: proyecto.production_status || (proyecto.creativo ? 'asignado' : 'pendiente_asignacion'),
      designer_assigned_at: proyecto.creativo ? new Date().toISOString() : null,
    };
    if (isConfigured) {
      const dbProy = {
        ...newProy,
        cliente_id:    newProy.clienteId,
        creativo_id:   newProy.creativo || null,
        pct_interno:   0,
        pct_cliente:   0,
        dias_entrega:  newProy.diasEntrega  || 45,
        dias_ejecucion:newProy.diasEjecucion || 30,
        client_due_date: newProy.fechaEntregaCliente || newProy.fechaEntrega || null,
        internal_due_date: newProy.fechaEntregaInterna || null,
        package_name: newProy.paquete,
        package_app_limit: newProy.aplicacionesIncluidas,
        package_price: newProy.package_price || 0,
        service_type: newProy.service_type || newProy.servicio,
        production_status: newProy.production_status,
        designer_assigned_at: newProy.designer_assigned_at,
      };
      const { data: inserted, error } = await supabase.from('proyectos').insert([dbProy]).select().single();
      if (!error && inserted) {
        const normalized = { ...inserted, clienteId: inserted.cliente_id, creativo: inserted.creativo_id, pctInterno: 0, pctCliente: 0, diasEntrega: inserted.dias_entrega, diasEjecucion: inserted.dias_ejecucion, fechaEntregaCliente: inserted.client_due_date, fechaEntregaInterna: inserted.internal_due_date, paquete: inserted.package_name, aplicacionesIncluidas: inserted.package_app_limit, package_price: inserted.package_price };
        const defaultApps = (proyecto.aplicaciones || defaultApplicationsForPackage(normalized.paquete)).map((app, index) => {
          const appId = app.application_id || app.id;
          const ref = applicationById(appId);
          return { proyecto_id: inserted.id, application_id: appId, name: app.name || ref.name, category: app.category || ref.category, status: app.status || 'pendiente', is_extra: Boolean(app.is_extra), extra_price: app.extra_price || 0, extra_status: app.extra_status || (app.is_extra ? 'pendiente_pago' : 'incluida'), sort_order: index + 1 };
        });
        let insertedApps = [];
        if (defaultApps.length) { const { data: appRows } = await supabase.from('project_applications').insert(defaultApps).select(); insertedApps = appRows || []; }
        setData(d => ({ ...d, proyectos: [normalized, ...d.proyectos], projectApplications: [...insertedApps, ...(d.projectApplications || [])] }));
        return normalized;
      }
    }
    const localApps = (proyecto.aplicaciones || defaultApplicationsForPackage(newProy.paquete)).map((app, index) => {
      const appId = app.application_id || app.id;
      const ref = applicationById(appId);
      return { id: crypto.randomUUID?.() || String(newProy.id) + '-' + index, proyecto_id: newProy.id, application_id: appId, name: app.name || ref.name, category: app.category || ref.category, status: app.status || 'pendiente', is_extra: Boolean(app.is_extra), extra_price: app.extra_price || 0, extra_status: app.extra_status || (app.is_extra ? 'pendiente_pago' : 'incluida'), sort_order: index + 1 };
    });
    setData(d => ({ ...d, proyectos: [newProy, ...d.proyectos], projectApplications: [...localApps, ...(d.projectApplications || [])] }));
    return newProy;
  }, []);

  const updateProyecto = useCallback(async (id, changes) => {
    setData(d => {
      const previous = d.proyectos.find(p => String(p.id) === String(id));
      const nextProjects = d.proyectos.map(p => String(p.id) === String(id) ? { ...p, ...changes } : p);
      let nextNotificaciones = d.notificaciones;
      if (Object.prototype.hasOwnProperty.call(changes, 'creativo')) {
        const designer = (d.team || []).find(m => String(m.id) === String(changes.creativo));
        const description = changes.creativo
          ? (designer?.name || 'Diseñador') + ' fue asignado a ' + (previous?.nombre || 'un proyecto')
          : (previous?.nombre || 'Proyecto') + ' quedó pendiente de asignación';
        nextNotificaciones = [{
          id: crypto.randomUUID?.() || String(Date.now()) + '-assignment',
          tipo: 'project_assignment',
          titulo: changes.creativo ? 'Proyecto asignado a diseñador' : 'Proyecto sin diseñador asignado',
          desc: description,
          descripcion: description,
          proyecto_id: id,
          target_member_id: changes.creativo || null,
          leida: false,
          created_at: new Date().toISOString(),
        }, ...d.notificaciones];
      }
      return { ...d, proyectos: nextProjects, notificaciones: nextNotificaciones };
    });
    if (isConfigured) {
      // Map camelCase to snake_case for DB
      const dbChanges = { ...changes };
      if (changes.clienteId    !== undefined) { dbChanges.cliente_id    = changes.clienteId;    delete dbChanges.clienteId; }
      if (changes.pctInterno   !== undefined) { dbChanges.pct_interno   = changes.pctInterno;   delete dbChanges.pctInterno; }
      if (changes.pctCliente   !== undefined) { dbChanges.pct_cliente   = changes.pctCliente;   delete dbChanges.pctCliente; }
      if (changes.diasEntrega  !== undefined) { dbChanges.dias_entrega  = changes.diasEntrega;  delete dbChanges.diasEntrega; }
      if (changes.diasEjecucion!== undefined) { dbChanges.dias_ejecucion= changes.diasEjecucion;delete dbChanges.diasEjecucion; }
      if (changes.fechaEntregaCliente !== undefined) { dbChanges.client_due_date = changes.fechaEntregaCliente; delete dbChanges.fechaEntregaCliente; }
      if (changes.fechaEntregaInterna !== undefined) { dbChanges.internal_due_date = changes.fechaEntregaInterna; delete dbChanges.fechaEntregaInterna; }
      if (changes.paquete !== undefined) { dbChanges.package_name = changes.paquete; delete dbChanges.paquete; }
      if (changes.aplicacionesIncluidas !== undefined) { dbChanges.package_app_limit = changes.aplicacionesIncluidas; delete dbChanges.aplicacionesIncluidas; }
      if (changes.creativo     !== undefined) { dbChanges.creativo_id   = changes.creativo || null; delete dbChanges.creativo; }
      if (changes.designer_assigned_at !== undefined) { dbChanges.designer_assigned_at = changes.designer_assigned_at; }
      if (changes.production_status !== undefined) { dbChanges.production_status = changes.production_status; }
      await supabase.from('proyectos').update(dbChanges).eq('id', id);
    }
  }, []);

  const addCliente = useCallback(async (cliente) => {
    if (isConfigured) {
      const { data: inserted, error } = await supabase
        .from('clientes')
        .insert([{ ...cliente, created_at: new Date().toISOString() }])
        .select().single();
      if (!error && inserted) {
        setData(d => ({ ...d, clientes: [inserted, ...d.clientes] }));
        return inserted;
      }
    }
    const newCliente = { ...cliente, id: crypto.randomUUID?.() || Date.now().toString() };
    setData(d => ({ ...d, clientes: [newCliente, ...d.clientes] }));
    return newCliente;
  }, []);

  const deleteCliente = useCallback(async (id) => {
    setData(d => ({ ...d, clientes: d.clientes.filter(c => c.id !== id) }));
    if (isConfigured) await supabase.from('clientes').delete().eq('id', id);
  }, []);

  const addLead = useCallback(async (lead) => {
    if (isConfigured) {
      const { data: inserted, error } = await supabase
        .from('leads').insert([lead]).select().single();
      if (!error && inserted) {
        setData(d => ({ ...d, leads: [inserted, ...d.leads] }));
        return inserted;
      }
    }
    const newLead = { ...lead, id: crypto.randomUUID?.() || Date.now().toString() };
    setData(d => ({ ...d, leads: [newLead, ...d.leads] }));
    return newLead;
  }, []);

  const updateLead = useCallback(async (id, changes) => {
    setData(d => ({ ...d, leads: d.leads.map(l => l.id === id ? { ...l, ...changes } : l) }));
    if (isConfigured) await supabase.from('leads').update(changes).eq('id', id);
  }, []);

  const deleteLead = useCallback(async (id) => {
    setData(d => ({ ...d, leads: d.leads.filter(l => l.id !== id) }));
    if (isConfigured) await supabase.from('leads').delete().eq('id', id);
  }, []);

  const addGasto = useCallback(async (gasto) => {
    if (isConfigured) {
      const { data: inserted, error } = await supabase
        .from('gastos').insert([gasto]).select().single();
      if (!error && inserted) {
        setData(d => ({ ...d, gastos: [inserted, ...d.gastos] }));
        return inserted;
      }
    }
    const newGasto = { ...gasto, id: crypto.randomUUID?.() || Date.now().toString() };
    setData(d => ({ ...d, gastos: [newGasto, ...d.gastos] }));
    return newGasto;
  }, []);

  const updateGasto = useCallback(async (id, changes) => {
    setData(d => ({ ...d, gastos: d.gastos.map(g => g.id === id ? { ...g, ...changes } : g) }));
    if (isConfigured) await supabase.from('gastos').update(changes).eq('id', id);
  }, []);

  const addCobro = useCallback(async (cobro) => {
    if (isConfigured) {
      const { clienteId, ...restCobro } = cobro || {};
      const cleanCobro = {
        ...restCobro,
        cliente_id: restCobro.cliente_id || clienteId || null,
        nombre: restCobro.nombre || restCobro.tipo || 'Cobro',
        created_at: restCobro.created_at || new Date().toISOString(),
      };
      const { data: inserted, error } = await supabase
        .from('cobros')
        .insert([cleanCobro])
        .select().single();
      if (!error && inserted) {
        const normalized = { ...inserted, clienteId: inserted.cliente_id };
        setData(d => ({ ...d, cobros: [normalized, ...d.cobros] }));
        return normalized;
      }
      console.warn('addCobro Supabase fallback:', error?.message || error);
    }
    const newCobro = { ...cobro, id: crypto.randomUUID?.() || Date.now().toString() };
    setData(d => ({ ...d, cobros: [newCobro, ...d.cobros] }));
    return newCobro;
  }, []);


  const updateCobro = useCallback(async (id, changes) => {
    const normalizedChanges = { ...changes };
    if (normalizedChanges.clienteId && !normalizedChanges.cliente_id) {
      normalizedChanges.cliente_id = normalizedChanges.clienteId;
      delete normalizedChanges.clienteId;
    }

    const previousCobro = (data.cobros || []).find(c => String(c.id) === String(id));
    const isMarkingPaid = changes?.status === 'paid' && previousCobro?.status !== 'paid';
    const paidAt = changes?.paid_at || changes?.fecha_pago || new Date().toISOString();

    let clienteForPayment = null;
    let access = null;
    if (isMarkingPaid && previousCobro) {
      const clientId = previousCobro.clienteId || previousCobro.cliente_id || changes.cliente_id;
      clienteForPayment = (data.clientes || []).find(c => String(c.id) === String(clientId));
      const rawStage = String(previousCobro.payment_stage || previousCobro.tipo || previousCobro.nombre || '').toLowerCase();
      const isAdvance60 = rawStage.includes('anticipo_60') || rawStage.includes('anticipo 60') || rawStage.includes('60%');
      if (clienteForPayment && isAdvance60) {
        access = buildPortalAccess(clienteForPayment);
        emailBrief({
          clienteNombre: clienteForPayment.nombre,
          clienteEmail: clienteForPayment.email,
          briefLink: access.portal_url,
        }).catch(() => null);
      }
    }

    setData(d => {
      const nextClientes = access && clienteForPayment
        ? d.clientes.map(c => String(c.id) === String(clienteForPayment.id)
            ? { ...c, stage: Math.max(Number(c.stage || 0), 4), ...access }
            : c)
        : d.clientes;

      const notif = access && clienteForPayment ? {
        id: crypto.randomUUID?.() || `${Date.now()}-portal-access`,
        tipo: 'portal_access',
        titulo: 'Pago 60% confirmado · acceso enviado',
        desc: `${clienteForPayment.nombre} realizó el pago. Se enviaron credenciales por correo y WhatsApp.`,
        descripcion: `${clienteForPayment.nombre} realizó el pago. Se enviaron credenciales por correo y WhatsApp.`,
        cliente_id: clienteForPayment.id,
        cobro_id: id,
        leida: false,
        created_at: paidAt,
      } : null;

      return {
        ...d,
        clientes: nextClientes,
        cobros: d.cobros.map(c => String(c.id) === String(id) ? { ...c, ...changes, ...(changes.cliente_id ? { clienteId: changes.cliente_id } : {}), paid_at: paidAt, fecha_pago: paidAt } : c),
        notificaciones: notif ? [notif, ...d.notificaciones] : d.notificaciones,
      };
    });

    if (isConfigured) {
      const { error } = await supabase
        .from('cobros')
        .update({ ...normalizedChanges, paid_at: paidAt, fecha_pago: paidAt, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) console.warn('updateCobro Supabase skipped:', error.message || error);

      if (access && clienteForPayment) {
        await supabase.from('clientes').update({ stage: Math.max(Number(clienteForPayment.stage || 0), 4), ...access, updated_at: new Date().toISOString() }).eq('id', clienteForPayment.id);
        supabase.functions.invoke('provision-client-access', { body: { cliente_id: clienteForPayment.id } }).then(() => {}).catch(() => {});
        supabase.from('notificaciones').insert([{
          tipo: 'portal_access',
          titulo: 'Pago 60% confirmado · acceso enviado',
          descripcion: `${clienteForPayment.nombre} realizó el pago. Se enviaron credenciales por correo y WhatsApp.`,
          cliente_id: clienteForPayment.id,
          cobro_id: id,
          leida: false,
          created_at: paidAt,
        }]).then(() => {});
      }
    }
  }, [data.cobros, data.clientes]);

  const firmarContrato = useCallback(async (clienteId, contratoData) => {
    let hash = contratoData.hash || '';
    if (!hash || hash.length < 40) {
      const payload = `${clienteId}|${contratoData.firmante || ''}|${new Date().toISOString()}|${(contratoData.contenido || '').slice(0, 500)}`;
      const buf     = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      hash          = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const ahora = new Date().toISOString();
    const cliente = data.clientes.find(c => String(c.id) === String(clienteId)) || {};
    const montoTotal = normalizeMoney(contratoData.monto ?? contratoData.total ?? cliente.monto ?? cliente.valor ?? cliente.package_price, 0);
    const monto60 = Math.round(montoTotal * 0.6);
    const paymentStage = 'anticipo_60';

    const row = {
      cliente_id:   clienteId,
      firmante:     contratoData.firmante     || '',
      firmante_doc: contratoData.firmante_doc || '',
      fecha_firma:  contratoData.fecha_firma  || ahora,
      hash_firma:   hash,
      contenido:    contratoData.contenido    || '',
      client_signature_name: contratoData.firmante || '',
      client_signed_email: contratoData.email || cliente.email || '',
      locked_at:    ahora,
      status:       'firmado',
    };

    const auditEntry = {
      cliente_id: clienteId,
      accion:     'contrato_firmado',
      actor:      contratoData.firmante || 'desconocido',
      hash,
      ip:         'client',
      ts:         ahora,
      detalle:    { firmante: contratoData.firmante, fecha: ahora },
    };

    let signedContract = { ...row, hash_firma: hash };

    if (isConfigured) {
      const { data: inserted } = await supabase
        .from('contratos')
        .upsert(row, { onConflict: 'cliente_id' })
        .select().single();
      signedContract = inserted || signedContract;
      supabase.from('audit_logs').insert([auditEntry]).then(() => {});
    }

    const newStage = Math.max(contratoData.stage || cliente.stage || 3, 3);
    if (isConfigured) {
      await supabase.from('clientes').update({ stage: newStage, updated_at: ahora }).eq('id', clienteId);
    }

    let cobro60 = null;
    let paymentLinkUrl = '';
    const existingCobro60 = (data.cobros || []).find(c =>
      String(c.clienteId || c.cliente_id) === String(clienteId) &&
      String(c.payment_stage || '').toLowerCase() === paymentStage &&
      String(c.status || '').toLowerCase() !== 'paid'
    );

    if (monto60 > 0) {
      cobro60 = existingCobro60 || {
        id: crypto.randomUUID?.() || `${Date.now()}-anticipo-60`,
        clienteId,
        cliente_id: clienteId,
        nombre: 'Anticipo 60%',
        tipo: 'Anticipo 60%',
        concepto: `Anticipo 60% · ${cliente.servicio || contratoData.paquete || 'Proyecto Feria Design'}`,
        monto: monto60,
        status: 'pending',
        via: 'Stripe',
        payment_stage: paymentStage,
        vence: addDaysISO(3),
        created_at: ahora,
        updated_at: ahora,
      };

      if (!existingCobro60) {
        if (isConfigured) {
          const { clienteId: _clientId, ...dbCobro } = cobro60;
          const { data: insertedCobro, error } = await supabase
            .from('cobros')
            .insert([dbCobro])
            .select().single();
          if (!error && insertedCobro) cobro60 = { ...insertedCobro, clienteId: insertedCobro.cliente_id };
        }
        setData(d => ({ ...d, cobros: [{ ...cobro60, clienteId }, ...d.cobros] }));
      }

      const linkResult = await createPaymentLink({
        clienteNombre: cliente.nombre || contratoData.firmante || 'Cliente',
        clienteEmail: cliente.email || contratoData.email || '',
        monto: monto60,
        tipo: 'Anticipo 60%',
        cobro_id: cobro60.id,
        payment_stage: paymentStage,
        cliente_id: clienteId,
        success_url: `${window.location.origin}/pago-completado?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/contratos`,
      });

      if (linkResult?.ok && linkResult.url) {
        paymentLinkUrl = linkResult.url;
        await savePaymentLink(cobro60.id, paymentLinkUrl);
        setData(d => ({
          ...d,
          cobros: d.cobros.map(c => String(c.id) === String(cobro60.id) ? { ...c, stripe_payment_link: paymentLinkUrl } : c),
        }));
      }

      emailBienvenida({
        clienteNombre: cliente.nombre || contratoData.firmante || 'Cliente',
        clienteEmail: cliente.email || contratoData.email || '',
        servicio: cliente.servicio || contratoData.paquete || 'Proyecto Feria Design',
        monto: montoTotal,
        paymentLink: paymentLinkUrl,
      }).catch(() => null);
    }

    const notifContrato = {
      id: crypto.randomUUID?.() || `${Date.now()}-contrato-firmado`,
      tipo: 'contrato_firmado',
      titulo: 'Contrato firmado',
      desc: `${cliente.nombre || contratoData.firmante || 'Cliente'} firmó el contrato. Se activó el cobro del 60%.`,
      descripcion: `${cliente.nombre || contratoData.firmante || 'Cliente'} firmó el contrato. Se activó el cobro del 60%.`,
      cliente_id: clienteId,
      cobro_id: cobro60?.id || null,
      leida: false,
      created_at: ahora,
    };

    setData(d => ({
      ...d,
      auditLog: [auditEntry, ...(d.auditLog || [])],
      clientes: d.clientes.map(c => String(c.id) === String(clienteId)
        ? { ...c, stage: newStage, client_signature_name: contratoData.firmante || '', fecha_firma: row.fecha_firma, hash_firma: hash }
        : c),
      notificaciones: [notifContrato, ...d.notificaciones],
    }));

    if (isConfigured) {
      supabase.from('notificaciones').insert([notifContrato]).then(() => {});
    }

    return { ...signedContract, hash_firma: hash, cobro60, paymentLinkUrl };
  }, [data.clientes, data.cobros]);

  const saveBrief = useCallback(async (clienteId, respuestas) => {
    if (isConfigured) {
      await supabase.from('briefs').upsert({
        cliente_id:  clienteId,
        respuestas:  respuestas,
        completado:  true,
        updated_at:  new Date().toISOString(),
      }, { onConflict: 'cliente_id' });
    }
  }, []);

  const saveAprobacion = useCallback(async (clienteId, aprobacionId, aprobado) => {
    if (isConfigured) {
      await supabase.from('aprobaciones').upsert({
        cliente_id:    clienteId,
        aprobacion_id: aprobacionId,
        aprobado,
        fecha:         new Date().toISOString(),
      }, { onConflict: 'cliente_id,aprobacion_id' });
    }
  }, []);

  const addDeuda = useCallback(async (deuda) => {
    const row = { ...deuda, id: deuda.id || crypto.randomUUID?.() || Date.now().toString(), status: deuda.status || 'pendiente', created_at: deuda.created_at || new Date().toISOString() };
    setData(d => ({ ...d, deudas: [row, ...(d.deudas || [])] }));
    if (isConfigured) { try { await supabase.from('deudas').insert([row]); } catch (_) {} }
    return row;
  }, []);

  const updateDeuda = useCallback(async (id, changes) => {
    setData(d => ({ ...d, deudas: (d.deudas || []).map(x => x.id === id ? { ...x, ...changes } : x) }));
    if (isConfigured) { try { await supabase.from('deudas').update(changes).eq('id', id); } catch (_) {} }
  }, []);

  const deleteDeuda = useCallback(async (id) => {
    setData(d => ({ ...d, deudas: (d.deudas || []).filter(x => x.id !== id) }));
    if (isConfigured) { try { await supabase.from('deudas').delete().eq('id', id); } catch (_) {} }
  }, []);

  const addTeamMember = useCallback(async (member) => {
    const normalized = normalizeTeamMember({
      ...member,
      id: member.id || crypto.randomUUID?.() || Date.now().toString(),
      created_at: new Date().toISOString(),
    });
    setData(d => ({ ...d, team: [normalized, ...d.team.map(normalizeTeamMember)] }));
    if (isConfigured) {
      const dbMember = { ...normalized, brand: normalized.brands?.[0] || 'feria', permissions: normalized.permissions };
      delete dbMember.brands;
      const { data: inserted, error } = await supabase.from('team').insert([dbMember]).select().single();
      if (!error && inserted) return normalizeTeamMember(inserted);
    }
    return normalized;
  }, []);

  const updateTeamMember = useCallback(async (id, changes) => {
    setData(d => ({ ...d, team: d.team.map(m => String(m.id) === String(id) ? normalizeTeamMember({ ...m, ...changes }) : normalizeTeamMember(m)) }));
    if (isConfigured) {
      const dbChanges = { ...changes };
      if (dbChanges.brands) { dbChanges.brand = dbChanges.brands[0] || 'feria'; delete dbChanges.brands; }
      try { await supabase.from('team').update(dbChanges).eq('id', id); } catch (_) {}
    }
  }, []);

  const deleteTeamMember = useCallback(async (id) => {
    setData(d => ({ ...d, team: d.team.filter(m => String(m.id) !== String(id)) }));
    if (isConfigured) { try { await supabase.from('team').delete().eq('id', id); } catch (_) {} }
  }, []);

  const addProjectUpdate = useCallback(async ({ proyectoId, tipo = 'avance', titulo, descripcion, archivo_url = '', reviewer_id = null, file_type = '', version_label = '', application_id = null }) => {
    const row = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      proyecto_id: proyectoId,
      tipo,
      titulo: titulo || 'Avance de diseño',
      descripcion: descripcion || '',
      archivo_url,
      reviewer_id,
      file_type,
      version_label,
      application_id,
      status: 'pendiente_revision',
      created_at: new Date().toISOString(),
    };
    setData(d => ({ ...d, projectUpdates: [row, ...(d.projectUpdates || [])] }));
    if (isConfigured) {
      try { await supabase.from('project_updates').insert([row]); } catch (_) {}
    }
    return row;
  }, []);

  const reviewProjectUpdate = useCallback(async (updateId, feedback, status = 'feedback') => {
    const organized = String(feedback || '')
      .split(/\n+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map((line, idx) => (idx + 1) + '. ' + line.replace(/^[-•\d.\s]+/, ''))
      .join('\n');
    const changes = { feedback, organized_feedback: organized || feedback, status, reviewed_at: new Date().toISOString() };
    setData(d => ({ ...d, projectUpdates: (d.projectUpdates || []).map(x => x.id === updateId ? { ...x, ...changes } : x) }));
    if (isConfigured) {
      try { await supabase.from('project_updates').update(changes).eq('id', updateId); } catch (_) {}
    }
  }, []);

  const addProjectApplication = useCallback(async ({ proyectoId, applicationId, isExtra = false, extraPrice = 0, selectedBy = 'admin' }) => {
    const app = applicationById(applicationId);
    const row = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      proyecto_id: proyectoId,
      application_id: applicationId,
      name: app.name,
      category: app.category,
      status: 'pendiente',
      is_extra: Boolean(isExtra),
      extra_price: Number(extraPrice || app.basePrice || 0),
      extra_status: isExtra ? 'pendiente_pago' : 'incluida',
      selected_by: selectedBy,
      sort_order: (data.projectApplications || []).filter(x => String(x.proyecto_id) === String(proyectoId)).length + 1,
      created_at: new Date().toISOString(),
    };
    setData(d => ({ ...d, projectApplications: [row, ...(d.projectApplications || [])] }));
    if (isConfigured) {
      const { data: inserted } = await supabase.from('project_applications').insert([row]).select().single();
      if (inserted) setData(d => ({ ...d, projectApplications: (d.projectApplications || []).map(x => x.id === row.id ? inserted : x) }));
      return inserted || row;
    }
    return row;
  }, [data.projectApplications]);

  const updateProjectApplication = useCallback(async (id, changes) => {
    setData(d => ({ ...d, projectApplications: (d.projectApplications || []).map(x => x.id === id ? { ...x, ...changes } : x) }));
    if (isConfigured) { try { await supabase.from('project_applications').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id); } catch (_) {} }
  }, []);

  const addProjectChatMessage = useCallback(async ({ proyectoId, message, senderName, senderId, attachmentUrl = '', clienteId = null, senderEmail = '', source = 'project', etiqueta = 'interno', attachmentName = '', attachmentSize = 0, isDemo = false, conversationId = '', conversationType = '', targetMemberId = null, replyToId = null, reactions = null, pinned = false }) => {
    const mentions = Array.from(String(message || '').matchAll(/@([\wáéíóúÁÉÍÓÚñÑ.-]+)/g)).map(m => m[1]);
    const row = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      proyecto_id: proyectoId || null,
      cliente_id: clienteId || null,
      sender_name: senderName || 'Equipo',
      sender_id: senderId || null,
      sender_email: senderEmail || '',
      message,
      mentions,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_size: attachmentSize,
      source,
      etiqueta,
      conversation_id: conversationId || (source === 'general' ? 'general' : proyectoId ? `project:${proyectoId}` : null),
      conversation_type: conversationType || (source === 'direct' ? 'direct' : source === 'general' ? 'general' : 'project'),
      target_member_id: targetMemberId || null,
      reply_to_id: replyToId || null,
      read_by: senderId ? [String(senderId)] : [],
      reactions: reactions || {},
      pinned: Boolean(pinned),
      is_demo: Boolean(isDemo),
      created_at: new Date().toISOString(),
    };
    const notif = source === 'portal_cliente'
      ? { id: crypto.randomUUID?.() || String(Date.now()) + '-portal-message', tipo:'mensaje_cliente', titulo:'Nuevo mensaje del portal cliente', desc: row.sender_name + ' escribió desde su portal personal.', descripcion: row.sender_name + ' escribió desde su portal personal.', cliente_id: clienteId || null, proyecto_id: proyectoId || null, leida:false, created_at:new Date().toISOString() }
      : (mentions.length ? { id: crypto.randomUUID?.() || String(Date.now()) + '-mention', tipo:'mention', titulo:'Mención en proyecto', desc: row.sender_name + ' mencionó a ' + mentions.join(', '), descripcion: row.sender_name + ' mencionó a ' + mentions.join(', '), leida:false, created_at:new Date().toISOString() } : null);
    setData(d => ({ ...d, projectChatMessages: [...(d.projectChatMessages || []), row], notificaciones: notif ? [notif, ...d.notificaciones] : d.notificaciones }));
    if (isConfigured) { try { const { data: inserted } = await supabase.from('project_chat_messages').insert([row]).select().single(); return inserted || row; } catch (_) {} }
    return row;
  }, []);

  const addProjectUpdateComment = useCallback(async ({ updateId, proyectoId, pageRef = '', body }) => {
    const row = { id: crypto.randomUUID?.() || Date.now().toString(), update_id: updateId, proyecto_id: proyectoId, page_ref: pageRef, body, created_at: new Date().toISOString() };
    setData(d => ({ ...d, projectUpdateComments: [...(d.projectUpdateComments || []), row] }));
    if (isConfigured) { try { await supabase.from('project_update_comments').insert([row]); } catch (_) {} }
    return row;
  }, []);


  const upsertMarketingPerformance = useCallback(async (perf) => {
    const now = new Date();
    const periodStart = perf.period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const row = {
      id: perf.id || crypto.randomUUID?.() || Date.now().toString(),
      period_start: periodStart,
      owner_name: perf.owner_name || 'Selena',
      channel: perf.channel || 'Meta Ads',
      brand: perf.brand || 'feria',
      invested_amount: Number(perf.invested_amount || 0),
      converted_amount: Number(perf.converted_amount || 0),
      leads_count: Number(perf.leads_count || 0),
      clients_count: Number(perf.clients_count || 0),
      notes: perf.notes || '',
      is_demo: Boolean(perf.is_demo),
      updated_at: new Date().toISOString(),
    };
    setData(d => {
      const exists = (d.marketingPerformance || []).some(x => String(x.id) === String(row.id));
      return { ...d, marketingPerformance: exists ? d.marketingPerformance.map(x => String(x.id) === String(row.id) ? { ...x, ...row } : x) : [row, ...(d.marketingPerformance || [])] };
    });
    if (isConfigured) {
      try {
        const { data: saved } = await supabase.from('marketing_performance').upsert(row, { onConflict: 'id' }).select().single();
        if (saved) setData(d => ({ ...d, marketingPerformance: (d.marketingPerformance || []).map(x => String(x.id) === String(row.id) ? saved : x) }));
        return saved || row;
      } catch (_) {}
    }
    return row;
  }, []);

  const updateMeta = useCallback(async (objetivo) => {
    setData(d => ({ ...d, studio: { ...d.studio, meta: { ...d.studio.meta, objetivo } } }));
    if (isConfigured && studioIdRef.current) {
      // Usa el UUID real capturado al cargar — nunca el literal 1
      await supabase.from('studio').update({ meta_objetivo: objetivo }).eq('id', studioIdRef.current);
    } else if (isConfigured && !studioIdRef.current) {
      // Fallback: actualizar la única fila existente sin depender del ID
      const { data: rows } = await supabase.from('studio').select('id').limit(1).single();
      if (rows?.id) {
        studioIdRef.current = rows.id;
        await supabase.from('studio').update({ meta_objetivo: objetivo }).eq('id', rows.id);
      }
    }
  }, []);

  const marcarNotifLeida = useCallback(async (id) => {
    setData(d => ({ ...d, notificaciones: d.notificaciones.map(n => n.id === id ? { ...n, leida: true } : n) }));
    if (isConfigured) {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    }
  }, []);

  // Derived
  const getClientId = (row = {}) => row.clienteId || row.cliente_id || row.clientId || row.client_id;
  const getProjectId = (row = {}) => row.proyectoId || row.proyecto_id || row.projectId || row.project_id;
  const matchesBrand = (row = {}) => activeBrand === 'all' || row.brand === activeBrand || row.marca === activeBrand;

  const clientesFiltrados = activeBrand === 'all'
    ? data.clientes
    : data.clientes.filter(c => c.brand === activeBrand);
  const scopedClientIds = new Set(clientesFiltrados.map(c => String(c.id)));

  const proyectosFiltrados = activeBrand === 'all'
    ? data.proyectos
    : data.proyectos.filter(p => matchesBrand(p) || scopedClientIds.has(String(getClientId(p))));
  const scopedProjectIds = new Set(proyectosFiltrados.map(p => String(p.id)));

  const cobrosFiltrados = activeBrand === 'all'
    ? data.cobros
    : data.cobros.filter(c => matchesBrand(c) || scopedClientIds.has(String(getClientId(c))));
  const gastosFiltrados = activeBrand === 'all'
    ? data.gastos
    : data.gastos.filter(g => !g.brand || matchesBrand(g));
  const leadsFiltrados = activeBrand === 'all'
    ? data.leads
    : data.leads.filter(l => matchesBrand(l) || scopedClientIds.has(String(getClientId(l))));
  const reunionesFiltradas = activeBrand === 'all'
    ? (data.reuniones || [])
    : (data.reuniones || []).filter(r => matchesBrand(r) || scopedClientIds.has(String(getClientId(r))));
  const deudasFiltradas = activeBrand === 'all'
    ? (data.deudas || [])
    : (data.deudas || []).filter(d => matchesBrand(d) || scopedClientIds.has(String(getClientId(d))));
  const projectUpdatesFiltrados = activeBrand === 'all'
    ? (data.projectUpdates || [])
    : (data.projectUpdates || []).filter(u => scopedProjectIds.has(String(getProjectId(u))));
  const scopedUpdateIds = new Set(projectUpdatesFiltrados.map(u => String(u.id)));
  const projectApplicationsFiltradas = activeBrand === 'all'
    ? (data.projectApplications || [])
    : (data.projectApplications || []).filter(a => scopedProjectIds.has(String(getProjectId(a))));
  const projectChatMessagesFiltrados = activeBrand === 'all'
    ? (data.projectChatMessages || [])
    : (data.projectChatMessages || []).filter(m => scopedProjectIds.has(String(getProjectId(m))) || scopedClientIds.has(String(getClientId(m))));
  const projectUpdateCommentsFiltrados = activeBrand === 'all'
    ? (data.projectUpdateComments || [])
    : (data.projectUpdateComments || []).filter(c => scopedProjectIds.has(String(getProjectId(c))) || scopedUpdateIds.has(String(c.update_id || c.updateId)));
  const marketingPerformanceFiltrado = activeBrand === 'all'
    ? (data.marketingPerformance || [])
    : (data.marketingPerformance || []).filter(m => matchesBrand(m));

  const scopedData = {
    ...data,
    clientes: clientesFiltrados,
    proyectos: proyectosFiltrados,
    cobros: cobrosFiltrados,
    gastos: gastosFiltrados,
    leads: leadsFiltrados,
    reuniones: reunionesFiltradas,
    deudas: deudasFiltradas,
    projectUpdates: projectUpdatesFiltrados,
    projectApplications: projectApplicationsFiltradas,
    projectChatMessages: projectChatMessagesFiltrados,
    projectUpdateComments: projectUpdateCommentsFiltrados,
    marketingPerformance: marketingPerformanceFiltrado,
    allClientes: data.clientes,
    allProyectos: data.proyectos,
    allCobros: data.cobros,
    allLeads: data.leads,
  };

  const notifsNoLeidas = data.notificaciones.filter(n => !n.leida).length;

  const ingresos    = cobrosFiltrados.filter(c => c.status === 'paid').reduce((a, c) => a + (c.monto || 0), 0);
  const porCobrar   = cobrosFiltrados.filter(c => c.status !== 'paid').reduce((a, c) => a + (c.monto || 0), 0);
  const totalGastos = gastosFiltrados.reduce((a, g) => a + (g.monto || 0), 0);

  // meta.actual siempre refleja los ingresos reales — una sola fuente de verdad
  const metaConIngresos = {
    ...data.studio.meta,
    actual: ingresos,
  };

  return (
    <AppContext.Provider value={{
      data: { ...scopedData, studio: { ...data.studio, meta: metaConIngresos } },
      activeBrand, setActiveBrand,
      toast, showToast,
      theme, toggleTheme,
      accentColor, setAccentColor,
      studioLogo, setStudioLogo,
      dbReady, isConfigured, demoMode, setDemoMode, loadDemoFlow, clearDemoFlow,
      // Equipo
      addTeamMember, updateTeamMember, deleteTeamMember,
      // Clientes
      updateCliente, addCliente, deleteCliente,
      // Proyectos
      updateProyecto, addProyecto,
      // Leads
      addLead, updateLead, deleteLead,
      // Gastos
      addGasto, updateGasto,
      // Deudas
      addDeuda, updateDeuda, deleteDeuda,
      // Cobros
      addCobro, updateCobro,
      // Contratos
      firmarContrato,
      // Portal cliente
      saveBrief, saveAprobacion,
      // Gestión de producción
      addProjectUpdate, reviewProjectUpdate, addProjectUpdateComment,
      addProjectApplication, updateProjectApplication, addProjectChatMessage,
      // Marketing interno
      upsertMarketingPerformance,
      // Studio
      updateMeta,
      // Notificaciones
      addNotification, marcarNotifLeida,
      // Derived
      clientesFiltrados,
      notifsNoLeidas,
      ingresos, porCobrar, totalGastos,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
