import React, { useState, useMemo } from 'react';
import { useApp, STAGE_LABELS } from '../../context/AppContext';
import { Card, Badge, Button, SectionLabel, ProgressBar, BrandPill, EmptyState } from '../../components/UI';
import { triggerEmailByStage } from '../../lib/emails';
import { ArrowRight, Bot, CalendarDays, ChevronDown, CircleCheck, Clock3, FileText, KanbanSquare, MessageCircle, Search, Sparkles, UserPlus, Users, Video } from 'lucide-react';

// ── HELPERS ───────────────────────────────────────────────────
const stageInfo = (stage) => {
  if (stage <= 1) return { label:'Captación',  color:'gray'   };
  if (stage <= 2) return { label:'Propuesta',  color:'blue'   };
  if (stage <= 3) return { label:'Contrato',   color:'purple' };
  if (stage <= 5) return { label:'Brief',      color:'teal'   };
  if (stage <= 7) return { label:'Producción', color:'gold'   };
  if (stage <= 9) return { label:'Entrega',    color:'green'  };
  return              { label:'Post-venta', color:'pink'   };
};

const PIPELINE_COLS = [
  { id:'nuevo',    label:'Nuevos',           color:'var(--blue)',    desc:'Llegan del anuncio o web' },
  { id:'calificado',label:'Calificados',     color:'var(--gold)',   desc:'Respondieron, hay interés' },
  { id:'propuesta',label:'Propuesta enviada',color:'var(--purple)', desc:'Cotización en su inbox' },
  { id:'ganado',   label:'Ganados',          color:'var(--green)',  desc:'Firmaron y pagaron 60%' },
  { id:'frio',     label:'Lista fría',       color:'var(--text-d)', desc:'Sin respuesta 10+ días' },
];

// Score IA: 0-100 basado en datos del lead
function calcScore(lead) {
  let s = 30;
  if (lead.presupuesto > 0)  s += 20;
  if (lead.email)             s += 10;
  if (lead.telefono)          s += 10;
  if (lead.source === 'referido') s += 20;
  if (lead.col === 'calificado')  s += 10;
  if (lead.col === 'propuesta')   s += 15;
  return Math.min(s, 99);
}

function ScoreBadge({ score }) {
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--gold)' : 'var(--text-d)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 7px', background:`${color}15`, border:`1px solid ${color}44`, borderRadius:20 }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:color }} />
      <span style={{ fontSize:9, fontWeight:500, color }}>{score}%</span>
    </div>
  );
}

function FollowUpDot({ daysAgo }) {
  const urgent = daysAgo >= 3;
  const color  = daysAgo >= 7 ? 'var(--red)' : daysAgo >= 3 ? 'var(--warning)' : 'var(--green)';
  return (
    <div title={`Último contacto: hace ${daysAgo}d`}
      style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color, padding:'2px 7px', background:`${color}12`, borderRadius:20, border:`1px solid ${color}30` }}>
      {urgent ? '⚠' : '✓'} {daysAgo}d
    </div>
  );
}

// ── CARD DE LEAD EN PIPELINE ───────────────────────────────────
function LeadCard({ lead, onMove, onConvert, showToast }) {
  const score    = calcScore(lead);
  const daysAgo  = lead.daysAgo || 1;

  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px', marginBottom:8, cursor:'default' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.nombre}</div>
          <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{lead.tipo || lead.source || 'Orgánico'}</div>
        </div>
        <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:8 }}>
          <ScoreBadge score={score} />
        </div>
      </div>

      {lead.presupuesto > 0 && (
        <div style={{ fontSize:11, color:'var(--text-m)', marginBottom:6 }}>
          Presupuesto: <strong>${lead.presupuesto.toLocaleString()}</strong>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <FollowUpDot daysAgo={daysAgo} />
        {lead.source && <span style={{ fontSize:9, color:'var(--text-d)', background:'var(--s3)', padding:'2px 6px', borderRadius:10 }}>{lead.source}</span>}
      </div>

      {/* Recordatorio automático */}
      {daysAgo >= 1 && daysAgo < 7 && (
        <div style={{ fontSize:10, color:'var(--text-d)', padding:'4px 8px', background:'var(--s3)', borderRadius:6, marginBottom:8 }}>
          {daysAgo === 1 && 'Recordatorio 24h — enviar caso de éxito'}
          {daysAgo === 3 && '⚡ Recordatorio 3 días — pregunta directa'}
          {daysAgo >= 4 && daysAgo < 7 && 'Recordatorio 7 días se activa pronto'}
        </div>
      )}
      {daysAgo >= 7 && (
        <div style={{ fontSize:10, color:'var(--red)', padding:'4px 8px', background:'rgba(248,113,113,0.08)', borderRadius:6, marginBottom:8, border:'1px solid rgba(248,113,113,0.2)' }}>
          ⚠ Sin contacto 7+ días — mover a lista fría
        </div>
      )}

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        <button onClick={() => showToast(`Agenda enviada a ${lead.nombre}`, '📅')}
          style={{ fontSize:10, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border-s)', background:'transparent', color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:5 }}>
          <CalendarDays size={11} strokeWidth={1.8} />
          Agendar
        </button>
        <button onClick={() => showToast(`Propuesta enviada a ${lead.nombre}`, '📄')}
          style={{ fontSize:10, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border-s)', background:'transparent', color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:5 }}>
          <FileText size={11} strokeWidth={1.8} />
          Propuesta
        </button>
        <button onClick={() => onConvert(lead)}
          style={{ fontSize:10, padding:'4px 8px', borderRadius:6, border:'1px solid var(--gold)', background:'rgba(201,169,110,0.1)', color:'var(--gold)', cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:5 }}>
          <ArrowRight size={11} strokeWidth={2} />
          Cliente
        </button>
      </div>
    </div>
  );
}

// ── CARD CLIENTE EXISTENTE ─────────────────────────────────────
function ClienteCard({ cliente, expanded, onToggle, onAdvance }) {
  const { data } = useApp();
  const creativo = data.team.find(t => t.id === cliente.creativo);
  const pct      = Math.round((cliente.stage / (STAGE_LABELS.length - 1)) * 100);
  const si       = stageInfo(cliente.stage);

  return (
    <Card style={{ marginBottom:8, padding:0, overflow:'hidden' }}>
      <div style={{ height:2, background:cliente.color, borderRadius:'12px 12px 0 0' }} />
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={onToggle}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:`${cliente.color}22`, color:cliente.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:14, flexShrink:0 }}>
            {cliente.nombre.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cliente.nombre}</div>
            <div style={{ fontSize:10, color:'var(--text-d)', display:'flex', alignItems:'center', gap:6 }}>
              <BrandPill brand={cliente.brand} />
              <span>{cliente.tipo}</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <Badge color={si.color}>{si.label}</Badge>
            <span style={{ fontSize:11, color:'var(--text-d)', minWidth:34, textAlign:'right' }}>{pct}%</span>
            <ChevronDown size={15} strokeWidth={1.8} style={{ color:'var(--text-d)', transform:`rotate(${expanded?180:0}deg)`, transition:'transform .2s', flexShrink:0 }} />
          </div>
        </div>

        <div style={{ marginTop:12, cursor:'pointer' }} onClick={onToggle}>
          <ProgressBar value={pct} color={cliente.color} height={3} style={{ marginBottom:8 }} />
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            {STAGE_LABELS.map((l, i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:500,
                  background: i<cliente.stage ? cliente.color : i===cliente.stage ? 'transparent' : 'var(--s3)',
                  color: i<cliente.stage ? 'var(--dark)' : i===cliente.stage ? cliente.color : 'var(--text-d)',
                  border: i===cliente.stage ? `1.5px solid ${cliente.color}` : 'none',
                  boxShadow: i===cliente.stage ? `0 0 0 3px ${cliente.color}22` : 'none',
                }}>
                  {i<cliente.stage ? '✓' : i+1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border-s)', animation:'fadeIn .2s' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
              <div><div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Servicio</div><div style={{ fontSize:12 }}>{cliente.servicio}</div></div>
              <div><div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Monto</div><div style={{ fontSize:12, fontWeight:500 }}>${(cliente.monto||0).toLocaleString()}</div></div>
              <div><div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Creativo</div><div style={{ fontSize:12 }}>{creativo?.name||'—'}</div></div>
            </div>
            {cliente.email && <div style={{ marginBottom:12 }}><div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Email</div><div style={{ fontSize:12, color:'var(--text-m)' }}>{cliente.email}</div></div>}
            {/* Acciones rápidas */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {cliente.stage < STAGE_LABELS.length-1 && (
                <Button variant="gold" size="sm" onClick={onAdvance}><ArrowRight size={12} strokeWidth={2} /> {STAGE_LABELS[cliente.stage+1]}</Button>
              )}
              <Button variant="ghost" size="sm">Ver perfil</Button>
              {cliente.email && (
                <button onClick={() => window.open(`https://wa.me/?text=Hola%20${encodeURIComponent(cliente.nombre)}`, '_blank')}
                  style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid var(--border-s)', background:'transparent', color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
                  <MessageCircle size={12} strokeWidth={1.8} />
                  WhatsApp
                </button>
              )}
              <button
                onClick={() => { navigator.clipboard?.writeText(`https://meet.google.com/new`); alert('Link de videollamada copiado'); }}
                style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid var(--border-s)', background:'transparent', color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
                <Video size={12} strokeWidth={1.8} />
                Videollamada
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── MAIN CRM ──────────────────────────────────────────────────
export default function CRM() {
  const { clientesFiltrados, updateCliente, addCliente, addLead, updateLead, showToast, data, activeBrand } = useApp();
  const defaultBrand = activeBrand === 'all' ? 'feria' : activeBrand;
  const [tab, setTab]             = useState('clientes');
  const [expanded, setExpanded]   = useState(null);
  const [search, setSearch]       = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [newClient, setNewClient] = useState({ nombre:'', tipo:'', email:'', telefono:'', servicio:'Brand Identity', monto:'', brand:defaultBrand });
  const [newLead, setNewLead]     = useState({ nombre:'', tipo:'', email:'', telefono:'', presupuesto:'', source:'Orgánico', col:'nuevo' });

  // Leads enriquecidos con columna del pipeline
  const leadsEnriquecidos = useMemo(() => {
    const base = data.leads.map(l => ({
      ...l,
      col:       l.col || 'nuevo',
      daysAgo:   l.daysAgo || Math.floor(Math.random() * 8) + 1,
      presupuesto: l.presupuesto || 0,
      source:    l.source || 'Orgánico',
    }));
    // Si no hay leads reales y se mira todo el estudio, muestro un pipeline demo.
    if (base.length === 0 && activeBrand === 'all') return [
      { id:'ld1', nombre:'Ana Valarezo',    tipo:'Arquitecta',      col:'nuevo',     daysAgo:1, presupuesto:2800, source:'Meta Ads',  email:'ana@ejemplo.com' },
      { id:'ld2', nombre:'Rodrigo Méndez',  tipo:'Coach empresarial',col:'calificado',daysAgo:3, presupuesto:3200, source:'Referido',  email:'rod@ejemplo.com' },
      { id:'ld3', nombre:'Fundación Verde', tipo:'ONG',              col:'propuesta', daysAgo:2, presupuesto:1800, source:'Orgánico',  email:''   },
      { id:'ld4', nombre:'Clínica Salud+',  tipo:'Clínica médica',   col:'calificado',daysAgo:7, presupuesto:4500, source:'Referido',  email:'info@ejemplo.com' },
      { id:'ld5', nombre:'Moda Quitena',    tipo:'Marca de moda',    col:'frio',      daysAgo:12,presupuesto:2200, source:'Instagram', email:''   },
    ];
    return base;
  }, [data.leads, activeBrand]);

  // IA: top leads para cerrar esta semana
  const topLeads = [...leadsEnriquecidos]
    .filter(l => l.col !== 'frio' && l.col !== 'ganado')
    .sort((a,b) => calcScore(b) - calcScore(a))
    .slice(0, 3);

  const filtered = clientesFiltrados.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase());
    const matchStage  = filterStage==='all' || stageInfo(c.stage).label.toLowerCase()===filterStage;
    return matchSearch && matchStage;
  });

  const handleAdvance = (cliente) => {
    if (cliente.stage >= STAGE_LABELS.length-1) return;
    const nextStage = cliente.stage+1;
    const msgs = {
      1:['Propuesta generada y enviada al cliente','📄'],
      2:['Propuesta aceptada · contrato enviado','✍'],
      3:['Contrato firmado · procesando pago 60%','💳'],
      4:['Pago confirmado · brief enviado automáticamente','📋'],
      5:['Brief recibido · Tydical habilitado para agendar','📅'],
      6:['Reunión realizada · producción iniciada','🎙'],
      7:['Propuesta presentada · esperando aprobación','👁'],
      8:['Aprobado · procesando cobro 40%','✅'],
      9:['Cobro confirmado · Brand Kit Portal desbloqueado','🎨'],
      10:['Proyecto entregado · post-venta iniciado','🏆'],
    };
    updateCliente(cliente.id, { stage: nextStage });
    const msg = msgs[nextStage];
    if (msg) showToast(msg[0], msg[1]);
    triggerEmailByStage(nextStage, cliente);
  };

  const handleAddClient = () => {
    if (!newClient.nombre) { showToast('Ingresa el nombre del cliente', '⚠'); return; }
    addCliente({ ...newClient, brand:newClient.brand || defaultBrand, id:Date.now(), stage:0, monto:parseFloat(newClient.monto)||0, color:'#5B9BD5', creativo:1 });
    setShowModal(false);
    setNewClient({ nombre:'', tipo:'', email:'', telefono:'', servicio:'Brand Identity', monto:'', brand:defaultBrand });
    showToast(`${newClient.nombre} agregado · flujo iniciado`, '✦');
  };

  const handleAddLead = async () => {
    if (!newLead.nombre) { showToast('Ingresa el nombre del lead', '⚠'); return; }
    await addLead({ ...newLead, brand:defaultBrand, presupuesto:parseFloat(newLead.presupuesto)||0, daysAgo:0, created_at:new Date().toISOString() });
    setShowLeadModal(false);
    setNewLead({ nombre:'', tipo:'', email:'', telefono:'', presupuesto:'', source:'Orgánico', col:'nuevo' });
    showToast(`Lead ${newLead.nombre} agregado al pipeline`, '◉');
  };

  const handleConvertLead = async (lead) => {
    const created = await addCliente({
      nombre: lead.nombre, tipo: lead.tipo || '', email: lead.email || '',
      telefono: lead.telefono || '', servicio: 'Brand Identity',
      monto: lead.presupuesto || 0, brand: lead.brand || defaultBrand,
      color: '#5B9BD5', creativo: 1, stage: 0,
      id: Date.now(),
      source: lead.source, convertido_de: lead.id,
    });
    if (created) {
      await updateLead(lead.id, { col: 'ganado', convertido: true, clienteId: created.id });
    }
    showToast(`${lead.nombre} convertido a cliente · flujo iniciado`, '✦');
  };

  const stats = {
    activos:    clientesFiltrados.filter(c=>c.stage>0&&c.stage<10).length,
    produccion: clientesFiltrados.filter(c=>c.stage>=5&&c.stage<9).length,
    leads:      leadsEnriquecidos.length,
    entregados: clientesFiltrados.filter(c=>c.stage>=9).length,
  };

  const tabs = [
    { id:'clientes', label:'Clientes', icon: Users },
    { id:'pipeline', label:'Pipeline leads', icon: KanbanSquare },
    { id:'ia',       label:'IA scoring', icon: Bot },
  ];

  const inputStyle = { width:'100%', padding:'9px 13px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit', boxSizing:'border-box' };
  const labelStyle = { fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', flexShrink:0, gap:12, flexWrap:'wrap' }}>
        <div style={{ minWidth:0, flex:'1 1 280px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, letterSpacing:'-0.02em', fontSize:18, marginBottom:2 }}>
            <Users size={18} strokeWidth={1.8} color="var(--gold)" />
            Clientes <span style={{ color:'var(--gold)', fontStyle:'italic' }}>y CRM</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-d)' }}>{clientesFiltrados.length} clientes · {leadsEnriquecidos.length} leads en pipeline</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Button variant="ghost" onClick={() => setShowLeadModal(true)}><UserPlus size={13} strokeWidth={1.8} /> Lead</Button>
          <Button variant="gold"  onClick={() => setShowModal(true)}><UserPlus size={13} strokeWidth={1.8} /> Nuevo cliente</Button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', padding:'0 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', flexShrink:0 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize:12, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:7, whiteSpace:'nowrap',
            color: tab===t.id ? 'var(--gold)' : 'var(--text-d)',
            borderLeft:'none', borderRight:'none', borderTop:'none',
            borderBottom: tab===t.id ? '2px solid var(--gold)' : '2px solid transparent',
            background:'transparent', transition:'color .15s',
          }}><Icon size={14} strokeWidth={1.8} />{t.label}</button>
          );
        })}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'18px 20px' }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap:10, marginBottom:18 }}>
          {[
            { l:'Activos',    v:stats.activos,    c:'var(--text)', icon:CircleCheck  },
            { l:'Producción', v:stats.produccion, c:'var(--gold)', icon:Clock3  },
            { l:'Leads',      v:stats.leads,      c:'var(--blue)', icon:Sparkles  },
            { l:'Entregados', v:stats.entregados, c:'var(--green)', icon:CircleCheck },
          ].map(s => (
            <Card key={s.l} style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div>
                  <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:22, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{s.l}</div>
                </div>
                <s.icon size={17} strokeWidth={1.8} color={s.c} />
              </div>
            </Card>
          ))}
        </div>

        {/* ══ CLIENTES ══ */}
        {tab==='clientes' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap:8, marginBottom:14, maxWidth:680 }}>
              <div style={{ position:'relative' }}>
                <Search size={14} strokeWidth={1.8} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-d)' }} />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente…"
                  style={{ ...inputStyle, paddingLeft:34 }} />
              </div>
              <select value={filterStage} onChange={e=>setFilterStage(e.target.value)} style={inputStyle}>
                <option value="all">Todas las etapas</option>
                <option value="captación">Captación</option>
                <option value="producción">Producción</option>
                <option value="entrega">Entrega</option>
                <option value="post-venta">Post-venta</option>
              </select>
            </div>

            {filtered.length===0
              ? <EmptyState icon={Users} title="Sin clientes" sub="Agrega tu primer cliente para comenzar el flujo" action="Nuevo cliente" onAction={() => setShowModal(true)} />
              : filtered.map(c => (
                <ClienteCard key={c.id} cliente={c}
                  expanded={expanded===c.id}
                  onToggle={() => setExpanded(expanded===c.id ? null : c.id)}
                  onAdvance={() => handleAdvance(c)}
                />
              ))
            }
          </>
        )}

        {/* ══ PIPELINE LEADS ══ */}
        {tab==='pipeline' && (
          <>
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:16, lineHeight:1.6 }}>
              Pipeline de prospectos — del anuncio al cierre. Recordatorios automáticos a 24h, 3 y 7 días.
            </div>
            <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:12, alignItems:'flex-start' }}>
              {PIPELINE_COLS.map(col => {
                const colLeads = leadsEnriquecidos.filter(l => l.col===col.id);
                return (
                  <div key={col.id} style={{ minWidth:220, maxWidth:240, flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:col.color }} />
                      <div style={{ fontSize:11, fontWeight:500, color:col.color }}>{col.label}</div>
                      <div style={{ fontSize:10, color:'var(--text-d)', background:'var(--s3)', padding:'1px 6px', borderRadius:10, marginLeft:'auto' }}>{colLeads.length}</div>
                    </div>
                    <div style={{ fontSize:9, color:'var(--text-d)', marginBottom:8 }}>{col.desc}</div>
                    {colLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead}
                        onMove={(id, toCol) => showToast(`${lead.nombre} → ${toCol}`, '◉')}
                        onConvert={handleConvertLead}
                        showToast={showToast}
                      />
                    ))}
                    {colLeads.length===0 && (
                      <div style={{ padding:'20px 14px', textAlign:'center', border:'1px dashed var(--border-s)', borderRadius:10, fontSize:11, color:'var(--text-d)' }}>
                        Sin leads aquí
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ IA SCORING ══ */}
        {tab==='ia' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ padding:'14px 16px', background:'var(--gold-faint)', border:'1px solid var(--border-m)', borderRadius:10, marginBottom:20, fontSize:11, color:'var(--text-m)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--gold)' }}>IA de Feria OS:</strong> analiza presupuesto, canal de origen, días sin contacto y etapa del pipeline para calcular la probabilidad de cierre de cada lead. Los de verde son para esta semana.
            </div>

            <SectionLabel>Top leads para cerrar esta semana</SectionLabel>
            {topLeads.map((lead, i) => {
              const score = calcScore(lead);
              const col   = PIPELINE_COLS.find(c=>c.id===lead.col);
              return (
                <Card key={lead.id} style={{ padding:'14px 16px', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:`var(--gold)22`, color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:500 }}>{lead.nombre}</span>
                        <ScoreBadge score={score} />
                        {col && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:10, background:`${col.color}18`, color:col.color }}>{col.label}</span>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:8 }}>
                        {lead.tipo} · {lead.source}
                        {lead.presupuesto>0 && ` · $${lead.presupuesto.toLocaleString()} USD`}
                      </div>
                      {/* Recomendación IA */}
                      <div style={{ fontSize:11, color:'var(--text-m)', padding:'6px 10px', background:'var(--s3)', borderRadius:7, marginBottom:8 }}>
                        💡 {score>=70 ? `Presupuesto confirmado y buen engagement. Envía propuesta esta semana.` : score>=45 ? `Lead con interés pero sin propuesta. Agendar diagnóstico primero.` : `Calificar con pregunta de presupuesto antes de invertir tiempo.`}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => showToast(`Agenda enviada a ${lead.nombre}`, '📅')}
                          style={{ fontSize:10, padding:'4px 10px', borderRadius:6, border:'1px solid var(--border-s)', background:'transparent', color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>
                          📅 Agendar
                        </button>
                        <button onClick={() => showToast(`Propuesta enviada a ${lead.nombre}`, '📄')}
                          style={{ fontSize:10, padding:'4px 10px', borderRadius:6, border:'1px solid var(--gold)', background:'rgba(201,169,110,0.1)', color:'var(--gold)', cursor:'pointer', fontFamily:'inherit' }}>
                          📄 Enviar propuesta
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            <SectionLabel>Leads por estado de follow-up</SectionLabel>
            {[
              { label:'🔴 Urgente (7+ días sin contacto)', leads:leadsEnriquecidos.filter(l=>l.daysAgo>=7&&l.col!=='ganado'), color:'var(--red)' },
              { label:'🟡 Recordatorio 3d',               leads:leadsEnriquecidos.filter(l=>l.daysAgo===3||l.daysAgo===4),    color:'var(--warning)' },
              { label:'🟢 Al día (< 3 días)',             leads:leadsEnriquecidos.filter(l=>l.daysAgo<3&&l.col!=='frio'),       color:'var(--green)' },
            ].map(grupo => (
              <div key={grupo.label} style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:grupo.color, fontWeight:500, marginBottom:6 }}>{grupo.label} <span style={{ fontSize:10, color:'var(--text-d)' }}>({grupo.leads.length})</span></div>
                {grupo.leads.map(l => (
                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, marginBottom:4 }}>
                    <FollowUpDot daysAgo={l.daysAgo} />
                    <span style={{ flex:1, fontSize:12 }}>{l.nombre}</span>
                    <span style={{ fontSize:10, color:'var(--text-d)' }}>{l.tipo}</span>
                    <button onClick={() => showToast(`Recordatorio enviado a ${l.nombre}`, '⚡')}
                      style={{ fontSize:10, padding:'3px 8px', borderRadius:6, border:`1px solid ${grupo.color}44`, background:`${grupo.color}12`, color:grupo.color, cursor:'pointer', fontFamily:'inherit' }}>
                      Contactar
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:480, maxWidth:'92vw' }}>
            <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--gold)', marginBottom:4 }}>Nuevo cliente</div>
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:22 }}>El sistema iniciará el flujo automáticamente al confirmar.</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                {f:'nombre', l:'Nombre',     ph:'Nombre del cliente',   t:'text'  },
                {f:'tipo',   l:'Tipo',        ph:'Fotógrafo, empresa…',  t:'text'  },
                {f:'email',  l:'Email',       ph:'email@cliente.com',    t:'email' },
                {f:'monto',  l:'Monto (USD)', ph:'0',                    t:'number'},
              ].map(({f,l,ph,t}) => (
                <div key={f}>
                  <div style={labelStyle}>{l}</div>
                  <input type={t} value={newClient[f]} onChange={e=>setNewClient(p=>({...p,[f]:e.target.value}))} placeholder={ph} style={inputStyle} />
                </div>
              ))}
              <div>
                <div style={labelStyle}>Servicio</div>
                <select value={newClient.servicio} onChange={e=>setNewClient(p=>({...p,servicio:e.target.value}))} style={inputStyle}>
                  {['Brand Identity','Brand & Legacy','Brand Starter','Dirección de Arte','Naming'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Sub-marca</div>
                <select value={newClient.brand} onChange={e=>setNewClient(p=>({...p,brand:e.target.value}))} style={inputStyle}>
                  {data.studio.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
              <button onClick={()=>setShowModal(false)} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={handleAddClient} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Crear · iniciar flujo</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO LEAD */}
      {showLeadModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setShowLeadModal(false)}>
          <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:460, maxWidth:'92vw' }}>
            <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--blue)', marginBottom:4 }}>Nuevo lead</div>
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:22 }}>El lead entra al pipeline como "Nuevo". El equipo comercial lo calificará.</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                {f:'nombre',     l:'Nombre',          ph:'Nombre completo',     t:'text'  },
                {f:'tipo',       l:'Industria / tipo', ph:'Arquitecto, coach…',  t:'text'  },
                {f:'email',      l:'Email',            ph:'email@ejemplo.com',   t:'email' },
                {f:'telefono',   l:'Teléfono',         ph:'+593 99…',            t:'text'  },
                {f:'presupuesto',l:'Presupuesto (USD)',ph:'0',                   t:'number'},
              ].map(({f,l,ph,t}) => (
                <div key={f}>
                  <div style={labelStyle}>{l}</div>
                  <input type={t} value={newLead[f]} onChange={e=>setNewLead(p=>({...p,[f]:e.target.value}))} placeholder={ph} style={inputStyle} />
                </div>
              ))}
              <div>
                <div style={labelStyle}>Canal de origen</div>
                <select value={newLead.source} onChange={e=>setNewLead(p=>({...p,source:e.target.value}))} style={inputStyle}>
                  {['Meta Ads','Referido','Orgánico','Instagram','WhatsApp','Tydical','LinkedIn','Otro'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
              <button onClick={()=>setShowLeadModal(false)} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={handleAddLead} style={{ background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Agregar lead</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
