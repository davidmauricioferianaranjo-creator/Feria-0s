import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp, STAGE_LABELS } from '../../context/AppContext';
import { supabase, isConfigured } from '../../lib/supabase';
import ClientPortalBrief     from '../../features/client-portal/components/ClientPortalBrief';
import ClientPortalApprovals from '../../features/client-portal/components/ClientPortalApprovals';
import ClientPortalChat      from '../../features/client-portal/components/ClientPortalChat';
import ClientPortalMeetings  from '../../features/client-portal/components/ClientPortalMeetings';
import ClientPortalDocuments from '../../features/client-portal/components/ClientPortalDocuments';
import ClientPortalBrandKit  from '../../features/client-portal/components/ClientPortalBrandKit';
import ClientPortalStudioNews from '../../features/client-portal/components/ClientPortalStudioNews';
import StageAnimation        from '../../features/client-portal/components/StageAnimation';
import { getBriefQuestionsForService } from '../../lib/briefs';
import { APPLICATION_CATALOG, getPackageRule, applicationById } from '../../lib/packages';
import { downloadSimplePdf } from '../../lib/pdf';
import { createPaymentLink, savePaymentLink } from '../../lib/stripe';
import { DEMO_IDS } from '../../lib/operationalData';
import { BadgeCheck, CheckCircle2, ClipboardList, FileText, Lock, Megaphone, Menu, MessagesSquare, Moon, PackageCheck, PanelRight, Presentation, Sun, X } from 'lucide-react';

// ── COLORES ARKES ─────────────────────────────────────────────
const COLORS = [
  { name: 'Negro arquitecto',   hex: '#1A1A18', rgb: '26,26,24',    cmyk: '0,0,8,90'  },
  { name: 'Crudo natural',      hex: '#F2EDE4', rgb: '242,237,228', cmyk: '0,2,6,5'   },
  { name: 'Bronce estructural', hex: '#8C7355', rgb: '140,115,85',  cmyk: '0,18,39,45'},
  { name: 'Gris concreto',      hex: '#6B6B68', rgb: '107,107,104', cmyk: '0,0,3,58'  },
  { name: 'Blanco puro',        hex: '#FFFFFF', rgb: '255,255,255', cmyk: '0,0,0,0'   },
];

// ── BRIEF DINÁMICO POR SERVICIO ─────────────────────────────
function getBriefQuestions(servicio) {
  return getBriefQuestionsForService(servicio);
}

function mergeSavedBriefData(baseQuestions, savedData) {
  if (!Array.isArray(savedData) || !savedData.length) return baseQuestions;
  if (savedData.length === baseQuestions.length) {
    return baseQuestions.map((q, i) => ({ ...q, respuesta: savedData[i]?.respuesta || '', filled: Boolean(savedData[i]?.filled), draft: savedData[i]?.draft || '' }));
  }
  const savedByQuestion = new Map(
    savedData.map(item => [String(item?.pregunta || '').trim().toLowerCase(), item]).filter(([k]) => k)
  );
  return baseQuestions.map(q => {
    const saved = savedByQuestion.get(String(q.pregunta || '').trim().toLowerCase());
    return saved ? { ...q, respuesta: saved.respuesta || '', filled: Boolean(saved.filled), draft: saved.draft || '' } : q;
  });
}

// ── SCREEN LOCK STATUS ────────────────────────────────────────
function getScreenStatus(screenId, briefComplete, meetingUnlocked, approvalsReady, aprobacionesComplete, kitUnlocked) {
  switch (screenId) {
    case 'progreso':     return 'unlocked';
    case 'documentos':   return 'unlocked';
    case 'brief':        return 'unlocked';
    case 'reunion':      return meetingUnlocked ? 'unlocked' : 'locked';
    case 'aprobaciones': return approvalsReady ? 'unlocked' : 'locked';
    case 'brandkit':     return aprobacionesComplete ? (kitUnlocked ? 'unlocked' : 'pending') : 'locked';
    case 'novedades':    return 'unlocked';
    case 'mensajes':     return 'unlocked';
    default:             return 'locked';
  }
}

// ── LOCKED SCREEN ─────────────────────────────────────────────
function LockedScreen({ reason, isDark = true, accentColor = '#E11D48', title = 'Sección bloqueada' }) {
  const colors = isDark ? {
    card: '#141416', border: 'rgba(255,255,255,.08)', text: '#F4F4F5', muted: '#A1A1AA', soft: 'rgba(255,255,255,.04)'
  } : {
    card: '#FFFFFF', border: 'rgba(24,24,27,.10)', text: '#18181B', muted: '#52525B', soft: 'rgba(24,24,27,.04)'
  };
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: colors.soft, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px', color: accentColor }}>🔒</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: colors.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>{reason}</div>
    </div>
  );
}

// ── DOWNLOAD BRIEF PDF ───────────────────────────────────────
function downloadBriefPDF(cliente, sentirData) {
  downloadSimplePdf({
    filename: `brief-${(cliente?.nombre || 'cliente').toLowerCase().replace(/\s+/g, '-')}.pdf`,
    title: `Brief de proyecto — ${cliente?.nombre || 'Cliente'}`,
    subtitle: 'Feria Design Studio',
    lines: [
      `Fecha: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      '',
      ...sentirData.map((s, idx) => [
        `Pregunta ${idx + 1}: ${s.pregunta}`,
        `Respuesta: ${s.respuesta || '(Sin respuesta)'}`,
        '',
      ]).flat(),
      'Brief generado por Feria OS.',
    ],
  });
}

function downloadContractPDF(cliente, proyecto) {
  downloadSimplePdf({
    filename: `contrato-firmado-${(cliente?.nombre || 'cliente').toLowerCase().replace(/\s+/g, '-')}.pdf`,
    title: `Contrato firmado — ${cliente?.nombre || 'Cliente'}`,
    subtitle: 'Feria Design Studio',
    lines: [
      `Cliente: ${cliente?.nombre || ''}`,
      `Correo: ${cliente?.email || ''}`,
      `Proyecto: ${proyecto?.nombre || cliente?.servicio || ''}`,
      `Servicio: ${cliente?.servicio || ''}`,
      '',
      'Firmado por Feria Design Studio',
      'David Mauricio Feria Naranjo — CEO Fundador',
      '',
      'Firmado electrónicamente por el cliente',
      `${cliente?.nombre || ''} · ${cliente?.email || ''}`,
      '',
      'Este documento representa la versión firmada disponible para descarga desde el portal.',
    ],
  });
}

function downloadQuotePDF(cliente, proyecto) {
  downloadSimplePdf({
    filename: `cotizacion-${(cliente?.nombre || 'cliente').toLowerCase().replace(/\s+/g, '-')}.pdf`,
    title: `Cotización aprobada — ${cliente?.nombre || 'Cliente'}`,
    subtitle: 'Feria Design Studio',
    lines: [
      `Cliente: ${cliente?.nombre || ''}`,
      `Servicio: ${cliente?.servicio || proyecto?.service_type || ''}`,
      `Paquete: ${proyecto?.paquete || proyecto?.package_name || 'Paquete contratado'}`,
      `Aplicaciones incluidas: ${proyecto?.aplicacionesIncluidas || proyecto?.package_app_limit || 'Según paquete'}`,
      '',
      'Condición comercial: anticipo 60% y saldo final 40% contra aprobación.',
      'Documento descargado desde el portal cliente de Feria OS.',
    ],
  });
}


function downloadBrandKitPDF(cliente, proyecto) {
  downloadSimplePdf({
    filename: `brand-kit-${(cliente?.nombre || 'cliente').toLowerCase().replace(/\s+/g, '-')}.pdf`,
    title: `Brand Kit — ${cliente?.nombre || 'Cliente'}`,
    subtitle: 'Feria Design Studio',
    lines: [
      `Proyecto: ${proyecto?.nombre || cliente?.servicio || ''}`,
      `Cliente: ${cliente?.nombre || ''}`,
      '',
      'Archivos finales disponibles:',
      '• Sistema de logotipo',
      '• Paleta cromática',
      '• Tipografías',
      '• Manual de identidad',
      '• Aplicaciones aprobadas',
      '',
      'Este PDF es una referencia de descarga. En producción se vinculará con los archivos finales reales.',
    ],
  });
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function isoAddDays(date, days) {
  return addDays(date, days).toISOString();
}

function formatShortDate(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ClientPortal() {
  const { user, signOut } = useAuth();
  const { data, saveBrief, saveAprobacion, addCobro, addProjectChatMessage, addProyecto, updateProyecto, addProjectApplication, updateProjectApplication, accentColor } = useApp();

  // Derived first — cliente y proyecto deben existir antes de usarlos
  const currentEmail = String(user?.email || '').toLowerCase();
  const foundCliente = data.clientes.find(c => String(c.email || '').toLowerCase() === currentEmail);
  const isDemoClientEmail = ['cliente.demo@feria.design', 'info@davidferia.com'].includes(currentEmail);
  const cliente  = foundCliente || (isDemoClientEmail ? {
    id: DEMO_IDS.cliente,
    nombre: currentEmail === 'cliente.demo@feria.design' ? 'Cliente Demo' : 'David Feria Demo',
    email: currentEmail,
    servicio: 'Branding para Fotógrafos',
    service_type: 'branding_fotografos',
    color: '#5B9BD5',
    brand: 'feria',
    is_demo: true,
  } : null);
  const foundProyecto = data.proyectos.find(p => (p.clienteId || p.cliente_id) === cliente?.id);
  const proyecto = foundProyecto || (cliente?.is_demo ? {
    id: DEMO_IDS.proyecto,
    clienteId: DEMO_IDS.cliente,
    nombre: 'Cliente Demo — Branding',
    fase: 4,
    pctCliente: 20,
    diasEntrega: 45,
    fechaEntregaCliente: new Date(Date.now() + 45 * 86400000).toISOString().slice(0,10),
    brief_completed_at: null,
  } : null);
  const totalDays = Number(proyecto?.diasEntrega || proyecto?.dias_entrega || 45);
  // v93 usa un namespace limpio para no heredar pruebas anteriores del navegador.
  const scopedCompletionKey = `feria_portal_v103_${cliente?.id || currentEmail || 'anon'}_brief_completed_at`;
  const persistedCompletionAt = localStorage.getItem(scopedCompletionKey);
  const startDate = persistedCompletionAt || (!cliente?.is_demo ? (proyecto?.brief_completed_at || proyecto?.production_started_at) : null);
  const elapsedDays = startDate ? Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)) : 0;
  const timelinePct = startDate ? Math.min(95, Math.round((elapsedDays / Math.max(totalDays, 1)) * 100)) : 0;
  const pct      = Math.max(Number(proyecto?.pctCliente || proyecto?.pct_cliente || 0), timelinePct);
  const fase     = proyecto?.fase || 4;
  const daysLeft = startDate ? Math.max(0, totalDays - elapsedDays) : totalDays;
  const finalPaymentPaid = data.cobros.some(c => String(c.clienteId || c.cliente_id) === String(cliente?.id) && c.status === 'paid' && /40|final|saldo/i.test(String(c.tipo || c.nombre || '')));

  const portalPackageName = proyecto?.paquete || proyecto?.package_name || cliente?.paquete || cliente?.package_name || cliente?.packageName || 'Paquete 1';
  const portalPackageRule = getPackageRule(portalPackageName);
  const includedApplicationLimit = Number(proyecto?.aplicacionesIncluidas || proyecto?.package_app_limit || portalPackageRule.includedApplications || 0);
  const recommendedApplicationIds = React.useMemo(() => APPLICATION_CATALOG
    // El estudio sugiere 4 aplicaciones; la quinta la escoge el cliente.
    .slice(0, Math.min(4, Math.max(0, includedApplicationLimit - 1)))
    .map(app => app.id), [includedApplicationLimit]);
  const applicationStorageKey = `feria_portal_applications_v103_${cliente?.id || currentEmail || 'anon'}`;

  // Brief questions based on client service type
  const briefQuestions = getBriefQuestions(cliente?.servicio);

  // State
  const [screen, setScreen]         = useState(() => new URLSearchParams(window.location.search).get('screen') || 'progreso');
  const [sentirIdx, setSentirIdx]   = useState(0);
  const [sentirData, setSentirData] = useState(
    briefQuestions.map(q => ({ ...q, respuesta: '', filled: false }))
  );
  const [chatMsgs, setChatMsgs] = useState([
    { from: 'studio', name: 'David · Feria',  time: 'Ayer 16:04', text: 'Hola! Los ajustes tipográficos están listos.' },
    { from: 'studio', name: 'Selene · Feria', time: 'Hoy 09:15',  text: 'Buenos días. Confirmamos la reunión de presentación para mañana.' },
  ]);
  const [chatInput, setChatInput]   = useState('');
  const [aprobaciones, setAprobaciones] = useState([
    { title: 'Sistema de logo — versión final', sub: 'Isotipo · variantes positivo/negativo · horizontal', version: 'v3', approved: false },
    { title: 'Paleta cromática y tipografía',   sub: 'Negro · Crudo · Bronce · Cormorant + DM Sans',       version: 'v2', approved: false },
  ]);
  const [briefDownloaded, setBriefDownloaded] = useState(false);
  const [reunionForm, setReunionForm] = useState({ fecha: '', hora: '10:00', tipo: 'virtual', notas: '' });
  const [reunionEnviada, setReunionEnviada]       = useState(null);
  const [reunionConfirmada, setReunionConfirmada] = useState(null);
  const storagePrefix = `feria_portal_v103_${cliente?.id || currentEmail || 'anon'}`;
  const [approvalActSigned, setApprovalActSigned] = useState(() => localStorage.getItem(`${storagePrefix}_approval_act_signed`) === 'true');
  const [deliveryActSigned, setDeliveryActSigned] = useState(() => localStorage.getItem(`${storagePrefix}_delivery_act_signed`) === 'true');
  const [localFinalPaymentPaid, setLocalFinalPaymentPaid] = useState(() => localStorage.getItem(`${storagePrefix}_final_payment_paid`) === 'true');
  const [selectedApplicationIds, setSelectedApplicationIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(applicationStorageKey) || '[]'); } catch { return []; }
  });
  const [paidExtraApplicationIds, setPaidExtraApplicationIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${applicationStorageKey}_paid_extras`) || '[]'); } catch { return []; }
  });
  const [applicationSelectionComplete, setApplicationSelectionComplete] = useState(() => localStorage.getItem(`${applicationStorageKey}_complete`) === 'true');
  const [pendingExtraApplication, setPendingExtraApplication] = useState(null);
  const [pendingExtraApplicationIds, setPendingExtraApplicationIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${applicationStorageKey}_pending_extras`) || '[]'); } catch { return []; }
  });
  const [extraPaymentLoading, setExtraPaymentLoading] = useState(false);

  React.useEffect(() => {
    if (!cliente?.is_demo) return;
    // Limpieza defensiva: evita que pruebas de versiones anteriores del demo
    // aparezcan como brief completado al entrar por primera vez en esta versión.
    ['v91', 'v92', 'v93', 'v94', 'v95', 'v96', 'v97', 'v98', 'v99', 'v100', 'v101', 'v102'].forEach((v) => {
      const base = `feria_portal_${v}_${cliente.id || currentEmail || 'anon'}`;
      const appBase = `feria_portal_applications_${v}_${cliente.id || currentEmail || 'anon'}`;
      try {
        localStorage.removeItem(`${base}_brief_completed_at`);
        localStorage.removeItem(`${appBase}_complete`);
      } catch (_) {}
    });
  }, [cliente?.is_demo, cliente?.id, currentEmail]);

  const questionsComplete    = sentirData.every(s => s.filled);
  const includedSelectionCount = (selectedApplicationIds || []).filter(id => !(paidExtraApplicationIds || []).includes(id)).length;
  const hasRequiredApplicationSelection = includedSelectionCount >= Number(includedApplicationLimit || 0);
  const briefPersistedComplete = applicationSelectionComplete || localStorage.getItem(`${applicationStorageKey}_complete`) === 'true' || Boolean(persistedCompletionAt) || (!cliente?.is_demo && (Boolean(proyecto?.brief_completed_at) || Boolean(proyecto?.project_started_at)));
  const briefComplete        = briefPersistedComplete || (questionsComplete && applicationSelectionComplete && hasRequiredApplicationSelection);
  const aprobacionesComplete = aprobaciones.every(a => a.approved);
  const approvalActComplete  = approvalActSigned || Boolean(proyecto?.approval_act_signed_at);
  const meetingUnlocked      = briefComplete && (daysLeft <= 2 || Boolean(reunionConfirmada) || Boolean(proyecto?.meeting_unlocked_at) || localStorage.getItem(`${storagePrefix}_meeting_unlocked`) === 'true');
  const approvalsReady       = briefComplete && Boolean(reunionConfirmada || proyecto?.approvals_ready_at || localStorage.getItem(`${storagePrefix}_approvals_ready`) === 'true');
  const finalPaymentConfirmed = finalPaymentPaid || localFinalPaymentPaid || Boolean(proyecto?.brandkit_unlocked_at || proyecto?.final_payment_paid_at);
  const kitUnlocked          = finalPaymentConfirmed;
  const finalPaymentCobro    = data.cobros.find(c => String(c.clienteId || c.cliente_id) === String(cliente?.id) && /40|final|saldo/i.test(String(c.tipo || c.nombre || c.payment_stage || '')));

  React.useEffect(() => {
    if (briefComplete && screen === 'brief') {
      setScreen('progreso');
    }
  }, [briefComplete, screen]);

  const portalMessageFlag = React.useCallback((key) => `${storagePrefix}_msg_${key}`, [storagePrefix]);
  const sendPortalLifecycleMessage = React.useCallback(async (key, { titulo, descripcion, scheduledFor = null, immediate = false }) => {
    if (!cliente?.id || localStorage.getItem(portalMessageFlag(key)) === 'true') return;
    localStorage.setItem(portalMessageFlag(key), 'true');
    const nowIso = new Date().toISOString();
    const payload = {
      tipo: key,
      titulo,
      descripcion,
      leida: false,
      cliente_id: cliente.id,
      proyecto_id: proyecto?.id || null,
      channel: 'email_whatsapp',
      scheduled_for: scheduledFor,
      created_at: nowIso,
    };
    try { if (isConfigured) await supabase.from('notificaciones').insert([payload]); } catch (_) {}
    if (immediate && !scheduledFor) {
      setChatMsgs(prev => [...prev, { from: 'studio', name: 'Feria · Sistema', time: 'Ahora', text: descripcion }]);
    }
  }, [cliente?.id, proyecto?.id, portalMessageFlag]);

  const SCREENS = [
    { id: 'progreso',     label: 'Mi proyecto',  icon: PanelRight },
    { id: 'documentos',   label: 'Documentos',    icon: FileText },
    { id: 'brief',        label: 'Brief',         icon: ClipboardList },
    { id: 'reunion',      label: 'Presentación',  icon: Presentation },
    { id: 'aprobaciones', label: 'Aprobaciones',  icon: BadgeCheck },
    { id: 'brandkit',     label: 'Brand Kit',     icon: PackageCheck },
    { id: 'novedades',    label: 'Novedades',     icon: Megaphone },
    { id: 'mensajes',     label: 'Mensajes',      icon: MessagesSquare },
  ];

  // ── CARGAR PROGRESO GUARDADO ───────────────────────────────────
  React.useEffect(() => {
    if (!cliente?.id) return;
    const { supabase: sb, isConfigured: ic } = require('../../lib/supabase');
    if (!ic) return;
    sb.from('portal_progreso').select('*').eq('cliente_id', cliente.id).single()
      .then(({ data: row }) => {
        if (!row) return;
        if (row.sentir_data) setSentirData(prev => mergeSavedBriefData(prev, row.sentir_data));
        if (row.selected_applications) {
          const apps = Array.isArray(row.selected_applications) ? row.selected_applications : [];
          setSelectedApplicationIds(apps.map(a => a.application_id || a.id).filter(Boolean));
          setPaidExtraApplicationIds(apps.filter(a => a.is_extra && a.extra_status === 'pagada').map(a => a.application_id || a.id).filter(Boolean));
        }
        if (row.application_selection_completed_at) setApplicationSelectionComplete(true);
        if (row.aprobaciones) setAprobaciones(row.aprobaciones);
        if (row.reunion_confirmada) setReunionConfirmada(row.reunion_confirmada);
        if (row.approval_act_signed_at) setApprovalActSigned(true);
        if (row.delivery_act_signed_at) setDeliveryActSigned(true);
      });
  }, [cliente?.id]);

  // ── MENSAJES AUTOMÁTICOS POR ETAPA DEL PORTAL ───────────────────
  React.useEffect(() => {
    if (!briefComplete || !cliente?.id || !startDate) return;
    const halfDay = Math.max(1, Math.floor(totalDays / 2));
    const cookingDay = Math.max(2, Math.floor(totalDays * 0.72));

    if (elapsedDays >= halfDay) {
      sendPortalLifecycleMessage('portal_mitad_proceso', {
        titulo: 'Tu proyecto avanza',
        descripcion: 'Nuestros creativos están preparando los ingredientes de tu marca. Estamos cuidando la estrategia, la forma y cada detalle visual para que el resultado tenga sentido.',
        immediate: true,
      });
    }

    if (elapsedDays >= cookingDay) {
      sendPortalLifecycleMessage('portal_cocinando', {
        titulo: 'Tu proyecto se está cocinando',
        descripcion: 'Tu proyecto se está cocinando. Estamos refinando las decisiones creativas para llegar a una presentación clara, sólida y alineada a tu brief.',
        immediate: true,
      });
    }

    if (daysLeft <= 2) {
      localStorage.setItem(`${storagePrefix}_meeting_unlocked`, 'true');
      sendPortalLifecycleMessage('portal_reunion_lista', {
        titulo: 'Ha llegado el momento de reunirnos',
        descripcion: 'Ha llegado el día de preparar la reunión. Elige la fecha y hora que prefieras para revisar la presentación de tu proyecto con nuestro equipo.',
        immediate: true,
      });
    }
  }, [briefComplete, cliente?.id, startDate, elapsedDays, daysLeft, totalDays, storagePrefix, sendPortalLifecycleMessage]);

  React.useEffect(() => {
    if (!approvalsReady || !cliente?.id) return;
    sendPortalLifecycleMessage('portal_aprobacion_lista', {
      titulo: 'Tu proyecto está listo para aprobación',
      descripcion: 'Tu proyecto está listo para su aprobación. Ya puedes revisar los archivos cargados por el equipo y aprobar las propuestas desde tu portal.',
      immediate: true,
    });
  }, [approvalsReady, cliente?.id, sendPortalLifecycleMessage]);

  // ── GUARDAR PROGRESO EN SUPABASE ───────────────────────────────
  const saveProgreso = async (updates) => {
    if (!cliente?.id) return;
    const { supabase: sb, isConfigured: ic } = await import('../../lib/supabase');
    if (!ic) return;
    await sb.from('portal_progreso').upsert({
      cliente_id: cliente.id,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cliente_id' });
  };

  const buildSelectedApplicationRows = (ids = selectedApplicationIds, extraIds = paidExtraApplicationIds) => {
    const extraSet = new Set(extraIds || []);
    return (ids || []).map((id, index) => {
      const app = applicationById(id);
      const isExtra = extraSet.has(id);
      return {
        application_id: id,
        name: app.name,
        category: app.category,
        status: 'pendiente',
        is_extra: isExtra,
        extra_price: isExtra ? Number(app.basePrice || 0) : 0,
        extra_status: isExtra ? 'pagada' : 'incluida',
        selected_by: 'cliente',
        sort_order: index + 1,
      };
    });
  };

  const persistApplicationSelection = React.useCallback((ids, extraIds) => {
    localStorage.setItem(applicationStorageKey, JSON.stringify(ids || []));
    localStorage.setItem(`${applicationStorageKey}_paid_extras`, JSON.stringify(extraIds || []));
  }, [applicationStorageKey]);

  React.useEffect(() => {
    if (!questionsComplete || applicationSelectionComplete || !includedApplicationLimit) return;
    if ((selectedApplicationIds || []).length) return;
    const flag = `${applicationStorageKey}_recommended_applied`;
    if (localStorage.getItem(flag) === 'true') return;
    const recommended = recommendedApplicationIds.slice(0, Math.min(4, Math.max(0, includedApplicationLimit - 1)));
    if (!recommended.length) return;
    setSelectedApplicationIds(recommended);
    persistApplicationSelection(recommended, paidExtraApplicationIds || []);
    localStorage.setItem(flag, 'true');
  }, [questionsComplete, applicationSelectionComplete, includedApplicationLimit, applicationStorageKey, selectedApplicationIds, paidExtraApplicationIds, recommendedApplicationIds, persistApplicationSelection]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paidExtraRaw = params.get('extra_paid');
    const cancelledExtra = params.get('extra_cancelled');
    if (!cliente?.id || (!paidExtraRaw && !cancelledExtra)) return;

    const nowIso = new Date().toISOString();

    if (paidExtraRaw) {
      const paidIds = paidExtraRaw.split(',').map(v => decodeURIComponent(v).trim()).filter(Boolean);
      const validPaidIds = paidIds.filter(id => applicationById(id)?.id);
      if (validPaidIds.length) {
        const mergedSelected = Array.from(new Set([...(selectedApplicationIds || []), ...validPaidIds]));
        const mergedPaid = Array.from(new Set([...(paidExtraApplicationIds || []), ...validPaidIds]));

        setSelectedApplicationIds(mergedSelected);
        setPaidExtraApplicationIds(mergedPaid);
        persistApplicationSelection(mergedSelected, mergedPaid);
        localStorage.setItem(`${applicationStorageKey}_complete`, 'true');
        localStorage.setItem(`${applicationStorageKey}_pending_extras`, JSON.stringify([]));
        localStorage.setItem(scopedCompletionKey, nowIso);
        localStorage.setItem(`${storagePrefix}_project_started_at`, nowIso);
        setApplicationSelectionComplete(true);

        try {
          saveProgreso({
            selected_applications: buildSelectedApplicationRows(mergedSelected, mergedPaid),
            application_selection_completed_at: nowIso,
            brief_completed_at: nowIso,
            project_started_at: nowIso,
          });
        } catch (_) {}
        try { ensureProductionProjectFromBrief({ completedAt: nowIso, selectedAppsRows: buildSelectedApplicationRows(mergedSelected, mergedPaid) }); } catch (_) {}
      }
    }

    if (cancelledExtra) {
      const includedSelected = (selectedApplicationIds || []).filter(id => !(paidExtraApplicationIds || []).includes(id)).length;
      if (includedSelected >= Number(includedApplicationLimit || 0)) {
        localStorage.setItem(`${applicationStorageKey}_complete`, 'true');
        localStorage.setItem(scopedCompletionKey, nowIso);
        localStorage.setItem(`${storagePrefix}_project_started_at`, nowIso);
        setApplicationSelectionComplete(true);
        try {
          saveProgreso({
            selected_applications: buildSelectedApplicationRows(selectedApplicationIds, paidExtraApplicationIds),
            application_selection_completed_at: nowIso,
            brief_completed_at: nowIso,
            project_started_at: nowIso,
          });
        } catch (_) {}
        try { ensureProductionProjectFromBrief({ completedAt: nowIso, selectedAppsRows: buildSelectedApplicationRows(selectedApplicationIds, paidExtraApplicationIds) }); } catch (_) {}
      }
    }

    setScreen('progreso');
    setPendingExtraApplication(null);
    setPendingExtraApplicationIds([]);
    localStorage.setItem(`${applicationStorageKey}_pending_extras`, JSON.stringify([]));
    params.delete('extra_paid');
    params.delete('extra_cancelled');
    params.delete('screen');
    const clean = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (clean ? `?${clean}` : ''));
  // Procesa el retorno de pago una sola vez por URL; las banderas locales evitan duplicados.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id, applicationStorageKey, storagePrefix, selectedApplicationIds, paidExtraApplicationIds]);

  const persistPendingExtras = (ids = []) => {
    const unique = Array.from(new Set(ids || []));
    setPendingExtraApplicationIds(unique);
    localStorage.setItem(`${applicationStorageKey}_pending_extras`, JSON.stringify(unique));
  };

  const handleToggleApplication = (appId) => {
    if (pendingExtraApplicationIds.includes(appId)) {
      const nextPending = pendingExtraApplicationIds.filter(id => id !== appId);
      persistPendingExtras(nextPending);
      if (pendingExtraApplication?.id === appId) setPendingExtraApplication(null);
      return;
    }

    if (selectedApplicationIds.includes(appId)) {
      const next = selectedApplicationIds.filter(id => id !== appId);
      const nextExtras = paidExtraApplicationIds.filter(id => id !== appId);
      setSelectedApplicationIds(next);
      setPaidExtraApplicationIds(nextExtras);
      persistApplicationSelection(next, nextExtras);
      return;
    }

    const includedSelected = selectedApplicationIds.filter(id => !paidExtraApplicationIds.includes(id)).length;
    if (includedSelected < includedApplicationLimit) {
      const next = [...selectedApplicationIds, appId];
      setSelectedApplicationIds(next);
      persistApplicationSelection(next, paidExtraApplicationIds);
      return;
    }

    const app = applicationById(appId);
    setPendingExtraApplication(app);
    persistPendingExtras([...pendingExtraApplicationIds, appId]);
  };

  const discardPendingExtras = () => {
    setPendingExtraApplication(null);
    persistPendingExtras([]);
  };

  const handleConfirmExtraApplication = async () => {
    const extraIds = Array.from(new Set([...(pendingExtraApplicationIds || []), pendingExtraApplication?.id].filter(Boolean)));
    if (!extraIds.length || extraPaymentLoading) return;
    const extraApps = extraIds.map(applicationById).filter(app => app?.id);
    const amount = extraApps.reduce((sum, app) => sum + Number(app.basePrice || 0), 0);
    if (amount <= 0) return;

    setExtraPaymentLoading(true);
    try {
      const label = extraApps.length === 1 ? extraApps[0].name : `${extraApps.length} aplicaciones extra`;
      const cobro = await addCobro({
        clienteId: cliente.id,
        cliente_id: cliente.id,
        nombre: `Aplicaciones extra · ${label}`,
        tipo: `Aplicaciones extra · ${label}`,
        payment_stage: 'application_extra',
        monto: amount,
        status: 'pending',
        via: 'Stripe',
        is_demo: Boolean(cliente?.is_demo),
        application_id: extraIds.join(','),
        proyecto_id: proyecto?.id || null,
      });

      const paidParam = encodeURIComponent(extraIds.join(','));
      const returnPath = `${window.location.pathname}?screen=progreso&extra_paid=${paidParam}`;
      const cancelPath = `${window.location.pathname}?screen=progreso&extra_cancelled=1`;
      const successUrl = `${window.location.origin}/pago-completado?return_to=${encodeURIComponent(returnPath)}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}${cancelPath}`;

      const payment = await createPaymentLink({
        clienteNombre: cliente?.nombre || 'Cliente',
        clienteEmail: cliente?.email || currentEmail,
        monto: amount,
        tipo: `Aplicaciones extra · ${label}`,
        cobro_id: cobro?.id,
        payment_stage: 'application_extra',
        application_id: extraIds.join(','),
        proyecto_id: proyecto?.id || null,
        cliente_id: cliente?.id,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      if (!payment?.ok) throw new Error(payment?.error || 'No se pudo crear el pago en Stripe.');

      if (payment?.demo) {
        const next = Array.from(new Set([...selectedApplicationIds, ...extraIds]));
        const nextExtras = Array.from(new Set([...paidExtraApplicationIds, ...extraIds]));
        const completedAt = new Date().toISOString();
        setSelectedApplicationIds(next);
        setPaidExtraApplicationIds(nextExtras);
        persistApplicationSelection(next, nextExtras);
        localStorage.setItem(`${applicationStorageKey}_complete`, 'true');
        localStorage.setItem(scopedCompletionKey, completedAt);
        localStorage.setItem(`${storagePrefix}_project_started_at`, completedAt);
        setApplicationSelectionComplete(true);
        try { await saveProgreso({ selected_applications: buildSelectedApplicationRows(next, nextExtras), application_selection_completed_at: completedAt, brief_completed_at: completedAt, project_started_at: completedAt }); } catch (_) {}
        try { ensureProductionProjectFromBrief({ completedAt, selectedAppsRows: buildSelectedApplicationRows(next, nextExtras) }); } catch (_) {}
        discardPendingExtras();
        setScreen('progreso');
        window.alert('Modo demo: las aplicaciones extra fueron marcadas como pagadas.');
        return;
      }

      if (!payment?.url) throw new Error('Stripe no devolvió URL de pago. Revisa STRIPE_SECRET_KEY y la función create-payment-link.');
      if (cobro?.id && payment?.url) await savePaymentLink(cobro.id, payment.url);
      sessionStorage.setItem('feria_pending_extra_payment', JSON.stringify({ app_ids: extraIds, cobro_id: cobro?.id, cliente_id: cliente?.id }));
      window.location.assign(payment.url);
    } catch (error) {
      console.error('Pago extra Stripe:', error);
      window.alert(error?.message || 'No se pudo abrir Stripe para pagar las aplicaciones extra.');
    } finally {
      setExtraPaymentLoading(false);
    }
  };

  const ensureProductionProjectFromBrief = async ({ completedAt = new Date().toISOString(), selectedAppsRows = null } = {}) => {
    if (!cliente?.id) return null;
    const appsRows = selectedAppsRows || buildSelectedApplicationRows(selectedApplicationIds, paidExtraApplicationIds);
    const projectPayload = {
      clienteId: cliente.id,
      nombre: (cliente.nombre || 'Cliente') + ' — ' + (cliente.servicio || 'Branding'),
      servicio: cliente.servicio || cliente.service_type || 'Branding',
      service_type: cliente.service_type || cliente.servicio || 'Branding',
      paquete: portalPackageName,
      aplicacionesIncluidas: includedApplicationLimit,
      aplicaciones: appsRows,
      fechaInicio: completedAt.slice(0, 10),
      fechaEntregaInterna: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      fechaEntregaCliente: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      diasEntrega: 45,
      diasEjecucion: 30,
      brand: cliente.brand || 'feria',
      production_status: 'pendiente_asignacion',
      brief_completed_at: completedAt,
      production_started_at: completedAt,
      brief_responses: sentirData,
    };

    let targetProject = foundProyecto || null;

    if (!targetProject && addProyecto) {
      targetProject = await addProyecto(projectPayload);
    } else if (targetProject) {
      try {
        if (updateProyecto) {
          await updateProyecto(targetProject.id, {
            paquete: portalPackageName,
            aplicacionesIncluidas: includedApplicationLimit,
            package_name: portalPackageName,
            package_app_limit: includedApplicationLimit,
            production_status: targetProject.creativo || targetProject.creativo_id ? (targetProject.production_status || 'asignado') : 'pendiente_asignacion',
            brief_completed_at: completedAt,
            production_started_at: completedAt,
            brief_responses: sentirData,
            pctCliente: Math.max(10, pct || 0),
          });
        }
      } catch (_) {}
    }

    if (targetProject?.id && appsRows?.length) {
      for (const appRow of appsRows) {
        const appId = appRow.application_id || appRow.id;
        const exists = (data.projectApplications || []).some(a => String(a.proyecto_id) === String(targetProject.id) && String(a.application_id) === String(appId));
        if (!exists && addProjectApplication) {
          try {
            const inserted = await addProjectApplication({
              proyectoId: targetProject.id,
              applicationId: appId,
              isExtra: Boolean(appRow.is_extra),
              extraPrice: Number(appRow.extra_price || 0),
              selectedBy: 'cliente',
            });
            if (inserted?.id && updateProjectApplication) {
              await updateProjectApplication(inserted.id, {
                status: appRow.status || 'pendiente',
                extra_status: appRow.extra_status || (appRow.is_extra ? 'pagada' : 'incluida'),
                sort_order: appRow.sort_order,
              });
            }
          } catch (_) {}
        }
      }
    }

    return targetProject;
  };

  const finishApplicationSelection = async () => {
    const includedSelected = selectedApplicationIds.filter(id => !paidExtraApplicationIds.includes(id)).length;
    if (includedSelected < includedApplicationLimit) return;
    const completedAt = new Date().toISOString();
    const selectedAppsRows = buildSelectedApplicationRows();
    localStorage.setItem(`${applicationStorageKey}_complete`, 'true');
    setApplicationSelectionComplete(true);
    try {
      await saveProgreso({
        sentir_data: sentirData,
        selected_applications: selectedAppsRows,
        application_selection_completed_at: completedAt,
        brief_completed_at: completedAt,
        project_started_at: completedAt,
      });
    } catch (_) {}
    try { if (cliente?.id) await saveBrief(cliente.id, sentirData); } catch (_) {}

    const midIso = isoAddDays(completedAt, Math.round(totalDays / 2));
    const cookingIso = isoAddDays(completedAt, Math.max(1, Math.floor(totalDays * 0.72)));
    const meetingIso = isoAddDays(completedAt, Math.max(0, totalDays - 2));
    localStorage.setItem(scopedCompletionKey, completedAt);
    localStorage.setItem(`${storagePrefix}_project_started_at`, completedAt);

    try {
      if (isConfigured && proyecto?.id) {
        await supabase.from('proyectos').update({
          brief_completed_at: completedAt,
          production_started_at: completedAt,
          brief_responses: sentirData,
          package_name: portalPackageName,
          package_app_limit: includedApplicationLimit,
          pct_cliente: Math.max(10, pct || 0),
          updated_at: completedAt,
        }).eq('id', proyecto.id);
      }
    } catch (_) {}

    let productionProject = proyecto || foundProyecto || null;
    try {
      productionProject = await ensureProductionProjectFromBrief({ completedAt, selectedAppsRows });
    } catch (e) {
      console.warn('No se pudo crear o sincronizar el proyecto automático desde el brief', e);
    }

    await sendPortalLifecycleMessage('portal_inicio_produccion', {
      titulo: 'Tu proyecto inició',
      descripcion: 'Tu brief fue recibido correctamente. Desde hoy empieza el tiempo de desarrollo de tu proyecto y nuestro equipo creativo inicia la etapa de análisis.',
      immediate: true,
    });
    await sendPortalLifecycleMessage('portal_mitad_proceso_programado', {
      titulo: 'Mitad de proceso programada',
      descripcion: 'Nuestros creativos preparan los ingredientes de tu marca. Este mensaje se enviará a mitad del proceso.',
      scheduledFor: midIso,
    });
    await sendPortalLifecycleMessage('portal_cocinando_programado', {
      titulo: 'Proyecto en refinamiento programado',
      descripcion: 'Tu proyecto se está cocinando. Este mensaje se enviará durante la etapa final de refinamiento.',
      scheduledFor: cookingIso,
    });
    await sendPortalLifecycleMessage('portal_reunion_programada', {
      titulo: 'Reunión próxima',
      descripcion: 'Dos días antes de la presentación se activará la elección de fecha y hora para tu reunión.',
      scheduledFor: meetingIso,
    });

    try {
      const nowIso = new Date().toISOString();
      await supabase.from('notificaciones').insert([{ tipo:'nuevo_proyecto', titulo:'Nuevo proyecto pendiente de asignar diseñador', descripcion:`${cliente?.nombre || 'Cliente'} completó el brief y eligió aplicaciones. Asignar diseñador.`, leida:false, cliente_id:cliente?.id, proyecto_id:productionProject?.id || proyecto?.id || null, created_at:nowIso }]);
    } catch (_) {}
    setScreen('progreso');
  };


  const saveSentir = async () => {
    const ta = document.getElementById('sentirTA');
    const val = String(ta?.value || sentirData[sentirIdx]?.draft || '').trim();
    if (!val) return;

    const newData = sentirData.map((s, i) => i === sentirIdx ? { ...s, filled: true, respuesta: val } : s);
    setSentirData(newData);
    await saveProgreso({ sentir_data: newData });
    if (cliente?.id) await saveBrief(cliente.id, newData);

    // ── Cuando todas las preguntas están completas → elegir aplicaciones ─────
    const todasCompletas = newData.every(s => s.filled);
    if (todasCompletas) {
      try {
        await saveProgreso({
          sentir_data: newData,
          selected_applications: buildSelectedApplicationRows(),
          application_selection_pending: true,
        });
      } catch (_) {}
      setSentirIdx(newData.length);
      return;
    }

    // Si el usuario intenta finalizar pero faltan preguntas, lo llevamos a la primera pendiente.
    const firstMissingIdx = newData.findIndex(s => !s.filled);
    const isLastQuestion = sentirIdx >= newData.length - 1;
    if (isLastQuestion && firstMissingIdx >= 0) {
      setSentirIdx(firstMissingIdx);
      try {
        window.alert(`Antes de elegir aplicaciones, completa la pregunta ${firstMissingIdx + 1}.`);
      } catch (_) {}
      return;
    }

    setSentirIdx(i => Math.min(i + 1, newData.length - 1));
  };

  const aprobar = async (idx) => {
    const newAprob = aprobaciones.map((ap, i) => i === idx ? { ...ap, approved: true } : ap);
    const allApproved = newAprob.every(a => a.approved);
    setAprobaciones(newAprob);
    await saveProgreso({ aprobaciones: newAprob, approvals_completed_at: allApproved ? new Date().toISOString() : undefined });
    if (cliente?.id) await saveAprobacion(cliente.id, `aprobacion_${idx}`, true);
    if (allApproved && cliente?.id) {
      try {
        await sendPortalLifecycleMessage('portal_acta_aprobacion_lista', {
          titulo: 'Documento de aprobación disponible',
          descripcion: 'Gracias por revisar las propuestas. Ya puedes firmar el documento de aprobación creativa dentro de Aprobaciones para habilitar el pago final.',
          immediate: true,
        });
      } catch (_) {}
    }
  };

  const handleApprovalActSign = async () => {
    if (!cliente?.id || approvalActComplete) return;
    const signedAt = new Date().toISOString();
    localStorage.setItem(`${storagePrefix}_approval_act_signed`, 'true');
    setApprovalActSigned(true);
    try {
      const existingFinal = data.cobros.find(c => String(c.clienteId || c.cliente_id) === String(cliente.id) && /40|final|saldo/i.test(String(c.tipo || c.nombre || '')));
      if (!existingFinal && addCobro) {
        await addCobro({ clienteId: cliente.id, cliente_id: cliente.id, tipo:'Saldo final 40%', payment_stage:'final_40', monto: Math.round(Number(cliente.monto || 2800) * 0.4), status:'pending', via:'Stripe', is_demo:Boolean(cliente.is_demo) });
      }
      await saveProgreso({ approval_act_signed_at: signedAt, final_payment_requested_at: signedAt });
      if (isConfigured) {
        await supabase.from('notificaciones').insert([{ tipo:'pago_final', titulo:'Pago final 40% pendiente', descripcion:`${cliente.nombre} firmó la aprobación creativa. Generar o enviar cobro final del 40%.`, leida:false, cliente_id:cliente.id, proyecto_id:proyecto?.id || null, channel:'interno', created_at:signedAt }]);
      }
      await sendPortalLifecycleMessage('portal_pago_final_solicitado', {
        titulo: 'Pago final disponible',
        descripcion: 'La aprobación creativa quedó firmada. Ya puedes completar el pago final del 40% para desbloquear tu Brand Kit y descargar los archivos finales.',
        immediate: true,
      });
    } catch (_) {}
  };

  const handleDeliveryActSign = async () => {
    if (!cliente?.id || deliveryActSigned) return;
    const signedAt = new Date().toISOString();
    localStorage.setItem(`${storagePrefix}_delivery_act_signed`, 'true');
    setDeliveryActSigned(true);
    try {
      await saveProgreso({ delivery_act_signed_at: signedAt, brandkit_download_started_at: signedAt });
      if (isConfigured) {
        await supabase.from('notificaciones').insert([{ tipo:'acta_entrega', titulo:'Acta de entrega final firmada', descripcion:`${cliente.nombre} firmó el acta de entrega final y descargó el Brand Kit.`, leida:false, cliente_id:cliente.id, proyecto_id:proyecto?.id || null, channel:'interno', created_at:signedAt }]);
      }
    } catch (_) {}
  };

  const handleFinalPayment = async () => {
    if (finalPaymentCobro?.payment_link || finalPaymentCobro?.stripe_payment_link) {
      window.location.href = finalPaymentCobro.payment_link || finalPaymentCobro.stripe_payment_link;
      return;
    }
    const paidAt = new Date().toISOString();
    localStorage.setItem(`${storagePrefix}_final_payment_paid`, 'true');
    setLocalFinalPaymentPaid(true);
    try { await saveProgreso({ final_payment_paid_at: paidAt, brandkit_unlocked_at: paidAt }); } catch (_) {}
    try {
      if (isConfigured && finalPaymentCobro?.id) {
        await supabase.from('cobros').update({ status: 'paid', updated_at: paidAt }).eq('id', finalPaymentCobro.id);
      }
      if (isConfigured && proyecto?.id) {
        await supabase.from('proyectos').update({ brandkit_unlocked_at: paidAt, final_payment_paid_at: paidAt, pct_cliente: 100, updated_at: paidAt }).eq('id', proyecto.id);
      }
    } catch (_) {}
    await sendPortalLifecycleMessage('portal_brandkit_desbloqueado', {
      titulo: 'Brand Kit desbloqueado',
      descripcion: 'Pago final confirmado. Tu Brand Kit ya está disponible para revisar y descargar desde tu portal.',
      immediate: true,
    });
    setScreen('brandkit');
  };

  const sendMsg = async ({ attachmentName = '', attachmentSize = 0, attachmentUrl = '', attachmentMime = '' } = {}) => {
    if (!chatInput.trim() && !attachmentName && !attachmentUrl) return;
    const text = chatInput.trim() || 'Archivo adjunto';
    const msg = { from: 'client', name: cliente?.nombre || user?.name, time: 'Ahora', text, attachmentName, attachmentUrl, attachmentMime };
    setChatMsgs(prev => [...prev, msg]);
    setChatInput('');
    try {
      await addProjectChatMessage?.({ proyectoId: proyecto?.id || null, clienteId: cliente?.id || null, senderName: cliente?.nombre || user?.email || 'Cliente', senderEmail: user?.email || cliente?.email || '', message: text, attachmentUrl, attachmentName, attachmentSize, source:'portal_cliente', etiqueta:'cliente_portal', isDemo:Boolean(cliente?.is_demo) });
    } catch (_) {}
    setTimeout(() => {
      setChatMsgs(prev => [...prev, { from: 'studio', name: 'Feria · Sistema', time: 'Ahora', text: 'Mensaje recibido. El equipo te responderá en breve.' }]);
    }, 1000);
  };

  const [portalTheme, setPortalTheme] = useState(() => localStorage.getItem('feria_client_portal_theme') || 'dark');
  const [portalMenuOpen, setPortalMenuOpen] = useState(false);
  const isDark = portalTheme === 'dark';
  const gold   = accentColor || '#E11D48';

  // Tema local del Portal Cliente. No depende del tema global de Feria OS,
  // así evitamos que “Oscuro” herede fondos claros o textos sin contraste.
  const portalColors = isDark ? {
    bg: '#09090B',
    surface: '#111113',
    surfaceAlt: '#18181B',
    card: '#141416',
    border: 'rgba(255,255,255,.10)',
    borderSoft: isDark ? 'rgba(255,255,255,.06)' : 'rgba(24,24,27,.06)',
    text: '#F4F4F5',
    muted: '#A1A1AA',
    subtle: '#71717A',
    disabled: 'rgba(244,244,245,.30)',
    success: '#34D399',
  } : {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F4F5',
    card: '#FFFFFF',
    border: 'rgba(24,24,27,.12)',
    borderSoft: 'rgba(24,24,27,.07)',
    text: '#18181B',
    muted: '#52525B',
    subtle: '#A1A1AA',
    disabled: 'rgba(24,24,27,.30)',
    success: '#16A34A',
  };
  const bg     = portalColors.bg;
  const text   = portalColors.text;
  const bgH    = portalColors.surface;
  const border = portalColors.borderSoft;
  const switchPortalTheme = () => setPortalTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    localStorage.setItem('feria_client_portal_theme', next);
    return next;
  });
  const activeScreenMeta = SCREENS.find(s => s.id === screen) || SCREENS[0];

  if (!cliente) return (
    <div style={{ minHeight: '100vh', background: isDark ? '#09090B' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: portalColors.text, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: gold, marginBottom: 8 }}>Feria Design</div>
        <div style={{ fontSize: 12, color: portalColors.muted, marginBottom: 16 }}>No hay proyecto vinculado a tu cuenta.</div>
        <button onClick={signOut} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: portalColors.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Cerrar sesión</button>
      </div>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans', sans-serif", color: text, transition: 'background .3s, color .3s' }}>

      {/* HEADER */}
      <div className="client-portal-header" style={{ padding: '12px 24px', background: bgH, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, gap: 12, flexWrap: 'wrap' }}>
        <div className="client-portal-brand" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: gold }}>Feria <em>Design</em></div>
        <div className="client-portal-head-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0 }}>
          <div className="client-portal-title-pill" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: portalColors.subtle }}>Portal del cliente</div>
          <div className="client-portal-profile" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${cliente.color}22`, color: cliente.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
              {cliente.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="client-portal-profile-name" style={{ fontSize: 11, fontWeight: 500 }}>{cliente.nombre}</div>
              <div className="client-portal-profile-service" style={{ fontSize: 9, color: portalColors.subtle }}>{cliente.servicio}</div>
            </div>
          </div>
          <div className="client-portal-theme" style={{ display:'flex', alignItems:'center', gap:8, border: `1px solid ${portalColors.border}`, borderRadius:999, padding:'4px 6px', background: portalColors.surfaceAlt }}>
            <span className="client-portal-theme-label" style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:portalColors.subtle, paddingLeft:4 }}>Tema</span>
            <button onClick={switchPortalTheme} style={{ background: portalColors.card, border:`1px solid ${portalColors.border}`, color:portalColors.text, borderRadius:999, padding:'5px 10px', fontSize:11, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color: gold, display:'inline-flex' }}>{isDark ? <Moon size={13} strokeWidth={1.8} /> : <Sun size={13} strokeWidth={1.8} />}</span>
              {isDark ? 'Oscuro' : 'Claro'}
            </button>
          </div>
          <button className="client-portal-logout" onClick={signOut} style={{ background: 'transparent', border: `1px solid ${portalColors.border}`, color: portalColors.subtle, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
            Salir
          </button>
        </div>
      </div>

      {/* NAV — con indicadores de estado */}
      <div className="client-portal-nav-shell" style={{ background: bgH, borderBottom: `1px solid ${border}`, padding: '10px 24px' }}>
        <button
          className="client-portal-menu-button"
          onClick={() => setPortalMenuOpen(v => !v)}
          aria-expanded={portalMenuOpen}
          aria-label="Abrir menu del portal"
          style={{ width:'100%', minHeight:44, border:`1px solid ${portalColors.border}`, background:portalColors.card, borderRadius:14, padding:'8px 12px', display:'flex', alignItems:'center', gap:10, color:portalColors.muted, fontFamily:'inherit', fontSize:12, cursor:'pointer' }}
        >
          <span style={{ width:28, height:28, borderRadius:10, background:`${gold}14`, color:gold, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {portalMenuOpen ? <X size={17} strokeWidth={1.9} /> : <Menu size={17} strokeWidth={1.9} />}
          </span>
          <span>Menu</span>
          <strong style={{ marginLeft:'auto', color:portalColors.text, fontSize:12, fontWeight:700 }}>{activeScreenMeta.label}</strong>
        </button>
      </div>
      <div className="client-portal-nav" style={{ display: portalMenuOpen ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit,minmax(168px,1fr))', gap: 8, padding: '10px 24px', background: bgH, borderBottom: `1px solid ${border}`, overflowX: 'visible', WebkitOverflowScrolling: 'touch' }}>
        {SCREENS.map(s => {
          const status   = getScreenStatus(s.id, briefComplete, meetingUnlocked, approvalsReady, aprobacionesComplete, kitUnlocked);
          const isActive = screen === s.id;
          const isLocked = status === 'locked';
          const Icon = s.icon;
          const isDone   = (s.id === 'brief' && briefComplete) ||
                           (s.id === 'aprobaciones' && approvalActComplete) ||
                           (s.id === 'brandkit' && kitUnlocked && deliveryActSigned);
          const navColor = isLocked ? portalColors.disabled : isActive ? gold : isDone ? portalColors.success : portalColors.muted;
          const navIconBg = isActive ? `${gold}14` : isDone ? `${portalColors.success}12` : isDark ? 'rgba(255,255,255,.025)' : 'rgba(24,24,27,.025)';
          const navIconBorder = isActive ? `${gold}38` : isDone ? `${portalColors.success}30` : portalColors.border;
          const unreadStudio = chatMsgs.filter(m => m.from === 'studio').length;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (!isLocked && !(s.id === 'brief' && briefComplete)) {
                  setScreen(s.id);
                  setPortalMenuOpen(false);
                }
              }}
              style={{
                fontSize: 11, padding: '9px 12px', cursor: isLocked ? 'not-allowed' : (s.id === 'brief' && briefComplete) ? 'default' : 'pointer',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8,
                color: navColor,
                borderBottom: isActive ? `1px solid ${gold}` : '1px solid transparent',
                background: 'transparent', border: 'none', fontFamily: 'inherit',
                opacity: isLocked ? .5 : 1,
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 8, flexShrink:0,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                background: navIconBg, border:`1px solid ${navIconBorder}`, color: navColor,
              }}>
                {isDone ? <CheckCircle2 size={13} strokeWidth={2} /> : isLocked ? <Lock size={12} strokeWidth={1.8} /> : <Icon size={13} strokeWidth={1.8} />}
              </span>
              <span style={{ position:'relative' }}>
                {s.label}
                {s.id === 'mensajes' && unreadStudio > 0 && (
                  <span style={{ position:'absolute', top:-8, right:-18, minWidth:16, height:16, padding:'0 4px', borderRadius:10, background:'#E06060', color:'#fff', fontSize:9, display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>
                    {unreadStudio}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <style>{`
        @media (max-width:520px){
          .client-portal-header{align-items:flex-start!important;padding:10px 14px!important;gap:8px!important}
          .client-portal-brand{width:100%;font-size:15px!important}
          .client-portal-head-actions{width:100%;justify-content:space-between!important;gap:8px!important}
          .client-portal-title-pill{order:3;width:100%;text-align:left;font-size:9px!important}
          .client-portal-profile{flex:1 1 132px}
          .client-portal-profile-name,.client-portal-profile-service{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .client-portal-theme{gap:4px!important;padding:3px!important}
          .client-portal-theme-label{display:none}
          .client-portal-logout{padding:5px 9px!important}
          .client-portal-nav-shell{padding:8px 12px!important}
          .client-portal-nav{grid-template-columns:1fr!important;padding:8px 12px!important}
          .client-portal-nav button{padding:8px 10px!important}
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>

        {/* ══ MI PROYECTO ══ */}
        {screen === 'progreso' && (
          <>
            <div style={{ display: 'none' }}>
              <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,.5)', marginBottom: 10 }}>Tu espacio</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 300, lineHeight: 1.2, marginBottom: 8 }}>
                Tu marca está <em style={{ color: gold }}>tomando forma</em>
              </div>
              <div style={{ fontSize: 11, color: portalColors.muted, lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
                Sigue el avance de tu proyecto, revisa entregas y comunícate con el equipo.
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ padding: '22px 24px' }}>
              <StageAnimation stage={fase} daysLeft={daysLeft} isDark={isDark} accentColor={gold} forceIllustration compact />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: portalColors.subtle }}>Progreso del proyecto</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: gold }}>{pct}%</div>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, marginBottom: 18, position: 'relative' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: gold, borderRadius: 2, transition: 'width .8s' }} />
                <div style={{ position: 'absolute', top: -3, width: 9, height: 9, borderRadius: '50%', background: gold, border: `2px solid ${bg}`, left: `${Math.min(pct, 99)}%`, transform: 'translateX(-50%)' }} />
              </div>

              {/* Stage dots */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                {STAGE_LABELS.map((l, i) => {
                  const done = i < fase;
                  const curr = i === fase;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 8, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? gold : curr ? 'transparent' : isDark ? 'rgba(255,255,255,.06)' : 'rgba(24,24,27,.06)',
                        color: done ? isDark ? '#09090B' : '#FFFFFF' : curr ? gold : portalColors.disabled,
                        border: curr ? `1.5px solid ${gold}` : 'none',
                        boxShadow: curr ? '0 0 0 3px rgba(201,169,110,0.1)' : 'none',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
                {[
                  { val: daysLeft <= 0 ? '¡Hoy!' : daysLeft, lbl: 'Días para entrega', c: daysLeft <= 1 ? gold : portalColors.text },
                  { val: `${fase + 1} / ${STAGE_LABELS.length}`, lbl: 'Etapas completadas', c: portalColors.success },
                  { val: cliente.servicio.split(' ')[0], lbl: 'Tipo de proyecto', c: portalColors.text },
                ].map(s => (
                  <div key={s.lbl} style={{ background: portalColors.card, border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: s.c, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: portalColors.subtle, marginTop: 3 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Contador de producción */}
              {briefComplete && (
                <div style={{ background: portalColors.card, border: `1px solid ${portalColors.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform:'uppercase', letterSpacing:'.12em', color: portalColors.subtle, marginBottom:4 }}>Tiempo de desarrollo</div>
                      <div style={{ fontFamily:"'DM Serif Display', serif", fontSize: 22, color: portalColors.text }}>El contador está activo</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'DM Serif Display', serif", fontSize: 34, lineHeight:1, color: daysLeft <= 2 ? gold : portalColors.text }}>{daysLeft <= 0 ? 'Hoy' : daysLeft}</div>
                      <div style={{ fontSize: 10, color: portalColors.muted }}>{daysLeft <= 0 ? 'día de entrega' : 'días restantes'}</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                    <div style={{ background:isDark?'rgba(255,255,255,.03)':'rgba(24,24,27,.04)', border:`1px solid ${portalColors.borderSoft}`, borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:10, color:portalColors.subtle }}>Días totales</div>
                      <div style={{ fontSize:15, color:portalColors.text, fontWeight:700 }}>{totalDays} días</div>
                    </div>
                    <div style={{ background:isDark?'rgba(255,255,255,.03)':'rgba(24,24,27,.04)', border:`1px solid ${portalColors.borderSoft}`, borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:10, color:portalColors.subtle }}>Inicio</div>
                      <div style={{ fontSize:15, color:portalColors.text, fontWeight:700 }}>{formatShortDate(startDate)}</div>
                    </div>
                  </div>
                  <div style={{ height: 5, background: isDark ? 'rgba(255,255,255,.07)' : 'rgba(24,24,27,.08)', borderRadius: 20, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.max(2, Math.min(100, Math.round(((totalDays - daysLeft) / Math.max(totalDays, 1)) * 100)))}%`, background: gold, borderRadius:20, transition:'width .6s' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:10, color:portalColors.muted }}>
                    <span>Inicio del desarrollo</span>
                    <span>{daysLeft <= 2 ? 'Reunión disponible' : `Reunión se activa a 2 días del cierre`}</span>
                  </div>
                </div>
              )}

              {/* Próximo paso */}
              {daysLeft <= 1 && (
                <div style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 20 }}
                  onClick={() => setScreen('mensajes')}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>📅</div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(201,169,110,.5)', marginBottom: 2 }}>Próximo paso</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Reunión de presentación final</div>
                    <div style={{ fontSize: 11, color: portalColors.muted, marginTop: 1 }}>El link de Zoom llegó a tu email</div>
                  </div>
                </div>
              )}

              {/* Flujo de pasos del cliente */}
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: portalColors.subtle, marginBottom: 14 }}>Tu flujo paso a paso</div>
              {[
                { id: 'brief',        icon: briefComplete ? '✓' : '◉', label: briefComplete ? 'Brief completado' : 'Completa el Brief', desc: briefComplete ? 'Tus respuestas y aplicaciones ya fueron recibidas' : 'Completa la información estratégica del proyecto', done: briefComplete, screen: 'brief', locked: briefComplete },
                { id: 'reunion',      icon: '◷', label: 'Presentación',      desc: daysLeft <= 2 ? 'Elige fecha y hora para la presentación' : 'Se activará 2 días antes del cierre', done: Boolean(reunionConfirmada), screen: 'reunion', locked: !meetingUnlocked },
                { id: 'aprobaciones', icon: '◧', label: 'Aprueba las propuestas', desc: 'Revisa y aprueba los archivos cargados por Feria', done: aprobacionesComplete, screen: 'aprobaciones', locked: !approvalsReady },
                { id: 'acta-aprobacion', icon: '✍', label: 'Firma aprobación creativa', desc: 'Deja constancia de marca y aplicaciones aprobadas', done: approvalActComplete, screen: 'aprobaciones', locked: !aprobacionesComplete },
                { id: 'pago',         icon: '◌', label: 'Pago final 40%',         desc: 'Completa el saldo final para desbloquear la descarga', done: kitUnlocked, screen: 'brandkit', locked: !approvalActComplete },
                { id: 'brandkit',     icon: '✦', label: 'Firma entrega y descarga',  desc: 'Manual, aplicaciones finales y carpeta Brand Kit', done: kitUnlocked && deliveryActSigned, screen: 'brandkit', locked: !kitUnlocked },
              ].map((step, i) => (
                <div
                  key={step.id}
                  onClick={() => !step.locked && !step.done && setScreen(step.screen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                    background: step.done ? 'rgba(123,198,122,0.06)' : step.locked ? 'rgba(255,255,255,.02)' : 'rgba(201,169,110,0.06)',
                    border: `1px solid ${step.done ? 'rgba(123,198,122,0.2)' : step.locked ? portalColors.borderSoft : 'rgba(201,169,110,0.15)'}`,
                    cursor: step.locked ? 'not-allowed' : step.done ? 'default' : 'pointer',
                    opacity: step.locked ? .5 : 1,
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: step.done ? 'rgba(123,198,122,0.15)' : step.locked ? portalColors.borderSoft : 'rgba(201,169,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: step.done ? portalColors.success : step.locked ? portalColors.disabled : gold }}>
                    {step.done ? '✓' : step.locked ? '🔒' : step.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: step.done ? portalColors.success : step.locked ? portalColors.subtle : portalColors.text }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: portalColors.muted, marginTop: 1 }}>{step.done ? 'Completado ✓' : step.locked ? 'Disponible cuando completes el paso anterior' : step.desc}</div>
                  </div>
                  {!step.locked && !step.done && <div style={{ fontSize: 14, color: gold, flexShrink: 0 }}>→</div>}
                </div>
              ))}
            </div>
          </>
        )}


        {/* ══ DOCUMENTOS ══ */}
        {screen === 'documentos' && (
          <ClientPortalDocuments
            cliente={cliente}
            proyecto={proyecto}
            briefComplete={briefComplete}
            aprobacionesComplete={aprobacionesComplete}
            kitUnlocked={kitUnlocked}
            onDownloadContract={() => downloadContractPDF(cliente, proyecto)}
            onDownloadQuote={() => downloadQuotePDF(cliente, proyecto)}
            onDownloadBrief={() => downloadBriefPDF(cliente, sentirData)}
            isDark={isDark}
            accentColor={gold}
          />
        )}

        {/* ══ BRIEF ══ */}
        {screen === 'brief' && (
          <ClientPortalBrief
            sentirData={sentirData}
            sentirIdx={sentirIdx}
            setSentirIdx={setSentirIdx}
            setSentirData={setSentirData}
            briefComplete={briefComplete}
            onSave={saveSentir}
            briefDownloaded={briefDownloaded}
            setBriefDownloaded={setBriefDownloaded}
            downloadBriefPDF={downloadBriefPDF}
            cliente={cliente}
            isDark={isDark}
            accentColor={gold}
            questionsComplete={questionsComplete}
            applicationSelectionComplete={applicationSelectionComplete}
            packageName={portalPackageName}
            includedApplicationLimit={includedApplicationLimit}
            selectedApplicationIds={selectedApplicationIds}
            paidExtraApplicationIds={paidExtraApplicationIds}
            recommendedApplicationIds={recommendedApplicationIds}
            pendingExtraApplicationIds={pendingExtraApplicationIds}
            pendingExtraApplication={pendingExtraApplication}
            onToggleApplication={handleToggleApplication}
            onConfirmExtraApplication={handleConfirmExtraApplication}
            onCancelExtraApplication={discardPendingExtras}
            onFinishApplicationSelection={finishApplicationSelection}
            extraPaymentLoading={extraPaymentLoading}
          />
        )}

        {/* ══ APROBACIONES ══ */}
        {screen === 'aprobaciones' && (
          getScreenStatus('aprobaciones', briefComplete, meetingUnlocked, approvalsReady, aprobacionesComplete, kitUnlocked) === 'locked'
            ? <LockedScreen isDark={isDark} accentColor={gold} title="Aprobaciones todavía no disponibles" reason={!briefComplete ? 'Completa el brief del proyecto primero. Una vez que el equipo tenga tus respuestas, iniciaremos la producción.' : 'Cuando la reunión esté confirmada y el equipo cargue los archivos, recibirás un mensaje por correo y WhatsApp para revisar y aprobar tus propuestas.'} />
            : <ClientPortalApprovals
                aprobaciones={aprobaciones}
                onAprobar={aprobar}
                aprobacionesComplete={aprobacionesComplete}
                approvalActSigned={approvalActComplete}
                onSignApprovalAct={handleApprovalActSign}
                kitUnlocked={kitUnlocked}
                onGoToBrandKit={() => setScreen('brandkit')}
                isDark={isDark}
                accentColor={gold}
              />
        )}

        {/* ══ BRAND KIT ══ */}
        {screen === 'brandkit' && (
          getScreenStatus('brandkit', briefComplete, meetingUnlocked, approvalsReady, aprobacionesComplete, kitUnlocked) === 'locked'
            ? <LockedScreen isDark={isDark} accentColor={gold} title="Brand Kit bloqueado" reason="Aprueba primero las propuestas y firma el documento de aprobación creativa. Después se activará el pago final y la entrega del Brand Kit." />
            : <ClientPortalBrandKit
                cliente={cliente}
                proyecto={proyecto}
                isDark={isDark}
                accentColor={gold}
                kitUnlocked={kitUnlocked}
                approvalActSigned={approvalActComplete}
                deliveryActSigned={deliveryActSigned}
                finalPaymentCobro={finalPaymentCobro}
                pct={pct}
                onFinalPayment={handleFinalPayment}
                onGoToApprovals={() => setScreen('aprobaciones')}
                onSignDeliveryAct={handleDeliveryActSign}
                onDownloadBrandKit={() => downloadBrandKitPDF(cliente, proyecto)}
              />
        )}

        {false && screen === 'brandkit' && (
          getScreenStatus('brandkit', briefComplete, meetingUnlocked, approvalsReady, aprobacionesComplete, kitUnlocked) === 'locked'
            ? <LockedScreen isDark={isDark} accentColor={gold} title="Brand Kit bloqueado" reason="Aprueba primero todas las propuestas de diseño. Una vez aprobadas, se activará el pago final del 40% y luego podrás descargar tus archivos finales." />
            : !kitUnlocked
              ? (
                <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 16px' }}>⏳</div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 8 }}>Confirma el pago final</div>
                  <div style={{ fontSize: 12, color: portalColors.muted, lineHeight: 1.7, maxWidth: 320, margin: '0 auto 20px' }}>
                    Las propuestas están aprobadas. El Brand Kit se desbloqueará automáticamente cuando se confirme el pago del 40% final.
                  </div>
                  <button onClick={handleFinalPayment} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily:'inherit', marginBottom: 18 }}>
                    {finalPaymentCobro?.payment_link || finalPaymentCobro?.stripe_payment_link ? 'Pagar saldo final 40%' : 'Confirmar pago final 40%'}
                  </button>
                  <div style={{ height: 4, background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(24,24,27,.06)', borderRadius: 2, overflow: 'hidden', maxWidth: 200, margin: '0 auto' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: gold, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, color: portalColors.subtle, marginTop: 8 }}>{pct}% completado · falta el pago final</div>
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                  <div style={{ textAlign: 'center', paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,.04)', marginBottom: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,.5)', marginBottom: 8 }}>Tu identidad completa</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 300 }}>Brand Kit <em style={{ color: gold }}>{cliente.nombre.split(' ')[0]}</em></div>
                    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 10, color: gold }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: gold }} /> Desbloqueado
                    </div>
                  </div>

                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: portalColors.subtle, marginBottom: 12 }}>Logos — clic para descargar</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
                    {['Principal', 'Blanco', 'Isotipo', 'Horizontal'].map(l => (
                      <div key={l} style={{ background: portalColors.card, border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,169,110,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = portalColors.borderSoft}>
                        <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <svg viewBox="0 0 40 28" width="36"><polygon points="20,2 38,26 2,26" fill="none" stroke={portalColors.text} strokeWidth="1.5"/><polygon points="20,9 32,26 8,26" fill={portalColors.text}/></svg>
                        </div>
                        <div style={{ fontSize: 10, color: portalColors.muted }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: portalColors.subtle, marginBottom: 12 }}>Colores — clic para copiar HEX</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 24 }}>
                    {COLORS.map(c => (
                      <div key={c.hex} style={{ borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,.05)', transition: 'transform .15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = ''}
                        onClick={() => navigator.clipboard?.writeText(c.hex).catch(() => {})}>
                        <div style={{ height: 44, background: c.hex }} />
                        <div style={{ background: portalColors.card, padding: '6px 8px' }}>
                          <div style={{ fontSize: 9, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name.split(' ')[0]}</div>
                          <div style={{ fontSize: 9, color: portalColors.muted, fontFamily: 'monospace' }}>{c.hex}</div>
                          <div style={{ fontSize: 8, color: portalColors.subtle }}>RGB {c.rgb}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div onClick={() => downloadBrandKitPDF(cliente, proyecto)} style={{ background: portalColors.card, border: '1px solid rgba(255,255,255,.05)', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,169,110,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = portalColors.borderSoft}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(224,96,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📄</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Manual de identidad {cliente.nombre.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, color: portalColors.muted, marginTop: 2 }}>PDF · 42 páginas · uso de marca, color, tipografía, aplicaciones</div>
                    </div>
                    <div style={{ background: gold, color: isDark ? '#09090B' : '#FFFFFF', fontSize: 11, fontWeight: 600, padding: '8px 16px', borderRadius: 8, flexShrink: 0 }}>↓ PDF</div>
                  </div>
                </div>
              )
        )}

        {/* ══ REUNIÓN ══ */}
        {screen === 'reunion' && (
          getScreenStatus('reunion', briefComplete, meetingUnlocked, approvalsReady, aprobacionesComplete, kitUnlocked) === 'locked'
            ? <LockedScreen isDark={isDark} accentColor={gold} title="La reunión se activará al final" reason={briefComplete ? `Tu reunión se activará cuando falten 2 días para el cierre del desarrollo. Actualmente faltan ${daysLeft} días.` : 'Completa primero el brief para iniciar el tiempo de desarrollo del proyecto.'} />
            : <ClientPortalMeetings
                reunionForm={reunionForm}
                setReunionForm={setReunionForm}
                reunionEnviada={reunionEnviada}
                setReunionEnviada={setReunionEnviada}
                reunionConfirmada={reunionConfirmada}
                setReunionConfirmada={setReunionConfirmada}
                cliente={cliente}
                user={user}
                isDark={isDark}
                accentColor={gold}
                onMeetingConfirmed={async (meeting) => {
                  const confirmedAt = new Date().toISOString();
                  localStorage.setItem(`${storagePrefix}_approvals_ready`, 'true');
                  try { await saveProgreso({ reunion_confirmada: meeting, meeting_confirmed_at: confirmedAt, approvals_ready_at: confirmedAt }); } catch (_) {}
                  await sendPortalLifecycleMessage('portal_archivos_aprobacion', {
                    titulo: 'Tu proyecto está listo para aprobación',
                    descripcion: 'Tu proyecto está listo para su aprobación. Ya puedes revisar los archivos cargados por el equipo desde la sección de Aprobaciones.',
                    immediate: true,
                  });
                }}
              />
        )}

        {screen === 'novedades' && (
          <ClientPortalStudioNews
            isDark={isDark}
            accentColor={gold}
            onRequest={(item) => {
              setScreen('mensajes');
              setChatInput(`Hola Feria, me interesa recibir más información sobre: ${item.title}.`);
            }}
          />
        )}

        {screen === 'mensajes' && (
          <ClientPortalChat
            chatMsgs={chatMsgs}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSend={sendMsg}
            isDark={isDark}
            accentColor={gold}
          />
        )}

      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
