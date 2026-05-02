import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { onlyOperationalRows, DEMO_IDS } from '../../lib/operationalData';
import { PACKAGE_RULES } from '../../lib/packages';
import { BarChart3, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock3, DollarSign, MapPin, Phone, Send, Sparkles, Target, Trash2, TrendingUp, User, Video, X } from 'lucide-react';
import { buildCorporateEmailHtml, getWhatsappImagePayload } from '../../lib/communicationTemplates';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_SEMANA_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ── TIPOS DE REUNIÓN ──────────────────────────────────────────────
const TIPOS = {
  virtual:     { label: 'Virtual',      Icon: Video,    toast: 'video', color: '#5B9BD5', bg: 'rgba(91,155,213,0.12)'  },
  presencial:  { label: 'Presencial',   Icon: MapPin,   toast: 'pin',   color: '#7BC67A', bg: 'rgba(123,198,122,0.12)' },
  llamada:     { label: 'Llamada',      Icon: Phone,    toast: 'call',  color: '#C9A96E', bg: 'rgba(201,169,110,0.12)' },
  presentacion:{ label: 'Presentación', Icon: Sparkles, toast: 'star',  color: '#D4537E', bg: 'rgba(212,83,126,0.12)'  },
  ventas:      { label: 'Ventas',       Icon: Target,   toast: 'target',color: '#E06060', bg: 'rgba(224,96,96,0.12)'  },
};

const SALES_META_KEY = 'feria_sales_meeting_meta_v1';
const SALES_RESULTS = {
  cerrado:     { label: 'Cerrado',        color: '#7BC67A', bg: 'rgba(123,198,122,.12)' },
  seguimiento: { label: 'En seguimiento', color: '#C9A96E', bg: 'rgba(201,169,110,.12)' },
  no_avanzo:   { label: 'No avanzo',      color: '#E06060', bg: 'rgba(224,96,96,.12)' },
};
const STUDIO_RESULTS = {
  logrado:      { label:'Objetivo logrado', color:'#7BC67A', bg:'rgba(123,198,122,.12)' },
  seguimiento:  { label:'Requiere seguimiento', color:'#C9A96E', bg:'rgba(201,169,110,.12)' },
  bloqueado:    { label:'Bloqueado', color:'#E06060', bg:'rgba(224,96,96,.12)' },
  pendiente:    { label:'Pendiente', color:'#5B9BD5', bg:'rgba(91,155,213,.12)' },
};
const SALES_PACKAGE_OPTIONS = Object.entries(PACKAGE_RULES).map(([name, rule]) => ({
  name,
  label: rule.label || name,
  price: Number(rule.price || 0),
}));
const SALES_PERIODS = [
  { id:'current_month', label:'Mes actual' },
  { id:'previous_month', label:'Mes anterior' },
  { id:'current_quarter', label:'Trimestre' },
  { id:'custom', label:'Rango' },
];
const TEMPLATE_STORAGE_KEY = 'feria_message_templates_v1';
const MEETING_TEMPLATE_FALLBACKS = {
  meeting_invite_email: {
    label: 'Invitacion a reunion - correo',
    subject: 'Tu reunion con Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nTe compartimos la informacion de tu reunion con {{nombre_estudio}}.\n\nProyecto: {{nombre_proyecto}}\nFecha: {{fecha_reunion}}\nDuracion: {{duracion_reunion}}\nTipo: {{tipo_reunion}}\n\nLink de reunion:\n{{link_reunion}}\n\nNos vemos pronto.\n\nCon carino,\n{{nombre_estudio}}`,
  },
  meeting_invite_whatsapp: {
    label: 'Invitacion a reunion - WhatsApp',
    subject: '',
    body: `Hola, {{nombre_cliente}}. Te compartimos tu reunion con {{nombre_estudio}}.\n\nProyecto: {{nombre_proyecto}}\nFecha: {{fecha_reunion}}\nDuracion: {{duracion_reunion}}\n\nLink:\n{{link_reunion}}`,
  },
};

// ── SEED REUNIONES ────────────────────────────────────────────────
const HOY = new Date();

function pad(n) { return String(n).padStart(2,'0'); }
function fmtHora(date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function fmtFecha(date) { return `${DIAS_SEMANA_FULL[date.getDay()]} ${date.getDate()} de ${MESES[date.getMonth()]}`; }
function sameDay(a,b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function getFirstDayOfMonth(y,m) { return new Date(y,m,1).getDay(); }
function getMessageTemplate(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '{}');
    return { ...(MEETING_TEMPLATE_FALLBACKS[key] || {}), ...(stored?.[key] || {}) };
  } catch (_) {
    return MEETING_TEMPLATE_FALLBACKS[key] || {};
  }
}
function renderMessageTemplate(text = '', values = {}) {
  return Object.entries(values).reduce((out, [key, value]) => out.split(key).join(value ?? ''), text || '');
}
function plainTemplateValues(values = {}) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace(/[{}]/g, ''), value]));
}
function needsZoomLink(r = {}) {
  return ['virtual', 'presentacion', 'ventas'].includes(r.tipo);
}
function meetingDateLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}, ${fmtHora(d)}`;
}
function normalizePhone(raw = '') {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('593')) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return `593${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('9')) return `593${digits}`;
  return digits;
}
function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}
function findMeetingClient(meeting = {}, clientes = []) {
  const id = meeting.cliente_id || meeting.clienteId || meeting.client_id;
  const byId = id ? clientes.find(c => String(c.id) === String(id)) : null;
  if (byId) return byId;
  const meetingName = normalizeText(meeting.cliente || meeting.cliente_nombre || meeting.titulo);
  if (!meetingName) return null;
  return clientes.find(c => {
    const name = normalizeText(c.nombre || c.name);
    return name && (name === meetingName || meetingName.includes(name) || name.includes(meetingName));
  }) || null;
}
function buildZoomFallbackLink(meeting = {}) {
  const source = `${meeting.id || ''}-${meeting.cliente || ''}-${new Date(meeting.fecha || Date.now()).getTime()}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = ((hash << 5) - hash) + source.charCodeAt(i);
  const meetingId = String(Math.abs(hash)).padStart(10, '7').slice(0, 10);
  return `https://zoom.us/j/${meetingId}`;
}
async function createZoomMeeting(meeting = {}) {
  const fallback = buildZoomFallbackLink(meeting);
  if (!isConfigured) return { link: fallback, provider: 'demo' };

  const start = meeting.fecha instanceof Date ? meeting.fecha : new Date(meeting.fecha || Date.now());
  const payload = {
    topic: meeting.titulo || `Reunion Feria OS - ${meeting.cliente || 'Cliente'}`,
    start_time: start.toISOString(),
    duration: Number(meeting.duracion || 60),
    timezone: 'America/Bogota',
    cliente: meeting.cliente || '',
  };

  for (const fnName of ['create-zoom-meeting', 'zoom-create-meeting']) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body: payload });
      if (!error) {
        const link = data?.join_url || data?.joinUrl || data?.zoomLink || data?.link || data?.start_url;
        if (link) return { link, provider: 'zoom', raw: data };
      }
    } catch (_) {
      // Intenta el siguiente nombre de funcion y, si no existe, cae al demo link.
    }
  }
  return { link: fallback, provider: 'demo' };
}
function buildMeetingTemplateValues(meeting = {}, cliente = {}) {
  const tipo = TIPOS[meeting.tipo] || TIPOS.virtual;
  return {
    '{{nombre_cliente}}': cliente?.nombre || meeting.cliente || 'Cliente',
    '{{email_cliente}}': cliente?.email || meeting.email || '',
    '{{telefono_cliente}}': cliente?.whatsapp || cliente?.telefono || meeting.whatsapp || '',
    '{{nombre_estudio}}': 'Feria Design Studio',
    '{{nombre_proyecto}}': meeting.proyecto || cliente?.proyecto || cliente?.servicio || meeting.titulo || 'Proyecto Feria',
    '{{fecha_reunion}}': meetingDateLabel(meeting.fecha),
    '{{duracion_reunion}}': `${Number(meeting.duracion || 60)} min`,
    '{{tipo_reunion}}': tipo.label,
    '{{link_reunion}}': meeting.link || 'Por confirmar',
  };
}
function readSalesMeta() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(SALES_META_KEY) || '{}') || {}; }
  catch { return {}; }
}
function packagePrice(name) {
  if (!name) return 0;
  return Number((SALES_PACKAGE_OPTIONS.find(p => p.name === name || p.label === name) || {}).price || 0);
}
function money(value = 0) {
  const n = Math.round(Number(value || 0));
  return n > 0 ? `$${n.toLocaleString('en-US')}` : '$0';
}
function isoDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
function salesMetaFrom(r = {}) {
  const esVentas = Boolean(r.esVentas || r.es_ventas || r.tipo === 'ventas');
  const paquete = r.paqueteContratado || r.paquete_contratado || r.paqueteCotizado || r.paquete_cotizado || '';
  const valor = Number(r.valorPaquete ?? r.valor_paquete ?? r.package_value ?? packagePrice(paquete));
  return {
    calendario: r.calendario || r.scope || r.contexto || (r.esEstudio ? 'estudio' : 'cliente'),
    objetivo: r.objetivo || r.objetivo_reunion || '',
    resultadoEstudio: r.resultadoEstudio || r.resultado_estudio || (r.esEstudio ? 'pendiente' : ''),
    esVentas,
    resultadoVentas: r.resultadoVentas || r.resultado_ventas || (esVentas ? 'seguimiento' : ''),
    paqueteContratado: paquete,
    paqueteCotizado: paquete,
    valorPaquete: valor || 0,
  };
}
function mergeSalesMeta(r = {}) {
  const meta = readSalesMeta()[String(r.id)] || {};
  const merged = { ...r, ...meta };
  return { ...merged, ...salesMetaFrom(merged) };
}
function saveSalesMeta(id, r = {}) {
  if (!id || typeof window === 'undefined') return;
  const current = readSalesMeta();
  current[String(id)] = salesMetaFrom(r);
  window.localStorage.setItem(SALES_META_KEY, JSON.stringify(current));
}
function getPeriodRange(mode = 'current_month', customStart = '', customEnd = '') {
  const today = new Date();
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  let end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  if (mode === 'previous_month') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  }

  if (mode === 'current_quarter') {
    const quarterStart = Math.floor(today.getMonth() / 3) * 3;
    start = new Date(today.getFullYear(), quarterStart, 1);
    end = new Date(today.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999);
  }

  if (mode === 'custom') {
    const customFrom = customStart ? new Date(`${customStart}T00:00:00`) : start;
    const customTo = customEnd ? new Date(`${customEnd}T23:59:59`) : end;
    start = customFrom;
    end = customTo;
  }

  return { start, end };
}
function previousPeriod(range) {
  const span = Math.max(1, range.end.getTime() - range.start.getTime());
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - span);
  return { start, end };
}
function periodLabel(range) {
  if (!range?.start || !range?.end) return 'Periodo';
  const opts = { day:'2-digit', month:'short' };
  return `${range.start.toLocaleDateString('es-ES', opts)} - ${range.end.toLocaleDateString('es-ES', opts)}`;
}
function formatMinutes(total = 0) {
  const minutes = Math.max(0, Math.round(total));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
function buildSalesMetrics(reuniones, range) {
  const period = reuniones.filter(r => {
    const d = new Date(r.fecha);
    return d >= range.start && d <= range.end;
  });
  const sales = period.filter(r => r.esVentas || r.tipo === 'ventas');
  const total = sales.length;
  const closed = sales.filter(r => r.resultadoVentas === 'cerrado').length;
  const follow = sales.filter(r => r.resultadoVentas === 'seguimiento').length;
  const stalled = sales.filter(r => r.resultadoVentas === 'no_avanzo').length;
  const totalMinutes = sales.reduce((sum, r) => sum + Number(r.duracion || 0), 0);
  const avgMinutes = total ? Math.round(totalMinutes / total) : 0;
  const conversion = total ? Math.round((closed / total) * 100) : 0;
  const minutesPerClosed = closed ? Math.round(totalMinutes / closed) : 0;
  const closedRevenue = sales.reduce((sum, r) => {
    if (r.resultadoVentas !== 'cerrado') return sum;
    return sum + Number(r.valorPaquete || packagePrice(r.paqueteContratado || r.paqueteCotizado));
  }, 0);
  const valuePerHour = totalMinutes > 0 ? Math.round(closedRevenue / (totalMinutes / 60)) : 0;
  const detail = [...sales].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(r => ({
    ...r,
    paqueteContratado: r.paqueteContratado || r.paqueteCotizado || '',
    valorGenerado: r.resultadoVentas === 'cerrado' ? Number(r.valorPaquete || packagePrice(r.paqueteContratado || r.paqueteCotizado)) : 0,
  }));
  const weekly = [0,1,2,3].map(idx => {
    const from = idx * 7 + 1;
    const to = idx === 3 ? 31 : from + 6;
    const items = sales.filter(r => {
      const day = new Date(r.fecha).getDate();
      return day >= from && day <= to;
    });
    return { label: `S${idx + 1}`, total: items.length };
  });
  const packageRevenue = Object.values(sales.reduce((acc, r) => {
    const key = r.paqueteContratado || r.paqueteCotizado || 'Sin paquete';
    if (!acc[key]) acc[key] = { paquete: key, total: 0, closed: 0, minutes: 0, revenue: 0 };
    acc[key].total += 1;
    acc[key].minutes += Number(r.duracion || 0);
    if (r.resultadoVentas === 'cerrado') {
      acc[key].closed += 1;
      acc[key].revenue += Number(r.valorPaquete || packagePrice(key));
    }
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue);
  const typeConversion = Object.entries(TIPOS).map(([id, cfg]) => {
    const items = sales.filter(r => r.tipo === id);
    const c = items.filter(r => r.resultadoVentas === 'cerrado').length;
    return { id, label: cfg.label, total: items.length, closed: c, rate: items.length ? Math.round((c / items.length) * 100) : 0, color: cfg.color };
  }).filter(item => item.total > 0);

  return { sales, detail, total, closed, follow, stalled, totalMinutes, avgMinutes, conversion, minutesPerClosed, closedRevenue, valuePerHour, weekly, packageRevenue, typeConversion };
}
function buildSalesSignals(metrics, previous, targetHourly) {
  const signals = [];
  if (!metrics.total) {
    return ['Aun no hay suficientes reuniones de venta en este periodo para identificar patrones del estudio.'];
  }
  if (metrics.valuePerHour >= targetHourly) {
    signals.push(`Cada hora comercial genero ${money(metrics.valuePerHour)}. El tiempo de ventas del estudio esta por encima de la referencia operativa.`);
  } else if (metrics.valuePerHour >= targetHourly * 0.75) {
    signals.push(`El valor por hora esta cerca de la referencia (${money(targetHourly)}). Conviene observar si los proximos cierres elevan el promedio.`);
  } else {
    signals.push(`El valor por hora esta bajo la referencia de ${money(targetHourly)}. La lectura sugiere revisar calificacion previa y claridad del paquete antes de agendar.`);
  }
  const stalledMinutes = metrics.detail.filter(r => r.resultadoVentas === 'no_avanzo').reduce((sum, r) => sum + Number(r.duracion || 0), 0);
  if (stalledMinutes > 0 && stalledMinutes / Math.max(metrics.totalMinutes, 1) >= 0.3) {
    signals.push(`Las reuniones sin avance concentraron ${formatMinutes(stalledMinutes)}. Esto apunta a optimizar el filtro de prospectos antes de invertir tiempo comercial.`);
  }
  const closedRows = metrics.detail.filter(r => r.resultadoVentas === 'cerrado' && r.valorGenerado > 0);
  if (closedRows.length >= 2) {
    const avgValue = closedRows.reduce((sum, r) => sum + r.valorGenerado, 0) / closedRows.length;
    const high = closedRows.filter(r => r.valorGenerado >= avgValue);
    const low = closedRows.filter(r => r.valorGenerado < avgValue);
    const highAvg = high.length ? high.reduce((sum, r) => sum + Number(r.duracion || 0), 0) / high.length : 0;
    const lowAvg = low.length ? low.reduce((sum, r) => sum + Number(r.duracion || 0), 0) / low.length : 0;
    if (high.length && low.length && highAvg <= lowAvg) {
      signals.push('Los cierres de mayor valor no estan consumiendo mas tiempo que los de menor ticket. Es un patron positivo para priorizar oportunidades mejor calificadas.');
    }
  }
  if (previous?.total >= 2 && metrics.conversion < previous.conversion - 10) {
    signals.push(`La conversion bajo de ${previous.conversion}% a ${metrics.conversion}% frente al periodo comparable. Es una senal para revisar el momento del mes y el tipo de lead.`);
  }
  if (signals.length < 2 && metrics.conversion >= 40) {
    signals.push('La conversion del periodo se mantiene saludable. El siguiente foco es sostener margen y evitar reuniones con baja probabilidad de decision.');
  }
  return signals.slice(0, 4);
}
function buildSalesInsights(reuniones, range, targetHourly) {
  const metrics = buildSalesMetrics(reuniones, range);
  const previous = buildSalesMetrics(reuniones, previousPeriod(range));
  const signals = buildSalesSignals(metrics, previous, targetHourly);
  return { ...metrics, previous, signals };
}

function isStudioMeeting(r = {}) {
  return ['estudio', 'studio', 'interno'].includes(String(r.calendario || r.scope || r.contexto || '').toLowerCase());
}

function buildMeetingImprovementSuggestions(reuniones = [], limit = 5) {
  const ordered = [...reuniones].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  const suggestions = [];

  ordered.forEach((meeting) => {
    const title = meeting.titulo || meeting.cliente || 'Reunión del estudio';
    const objective = String(meeting.objetivo || '').trim();
    const notes = String(meeting.notas || '').trim();
    const result = meeting.resultadoEstudio || 'pendiente';
    const detail = objective || notes;

    if (result === 'bloqueado') {
      suggestions.push({
        tone: 'red',
        title: `Desbloquear: ${title}`,
        detail: detail || 'Hay un punto bloqueado. Conviene definir responsable, siguiente acción y fecha de salida.',
      });
      return;
    }

    if (result === 'seguimiento') {
      suggestions.push({
        tone: 'gold',
        title: `Dar seguimiento: ${title}`,
        detail: detail || 'La reunión dejó una acción abierta. Mantenerla visible ayuda a comprobar que se está aplicando.',
      });
      return;
    }

    if (result === 'logrado') {
      suggestions.push({
        tone: 'green',
        title: `Aplicar acuerdo: ${title}`,
        detail: notes || objective || 'El objetivo se marcó como logrado. Revisar que el acuerdo ya esté reflejado en el flujo.',
      });
      return;
    }

    if (!objective) {
      suggestions.push({
        tone: 'blue',
        title: `Definir objetivo: ${title}`,
        detail: 'Registrar un objetivo antes de la reunión permite medir si el tiempo del estudio fue bien invertido.',
      });
    }
  });

  if (!suggestions.length) {
    return [
      {
        tone: 'blue',
        title: 'Registrar acuerdos concretos',
        detail: 'Al cerrar cada reunión, anotar resultado y siguiente paso ayuda a que el dashboard recuerde que se está aplicando.',
      },
      {
        tone: 'gold',
        title: 'Mantener una prioridad por reunión',
        detail: 'Un objetivo claro reduce dispersión y hace más fácil medir avance, bloqueo o seguimiento.',
      },
    ];
  }

  return suggestions.slice(0, limit);
}

function buildStudioInsights(reuniones = []) {
  const total = reuniones.length;
  const totalMinutes = reuniones.reduce((sum, r) => sum + Number(r.duracion || 0), 0);
  const withObjective = reuniones.filter(r => String(r.objetivo || '').trim()).length;
  const closed = reuniones.filter(r => ['logrado', 'seguimiento'].includes(r.resultadoEstudio)).length;
  const achieved = reuniones.filter(r => r.resultadoEstudio === 'logrado').length;
  const effectiveness = total ? Math.round((closed / total) * 100) : 0;
  const objectiveCoverage = total ? Math.round((withObjective / total) * 100) : 0;
  const avgMinutes = total ? Math.round(totalMinutes / total) : 0;
  const signals = [
    total ? `El estudio registró ${total} reuniones internas con ${formatMinutes(totalMinutes)} invertidos.` : 'Aún no hay reuniones internas registradas en este período.',
    total ? `${objectiveCoverage}% de las reuniones tiene objetivo definido antes de iniciar.` : 'Registrar objetivos ayudará a medir mejor el uso del tiempo del estudio.',
    total ? `La efectividad operativa del período está en ${effectiveness}% según resultados cerrados o con seguimiento claro.` : 'Cuando haya resultados, el sistema mostrará patrones de seguimiento y bloqueo.',
  ];
  const suggestions = buildMeetingImprovementSuggestions(reuniones);
  return { total, totalMinutes, avgMinutes, withObjective, achieved, effectiveness, objectiveCoverage, signals, suggestions };
}

// ── MODAL NUEVA REUNIÓN ───────────────────────────────────────────
function ModalReunion({ inicial, onSave, onClose, clientes, onDelete, canUseSalesIntelligence = true, meetingTypes = TIPOS, calendarMode = 'cliente', onGenerateZoom, onSendInvite, sending = false, zooming = false }) {
  const [form, setForm] = useState(() => {
    const base = inicial || {
      titulo: '', tipo: 'virtual', fecha: new Date(), hora: '10:00',
      duracion: 60, cliente: '', notas: '', link: '', confirmada: false,
      calendario: calendarMode, objetivo: '', resultadoEstudio: calendarMode === 'estudio' ? 'pendiente' : '',
    };
    const meta = salesMetaFrom(base);
    return { ...base, ...meta, calendario: meta.calendario || calendarMode };
  });

  const set = (k,v) => setForm(p => ({...p,[k]:v}));
  const setPackage = (value) => {
    const selected = SALES_PACKAGE_OPTIONS.find(p => p.name === value);
    setForm(p => ({
      ...p,
      paqueteContratado: value,
      paqueteCotizado: value,
      valorPaquete: selected?.price || 0,
    }));
  };

  const buildPayload = () => {
    if (!form.titulo.trim() && !form.cliente.trim()) return;
    const [h,min] = (form.hora||'10:00').split(':').map(Number);
    const fecha = new Date(form.fecha);
    fecha.setHours(h,min,0,0);
    const fallbackTitle = form.calendario === 'estudio' ? 'Reunion del estudio' : `Venta · ${form.cliente}`;
    return { ...form, titulo: form.titulo.trim() || fallbackTitle, notas: form.esVentas ? '' : form.notas, fecha, id: inicial?.id || Date.now() };
  };

  const handleSave = () => {
    const payload = buildPayload();
    if (!payload) return;
    onSave(payload);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const tipo = TIPOS[form.tipo] || TIPOS.virtual;
  const TipoIcon = tipo.Icon;

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.68)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }}>
      <div onClick={event => event.stopPropagation()} style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', padding:28, boxShadow:'0 24px 60px rgba(0,0,0,0.5)', boxSizing:'border-box' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:20 }}>
            {inicial ? 'Editar reunión' : 'Nueva reunión'}
          </div>
          <button onClick={onClose} style={{ width:30, height:30, display:'grid', placeItems:'center', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, cursor:'pointer', color:'var(--text-d)', lineHeight:1 }}>
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Tipo de reunión */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:8 }}>Tipo de reunión</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(78px, 1fr))', gap:8 }}>
            {Object.entries(meetingTypes).map(([k,t]) => {
              const TypeIcon = t.Icon;
              return (
              <button key={k} onClick={() => setForm(p => ({ ...p, tipo:k, esVentas: k === 'ventas' ? true : p.esVentas }))} style={{
                flex:1, padding:'8px 4px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                border:`1px solid ${form.tipo===k ? t.color : 'var(--border-s)'}`,
                background: form.tipo===k ? t.bg : 'transparent',
                color: form.tipo===k ? t.color : 'var(--text-d)',
                fontSize:11, fontWeight: form.tipo===k ? 600 : 400,
                display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                transition:'all .15s',
              }}>
                <TypeIcon size={18} strokeWidth={1.8} />
                <span>{t.label}</span>
              </button>
            );})}
          </div>
        </div>

        {/* Título */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Título</div>
          <input value={form.titulo} onChange={e => set('titulo',e.target.value)}
            placeholder="Ej: Reunión EL ORIGEN · ARKES"
            style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }} />
        </div>

        {/* Cliente */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Prospecto / cliente</div>
          <input list="feria-reunion-clientes" value={form.cliente} onChange={e => set('cliente',e.target.value)}
            placeholder="Nombre del prospecto o cliente"
            style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }} />
          <datalist id="feria-reunion-clientes">
            {clientes.map(c => <option key={c.id} value={c.nombre} />)}
          </datalist>
        </div>

        {form.calendario === 'estudio' && (
          <div style={{ background:'rgba(201,169,110,.07)', border:'1px solid rgba(201,169,110,.22)', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) minmax(150px, 220px)', gap:10 }}>
              <div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Objetivo de la reunion</div>
                <textarea value={form.objetivo || ''} onChange={e => set('objetivo', e.target.value)}
                  placeholder="Qué decisión, avance o claridad necesita lograr el estudio."
                  rows={2}
                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.5 }} />
              </div>
              <div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Resultado</div>
                <select value={form.resultadoEstudio || 'pendiente'} onChange={e => set('resultadoEstudio', e.target.value)}
                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }}>
                  {Object.entries(STUDIO_RESULTS).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                </select>
                <div style={{ fontSize:10, color:'var(--text-d)', lineHeight:1.45, marginTop:7 }}>
                  El resultado informa patrones del estudio; no evalúa personas.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fecha y hora */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Fecha</div>
            <input type="date" value={form.fecha instanceof Date ? form.fecha.toISOString().slice(0,10) : form.fecha}
              onChange={e => set('fecha', new Date(e.target.value+'T12:00:00'))}
              style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', cursor:'pointer' }} />
          </div>
          <div>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Hora</div>
            <input type="time" value={form.hora || fmtHora(form.fecha)}
              onChange={e => set('hora',e.target.value)}
              style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', cursor:'pointer' }} />
          </div>
          <div>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Duración</div>
            <select value={form.duracion} onChange={e => set('duracion',+e.target.value)}
              style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
              {[15,20,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
        </div>

        {/* Link (solo virtual/presentación) */}
        {/* Inteligencia comercial */}
        {canUseSalesIntelligence && <div style={{ background:'rgba(91,155,213,.06)', border:'1px solid rgba(91,155,213,.18)', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
          <label onClick={() => set('esVentas', !form.esVentas)} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
            <span
              style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${form.esVentas ? '#5B9BD5' : 'var(--border)'}`, background: form.esVentas ? '#5B9BD5' : 'transparent', display:'grid', placeItems:'center', flexShrink:0, marginTop:1 }}>
              {form.esVentas && <Check size={13} color="#fff" strokeWidth={2.2} />}
            </span>
            <span>
              <span style={{ display:'block', fontSize:12, color:'var(--text)', fontWeight:700 }}>Registrar para inteligencia comercial del estudio</span>
              <span style={{ display:'block', fontSize:10.5, color:'var(--text-d)', lineHeight:1.5, marginTop:2 }}>Solo datos objetivos: fecha, duracion, resultado, paquete y valor. Informa el flujo comercial del estudio.</span>
            </span>
          </label>
          {form.esVentas && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginTop:12 }}>
              <div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Resultado</div>
                <select value={form.resultadoVentas || 'seguimiento'} onChange={e => set('resultadoVentas', e.target.value)}
                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }}>
                  {Object.entries(SALES_RESULTS).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Paquete contratado</div>
                <select value={form.paqueteContratado || form.paqueteCotizado || ''} onChange={e => setPackage(e.target.value)}
                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }}>
                  <option value="">Sin paquete</option>
                  {SALES_PACKAGE_OPTIONS.map(pkg => <option key={pkg.name} value={pkg.name}>{pkg.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Valor del paquete</div>
                <input value={money(form.valorPaquete || 0)} readOnly
                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }} />
              </div>
            </div>
          )}
        </div>}

        {needsZoomLink(form) && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Link de reunión</div>
            <input value={form.link} onChange={e => set('link',e.target.value)}
              placeholder="https://meet.google.com/... o https://zoom.us/..."
              style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit' }} />
            {inicial && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                <button
                  onClick={async () => {
                    const payload = buildPayload();
                    if (!payload) return;
                    const updated = await onGenerateZoom?.(payload);
                    if (updated?.link) set('link', updated.link);
                  }}
                  disabled={zooming}
                  style={{ background:'rgba(91,155,213,.10)', border:'1px solid rgba(91,155,213,.25)', borderRadius:8, color:'var(--blue)', padding:'8px 10px', fontSize:11, fontFamily:'inherit', cursor: zooming ? 'default' : 'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity: zooming ? .65 : 1 }}>
                  <Video size={13} strokeWidth={1.9} /> {zooming ? 'Generando...' : 'Generar Zoom'}
                </button>
                <button
                  onClick={() => {
                    const payload = buildPayload();
                    if (payload) onSendInvite?.(payload);
                  }}
                  disabled={sending}
                  style={{ background:'rgba(37,211,102,.09)', border:'1px solid rgba(37,211,102,.25)', borderRadius:8, color:'#25D366', padding:'8px 10px', fontSize:11, fontFamily:'inherit', cursor: sending ? 'default' : 'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity: sending ? .65 : 1 }}>
                  <Send size={13} strokeWidth={1.9} /> {sending ? 'Enviando...' : 'Enviar invitacion'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notas */}
        {!form.esVentas && <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:6 }}>Notas</div>
          <textarea value={form.notas} onChange={e => set('notas',e.target.value)}
            placeholder="Agenda, temas a tratar, preparación necesaria…"
            rows={2}
            style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.5 }} />
        </div>}

        {/* Confirmada */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div onClick={() => set('confirmada',!form.confirmada)}
            style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${form.confirmada ? 'var(--green)' : 'var(--border)'}`, background: form.confirmada ? 'var(--green)' : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
            {form.confirmada && <Check size={13} color="#fff" strokeWidth={2.2} />}
          </div>
          <span style={{ fontSize:12, color:'var(--text-m)' }}>{form.calendario === 'estudio' ? 'Reunion confirmada con el equipo' : 'Reunión confirmada con el cliente'}</span>
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleSave} style={{ flex:1, background: tipo.color, color:'#fff', border:'none', borderRadius:9, padding:'11px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <TipoIcon size={15} strokeWidth={2} /> {inicial ? 'Guardar cambios' : 'Crear reunión'}
          </button>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:9, padding:'11px 18px', fontSize:13, cursor:'pointer', fontFamily:'inherit', color:'var(--text-d)' }}>
            Cancelar
          </button>
          {onDelete && (
            <button onClick={onDelete} style={{ background:'rgba(224,96,96,0.1)', border:'1px solid rgba(224,96,96,0.25)', borderRadius:9, padding:'11px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit', color:'var(--red)' }} title="Eliminar reunión">
              <Trash2 size={15} strokeWidth={1.9} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
function SalesMetric({ label, value, tone = 'var(--text)', Icon = BarChart3, note, emphasis = false }) {
  return (
    <div style={{ background: emphasis ? 'rgba(123,198,122,.08)' : 'var(--s2)', border:`1px solid ${emphasis ? tone : 'var(--border-s)'}`, borderRadius:10, padding:'12px 14px', minWidth:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:8 }}>
        <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</div>
        <Icon size={15} strokeWidth={1.8} color={tone} />
      </div>
      <div style={{ fontSize:emphasis ? 30 : 22, fontWeight:850, letterSpacing:'-.03em', color:tone, lineHeight:1 }}>{value}</div>
      {note && <div style={{ fontSize:10.5, color:'var(--text-d)', marginTop:5, lineHeight:1.4 }}>{note}</div>}
    </div>
  );
}

function HorizontalBars({ data, empty, valueLabel }) {
  const max = Math.max(1, ...data.map(d => d.revenue || 0));
  if (!data.length) return <div style={{ fontSize:11, color:'var(--text-d)', padding:'18px 0' }}>{empty}</div>;
  return (
    <div style={{ display:'grid', gap:10 }}>
      {data.map(item => (
        <div key={item.paquete}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10, fontSize:11, marginBottom:5 }}>
            <span style={{ color:'var(--text-m)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.paquete}</span>
            <span style={{ color:'var(--green)', fontWeight:800 }}>{valueLabel(item)}</span>
          </div>
          <div style={{ height:8, background:'var(--s3)', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.max(5, (item.revenue / max) * 100)}%`, background:'linear-gradient(90deg, var(--green), rgba(123,198,122,.45))', borderRadius:999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VerticalBars({ data, valueKey = 'total', colorKey = 'color', maxValue, labelValue }) {
  const max = maxValue || Math.max(1, ...data.map(d => d[valueKey] || 0));
  if (!data.length) return <div style={{ fontSize:11, color:'var(--text-d)', padding:'18px 0' }}>Sin datos para graficar en este periodo.</div>;
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.max(1, data.length)}, minmax(42px, 1fr))`, gap:10, alignItems:'end', minHeight:138 }}>
      {data.map(item => (
        <div key={item.id || item.label} style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:7, minWidth:0 }}>
          <div style={{ height:86, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <div style={{ width:'70%', minWidth:24, minHeight:4, height:`${Math.max(4, ((item[valueKey] || 0) / max) * 86)}px`, borderRadius:8, background:item[colorKey] || 'var(--blue)' }} />
          </div>
          <div style={{ textAlign:'center', fontSize:15, fontWeight:850, color:item[colorKey] || 'var(--text)' }}>{labelValue ? labelValue(item) : item[valueKey]}</div>
          <div style={{ textAlign:'center', fontSize:9.5, color:'var(--text-d)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function SalesEffectivenessPanel({ insights, range, periodMode, setPeriodMode, customStart, setCustomStart, customEnd, setCustomEnd, targetHourly }) {
  const valueTone = insights.valuePerHour >= targetHourly ? 'var(--green)' : insights.valuePerHour >= targetHourly * 0.75 ? 'var(--gold)' : 'var(--red)';
  const maxWeek = Math.max(1, ...insights.weekly.map(w => w.total));
  return (
    <section style={{ background:'linear-gradient(135deg, rgba(91,155,213,.09), rgba(201,169,110,.06))', border:'1px solid rgba(91,155,213,.18)', borderRadius:14, padding:16, marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'flex-start', flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, color:'#5B9BD5', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:800, marginBottom:6 }}>
            <TrendingUp size={14} strokeWidth={2} /> Inteligencia operativa
          </div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-.02em' }}>Efectividad de reuniones de ventas</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:4, maxWidth:640, lineHeight:1.55 }}>
            Lectura del estudio en {periodLabel(range)}: mide el valor del tiempo comercial para tomar mejores decisiones, sin evaluar a una persona.
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {SALES_PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriodMode(p.id)} style={{ border:'1px solid var(--border-s)', background:periodMode === p.id ? 'var(--s3)' : 'var(--s2)', color:periodMode === p.id ? 'var(--text)' : 'var(--text-d)', borderRadius:999, padding:'6px 10px', fontSize:10.5, fontFamily:'inherit', cursor:'pointer' }}>{p.label}</button>
          ))}
        </div>
      </div>

      {periodMode === 'custom' && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:9, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit', fontSize:11 }} />
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:9, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit', fontSize:11 }} />
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap:8, marginBottom:14 }}>
        <SalesMetric label="Valor por hora de ventas" value={money(insights.valuePerHour)} tone={valueTone} Icon={DollarSign} note={`Referencia operativa: ${money(targetHourly)}/h`} emphasis />
        <SalesMetric label="Ingresos cerrados" value={money(insights.closedRevenue)} tone="var(--green)" Icon={TrendingUp} note="Generados por cierres del periodo" />
        <SalesMetric label="Total reuniones" value={insights.total} tone="var(--text)" Icon={BarChart3} note="Periodo seleccionado" />
        <SalesMetric label="Conversion" value={`${insights.conversion}%`} tone="var(--green)" Icon={Target} note={`${insights.closed} cierres / ${insights.total || 0} reuniones`} />
        <SalesMetric label="Promedio" value={formatMinutes(insights.avgMinutes)} tone="var(--blue)" Icon={Clock3} note="Tiempo por reunion" />
        <SalesMetric label="Tiempo total" value={formatMinutes(insights.totalMinutes)} tone="var(--gold)" Icon={Clock3} note="Invertido en ventas" />
        <SalesMetric label="Tiempo por cierre" value={insights.closed ? formatMinutes(insights.minutesPerClosed) : 'Sin cierres'} tone="var(--purple)" Icon={TrendingUp} note="Relacion tiempo/proyecto" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap:12 }}>
        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:10 }}>Valor generado por paquete</div>
          <HorizontalBars data={insights.packageRevenue.filter(p => p.revenue > 0)} empty="Sin cierres con valor en este periodo." valueLabel={item => money(item.revenue)} />
        </div>

        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:10 }}>Conversion por tipo de reunion</div>
          <VerticalBars data={insights.typeConversion} valueKey="rate" maxValue={100} labelValue={item => `${item.rate}%`} />
        </div>

        <div style={{ background:'rgba(0,0,0,.12)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:10 }}>Distribucion por semana del mes</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, alignItems:'end', minHeight:112 }}>
            {insights.weekly.map(w => (
              <div key={w.label} style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:5, minWidth:0 }}>
                <div style={{ height:72, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                  <div title={`${w.total} reuniones`} style={{ width:'58%', minHeight:4, height:`${Math.max(4, (w.total / maxWeek) * 72)}px`, borderRadius:6, background:'rgba(91,155,213,.55)' }} />
                </div>
                <div style={{ textAlign:'center', fontSize:16, color:'var(--blue)', fontWeight:850 }}>{w.total}</div>
                <div style={{ textAlign:'center', fontSize:10, color:'var(--text-d)' }}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:8 }}>Señales automaticas del periodo</div>
          <div style={{ display:'grid', gap:8 }}>
            {insights.signals.map((signal, index) => (
              <div key={index} style={{ fontSize:11.5, color:'var(--text-m)', lineHeight:1.55, padding:'9px 10px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:9 }}>{signal}</div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            {Object.entries(SALES_RESULTS).map(([id, cfg]) => (
              <span key={id} style={{ fontSize:10, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}35`, borderRadius:999, padding:'4px 8px' }}>
                {cfg.label}: {insights.sales.filter(r => r.resultadoVentas === id).length}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop:12, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'12px 14px', display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', borderBottom:'1px solid var(--border-s)' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800 }}>Detalle de reuniones del periodo</div>
            <div style={{ fontSize:10.5, color:'var(--text-d)', marginTop:3 }}>Datos cuantitativos para lectura del flujo comercial del estudio.</div>
          </div>
          <div style={{ fontSize:11, color:'var(--text-d)' }}>{insights.total} registros</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', minWidth:680, borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Prospecto / cliente','Tipo','Duracion','Resultado','Paquete','Valor generado'].map(h => (
                  <th key={h} style={{ textAlign:'left', fontSize:9.5, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', padding:'10px 12px', borderBottom:'1px solid var(--border-s)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insights.detail.map(row => {
                const result = SALES_RESULTS[row.resultadoVentas] || SALES_RESULTS.seguimiento;
                const type = TIPOS[row.tipo] || TIPOS.ventas;
                return (
                  <tr key={row.id}>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-s)', fontSize:11.5, color:'var(--text)' }}>{row.cliente || row.titulo || 'Prospecto sin nombre'}</td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-s)', fontSize:11, color:type.color }}>{type.label}</td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-s)', fontSize:11, color:'var(--text-m)' }}>{row.duracion || 0} min</td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-s)' }}><span style={{ fontSize:10, color:result.color, background:result.bg, border:`1px solid ${result.color}35`, borderRadius:999, padding:'4px 8px' }}>{result.label}</span></td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-s)', fontSize:11, color:'var(--text-d)' }}>{row.paqueteContratado || 'Sin paquete'}</td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-s)', fontSize:12, color:row.valorGenerado ? 'var(--green)' : 'var(--text-d)', fontWeight:800 }}>{row.valorGenerado ? money(row.valorGenerado) : '—'}</td>
                  </tr>
                );
              })}
              {!insights.detail.length && (
                <tr><td colSpan={6} style={{ padding:18, textAlign:'center', color:'var(--text-d)', fontSize:11 }}>Sin reuniones de venta en el periodo seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StudioEffectivenessPanel({ insights }) {
  const tone = insights.effectiveness >= 75 ? 'var(--green)' : insights.effectiveness >= 45 ? 'var(--gold)' : 'var(--red)';
  const suggestionTone = {
    green: 'var(--green)',
    gold: 'var(--gold)',
    red: 'var(--red)',
    blue: 'var(--blue)',
  };
  return (
    <section style={{ background:'linear-gradient(135deg, rgba(201,169,110,.08), rgba(91,155,213,.06))', border:'1px solid rgba(201,169,110,.22)', borderRadius:14, padding:16, marginTop:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:14, flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, color:'var(--gold)', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:800, marginBottom:6 }}>
            <Target size={14} strokeWidth={2} /> Inteligencia del estudio
          </div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-.02em' }}>Efectividad de reuniones del estudio</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:4, maxWidth:640, lineHeight:1.55 }}>
            Mide objetivos, resultados y tiempo interno para mejorar decisiones operativas sin señalar personas.
          </div>
        </div>
        <div style={{ minWidth:140, background:'var(--s2)', border:`1px solid ${tone}45`, borderRadius:12, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>Efectividad</div>
          <div style={{ fontSize:28, fontWeight:900, color:tone, lineHeight:1, marginTop:5 }}>{insights.effectiveness}%</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap:8, marginBottom:14 }}>
        <SalesMetric label="Reuniones" value={insights.total} tone="var(--text)" Icon={BarChart3} note="Internas del estudio" />
        <SalesMetric label="Tiempo total" value={formatMinutes(insights.totalMinutes)} tone="var(--gold)" Icon={Clock3} note="Invertido en coordinación" />
        <SalesMetric label="Promedio" value={formatMinutes(insights.avgMinutes)} tone="var(--blue)" Icon={Clock3} note="Duración por reunión" />
        <SalesMetric label="Con objetivo" value={`${insights.objectiveCoverage}%`} tone="var(--green)" Icon={Target} note={`${insights.withObjective}/${insights.total || 0} registradas`} />
        <SalesMetric label="Logradas" value={insights.achieved} tone="var(--green)" Icon={Check} note="Objetivo logrado" />
      </div>
      <div style={{ background:'rgba(0,0,0,.16)', border:'1px solid var(--border-s)', borderRadius:12, padding:12, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:850 }}>Puntos de mejora en aplicación</div>
            <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>Recordatorios derivados de objetivos, resultados y acuerdos registrados.</div>
          </div>
          <span style={{ fontSize:10, color:'var(--text-d)', border:'1px solid var(--border-s)', borderRadius:999, padding:'4px 8px' }}>
            {insights.suggestions?.length || 0} visibles
          </span>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {(insights.suggestions || []).map((item, index) => {
            const color = suggestionTone[item.tone] || 'var(--text)';
            return (
              <div key={`${item.title}-${index}`} style={{ display:'grid', gridTemplateColumns:'auto minmax(0, 1fr)', gap:10, alignItems:'flex-start', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'9px 10px' }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:color, marginTop:5, boxShadow:`0 0 0 4px ${color}18` }} />
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:11.5, color:'var(--text)', fontWeight:800 }}>{item.title}</div>
                  <div style={{ fontSize:10.5, color:'var(--text-d)', lineHeight:1.5, marginTop:3 }}>{item.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display:'grid', gap:8 }}>
        {insights.signals.map((signal, index) => (
          <div key={index} style={{ fontSize:11.5, color:'var(--text-m)', lineHeight:1.55, padding:'9px 10px', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:9 }}>{signal}</div>
        ))}
      </div>
    </section>
  );
}

export default function Calendario() {
  const { data, showToast, demoMode, addNotification } = useApp();
  const { user } = useAuth();
  // Arranca vacío — se llena desde Supabase en el useEffect
  const [reuniones, setReuniones] = useState([]);
  const [year, setYear]   = useState(HOY.getFullYear());
  const [month, setMonth] = useState(HOY.getMonth());
  const [view, setView]   = useState('mes');
  const [modal, setModal] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [calendarMode, setCalendarMode] = useState('cliente');
  const [periodMode, setPeriodMode] = useState('current_month');
  const [customStart, setCustomStart] = useState(isoDate(new Date(HOY.getFullYear(), HOY.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(isoDate(HOY));
  const [sendingId, setSendingId] = useState(null);
  const [zoomingId, setZoomingId] = useState(null);

  const role = String(user?.role || user?.perms || '').toLowerCase();
  const canUseSalesIntelligence = ['admin', 'crm', 'ventas', 'sales'].includes(role);
  const meetingTypes = useMemo(
    () => Object.fromEntries(Object.entries(TIPOS).filter(([key]) => canUseSalesIntelligence || key !== 'ventas')),
    [canUseSalesIntelligence]
  );
  const salesRange = useMemo(() => getPeriodRange(periodMode, customStart, customEnd), [periodMode, customStart, customEnd]);
  const targetHourly = Math.max(1, Math.round((Number(data.studio?.meta?.objetivo || 14000) || 14000) / 40));

  // ── SUPABASE SYNC ──────────────────────────────────────────────
  const loadReuniones = useCallback(async () => {
    if (demoMode) {
      const fecha = new Date(Date.now()+2*86400000);
      const day = (d, h = 10) => new Date(HOY.getFullYear(), HOY.getMonth(), Math.min(d, getDaysInMonth(HOY.getFullYear(), HOY.getMonth())), h, 0, 0);
      setReuniones([
        { id:'demo-sales-1', titulo:'Venta · Diagnostico ARKES', tipo:'ventas', cliente:'Cliente Demo', cliente_id:DEMO_IDS.cliente, fecha:day(4,10), hora:'10:00', duracion:45, notas:'', confirmada:true, solicitudCliente:false, esVentas:true, resultadoVentas:'cerrado', paqueteContratado:'Brand Identity', paqueteCotizado:'Brand Identity', valorPaquete:packagePrice('Brand Identity'), is_demo:true },
        { id:'demo-sales-2', titulo:'Venta · Fotografa premium', tipo:'ventas', cliente:'Fotografa Demo', fecha:day(11,11), hora:'11:00', duracion:60, notas:'', confirmada:true, solicitudCliente:false, esVentas:true, resultadoVentas:'seguimiento', paqueteContratado:'B&L Signature', paqueteCotizado:'B&L Signature', valorPaquete:packagePrice('B&L Signature'), is_demo:true },
        { id:'demo-sales-3', titulo:'Venta · Restaurante nuevo', tipo:'ventas', cliente:'Restaurante Demo', fecha:day(16,9), hora:'09:00', duracion:35, notas:'', confirmada:true, solicitudCliente:false, esVentas:true, resultadoVentas:'no_avanzo', paqueteContratado:'Brand Starter', paqueteCotizado:'Brand Starter', valorPaquete:packagePrice('Brand Starter'), is_demo:true },
        { id:'demo-sales-4', titulo:'Venta · Rebranding TES', tipo:'ventas', cliente:'TES Demo', fecha:day(22,16), hora:'16:00', duracion:50, notas:'', confirmada:true, solicitudCliente:false, esVentas:true, resultadoVentas:'cerrado', paqueteContratado:'Brand Legacy', paqueteCotizado:'Brand Legacy', valorPaquete:packagePrice('Brand Legacy'), is_demo:true },
        { id:'demo-sales-5', titulo:'Venta · Consulta campana', tipo:'ventas', cliente:'Campana Demo', fecha:day(28,12), hora:'12:00', duracion:30, notas:'', confirmada:true, solicitudCliente:false, esVentas:true, resultadoVentas:'seguimiento', paqueteContratado:'Dirección de Arte', paqueteCotizado:'Dirección de Arte', valorPaquete:packagePrice('Dirección de Arte'), is_demo:true },
        { id:'demo-studio-1', titulo:'Estudio · Revision de producción', tipo:'presentacion', cliente:'Equipo Feria', fecha:day(8,15), hora:'15:00', duracion:40, notas:'Revisar bloqueos activos y prioridad de entregas.', confirmada:true, solicitudCliente:false, calendario:'estudio', objetivo:'Definir prioridades de producción y próximos desbloqueos.', resultadoEstudio:'logrado', is_demo:true },
        { id:'demo-studio-2', titulo:'Estudio · Planeación financiera', tipo:'virtual', cliente:'Administracion', fecha:day(18,10), hora:'10:00', duracion:55, notas:'Revisar salud del estudio y compromisos del mes.', confirmada:true, solicitudCliente:false, calendario:'estudio', objetivo:'Alinear pagos, deudas y decisiones de gasto del mes.', resultadoEstudio:'seguimiento', is_demo:true },
      {
        id:'demo-reunion-calendario', titulo:'Demo · Presentación de marca', tipo:'presentacion', cliente:'David Feria Demo', cliente_id:DEMO_IDS.cliente,
        fecha, hora:fmtHora(fecha), duracion:60, link:'https://zoom.us/j/demo', notas:'Reunión demo para revisar agenda, tiempos y seguimiento.', confirmada:true, solicitudCliente:false, is_demo:true,
      }]);
      return;
    }
    if (!isConfigured) { setReuniones([]); return; }
    try {
      const { data: rows, error } = await supabase
        .from('reuniones').select('*').order('fecha', { ascending: true });
      if (!error && rows?.length) {
        setReuniones(onlyOperationalRows(rows, false).map(r => mergeSalesMeta({
          ...r, fecha: new Date(r.fecha),
          solicitudCliente: r.solicitud_cliente,
        })));
      }
    } catch (e) { /* usa datos locales */ }
  }, [demoMode]);

  useEffect(() => { loadReuniones(); }, [loadReuniones]);

  useEffect(() => {
    if (!canUseSalesIntelligence && filtroTipo === 'ventas') setFiltroTipo('all');
  }, [canUseSalesIntelligence, filtroTipo]);

  useEffect(() => {
    setFiltroTipo('all');
    setDiaSeleccionado(null);
  }, [calendarMode]);

  useEffect(() => {
    if (!isConfigured) return;
    const ch = supabase.channel('reuniones-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reuniones' }, loadReuniones)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadReuniones]);

  const visibleByRole = canUseSalesIntelligence ? reuniones : reuniones.filter(r => !(r.esVentas || r.tipo === 'ventas'));
  const visibleReuniones = visibleByRole.filter(r => calendarMode === 'estudio' ? isStudioMeeting(r) : !isStudioMeeting(r));
  const filtered = visibleReuniones.filter(r => filtroTipo === 'all' || r.tipo === filtroTipo);

  const reunionesDelDia = (dia) =>
    filtered.filter(r => sameDay(new Date(r.fecha), new Date(year, month, dia)));

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };

  const updateMeetingLocal = useCallback((meeting) => {
    const next = mergeSalesMeta(meeting);
    setReuniones(prev => prev.some(item => item.id === next.id) ? prev.map(item => item.id === next.id ? next : item) : [...prev, next]);
    return next;
  }, []);

  const persistMeetingPatch = useCallback(async (meeting, patch) => {
    const next = { ...meeting, ...patch };
    if (isConfigured && next.id && typeof next.id !== 'number' && !next.is_demo) {
      const dbPatch = {};
      if ('link' in patch) dbPatch.link = patch.link || '';
      if ('confirmada' in patch) dbPatch.confirmada = patch.confirmada;
      if (Object.keys(dbPatch).length) await supabase.from('reuniones').update(dbPatch).eq('id', next.id);
    }
    return updateMeetingLocal(next);
  }, [updateMeetingLocal]);

  const generateMeetingZoom = useCallback(async (meeting) => {
    if (!needsZoomLink(meeting)) return meeting;
    setZoomingId(meeting.id);
    try {
      const { link, provider } = await createZoomMeeting(meeting);
      const updated = await persistMeetingPatch(meeting, { link });
      showToast(provider === 'zoom' ? 'Zoom generado automaticamente' : 'Link de reunion generado para demo', 'video');
      return updated;
    } catch (_) {
      showToast('No se pudo generar el link de Zoom', '⚠');
      return meeting;
    } finally {
      setZoomingId(null);
    }
  }, [persistMeetingPatch, showToast]);

  const ensureMeetingLink = useCallback(async (meeting) => {
    const currentLink = String(meeting.link || '');
    if (!needsZoomLink(meeting)) return meeting;
    if (currentLink && !currentLink.includes('/j/demo') && !currentLink.includes('Generando')) return meeting;
    return generateMeetingZoom(meeting);
  }, [generateMeetingZoom]);

  const sendMeetingInvite = useCallback(async (meeting) => {
    setSendingId(meeting.id);
    try {
      const readyMeeting = await ensureMeetingLink(meeting);
      const cliente = findMeetingClient(readyMeeting, data.clientes);
      const email = cliente?.email || readyMeeting.email || '';
      const phone = cliente?.whatsapp || cliente?.telefono || readyMeeting.whatsapp || readyMeeting.telefono || '';

      if (!email && !phone) {
        showToast('Agrega email o WhatsApp al cliente para enviar la invitacion', '⚠');
        return readyMeeting;
      }

      const values = buildMeetingTemplateValues(readyMeeting, cliente);
      const plainValues = plainTemplateValues(values);
      const emailTemplate = getMessageTemplate('meeting_invite_email');
      const whatsappTemplate = getMessageTemplate('meeting_invite_whatsapp');
      const sent = [];

      if (email && emailTemplate.active !== false) {
        const subject = renderMessageTemplate(emailTemplate.subject || 'Tu reunion con Feria Design Studio', values);
        const text = renderMessageTemplate(emailTemplate.body, values);
        const html = buildCorporateEmailHtml({
          subject: emailTemplate.subject || 'Tu reunion con Feria Design Studio',
          body: emailTemplate.body,
          values,
          design: emailTemplate.email_design,
        });
        if (isConfigured) {
          await supabase.functions.invoke('send-email', {
            body: {
              templateId: 'meeting_invite_email',
              to: email,
              subject,
              text,
              html,
              variables: plainValues,
              params: plainValues,
              data: { ...plainValues, mensaje: text },
            },
          });
        }
        sent.push('correo');
      }

      if (phone && whatsappTemplate.active !== false) {
        const text = renderMessageTemplate(whatsappTemplate.body, values);
        const whatsappNumber = normalizePhone(phone);
        if (isConfigured) {
          await supabase.functions.invoke('send-meta-message', {
            body: {
              canal: 'whatsapp',
              to: whatsappNumber,
              destinatario: whatsappNumber,
              text,
              texto: text,
              conv_id: `wa_${whatsappNumber}`,
              nombre: cliente?.nombre || readyMeeting.cliente || 'Cliente',
              ...getWhatsappImagePayload(whatsappTemplate, 'meeting_invite_whatsapp'),
            },
          });
        } else {
          window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        }
        sent.push('WhatsApp');
      }

      showToast(sent.length ? `Invitacion enviada por ${sent.join(' + ')}` : 'Las plantillas de reunion estan pausadas', sent.length ? 'ok' : '•');
      return readyMeeting;
    } catch (_) {
      showToast('No se pudo enviar la invitacion de reunion', '⚠');
      return meeting;
    } finally {
      setSendingId(null);
    }
  }, [data.clientes, ensureMeetingLink, showToast]);

  const saveReunion = async (r) => {
    let nextMeeting = r;
    const isNewMeeting = nextMeeting._isNew || !nextMeeting.id || typeof nextMeeting.id === 'number';
    if (needsZoomLink(nextMeeting) && !nextMeeting.link) {
      const { link } = await createZoomMeeting(nextMeeting);
      nextMeeting = { ...nextMeeting, link };
    }
    const row = {
      titulo: nextMeeting.titulo, tipo: nextMeeting.tipo, cliente: nextMeeting.cliente,
      fecha: nextMeeting.fecha instanceof Date ? nextMeeting.fecha.toISOString() : nextMeeting.fecha,
      duracion: nextMeeting.duracion, link: nextMeeting.link || '', notas: nextMeeting.notas || '',
      confirmada: nextMeeting.confirmada, solicitud_cliente: nextMeeting.solicitudCliente || false,
    };
    if (isConfigured) {
      if (nextMeeting._isNew || !nextMeeting.id || typeof nextMeeting.id === 'number') {
        const { data: inserted } = await supabase.from('reuniones').insert([row]).select().single();
        if (inserted) {
          saveSalesMeta(inserted.id, nextMeeting);
          loadReuniones();
        }
      } else {
        await supabase.from('reuniones').update(row).eq('id', nextMeeting.id);
        saveSalesMeta(nextMeeting.id, nextMeeting);
        loadReuniones();
      }
    } else {
      const localId = nextMeeting.id || Date.now();
      const localRow = mergeSalesMeta({ ...nextMeeting, id: localId });
      saveSalesMeta(localId, localRow);
      setReuniones(prev => prev.some(x => x.id===localId) ? prev.map(x => x.id===localId ? localRow : x) : [...prev, localRow]);
    }
    setModal(null);
    if (isNewMeeting && isStudioMeeting(nextMeeting)) {
      const objective = String(nextMeeting.objetivo || '').trim() || 'Objetivo pendiente por definir';
      const members = (data.team || []).map(m => m.name || m.nombre || m.email).filter(Boolean);
      await addNotification?.({
        tipo: 'studio_meeting',
        titulo: 'Reunión del estudio creada',
        descripcion: `${nextMeeting.titulo} · ${meetingDateLabel(nextMeeting.fecha)} · Objetivo: ${objective}`,
        desc: `${nextMeeting.titulo} · Objetivo: ${objective}`,
        leida: false,
        audience: 'studio_team',
        recipients: members,
        created_at: new Date().toISOString(),
      });
    }
    showToast(`Reunion "${nextMeeting.titulo}" guardada${nextMeeting.link ? ' con Zoom' : ''}`, 'ok');
  };

  const deleteReunion = async (id) => {
    if (isConfigured) {
      await supabase.from('reuniones').delete().eq('id', id);
      loadReuniones();
    } else {
      setReuniones(prev => prev.filter(r => r.id !== id));
    }
    setModal(null);
    showToast('Reunión eliminada', 'x');
  };

  const hoyTiene = visibleReuniones.filter(r => sameDay(new Date(r.fecha), HOY));
  const proximaSemana = visibleReuniones.filter(r => {
    const d = new Date(r.fecha);
    const diff = (d - HOY) / 86400000;
    return diff >= 0 && diff <= 7;
  }).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  const salesInsights = buildSalesInsights(reuniones, salesRange, targetHourly);
  const studioInsights = buildStudioInsights(visibleByRole.filter(isStudioMeeting));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', padding:'14px 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', flexShrink:0 }}>
        <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:20 }}>
          Calendario <em style={{ color:'var(--gold)' }}>· Reuniones</em>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <div style={{ display:'flex', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:3, gap:3 }}>
            {[
              ['cliente', 'Clientes'],
              ['estudio', 'Estudio'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setCalendarMode(id)} style={{ background:calendarMode === id ? 'var(--s3)' : 'transparent', border:'none', borderRadius:8, padding:'6px 12px', fontSize:11, cursor:'pointer', color:calendarMode === id ? 'var(--text)' : 'var(--text-d)', fontFamily:'inherit', fontWeight:calendarMode === id ? 800 : 500 }}>{label}</button>
            ))}
          </div>
          {/* Filtro tipo */}
          <div style={{ display:'flex', background:'var(--s2)', borderRadius:8, padding:2, gap:2 }}>
            <button onClick={() => setFiltroTipo('all')} style={{ background:filtroTipo==='all'?'var(--s3)':'transparent', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', color:filtroTipo==='all'?'var(--text)':'var(--text-d)', fontFamily:'inherit' }}>Todas</button>
            {Object.entries(meetingTypes).map(([k,t]) => {
              const TypeIcon = t.Icon;
              return (
                <button key={k} onClick={() => setFiltroTipo(k)} style={{ background:filtroTipo===k?'var(--s3)':'transparent', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer', fontFamily:'inherit', color:filtroTipo===k?t.color:'var(--text-d)', display:'grid', placeItems:'center' }} title={t.label}>
                  <TypeIcon size={14} strokeWidth={1.8} />
                </button>
              );
            })}
          </div>
          {/* Vista */}
          <div style={{ display:'flex', background:'var(--s2)', borderRadius:8, padding:2, gap:2 }}>
            {[['mes','Mes'],['lista','Lista']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{ background:view===v?'var(--s3)':'transparent', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', color:view===v?'var(--text)':'var(--text-d)', fontFamily:'inherit' }}>{l}</button>
            ))}
          </div>
          <button onClick={() => setModal('nueva')} style={{ background:'var(--gold)', color:'#0a0a0a', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:7 }}>
            <CalendarPlus size={15} strokeWidth={2} /> Reunión
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', display:'grid', gridTemplateColumns:'minmax(220px, 260px) minmax(0, 1fr)', gap:0 }}>

        {/* ── SIDEBAR — hoy + próximos ── */}
        <div style={{ minWidth:0, borderRight:'1px solid var(--border-s)', padding:'16px 14px', overflow:'auto', background:'var(--s1)' }}>

          {/* Hoy */}
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:10 }}>
            Hoy · {HOY.getDate()} de {MESES[HOY.getMonth()]}
          </div>
          {hoyTiene.length === 0 ? (
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:16, padding:'10px 12px', background:'var(--s2)', borderRadius:8 }}>Sin reuniones hoy</div>
          ) : (
            hoyTiene.map(r => <ReunionMini key={r.id} r={r} onClick={() => setModal(r)} />)
          )}

          <div style={{ height:1, background:'var(--border-s)', margin:'14px 0' }} />

          {/* Próximos 7 días */}
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:10 }}>Próximos 7 días</div>
          {proximaSemana.length === 0 ? (
            <div style={{ fontSize:11, color:'var(--text-d)', padding:'10px 12px', background:'var(--s2)', borderRadius:8 }}>Sin reuniones próximas</div>
          ) : (
            proximaSemana.filter(r => !sameDay(new Date(r.fecha), HOY)).map(r => <ReunionMini key={r.id} r={r} onClick={() => setModal(r)} />)
          )}

          <div style={{ height:1, background:'var(--border-s)', margin:'14px 0' }} />

          {/* Reuniones agendadas por clientes */}
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:10 }}>
            Agendadas por clientes
          </div>
          {visibleReuniones.filter(r => r.solicitudCliente).length === 0 ? (
            <div style={{ fontSize:11, color:'var(--text-d)', padding:'10px 12px', background:'var(--s2)', borderRadius:8 }}>Sin reuniones de clientes</div>
          ) : (
            visibleReuniones.filter(r => r.solicitudCliente).map(r => (
              <ReunionMini key={r.id} r={r} onClick={() => setModal(r)} />
            ))
          )}

          <div style={{ height:1, background:'var(--border-s)', margin:'14px 0' }} />

          {/* Leyenda */}
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:8 }}>Tipos</div>
          {Object.entries(meetingTypes).map(([k,t]) => {
            const TypeIcon = t.Icon;
            return (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ width:20, height:20, borderRadius:6, display:'grid', placeItems:'center', background:t.bg, color:t.color }}>
                <TypeIcon size={13} strokeWidth={1.8} />
              </span>
              <span style={{ fontSize:11, color:'var(--text-m)' }}>{t.label}</span>
              <div style={{ marginLeft:'auto', width:10, height:10, borderRadius:'50%', background:t.color }} />
            </div>
          );})}
        </div>

        {/* ── MAIN — calendario ── */}
        <div style={{ minWidth:0, padding:'20px 24px', overflow:'auto' }}>

          {false && canUseSalesIntelligence && (
            <SalesEffectivenessPanel
              insights={salesInsights}
              range={salesRange}
              periodMode={periodMode}
              setPeriodMode={setPeriodMode}
              customStart={customStart}
              setCustomStart={setCustomStart}
              customEnd={customEnd}
              setCustomEnd={setCustomEnd}
              targetHourly={targetHourly}
            />
          )}

          {/* Navegación mes */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <button onClick={prevMonth} style={{ width:34, height:34, display:'grid', placeItems:'center', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, cursor:'pointer', color:'var(--text-d)', fontFamily:'inherit' }}>
              <ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:22, fontWeight:300 }}>
              {MESES[month]} <span style={{ color:'var(--text-d)', fontStyle:'normal', fontSize:18 }}>{year}</span>
            </div>
            <button onClick={nextMonth} style={{ width:34, height:34, display:'grid', placeItems:'center', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, cursor:'pointer', color:'var(--text-d)', fontFamily:'inherit' }}>
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
          </div>

          {view === 'mes' && (
            <>
              {/* Días de la semana */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:4, marginBottom:4 }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ textAlign:'center', fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', padding:'6px 0' }}>{d}</div>
                ))}
              </div>

              {/* Grid de días */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:4 }}>
                {calendarDays.map((dia, i) => {
                  if (!dia) return <div key={`empty-${i}`} />;
                  const reus = reunionesDelDia(dia);
                  const esHoy = sameDay(new Date(year, month, dia), HOY);
                  const esSeleccionado = diaSeleccionado === dia;

                  return (
                    <div key={dia}
                      onClick={() => { setDiaSeleccionado(dia === diaSeleccionado ? null : dia); }}
                      style={{
                        minHeight:80, minWidth:0, padding:'6px', borderRadius:10, cursor:'pointer',
                        border:`1px solid ${esSeleccionado ? 'var(--gold)' : esHoy ? 'rgba(201,169,110,0.4)' : 'var(--border-s)'}`,
                        background: esSeleccionado ? 'rgba(201,169,110,0.08)' : esHoy ? 'rgba(201,169,110,0.04)' : 'var(--s2)',
                        transition:'all .15s',
                      }}
                      onMouseEnter={e => { if (!esSeleccionado) e.currentTarget.style.borderColor='var(--border)'; }}
                      onMouseLeave={e => { if (!esSeleccionado) e.currentTarget.style.borderColor= esHoy?'rgba(201,169,110,0.4)':'var(--border-s)'; }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{
                          fontSize:12, fontWeight: esHoy ? 700 : 400,
                          width:22, height:22, borderRadius:'50%',
                          background: esHoy ? 'var(--gold)' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color: esHoy ? '#0a0a0a' : 'var(--text-m)',
                        }}>{dia}</span>
                        {reus.length > 0 && (
                          <span style={{ fontSize:9, background:'var(--gold)', color:'#0a0a0a', borderRadius:8, padding:'1px 5px', fontWeight:600 }}>{reus.length}</span>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                        {reus.slice(0,3).map(r => {
                          const t = TIPOS[r.tipo];
                          const EventIcon = r.solicitudCliente ? User : t.Icon;
                          return (
                            <div key={r.id}
                              onClick={e => { e.stopPropagation(); setModal(r); }}
                              style={{
                                fontSize:9, padding:'2px 5px', borderRadius:4,
                                background: r.solicitudCliente ? 'rgba(123,198,122,0.15)' : t.bg,
                                color: r.solicitudCliente ? 'var(--green)' : t.color,
                                fontWeight:500,
                                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                                cursor:'pointer',
                                border:`1px solid ${r.solicitudCliente ? 'rgba(123,198,122,0.3)' : t.color+'30'}`,
                                display:'flex', alignItems:'center', gap:3,
                              }}>
                              <EventIcon size={10} strokeWidth={1.8} />
                              <span>{fmtHora(new Date(r.fecha))} {r.titulo.split('·')[0].trim()}</span>
                            </div>
                          );
                        })}
                        {reus.length > 3 && <div style={{ fontSize:9, color:'var(--text-d)', paddingLeft:4 }}>+{reus.length-3} más</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel del día seleccionado */}
              {diaSeleccionado && (
                <div style={{ marginTop:20, background:'var(--s2)', border:'1px solid var(--gold)44', borderRadius:12, padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--gold)' }}>
                      {DIAS_SEMANA_FULL[new Date(year,month,diaSeleccionado).getDay()]}, {diaSeleccionado} de {MESES[month]}
                    </div>
                    <button onClick={() => { setModal('nueva'); }} style={{ background:'var(--gold)', color:'#0a0a0a', border:'none', borderRadius:7, padding:'5px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      + Agregar
                    </button>
                  </div>
                  {reunionesDelDia(diaSeleccionado).length === 0 ? (
                    <div style={{ fontSize:12, color:'var(--text-d)', padding:'8px 0' }}>Sin reuniones este día. Haz clic en + Agregar para crear una.</div>
                  ) : (
                    reunionesDelDia(diaSeleccionado).map(r => (
                      <ReunionCard key={r.id} r={r} onClick={() => setModal(r)} onGenerateZoom={generateMeetingZoom} onSendInvite={sendMeetingInvite} sending={sendingId === r.id} zooming={zoomingId === r.id} />
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {view === 'lista' && (
            <div>
              {/* Agrupar por fecha */}
              {(() => {
                const grupos = {};
                [...filtered].sort((a,b) => new Date(a.fecha)-new Date(b.fecha)).forEach(r => {
                  const key = new Date(r.fecha).toDateString();
                  if (!grupos[key]) grupos[key] = [];
                  grupos[key].push(r);
                });
                return Object.entries(grupos).map(([key, reus]) => {
                  const fecha = new Date(key);
                  const esHoy = sameDay(fecha, HOY);
                  const esPasado = fecha < HOY && !esHoy;
                  return (
                    <div key={key} style={{ marginBottom:20 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                        <div style={{ fontSize:12, fontWeight:600, color: esHoy ? 'var(--gold)' : esPasado ? 'var(--text-d)' : 'var(--text)' }}>
                          {esHoy ? '◆ Hoy' : fmtFecha(fecha)}
                        </div>
                        <div style={{ flex:1, height:1, background:'var(--border-s)' }} />
                        <div style={{ fontSize:10, color:'var(--text-d)' }}>{reus.length} reunión{reus.length>1?'es':''}</div>
                      </div>
                      {reus.map(r => <ReunionCard key={r.id} r={r} onClick={() => setModal(r)} onGenerateZoom={generateMeetingZoom} onSendInvite={sendMeetingInvite} sending={sendingId === r.id} zooming={zoomingId === r.id} />)}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {calendarMode === 'cliente' && canUseSalesIntelligence && (
            <SalesEffectivenessPanel
              insights={salesInsights}
              range={salesRange}
              periodMode={periodMode}
              setPeriodMode={setPeriodMode}
              customStart={customStart}
              setCustomStart={setCustomStart}
              customEnd={customEnd}
              setCustomEnd={setCustomEnd}
              targetHourly={targetHourly}
            />
          )}

          {calendarMode === 'estudio' && (
            <StudioEffectivenessPanel insights={studioInsights} />
          )}
        </div>
      </div>

      {/* Modal nueva / editar */}
      {modal && (
        <ModalReunion
          inicial={typeof modal === 'object' ? modal : null}
          onSave={saveReunion}
          onClose={() => setModal(null)}
          clientes={data.clientes}
          onDelete={typeof modal === 'object' ? () => deleteReunion(modal.id) : null}
          canUseSalesIntelligence={canUseSalesIntelligence}
          meetingTypes={meetingTypes}
          calendarMode={calendarMode}
          onGenerateZoom={generateMeetingZoom}
          onSendInvite={sendMeetingInvite}
          sending={typeof modal === 'object' && sendingId === modal.id}
          zooming={typeof modal === 'object' && zoomingId === modal.id}
        />
      )}
    </div>
  );
}

// ── TARJETA COMPACTA (sidebar) ────────────────────────────────────
function ReunionMini({ r, onClick }) {
  const t = TIPOS[r.tipo];
  const TypeIcon = t.Icon;
  return (
    <div onClick={onClick} style={{
      display:'flex', gap:8, padding:'8px 10px', borderRadius:9, cursor:'pointer', marginBottom:6,
      background:`${t.color}0d`, border:`1px solid ${t.color}25`, transition:'all .15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background=t.bg}
    onMouseLeave={e => e.currentTarget.style.background=`${t.color}0d`}>
      <div style={{ width:24, height:24, borderRadius:8, display:'grid', placeItems:'center', flexShrink:0, marginTop:1, background:t.bg, color:t.color }}>
        <TypeIcon size={14} strokeWidth={1.9} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titulo}</div>
        <div style={{ fontSize:10, color:'var(--text-d)', marginTop:1, display:'flex', gap:6 }}>
          <span>{fmtHora(new Date(r.fecha))}</span>
          {r.duracion && <span>· {r.duracion}min</span>}
          {!r.confirmada && <span style={{ color:'var(--gold)' }}>· Pendiente</span>}
        </div>
      </div>
    </div>
  );
}

// ── TARJETA COMPLETA ──────────────────────────────────────────────
function ReunionCard({ r, onClick, onGenerateZoom, onSendInvite, sending = false, zooming = false }) {
  const t = TIPOS[r.tipo];
  const TypeIcon = t.Icon;
  const canInvite = Boolean(onSendInvite) && !isStudioMeeting(r);
  const canGenerateZoom = needsZoomLink(r) && Boolean(onGenerateZoom);
  return (
    <div onClick={onClick} style={{
      display:'flex', gap:14, padding:'12px 14px', borderRadius:10, cursor:'pointer', marginBottom:8,
      background:'var(--s1)', borderTop:'1px solid var(--border-s)', borderRight:'1px solid var(--border-s)', borderBottom:'1px solid var(--border-s)',
      borderLeft:`3px solid ${t.color}`, transition:'all .15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderTopColor=t.color;
      e.currentTarget.style.borderRightColor=t.color;
      e.currentTarget.style.borderBottomColor=t.color;
      e.currentTarget.style.background='var(--s2)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderTopColor='var(--border-s)';
      e.currentTarget.style.borderRightColor='var(--border-s)';
      e.currentTarget.style.borderBottomColor='var(--border-s)';
      e.currentTarget.style.background='var(--s1)';
    }}
    >
      {/* Tipo + hora */}
      <div style={{ textAlign:'center', minWidth:48, flexShrink:0 }}>
        <div style={{ width:34, height:34, borderRadius:10, display:'grid', placeItems:'center', margin:'0 auto 5px', background:t.bg, color:t.color }}>
          <TypeIcon size={17} strokeWidth={1.9} />
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:t.color }}>{fmtHora(new Date(r.fecha))}</div>
        <div style={{ fontSize:10, color:'var(--text-d)' }}>{r.duracion}min</div>
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titulo}</div>
          <div style={{ fontSize:9, padding:'2px 7px', borderRadius:20, background:t.bg, color:t.color, fontWeight:500, flexShrink:0 }}>{t.label}</div>
          {!r.confirmada && <div style={{ fontSize:9, padding:'2px 7px', borderRadius:20, background:'rgba(201,169,110,0.12)', color:'var(--gold)', fontWeight:500, flexShrink:0 }}>Pendiente</div>}
          {r.confirmada && <div style={{ fontSize:9, color:'var(--green)', flexShrink:0, display:'inline-flex', alignItems:'center', gap:3 }}><Check size={11} strokeWidth={2} /> Confirmada</div>}
        </div>
        {r.cliente && <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:3, display:'inline-flex', alignItems:'center', gap:4 }}><User size={11} strokeWidth={1.8} /> {r.cliente}</div>}
        {isStudioMeeting(r) && (
          <div style={{ display:'grid', gap:5, margin:'5px 0 6px' }}>
            {r.objetivo && <div style={{ fontSize:10.5, color:'var(--text-m)', lineHeight:1.45 }}><b style={{ color:'var(--text)' }}>Objetivo:</b> {r.objetivo}</div>}
            {r.resultadoEstudio && (
              <span style={{ width:'fit-content', fontSize:9.5, padding:'3px 7px', borderRadius:999, background:(STUDIO_RESULTS[r.resultadoEstudio] || STUDIO_RESULTS.pendiente).bg, color:(STUDIO_RESULTS[r.resultadoEstudio] || STUDIO_RESULTS.pendiente).color, border:`1px solid ${(STUDIO_RESULTS[r.resultadoEstudio] || STUDIO_RESULTS.pendiente).color}35` }}>
                {(STUDIO_RESULTS[r.resultadoEstudio] || STUDIO_RESULTS.pendiente).label}
              </span>
            )}
          </div>
        )}
        {r.esVentas && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'4px 0 5px' }}>
            <span style={{ fontSize:9.5, padding:'3px 7px', borderRadius:999, background:SALES_RESULTS[r.resultadoVentas]?.bg || 'var(--s2)', color:SALES_RESULTS[r.resultadoVentas]?.color || 'var(--text-d)', border:`1px solid ${(SALES_RESULTS[r.resultadoVentas]?.color || '#6b7280')}35` }}>
              {SALES_RESULTS[r.resultadoVentas]?.label || 'Venta'}
            </span>
            {r.paqueteCotizado && <span style={{ fontSize:9.5, padding:'3px 7px', borderRadius:999, background:'rgba(91,155,213,.10)', color:'var(--blue)', border:'1px solid rgba(91,155,213,.24)' }}>{r.paqueteCotizado}</span>}
          </div>
        )}
        {!r.esVentas && r.notas && <div style={{ fontSize:11, color:'var(--text-m)', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notas}</div>}
        {r.link && (
          <div onClick={e => { e.stopPropagation(); window.open(r.link,'_blank'); }}
            style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:5, fontSize:10, color:t.color, cursor:'pointer', textDecoration:'underline' }}>
            <TypeIcon size={12} strokeWidth={1.8} /> Unirse a la reunión →
          </div>
        )}
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:8 }}>
          {canGenerateZoom && !r.link && (
            <button
              onClick={e => { e.stopPropagation(); onGenerateZoom(r); }}
              disabled={zooming}
              style={{ border:'1px solid rgba(91,155,213,.28)', background:'rgba(91,155,213,.09)', color:'var(--blue)', borderRadius:8, padding:'7px 9px', fontSize:10.5, fontFamily:'inherit', cursor: zooming ? 'default' : 'pointer', display:'inline-flex', alignItems:'center', gap:5, opacity: zooming ? .65 : 1 }}>
              <Video size={12} strokeWidth={1.9} /> {zooming ? 'Generando...' : 'Generar Zoom'}
            </button>
          )}
          {canInvite && (
            <button
              onClick={e => { e.stopPropagation(); onSendInvite(r); }}
              disabled={sending}
              style={{ border:'1px solid rgba(37,211,102,.25)', background:'rgba(37,211,102,.08)', color:'#25D366', borderRadius:8, padding:'7px 9px', fontSize:10.5, fontFamily:'inherit', cursor: sending ? 'default' : 'pointer', display:'inline-flex', alignItems:'center', gap:5, opacity: sending ? .65 : 1 }}>
              <Send size={12} strokeWidth={1.9} /> {sending ? 'Enviando...' : 'Enviar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
