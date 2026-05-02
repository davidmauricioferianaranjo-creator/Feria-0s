import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { Card, Badge, Button, SectionLabel } from '../../components/UI';
import { BadgeCheck, CheckCircle2, Gem, Handshake, Mail, MessageCircle, Repeat2, Send, Square, SquareCheck, Star, Target, Zap } from 'lucide-react';

const FLUJO_AUTO = [
  { title: 'Email de cierre',       desc: 'Link al Brand Kit Portal + mensaje de gratitud personalizado.',   color: 'var(--green)',  delay: 'Día 0',  icon: Mail,      iconLabel: '✉' },
  { title: 'Solicitud de review',   desc: 'Link directo a Google. Máximo 2 clics para dejar la reseña.',    color: 'var(--gold)',   delay: 'Día 1',  icon: Star,      iconLabel: '★' },
  { title: 'Encuesta NPS',          desc: 'Una sola pregunta: "¿Recomendarías Feria?" Escala 1–10.',        color: 'var(--blue)',   delay: 'Día 2',  icon: Target,    iconLabel: '◎' },
  { title: 'Oferta mantenimiento',  desc: 'Propuesta personalizada según el proyecto. Tres tiers.',         color: 'var(--coral)',  delay: 'Día 7',  icon: Gem,       iconLabel: '◈' },
  { title: 'Solicitud de referido', desc: 'Link personalizado. Incentivo: 10% en próximo servicio.',        color: 'var(--purple)', delay: 'Día 14', icon: Handshake, iconLabel: '⊕' },
  { title: 'Check-in de marca',     desc: '¿Cómo está funcionando tu identidad? Abre conversación.',        color: 'var(--teal)',   delay: 'Día 30', icon: Repeat2,   iconLabel: '⟳' },
];

const TESTIMONIALS = [
  { quote: 'Feria entendió desde el primer minuto qué queríamos construir. La identidad de ARKES no es solo un logo — es un lenguaje completo.', author: 'ARKES Arquitectura',        project: 'Brand Identity · 2025', color: 'var(--blue)',   stars: 5 },
  { quote: 'El proceso fue tan importante como el resultado. El brief los ayudó a escuchar cosas que yo ni sabía que quería comunicar.',          author: 'Mónica Samaniego',         project: 'Brand Identity · 2025', color: 'var(--purple)', stars: 5 },
  { quote: 'ArtizWed ahora se ve como lo que realmente es: una marca de fotografía premium. Los clientes lo notan antes de ver un solo portfolio.', author: 'Arturo Jiménez · ArtizWed', project: 'Brand & Legacy · 2024', color: 'var(--coral)',  stars: 5 },
  { quote: 'Sultán de los Andes pasó de ser un producto sin identidad a una marca que compite en estantería con cualquiera.',                      author: 'Sultán de los Andes',      project: 'Brand Identity · 2025', color: 'var(--green)',  stars: 5 },
];

const MANT_TIERS = [
  { name: 'Esencial', price: '$180', period: '/mes', feats: ['1 actualización mensual','Ajuste de color o tipografía','Entrega en 48h','Soporte por email'],                                             featured: false },
  { name: 'Activo',   price: '$350', period: '/mes', feats: ['Hasta 4 piezas al mes','Nuevas aplicaciones de marca','Entrega en 24h','Soporte prioritario','Revisión mensual estratégica'],              featured: true  },
  { name: 'Legacy',   price: '$600', period: '/mes', feats: ['Piezas ilimitadas','Evolución de identidad continua','Entrega en 12h','Reunión mensual','Guidelines actualizadas'],                         featured: false },
];

// ── MODAL ACTIVAR SECUENCIA ────────────────────────────────────────
function ModalSecuencia({ data, showToast, onClose }) {
  const [clienteId, setClienteId] = useState('');
  const [sent, setSent]           = useState({});
  const [activado, setActivado]   = useState(false);
  const [customDelays, setCustomDelays] = useState(() => [0,1,2,7,14,30]);
  const [activeSteps, setActiveSteps] = useState(() => FLUJO_AUTO.map(() => true));

  const cliente = data.clientes.find(c => String(c.id) === String(clienteId));
  const activeCount = activeSteps.filter(Boolean).length;
  const toggleStep = (i) => {
    if (activado) return;
    setActiveSteps(steps => steps.map((enabled, idx) => idx === i ? !enabled : enabled));
  };

  const sendStep = async (i) => {
    if (!clienteId) { showToast('Selecciona un cliente primero', '⚠'); return; }
    if (!activeSteps[i]) { showToast(`${FLUJO_AUTO[i].title} está desactivado`, '•'); return; }
    setSent(p => ({ ...p, [i]: 'sending' }));
    const paso = FLUJO_AUTO[i];

    const templateMap = { 0: 'brandkit_listo', 2: 'postventa', 5: 'postventa' };
    const templateId = templateMap[i];
    let enviado = false;

    try {
      // Email via send-email Edge Function
      if (templateId && cliente?.email && isConfigured) {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            templateId,
            to: cliente.email,
            params: { nombre: cliente.nombre, dias: i === 5 ? 30 : 7, portalUrl: `${window.location.origin}/portal` },
          },
        });
        if (!error) enviado = true;
      }
      // WhatsApp
      if (cliente?.telefono && isConfigured) {
        const { error } = await supabase.functions.invoke('send-meta-message', {
          body: {
            canal: 'whatsapp',
            destinatario: cliente.telefono,
            texto: `✦ *Feria Design Studio*\n\n${paso.title}\n${paso.desc}`,
            conv_id: `wa_${cliente.telefono}`,
            nombre: cliente.nombre,
          },
        });
        if (!error) enviado = true;
      }
      // Registrar en recordatorios aunque no haya email/WA
      if (isConfigured) {
        await supabase.from('recordatorios').insert([{
          cliente_email:    cliente.email || '',
          cliente_nombre:   cliente.nombre,
          tipo:             `postventa_paso_${i}`,
          enviado:          enviado,
          mensaje_email:    `${paso.title} — ${cliente.nombre}`,
          mensaje_wp:       `${paso.title}\n${paso.desc}`,
          enviar_at:        new Date().toISOString(),
        }]);
      }
    } catch (e) {
      console.warn('sendStep error:', e.message);
    }

    setSent(p => ({ ...p, [i]: 'done' }));
    showToast(
      enviado
        ? `${paso.title} enviado a ${cliente.nombre}`
        : `${paso.title} registrado — configura email del cliente para enviar`,
      paso.iconLabel
    );
  };

  const activarTodo = async () => {
    if (!clienteId) { showToast('Selecciona un cliente', '⚠'); return; }
    const selectedSteps = FLUJO_AUTO.map((_, i) => i).filter(i => activeSteps[i]);
    if (!selectedSteps.length) { showToast('Selecciona al menos un paso de post-venta', '⚠'); return; }
    setActivado(true);
    showToast(`Activando ${selectedSteps.length} pasos · ${cliente?.nombre}`, '⚡');
    // Enviar paso 0 inmediatamente (email cierre)
    if (selectedSteps.includes(0)) await sendStep(0);
    // Los demás seleccionados se programan como recordatorios
    if (isConfigured && cliente?.email) {
      for (const i of selectedSteps.filter(step => step !== 0)) {
        const delay = Number(customDelays[i] || 1);
        const enviarAt = new Date(Date.now() + delay * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('recordatorios').insert([{
          cliente_email:    cliente.email,
          cliente_whatsapp: cliente.whatsapp || '',
          cliente_nombre:   cliente.nombre,
          tipo:             `postventa_paso_${i}`,
          enviar_at:        enviarAt,
          enviado:          false,
          mensaje_email:    `${FLUJO_AUTO[i].title} — ${cliente.nombre}`,
          mensaje_wp:       `Feria Design · ${FLUJO_AUTO[i].title}\n${FLUJO_AUTO[i].desc}`,
        }]);
      }
    }
    showToast(`Secuencia de ${selectedSteps.length} pasos activada · los mensajes se enviarán automáticamente`, '⚡');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:520, maxWidth:'93vw', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--gold)', marginBottom:4 }}>Activar secuencia post-venta</div>
        <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:20 }}>Todos los pasos vienen activos por defecto. Desmarca los que no quieras programar.</div>

        {/* Selector cliente */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Cliente</div>
          <select value={clienteId} onChange={e => setClienteId(e.target.value)}
            style={{ width:'100%', padding:'9px 13px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' }}>
            <option value="">— Selecciona cliente —</option>
            {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} · etapa {c.stage}</option>)}
          </select>
        </div>

        {/* Pasos */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {FLUJO_AUTO.map((paso, i) => {
            const enabled = activeSteps[i];
            const Icon = paso.icon;
            const ok      = enabled && (sent[i] === 'done' || activado);
            const sending = sent[i] === 'sending';
            return (
              <div key={i} style={{ background:'var(--s3)', border:`1px solid ${ok ? paso.color+'44': enabled ? 'var(--border-s)' : 'rgba(255,255,255,.04)'}`, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:12, transition:'border-color .2s, opacity .2s', opacity: enabled ? 1 : .48 }}>
                <button
                  type="button"
                  onClick={() => toggleStep(i)}
                  title={enabled ? 'Desactivar paso' : 'Activar paso'}
                  aria-label={enabled ? `Desactivar ${paso.title}` : `Activar ${paso.title}`}
                  aria-pressed={enabled}
                  style={{ width:24, height:24, border:'none', background:'transparent', color: enabled ? paso.color : 'var(--text-d)', display:'flex', alignItems:'center', justifyContent:'center', padding:0, cursor: activado ? 'default' : 'pointer', flexShrink:0 }}
                >
                  {enabled ? <SquareCheck size={18} strokeWidth={1.9} /> : <Square size={18} strokeWidth={1.7} />}
                </button>
                <div style={{ width:28, height:28, borderRadius:'50%', background:`${paso.color}20`, color:paso.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
                  {ok ? <CheckCircle2 size={14} strokeWidth={2} /> : sending ? '…' : <Icon size={14} strokeWidth={1.8} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:500 }}>{paso.title}</span>
                    <span style={{ fontSize:9, color:'var(--text-d)', background:'var(--s2)', padding:'1px 6px', borderRadius:10, border:'1px solid var(--border-s)' }}>{paso.delay}</span>
                    <input disabled={!enabled || activado} type='number' min='0' value={customDelays[i]} onChange={e=>setCustomDelays(arr=>arr.map((d,idx)=>idx===i?e.target.value:d))} title='Días después de entrega' style={{ width:44, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:6, padding:'2px 5px', color:'var(--text)', fontSize:9, opacity: enabled ? 1 : .5 }} />
                    {!enabled && <span style={{ fontSize:9, color:'var(--text-d)', fontWeight:500 }}>Desactivado</span>}
                    {ok && <span style={{ fontSize:9, color:paso.color, fontWeight:500 }}>Programado</span>}
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-d)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{paso.desc}</div>
                </div>
                <button disabled={!enabled || ok || sending} onClick={() => sendStep(i)}
                  style={{ fontSize:10, padding:'5px 10px', borderRadius:6, border:`1px solid ${ok || !enabled ? 'var(--border-s)' : paso.color+'66'}`, background:ok || !enabled ? 'transparent' : `${paso.color}15`, color:ok || !enabled ? 'var(--text-d)' : paso.color, cursor:(!enabled||ok||sending)?'default':'pointer', fontFamily:'inherit', flexShrink:0, transition:'all .15s', display:'inline-flex', alignItems:'center', gap:5 }}>
                  {ok ? <CheckCircle2 size={12} strokeWidth={2} /> : sending ? null : <Send size={12} strokeWidth={1.8} />}
                  {ok ? 'Programado' : sending ? '…' : 'Enviar'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cerrar</button>
          <button onClick={activarTodo} disabled={activado || activeCount === 0}
            style={{ background:activado?'transparent':activeCount === 0 ? 'var(--s3)' : 'var(--gold)', color:activado?'var(--green)':activeCount === 0 ? 'var(--text-d)' : '#000', border:activado?'1px solid var(--green)':activeCount === 0 ? '1px solid var(--border-s)' : 'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:activado || activeCount === 0 ? 'default':'pointer', fontFamily:'inherit', transition:'all .2s', display:'inline-flex', alignItems:'center', gap:8 }}>
            {activado ? <BadgeCheck size={14} strokeWidth={2} /> : <Zap size={14} strokeWidth={2} />}
            {activado ? 'Secuencia activa' : `Activar ${activeCount} pasos seleccionados`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function PostVenta() {
  const { data, showToast, demoMode } = useApp();
  const [tab, setTab]           = useState('pipeline');
  const [npsVal, setNpsVal]     = useState(null);
  const [showModal, setShowModal] = useState(false);

  const completados = data.clientes.filter(c => c.stage >= 9);
  const tabs = [
    { id:'pipeline',      label:'Pipeline',        icon: BadgeCheck },
    { id:'flujo',         label:'Flujo automático',icon: Zap },
    { id:'reviews',       label:'Reviews · NPS',   icon: Star },
    { id:'testimoniales', label:'Testimoniales',   icon: MessageCircle },
    { id:'referidos',     label:'Referidos',       icon: Handshake },
    { id:'mantenimiento', label:'Mantenimiento',   icon: Gem },
  ];

  const npsColor = npsVal === null ? '' : npsVal >= 9 ? 'var(--green)' : npsVal >= 7 ? 'var(--gold)' : 'var(--red)';
  const npsLabel = npsVal === null ? '' : npsVal >= 9 ? 'Promotor' : npsVal >= 7 ? 'Neutral' : 'Detractor';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)' }}>
        <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:18 }}>
          Post-venta <span style={{ color:'var(--gold)', fontStyle:'italic' }}>· Retención</span>
        </div>
        <Button variant="gold" onClick={() => setShowModal(true)}><Zap size={14} strokeWidth={2} /> Activar secuencia</Button>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', padding:'0 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', overflowX:'auto' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize:11, fontWeight:500, padding:'10px 14px', cursor:'pointer', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:7,
            color: tab===t.id ? 'var(--gold)' : 'var(--text-d)',
            borderBottom: tab===t.id ? '2px solid var(--gold)' : '2px solid transparent',
            background:'transparent', border:'none', fontFamily:'inherit',
          }}><Icon size={13} strokeWidth={1.8} />{t.label}</button>
          );
        })}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'18px 20px' }}>

        {/* ══ PIPELINE ══ */}
        {tab==='pipeline' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
              {[
                { l:'En post-venta',     v:completados.length+2, c:'var(--gold)'  },
                { l:'Reviews recibidos', v:3,                     c:'var(--green)' },
                { l:'NPS promedio',      v:'4.9',                 c:'var(--text)'  },
                { l:'Referidos activos', v:2,                     c:'var(--blue)'  },
              ].map(s => (
                <Card key={s.l} style={{ textAlign:'center', padding:'12px 14px' }}>
                  <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:22, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{s.l}</div>
                </Card>
              ))}
            </div>

            <SectionLabel>Clientes en secuencia post-venta</SectionLabel>
            {[...completados, ...data.clientes.filter(c=>c.stage>=7&&c.stage<9).slice(0,2)].map(c => {
              const acciones = { 9:'Brand Kit Portal enviado · solicitar review', 10:'Review recibido · ofrecer mantenimiento' };
              const accion = acciones[c.stage] || 'Completar secuencia';
              return (
                <Card key={c.id} style={{ padding:'12px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
                  onClick={() => showToast(`${c.nombre} · ${accion}`, '◆')}>
                  <div style={{ width:3, height:40, borderRadius:2, background:c.color, flexShrink:0 }} />
                  <div style={{ width:34, height:34, borderRadius:'50%', background:`${c.color}22`, color:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
                    {c.nombre.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{accion}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    <Badge color={c.stage>=9?'green':'warning'}>{c.stage>=9?'Post-venta':'Completando'}</Badge>
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setShowModal(true); }}>Secuencia</Button>
                  </div>
                </Card>
              );
            })}
            {completados.length===0 && data.clientes.filter(c=>c.stage>=7).length===0 && (
              <div style={{ textAlign:'center', padding:32, color:'var(--text-d)', fontSize:12 }}>
                Ningún cliente ha completado el proyecto aún.<br/>Los clientes aparecen aquí al llegar a la etapa Brand Kit.
              </div>
            )}
          </>
        )}

        {/* ══ FLUJO AUTOMÁTICO ══ */}
        {tab==='flujo' && (
          <div style={{ maxWidth:640 }}>
            <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.7, marginBottom:18, background:'var(--gold-faint)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 16px' }}>
              <strong style={{ color:'var(--gold)' }}>Regla de oro de Feria:</strong> automatiza el seguimiento, no la relación. Los flujos hacen el trabajo repetitivo; tú apareces cuando hay señal real de interés.
            </div>

            {/* Flujo 1: del proyecto al cierre */}
            <SectionLabel>Del anuncio al cierre — sin intervención manual</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:1, marginBottom:24 }}>
              {FLUJO_AUTO.map((paso, i) => {
                const Icon = paso.icon;
                return (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:`${paso.color}18`, border:`1px solid ${paso.color}44`, color:paso.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}><Icon size={15} strokeWidth={1.8} /></div>
                    {i < FLUJO_AUTO.length-1 && <div style={{ width:1, height:20, background:'var(--border-s)', marginTop:2, marginBottom:2 }} />}
                  </div>
                  <div style={{ flex:1, paddingBottom:i<FLUJO_AUTO.length-1?16:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{paso.title}</span>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:`${paso.color}18`, color:paso.color, border:`1px solid ${paso.color}30` }}>{paso.delay}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.5 }}>{paso.desc}</div>
                  </div>
                  <button onClick={() => { showToast(`${paso.title} · simulando envío`, paso.iconLabel); }}
                    style={{ fontSize:10, padding:'5px 10px', borderRadius:6, border:`1px solid ${paso.color}44`, background:`${paso.color}10`, color:paso.color, cursor:'pointer', fontFamily:'inherit', flexShrink:0, marginTop:4, display:'inline-flex', alignItems:'center', gap:5 }}>
                    <Send size={12} strokeWidth={1.8} />
                    Probar
                  </button>
                </div>
                );
              })}
            </div>

            {/* Flujos adicionales */}
            <SectionLabel>Nurturing de leads que no agendaron</SectionLabel>
            <Card style={{ padding:'14px 16px', marginBottom:16 }}>
              {[
                {s:'Sin respuesta',       a:'→ Día 2: caso de éxito relevante', c:'var(--gold)'},
                {s:'Día 2 sin respuesta', a:'→ Día 5: pregunta directa',        c:'var(--blue)'},
                {s:'Día 5 sin respuesta', a:'→ Día 10: oferta limitada',        c:'var(--coral)'},
                {s:'Sin respuesta final', a:'→ Lista fría',                     c:'var(--text-d)'},
              ].map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border-s)', fontSize:11 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:f.c, flexShrink:0 }} />
                  <span style={{ color:'var(--text-m)' }}>{f.s}</span>
                  <span style={{ color:'var(--text-d)' }}>{f.a}</span>
                </div>
              ))}
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:8, fontStyle:'italic' }}>Corre solo. Tú solo apareces cuando alguien responde.</div>
            </Card>

            <SectionLabel>Reactivación de propuestas sin respuesta</SectionLabel>
            <Card style={{ padding:'14px 16px' }}>
              {[
                {s:'Propuesta enviada',      a:'→ 48h sin abrir → recordatorio',     c:'var(--gold)'},
                {s:'Abrió pero no respondió',a:'→ alerta a Sele',                    c:'var(--blue)'},
                {s:'72h sin respuesta',      a:'→ email con urgencia',               c:'var(--red)'},
              ].map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border-s)', fontSize:11 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:f.c, flexShrink:0 }} />
                  <span style={{ color:'var(--text-m)' }}>{f.s}</span>
                  <span style={{ color:'var(--text-d)' }}>{f.a}</span>
                </div>
              ))}
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:8, fontStyle:'italic' }}>La plataforma te avisa exactamente quién abrió la propuesta y cuándo.</div>
            </Card>
          </div>
        )}

        {/* ══ REVIEWS / NPS ══ */}
        {tab==='reviews' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
            <div>
              <SectionLabel>Simulador NPS</SectionLabel>
              <Card style={{ padding:'20px', marginBottom:16 }}>
                <div style={{ fontSize:12, marginBottom:16 }}>¿Con qué probabilidad recomendarías Feria Design a un colega o amigo? <span style={{ color:'var(--text-d)' }}>(1–10)</span></div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNpsVal(n)} style={{
                      width:38, height:38, borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                      background: npsVal===n ? (n>=9?'var(--green)':n>=7?'var(--gold)':'var(--red)') : 'var(--s3)',
                      color: npsVal===n ? 'var(--dark)' : 'var(--text-m)',
                      border: `1px solid ${npsVal===n ? 'transparent' : 'var(--border-s)'}`,
                    }}>{n}</button>
                  ))}
                </div>
                {npsVal !== null && (
                  <div style={{ padding:'12px 16px', borderRadius:10, background:`${npsColor}12`, border:`1px solid ${npsColor}30` }}>
                    <div style={{ fontSize:14, fontWeight:500, color:npsColor, marginBottom:4 }}>{npsLabel}</div>
                    <div style={{ fontSize:11, color:'var(--text-m)' }}>
                      {npsVal>=9 ? 'Cliente promotor — activar secuencia de referido automáticamente.' : npsVal>=7 ? 'Cliente neutro — hacer seguimiento personal.' : 'Cliente detractor — alerta a Sele, intervención inmediata.'}
                    </div>
                  </div>
                )}
              </Card>

              <SectionLabel>Reviews recientes</SectionLabel>
              {['ArtizWed · ★★★★★ — La identidad habla por sí sola.', 'ARKES · ★★★★★ — Proceso impecable de principio a fin.', 'Sultán de los Andes · ★★★★★ — Marca que compite en cualquier estantería.'].map(r => (
                <Card key={r} style={{ padding:'12px 14px', marginBottom:8, fontSize:12 }}>
                  <div style={{ color:'var(--gold)', fontSize:10, marginBottom:3 }}>{'★★★★★'}</div>
                  <div style={{ color:'var(--text-m)' }}>{r.split(' — ')[1]}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:4 }}>{r.split(' · ')[0]}</div>
                </Card>
              ))}
            </div>

            <div>
              <SectionLabel>Métricas NPS</SectionLabel>
              <Card style={{ padding:'16px' }}>
                {[
                  { l:'NPS promedio', v:'4.9 / 5', c:'var(--gold)' },
                  { l:'Promotores',  v:'87%',      c:'var(--green)'},
                  { l:'Neutros',     v:'10%',      c:'var(--text-m)'},
                  { l:'Detractores', v:'3%',       c:'var(--red)'  },
                ].map(m => (
                  <div key={m.l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-s)', fontSize:12 }}>
                    <span style={{ color:'var(--text-d)' }}>{m.l}</span>
                    <span style={{ fontWeight:600, color:m.c }}>{m.v}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ══ TESTIMONIALES ══ */}
        {tab==='testimoniales' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {(demoMode ? TESTIMONIALS : []).map(t => (
                <Card key={t.author} style={{ padding:'18px', borderLeft:`3px solid ${t.color}` }}>
                  <div style={{ display:'flex', gap:2, marginBottom:10 }}>
                    {Array(t.stars).fill(0).map((_,i) => <span key={i} style={{ color:'var(--gold)', fontSize:12 }}>★</span>)}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-m)', lineHeight:1.7, fontStyle:'italic', marginBottom:12 }}>"{t.quote}"</div>
                  <div style={{ fontSize:11, fontWeight:500 }}>{t.author}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{t.project}</div>
                </Card>
              ))}
            </div>
            <div style={{ marginTop:16, padding:'12px 16px', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, fontSize:11, color:'var(--text-d)', lineHeight:1.6 }}>
              Fuente: Google Reviews · Actualizado automáticamente desde el flujo post-venta.
            </div>
          </>
        )}

        {/* ══ REFERIDOS ══ */}
        {tab==='referidos' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.6, marginBottom:16 }}>
                El referido es la fuente más barata de nuevos clientes. Automatizarlo lo hace consistente.
              </div>
              <SectionLabel>Clientes con potencial de referido</SectionLabel>
              <Card>
                {data.clientes.filter(c=>c.stage>=9).slice(0,5).map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border-s)' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:`${c.color}22`, color:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>
                      {c.nombre.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>{c.nombre}</div>
                      <div style={{ fontSize:10, color:'var(--text-d)' }}>NPS alto · cliente satisfecho</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => showToast(`Email de referido enviado a ${c.nombre}`, '🔗')}><Handshake size={12} strokeWidth={1.8} /> Invitar</Button>
                  </div>
                ))}
              </Card>
            </div>

            <div>
              <SectionLabel>Ciclo de vida del cliente</SectionLabel>
              <Card>
                {[
                  { fase:'Proyecto único',       val:'$2,800',  sub:'primera vez',    c:'var(--text-m)' },
                  { fase:'+ Mantenimiento 12m',  val:'$5,960',  sub:'+$530/mes',      c:'var(--gold)'   },
                  { fase:'+ Referido convierte', val:'$9,060',  sub:'+1 cliente',     c:'var(--green)'  },
                  { fase:'+ Brand refresh',      val:'$14,260', sub:'evolución marca', c:'var(--teal)'  },
                ].map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-s)' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:`${r.c}22`, color:r.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:600 }}>{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:500 }}>{r.fase}</div>
                      <div style={{ fontSize:10, color:'var(--text-d)' }}>{r.sub}</div>
                    </div>
                    <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:13, color:r.c }}>{r.val}</div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ══ MANTENIMIENTO ══ */}
        {tab==='mantenimiento' && (
          <>
            <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:16, lineHeight:1.6 }}>
              El mantenimiento es el upsell natural después de entregar. El cliente ya confía en Feria — ofrecerle continuidad es lógico y valioso para ambos.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
              {MANT_TIERS.map(m => (
                <Card key={m.name} highlight={m.featured} style={{ background: m.featured?'var(--gold-faint)':'var(--s1)', cursor:'pointer', transition:'all .15s', border: m.featured?'1px solid var(--border-m)':'1px solid var(--border-s)' }}
                  onClick={() => showToast(`Ofreciendo plan ${m.name} · ${m.price}/mes`, '◈')}>
                  {m.featured && <div style={{ fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--gold)', fontWeight:600, marginBottom:6 }}>Más popular</div>}
                  <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
                  <div style={{ fontWeight:600, letterSpacing:'-0.02em', fontSize:24, marginTop:6, marginBottom:2 }}>{m.price}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginBottom:12 }}>{m.period} · factura mensual</div>
                  {m.feats.map(f => (
                    <div key={f} style={{ fontSize:11, color:'var(--text-m)', padding:'4px 0', borderBottom:'1px solid var(--border-s)', display:'flex', gap:6 }}>
                      <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                </Card>
              ))}
            </div>

            <SectionLabel>Clientes en mantenimiento activo</SectionLabel>
            <Card>
              {[
                { nombre:'ArtizWed',            plan:'Activo',   val:'$350/mes', color:'var(--coral)', desde:'3 meses' },
                { nombre:'Sultán de los Andes', plan:'Esencial', val:'$180/mes', color:'var(--green)', desde:'1 mes'   },
              ].map(m => (
                <div key={m.nombre} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border-s)' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:`${m.color}22`, color:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>
                    {m.nombre.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500 }}>{m.nombre}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)' }}>Plan {m.plan} · {m.desde}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--gold)' }}>{m.val}</div>
                </div>
              ))}
              <div style={{ paddingTop:10, display:'flex', justifyContent:'space-between', fontSize:11 }}>
                <span style={{ color:'var(--text-d)' }}>Ingreso recurrente mensual</span>
                <span style={{ fontWeight:500, color:'var(--green)' }}>$530/mes</span>
              </div>
            </Card>
          </>
        )}

      </div>

      {/* MODAL */}
      {showModal && (
        <ModalSecuencia data={data} showToast={showToast} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
