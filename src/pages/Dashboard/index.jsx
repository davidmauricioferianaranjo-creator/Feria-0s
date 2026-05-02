import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Card, StatCard, SectionLabel, Badge, ProgressBar, Button, BrandPill, Avatar,
  Input, Select,
} from '../../components/UI';
import { STAGE_LABELS } from '../../context/AppContext';
import { DEMO_PUBLICACIONES } from '../../lib/operationalData';
import { calculateStudioHealth } from '../../lib/studioHealth';
import { Activity, AlertTriangle, Lightbulb, ShieldCheck, Target } from 'lucide-react';

function tempColor(daysLeft) {
  if (daysLeft <= 2)  return { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)', dot: 'var(--red)',     label: 'Urgente', badge: 'red'     };
  if (daysLeft <= 5)  return { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.25)', dot: 'var(--warning)', label: 'Próximo', badge: 'warning' };
  return               { bg: 'transparent',                  border: 'var(--border-s)',        dot: 'var(--green)',   label: 'OK',      badge: 'green'   };
}

function notifRoute(n) {
  const tipo = (n.tipo || '').toLowerCase();
  const title = `${n.titulo || ''} ${n.descripcion || ''}`.toLowerCase();
  if (tipo.includes('cobro') || title.includes('cobro') || title.includes('pago')) return '/finanzas';
  if (tipo.includes('lead') || title.includes('lead')) return '/crm';
  if (tipo.includes('contrato') || title.includes('contrato')) return '/contratos';
  if (tipo.includes('review') || title.includes('aprob')) return '/postventa';
  if (tipo.includes('proyecto') || title.includes('entrega')) return '/kanban';
  return '/';
}

function money(v) {
  const n = Number(v || 0);
  return n > 0 ? `$${n.toLocaleString()}` : '';
}

function notifText(n, data) {
  const tipo = (n.tipo || '').toLowerCase();
  const rawClienteId = n.clienteId || n.cliente_id || n.cliente;
  const rawCobroId = n.cobroId || n.cobro_id || n.cobro;
  const title = n.titulo || 'Notificación';
  const body = `${n.titulo || ''} ${n.descripcion || ''} ${n.desc || ''}`.toLowerCase();

  const cobro = data.cobros.find(c => String(c.id) === String(rawCobroId))
    || data.cobros.find(c => rawClienteId && String(c.clienteId || c.cliente_id) === String(rawClienteId));

  const cliente = data.clientes.find(c => String(c.id) === String(rawClienteId))
    || (cobro ? data.clientes.find(c => String(c.id) === String(cobro.clienteId || cobro.cliente_id)) : null)
    || data.clientes.find(c => body.includes((c.nombre || '').toLowerCase()))
    || null;

  if (tipo.includes('cobro') || body.includes('cobro') || body.includes('pago')) {
    const monto = money(n.monto || cobro?.monto);
    const nombre = cliente?.nombre || 'Cliente sin identificar';
    const base = title.toLowerCase().includes('confirm') || title.toLowerCase().includes('pag') ? 'Cobro confirmado' : title;
    return [monto, nombre, base].filter(Boolean).join(' · ');
  }

  if (cliente && !title.toLowerCase().includes(cliente.nombre.toLowerCase())) return `${title} · ${cliente.nombre}`;
  return title;
}
function buildChartData(cobros, range) {
  const now    = new Date();
  const months = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('es-ES', { month: 'short', year: months > 6 ? '2-digit' : undefined });
    buckets.push({ label: key, year: d.getFullYear(), month: d.getMonth(), total: 0, demo: false });
  }
  cobros.filter(c => c.status === 'paid').forEach(c => {
    const d = new Date(c.created_at || c.fecha || Date.now());
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.total += (c.monto || 0);
  });
  return buckets;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border-m)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-d)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>${(payload[0].value||0).toLocaleString()}</div>
    </div>
  );
}

const EC = {
  publicado:   { label: 'Publicado',   badge: 'green'   },
  en_progreso: { label: 'En progreso', badge: 'warning' },
  pendiente:   { label: 'Pendiente',   badge: 'default' },
  revision:    { label: 'En revisión', badge: 'blue'    },
};


function MarketingPerformanceCard({ data, showToast, upsertMarketingPerformance }) {
  const latest = (data.marketingPerformance || [])[0] || {};
  const [draft, setDraft] = useState({
    id: latest.id || '',
    owner_name: latest.owner_name || 'Equipo comercial',
    channel: latest.channel || 'Meta Ads',
    brand: latest.brand || 'feria',
    invested_amount: latest.invested_amount || '',
    converted_amount: latest.converted_amount || '',
    leads_count: latest.leads_count || '',
    clients_count: latest.clients_count || '',
    notes: latest.notes || '',
    period_start: latest.period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!latest.id) return;
    setDraft({
      id: latest.id || '',
      owner_name: latest.owner_name || 'Equipo comercial',
      channel: latest.channel || 'Meta Ads',
      brand: latest.brand || 'feria',
      invested_amount: latest.invested_amount || '',
      converted_amount: latest.converted_amount || '',
      leads_count: latest.leads_count || '',
      clients_count: latest.clients_count || '',
      notes: latest.notes || '',
      period_start: latest.period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    });
  }, [
    latest.id,
    latest.owner_name,
    latest.channel,
    latest.brand,
    latest.invested_amount,
    latest.converted_amount,
    latest.leads_count,
    latest.clients_count,
    latest.notes,
    latest.period_start,
  ]);

  const invested = Number(draft.invested_amount || 0);
  const converted = Number(draft.converted_amount || 0);
  const roi = invested > 0 ? Math.round(((converted - invested) / invested) * 100) : 0;
  const roas = invested > 0 ? (converted / invested).toFixed(2) : '0.00';
  const conversionRate = Number(draft.leads_count || 0) > 0 ? Math.round((Number(draft.clients_count || 0) / Number(draft.leads_count || 0)) * 100) : 0;

  const save = async () => {
    await upsertMarketingPerformance(draft);
    showToast('Rendimiento de pauta guardado', '✓');
  };

  return (
    <Card style={{ background: 'var(--s2)', border: '1px solid var(--border-m)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Conversión de pauta</div>
          <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>Control comercial para saber cuánto se invierte y cuánto se convierte.</div>
        </div>
        <Badge color={roi >= 0 ? 'green' : 'warning'}>ROAS {roas}x</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--text-d)', marginBottom: 4 }}>Invertido</div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>${invested.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--text-d)', marginBottom: 4 }}>Convertido</div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>${converted.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--text-d)', marginBottom: 4 }}>Clientes / leads</div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>{draft.clients_count || 0}/{draft.leads_count || 0}</div>
        </div>
        <div style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--text-d)', marginBottom: 4 }}>Conversión</div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>{conversionRate}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 8 }}>
        <Input placeholder="Responsable" value={draft.owner_name} onChange={e => setDraft(d => ({ ...d, owner_name: e.target.value }))} />
        <Select value={draft.brand} onChange={e => setDraft(d => ({ ...d, brand: e.target.value }))} style={{ width: '100%' }}>
          <option value="feria">Feria Design</option>
          <option value="bl">Brand & Legacy</option>
        </Select>
        <Input type="number" placeholder="Invertido" value={draft.invested_amount} onChange={e => setDraft(d => ({ ...d, invested_amount: e.target.value }))} />
        <Input type="number" placeholder="Convertido" value={draft.converted_amount} onChange={e => setDraft(d => ({ ...d, converted_amount: e.target.value }))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <Input type="number" placeholder="Leads" value={draft.leads_count} onChange={e => setDraft(d => ({ ...d, leads_count: e.target.value }))} />
        <Input type="number" placeholder="Clientes" value={draft.clients_count} onChange={e => setDraft(d => ({ ...d, clients_count: e.target.value }))} />
        <Input placeholder="Notas / campaña" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
        <Button variant="gold" onClick={save}>Guardar</Button>
      </div>
    </Card>
  );
}

function StudioHealthBannerPro({ meta, ingresos, gastos, porCobrar, data, onOpen }) {
  const health = calculateStudioHealth({ meta, ingresos, gastos, porCobrar, deudas:data.deudas || [] });
  const state = health.status;
  const Icon = health.score >= 80 ? ShieldCheck : health.score >= 60 ? Activity : AlertTriangle;

  return (
    <div style={{ background:'var(--s2)', border:`1px solid ${state.color}45`, borderRadius:14, padding:16, display:'grid', gap:14, boxShadow:`0 0 0 1px ${state.color}10` }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', gap:14, alignItems:'center' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', minWidth:0 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${state.color}18`, border:`1px solid ${state.color}35`, display:'grid', placeItems:'center', flexShrink:0 }}>
            <Icon size={20} strokeWidth={1.8} color={state.color} />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:3 }}>Salud del estudio</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:18, fontWeight:850, color:state.color }}>{state.label}</span>
              <span style={{ fontSize:11, color:'var(--text-d)' }}>{health.score}/100</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.5, marginTop:3 }}>{health.worst?.note}</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(120px, 1fr))', gap:8 }}>
          {[
            { label:'Pasivo actual', value:`$${health.debt.pending.toLocaleString()}`, color:'var(--text)' },
            { label:'Cuotas deuda/mes', value:`$${health.debt.monthlyQuota.toLocaleString()}`, color:'var(--gold)' },
          ].map(item => (
            <div key={item.label} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:'8px 10px', minWidth:0 }}>
              <div style={{ fontSize:9, color:'var(--text-d)', marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:14, fontWeight:900, color:item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap:8 }}>
        {health.dimensions.map(item => (
          <div key={item.id} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:10, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
              <div style={{ fontSize:9, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>{item.label}</div>
              <div style={{ fontSize:11, color:item.color, fontWeight:900 }}>{item.value}</div>
            </div>
            <div style={{ height:5, background:'var(--s3)', borderRadius:999, marginTop:8, overflow:'hidden' }}>
              <div style={{ width:`${Math.max(4, item.score)}%`, height:'100%', background:item.color, borderRadius:999 }} />
            </div>
            <div style={{ fontSize:9, color:'var(--text-d)', marginTop:6 }}>{item.score}/100 - peso {item.weight}%</div>
          </div>
        ))}
      </div>

      {onOpen && (
        <Button variant="ghost" style={{ justifySelf:'start' }} onClick={onOpen}>
          Ver desglose financiero
        </Button>
      )}
    </div>
  );
}

function isStudioMeeting(r = {}) {
  return ['estudio', 'studio', 'interno'].includes(String(r.calendario || r.scope || r.contexto || '').toLowerCase());
}

function buildDashboardMeetingSuggestions(reuniones = []) {
  const all = Array.isArray(reuniones) ? reuniones : [];
  const studioMeetings = all.filter(isStudioMeeting);
  const source = (studioMeetings.length ? studioMeetings : all)
    .filter(Boolean)
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  const suggestions = [];

  source.forEach((meeting) => {
    const title = meeting.titulo || meeting.cliente || 'Reunión';
    const objective = String(meeting.objetivo || '').trim();
    const notes = String(meeting.notas || '').trim();
    const result = meeting.resultadoEstudio || meeting.resultado || '';
    const detail = objective || notes;

    if (result === 'bloqueado') {
      suggestions.push({
        tone: 'red',
        title: `Desbloquear ${title}`,
        detail: detail || 'Definir responsable, siguiente acción y fecha de salida para que el acuerdo avance.',
      });
      return;
    }

    if (result === 'seguimiento') {
      suggestions.push({
        tone: 'gold',
        title: `Seguimiento pendiente: ${title}`,
        detail: detail || 'Queda una acción abierta. Mantenerla visible evita que el acuerdo se pierda entre reuniones.',
      });
      return;
    }

    if (result === 'logrado') {
      suggestions.push({
        tone: 'green',
        title: `Acuerdo para aplicar: ${title}`,
        detail: notes || objective || 'El objetivo fue logrado. Verificar que el ajuste ya esté reflejado en el proceso.',
      });
      return;
    }

    if (notes) {
      suggestions.push({
        tone: 'blue',
        title: `Convertir nota en acción: ${title}`,
        detail: notes,
      });
      return;
    }

    if (!objective && isStudioMeeting(meeting)) {
      suggestions.push({
        tone: 'blue',
        title: `Definir objetivo: ${title}`,
        detail: 'Agregar objetivo y resultado hace que la inteligencia operativa mida qué se está aplicando.',
      });
    }
  });

  if (!suggestions.length) {
    return [
      {
        tone: 'blue',
        title: 'Registrar el siguiente paso de cada reunión',
        detail: 'El dashboard mostrará aquí los acuerdos y mejoras activas cuando el calendario del estudio tenga objetivos y resultados.',
      },
      {
        tone: 'gold',
        title: 'Revisar patrones de seguimiento',
        detail: 'Si varios acuerdos quedan abiertos, conviene ajustar la preparación o el cierre operativo de las reuniones.',
      },
    ];
  }

  return suggestions.slice(0, 3);
}

function MeetingImprovementsCard({ suggestions, onOpen }) {
  const toneColor = {
    green: 'var(--green)',
    gold: 'var(--gold)',
    red: 'var(--red)',
    blue: 'var(--blue)',
  };

  return (
    <Card style={{ background:'var(--s2)', border:'1px solid var(--border-m)', padding:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, marginBottom:14 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--gold)', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:850, marginBottom:6 }}>
            <Lightbulb size={14} strokeWidth={2} /> Reuniones del estudio
          </div>
          <div style={{ fontSize:16, fontWeight:850 }}>Puntos de mejora en aplicación</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:4, lineHeight:1.5 }}>
            Acuerdos y sugerencias visibles para recordar qué se está aplicando en el flujo.
          </div>
        </div>
        <div style={{ width:42, height:42, borderRadius:12, background:'rgba(201,169,110,.12)', border:'1px solid rgba(201,169,110,.28)', display:'grid', placeItems:'center', flexShrink:0 }}>
          <Target size={18} color="var(--gold)" strokeWidth={1.9} />
        </div>
      </div>

      <div style={{ display:'grid', gap:8, marginBottom:12 }}>
        {(suggestions || []).map((item, index) => {
          const color = toneColor[item.tone] || 'var(--text)';
          return (
            <div key={`${item.title}-${index}`} style={{ display:'grid', gridTemplateColumns:'auto minmax(0, 1fr)', gap:10, background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 11px' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:color, marginTop:5, boxShadow:`0 0 0 4px ${color}18` }} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:850, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                <div style={{ fontSize:10.5, color:'var(--text-d)', lineHeight:1.5, marginTop:3 }}>{item.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="ghost" onClick={onOpen} style={{ fontSize:11, padding:'6px 10px' }}>Abrir calendario</Button>
    </Card>
  );
}

export default function Dashboard() {
  const { data, ingresos, notifsNoLeidas, showToast, addCliente, marcarNotifLeida, demoMode, upsertMarketingPerformance } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('6m');
  const [showModal, setShowModal]   = useState(false);
  const [newClient, setNewClient]   = useState({ nombre: '', tipo: '', email: '', servicio: 'Brand Identity', monto: '', brand: 'feria' });

  const { meta }         = data.studio;
  const metaForDisplay   = { ...meta, actual: ingresos };
  const pct              = Math.round(ingresos / (meta.objetivo || 1) * 100);
  const falta            = Math.max((meta.objetivo || 0) - (meta.actual ?? ingresos), 0);
  const diario           = meta.diasRestantes > 0 ? Math.round(falta / meta.diasRestantes) : 0;
  const barColor         = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--text)' : 'var(--red)';
  const proyActivos      = data.proyectos.filter(p => p.pctInterno < 100);
  const cobrosPend       = data.cobros.filter(c => c.status !== 'paid');
  const chartData        = useMemo(() => buildChartData(data.cobros, chartRange), [data.cobros, chartRange]);
  const publicacionesOperativas = demoMode ? DEMO_PUBLICACIONES : [];
  const totalGastos      = data.gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  const porCobrar        = cobrosPend.reduce((sum, c) => sum + Number(c.monto || 0), 0);
  const meetingSuggestions = useMemo(() => buildDashboardMeetingSuggestions(data.reuniones), [data.reuniones]);
  const handleAddClient = () => {
    if (!newClient.nombre) { showToast('Ingresa el nombre del cliente', '⚠'); return; }
    addCliente({ ...newClient, id: Date.now(), stage: 0, monto: parseFloat(newClient.monto) || 0, color: '#5B9BD5', creativo: 1 });
    setShowModal(false);
    setNewClient({ nombre: '', tipo: '', email: '', servicio: 'Brand Identity', monto: '', brand: 'feria' });
    showToast(`${newClient.nombre} agregado · flujo iniciado`, '✦');
  };

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 32px) clamp(16px, 5vw, 40px)', maxWidth: 1200, margin: '0 auto', width: '100%', minWidth: 0 }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
            Dashboard <span style={{ color: 'var(--text-m)', fontWeight: 400 }}>Feria OS</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-d)' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => navigate('/crm')}>Ver CRM</Button>
          <Button variant="ghost" onClick={signOut}>⏻ Cerrar sesión</Button>
          <Button variant="gold" onClick={() => setShowModal(true)}>+ Nuevo cliente</Button>
        </div>
      </div>

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Ingresos mes"      value={`$${ingresos.toLocaleString()}`}
                  sub="cobrado este mes"   delta="up" color="var(--text)" />
        <StatCard label="Por cobrar"
                  value={`$${cobrosPend.reduce((a,c)=>a+c.monto,0).toLocaleString()}`}
                  sub={cobrosPend.length ? `${cobrosPend.length} cobro${cobrosPend.length>1?'s':''} pendiente${cobrosPend.length>1?'s':''}` : 'Todo al día'}
                  delta={cobrosPend.length ? 'warn' : undefined} />
        <StatCard label="Proyectos activos" value={proyActivos.length} sub="en producción" />
        <StatCard label="Leads pipeline"    value={data.leads.length}
                  sub={`${data.leads.filter(l=>l.status==='caliente').length} calientes`} delta="up" color="var(--text)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* META CARD */}
          <Card highlight style={{ background: 'var(--s2)', border: '1px solid var(--border-m)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Meta mensual</div>
                <div style={{ fontSize: 11, color: 'var(--text-d)' }}>Feria + Brand & Legacy · {new Date().toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</div>
              </div>
              <Badge color={pct >= 100 ? 'green' : pct >= 60 ? 'warning' : 'red'}>
                {pct >= 100 ? 'Meta cumplida' : pct >= 60 ? 'En riesgo' : 'Crítico'}
              </Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { v: `$${metaForDisplay.actual.toLocaleString()}`,   l: 'Alcanzado',     c: 'var(--text)' },
                { v: `$${meta.objetivo.toLocaleString()}`, l: 'Meta',          c: 'var(--text-m)' },
                { v: meta.diasRestantes,                   l: 'Días restantes',c: pct >= 60 ? 'var(--text)' : 'var(--red)' },
              ].map(({ v, l, c }) => (
                <div key={l} style={{ background: 'var(--s1)', borderRadius: 10, padding: '16px', textAlign: 'center', border: '1px solid var(--border-s)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 6 }}>{l}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={pct} color={barColor} height={6} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-m)', marginBottom: 16 }}>
              <span>{pct}% alcanzado</span>
              <span>{falta > 0 ? `Faltan $${falta.toLocaleString()}` : '¡Superada!'}</span>
            </div>
            {falta > 0 && (
              <div style={{ background: pct >= 60 ? 'var(--s3)' : 'rgba(248,113,113,0.1)', border: `1px solid ${pct >= 60 ? 'var(--border-m)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: pct >= 60 ? 'var(--text)' : 'var(--red)' }}>
                Necesitas ~${diario.toLocaleString()}/día en los próximos {meta.diasRestantes} días.
                {cobrosPend.length > 0 ? ` Hay $${cobrosPend.reduce((a,c)=>a+c.monto,0).toLocaleString()} en cobros pendientes.` : ''}
              </div>
            )}
          </Card>

          <StudioHealthBannerPro
            meta={metaForDisplay}
            ingresos={ingresos}
            gastos={totalGastos}
            porCobrar={porCobrar}
            data={data}
            onOpen={() => navigate('/finanzas')}
          />

          <MeetingImprovementsCard
            suggestions={meetingSuggestions}
            onOpen={() => navigate('/calendario')}
          />

          <MarketingPerformanceCard data={data} showToast={showToast} upsertMarketingPerformance={upsertMarketingPerformance} />

          {/* GRÁFICA DE INGRESOS */}
          <Card style={{ background: 'var(--s2)', border: '1px solid var(--border-m)', padding: '20px 20px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ingresos en el tiempo</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[['1m','1M'],['3m','3M'],['6m','6M'],['12m','1A']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setChartRange(val)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: chartRange === val ? 'var(--gold)' : 'var(--s3)',
                    color: chartRange === val ? '#000' : 'var(--text-m)',
                    border: 'none', fontWeight: chartRange === val ? 600 : 400, transition: 'all .15s',
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--gold)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-d)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} axisLine={false} tickLine={false}
                       tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="var(--gold)" strokeWidth={2}
                      fill="url(#goldGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--gold)', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* PROYECTOS ACTIVOS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionLabel style={{ marginBottom: 0 }}>Proyectos activos</SectionLabel>
              <Badge color="default">{proyActivos.length} en producción</Badge>
            </div>
            {proyActivos.length === 0 ? (
              <Card style={{ padding: 24, textAlign: 'center', color: 'var(--text-d)', fontSize: 13 }}>
                No hay proyectos activos en este momento
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {proyActivos.map(p => {
                  const cliente  = data.clientes.find(c => c.id === (p.clienteId || p.cliente_id));
                  const creativo = data.team.find(t => t.id === p.creativo);
                  const daysLeft = Math.max(0, (p.diasEntrega || 30) - Math.round((p.diasEntrega || 30) * (p.pctInterno || 0) / 100));
                  const temp     = tempColor(daysLeft);
                  const fechaIni = p.fechaInicio  || p.fecha_inicio  || null;
                  const fechaFin = p.fechaEntrega || p.fecha_entrega || null;
                  return (
                    <div key={p.id} onClick={() => navigate('/kanban')} style={{ background: temp.bg, border: `1px solid ${temp.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'opacity .15s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <Avatar initials={(cliente?.nombre||'?').slice(0,2).toUpperCase()} bg={`${cliente?.color||'#5B9BD5'}22`} color={cliente?.color||'#5B9BD5'} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente?.nombre || 'Cliente'}</span>
                            <BrandPill brand={cliente?.brand} />
                            <Badge color={temp.badge} style={{ fontSize: 9 }}>{temp.label}</Badge>
                            <span style={{ fontSize: 10, color: 'var(--text-d)', background: 'var(--s3)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border-s)' }}>
                              {STAGE_LABELS[p.stage || 0] || 'Inicio'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <ProgressBar value={p.pctInterno || 0} color={temp.dot} height={4} style={{ flex: 1 }} />
                            <span style={{ fontSize: 10, color: 'var(--text-m)', whiteSpace: 'nowrap', minWidth: 68, textAlign: 'right' }}>
                              {p.pctInterno||0}% int · {p.pctCliente||0}% cli
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar initials={creativo?.initials || '?'} bg={creativo?.bg || 'var(--s3)'} color={creativo?.color || 'var(--text-d)'} size={18} />
                              <span style={{ fontSize: 11, color: 'var(--text-m)' }}>{creativo?.name || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-d)' }}>
                              {fechaIni && <span>Inicio: {new Date(fechaIni).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>}
                              {fechaFin && <span>Entrega: {new Date(fechaFin).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>}
                              <span style={{ color: temp.dot, fontWeight: 500 }}>{daysLeft}d restantes</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COMUNICACIÓN DEL ESTUDIO */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionLabel style={{ marginBottom: 0 }}>Comunicación del estudio</SectionLabel>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge color="warning">{publicacionesOperativas.filter(p => p.estado !== 'publicado').length} pendientes</Badge>
                <Button variant="ghost" onClick={() => navigate('/marketing')} style={{ fontSize: 11, padding: '4px 10px' }}>Marketing →</Button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publicacionesOperativas.length === 0 ? (
                <Card style={{ padding: '18px', textAlign: 'center', color: 'var(--text-d)', fontSize: 12 }}>
                  Sin publicaciones cargadas. En modo real, Marketing queda vacío hasta conectar Meta o crear contenido real.
                </Card>
              ) : publicacionesOperativas.map(pub => {
                const daysLeft = Math.ceil((new Date(pub.entrega) - new Date()) / 86400000);
                const temp = pub.estado === 'publicado' ? { bg:'transparent', border:'var(--border-s)', dot:'var(--green)' } : tempColor(daysLeft);
                const ec = EC[pub.estado] || EC.pendiente;
                const member = data.team.find(t => t.name === pub.responsable);
                return (
                  <div key={pub.id} style={{ background: temp.bg, border: `1px solid ${temp.border}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub.titulo}</span>
                          <Badge color={ec.badge} style={{ fontSize: 9 }}>{ec.label}</Badge>
                          <span style={{ fontSize: 10, color: 'var(--text-d)', background: 'var(--s3)', padding: '2px 7px', borderRadius: 20, border: '1px solid var(--border-s)' }}>{pub.plataforma}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Avatar initials={member?.initials || pub.responsable.slice(0,2).toUpperCase()} bg={member?.bg||'var(--s3)'} color={member?.color||'var(--text-d)'} size={18} />
                            <span style={{ fontSize: 10, color: 'var(--text-m)' }}>{pub.responsable}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-d)' }}>· {pub.marca}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-d)' }}>
                            <span>Inicio: {new Date(pub.inicio).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                            <span>Entrega: {new Date(pub.entrega).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                            {pub.estado !== 'publicado' && <span style={{ color: temp.dot, fontWeight: 500 }}>{daysLeft > 0 ? `${daysLeft}d` : 'Vencido'}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* NOTIFICACIONES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionLabel style={{ marginBottom: 0 }}>Notificaciones</SectionLabel>
              {notifsNoLeidas > 0 && <Badge color="gold">{notifsNoLeidas} nuevas</Badge>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.notificaciones.length === 0 ? (
                <Card style={{ padding: '18px', textAlign: 'center', color: 'var(--text-d)', fontSize: 12 }}>Sin notificaciones nuevas</Card>
              ) : data.notificaciones.slice(0,4).map(n => {
                const icoMap = { urgente:'⚠', trigger:'⚡', cobro:'$', review:'★', lead:'◉' };
                const clrMap = { urgente:'var(--red)', trigger:'var(--warning)', cobro:'var(--green)', review:'var(--gold)', lead:'var(--blue)' };
                return (
                  <Card key={n.id} onClick={() => { marcarNotifLeida?.(n.id); navigate(notifRoute(n)); }} style={{ padding: '12px 14px', opacity: n.leida ? .6 : 1, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${clrMap[n.tipo]||'var(--gold)'}15`, color: clrMap[n.tipo]||'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {icoMap[n.tipo] || '·'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notifText(n, data)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 2 }}>{n.desc || n.descripcion || n.tiempo}</div>
                      </div>
                      {!n.leida && <div style={{ width: 8, height: 8, borderRadius: '50%', background: clrMap[n.tipo]||'var(--gold)', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* COBROS PENDIENTES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionLabel style={{ marginBottom: 0 }}>Cobros pendientes</SectionLabel>
              {cobrosPend.length > 0 && <Badge color="warning">{cobrosPend.length}</Badge>}
            </div>
            {cobrosPend.length === 0 ? (
              <Card style={{ padding: '22px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6, color: 'var(--green)' }}>✓</div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--green)' }}>Sin cobros pendientes</div>
                <div style={{ fontSize: 11, color: 'var(--text-d)' }}>Todos los cobros están al día</div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...cobrosPend].sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,4).map(c => {
                  const cliente = data.clientes.find(cl => cl.id === (c.clienteId||c.cliente_id) || cl.id === String(c.clienteId||c.cliente_id));
                  return (
                    <Card key={c.id} onClick={() => navigate('/finanzas')} style={{ padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{cliente?.nombre || 'Cliente'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-d)' }}>{c.tipo} · {c.vence}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: c.status === 'overdue' ? 'var(--red)' : 'var(--text)' }}>${c.monto.toLocaleString()}</div>
                          <Badge color={c.status === 'overdue' ? 'red' : 'warning'} style={{ fontSize: 9 }}>{c.status === 'overdue' ? 'Vencido' : 'Pendiente'}</Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                <Button variant="text" onClick={() => navigate('/finanzas')} style={{ fontSize: 11, color: 'var(--text-m)', marginTop: 4 }}>Ver todos →</Button>
              </div>
            )}
          </div>

          {/* ACCESOS RÁPIDOS */}
          <div>
            <SectionLabel>Accesos rápidos</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Nuevo cliente', icon: '+',  action: () => setShowModal(true)          },
                { label: 'Ver Kanban',    icon: '◧',  action: () => navigate('/kanban')         },
                { label: 'Finanzas',      icon: '◌',  action: () => navigate('/finanzas')       },
                { label: 'Inteligencia',  icon: '⊙',  action: () => navigate('/inteligencia')   },
              ].map(a => (
                <Button key={a.label} variant="ghost" onClick={a.action} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', padding: '10px 14px' }}>
                  <span style={{ fontSize: 14 }}>{a.icon}</span>
                  <span style={{ fontSize: 12 }}>{a.label}</span>
                </Button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <Card style={{ width: 480, maxWidth: '92vw', padding: 28 }}>
            <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, color: 'var(--gold)', marginBottom: 4 }}>Nuevo cliente</div>
            <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 22 }}>El sistema iniciará el flujo automáticamente al confirmar.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { field:'nombre', label:'Nombre',     placeholder:'Nombre del cliente',  type:'text'   },
                { field:'tipo',   label:'Tipo',        placeholder:'Fotógrafo, empresa…', type:'text'   },
                { field:'email',  label:'Email',       placeholder:'email@cliente.com',   type:'email'  },
                { field:'monto',  label:'Monto (USD)', placeholder:'0',                   type:'number' },
              ].map(({ field, label, placeholder, type }) => (
                <div key={field}>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
                  <Input type={type} value={newClient[field]} onChange={e => setNewClient(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Servicio</div>
                <Select value={newClient.servicio} onChange={e => setNewClient(p => ({ ...p, servicio: e.target.value }))} style={{ width:'100%', padding:'9px 13px' }}>
                  <option>Brand Identity</option><option>Brand & Legacy</option>
                  <option>Brand Starter</option><option>Dirección de Arte</option><option>Naming</option>
                </Select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Sub-marca</div>
                <Select value={newClient.brand} onChange={e => setNewClient(p => ({ ...p, brand: e.target.value }))} style={{ width:'100%', padding:'9px 13px' }}>
                  {data.studio.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="gold" onClick={handleAddClient}>Crear · iniciar flujo</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
