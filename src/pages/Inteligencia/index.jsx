import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { buildMonthlyFinancialData } from '../../lib/operationalData';
import { supabase, isConfigured } from '../../lib/supabase';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FormattedResponse, TypingDots } from '../../features/inteligencia/components/InteligenciaChat';
import { calculateStudioHealth } from '../../lib/studioHealth';

const C = { gold: 'var(--gold)', teal: 'var(--teal)', green: 'var(--green)', red: 'var(--red)', blue: 'var(--blue)', pink: 'var(--pink)', purple: 'var(--purple)' };

// Tooltip local para recharts inline
const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:'var(--text-d)', marginBottom:4 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color:p.color, fontWeight:500 }}>{p.name}: {typeof p.value==='number'?`$${p.value.toLocaleString()}`:p.value}</div>)}
    </div>
  );
};

// ── ANÁLISIS RÁPIDOS ──────────────────────────────────────────────
const ANALISIS_RAPIDOS = [
  { id: 'estado_general',   icon: '◈', label: 'Estado general',       desc: 'Diagnóstico ejecutivo del estudio' },
  { id: 'salud_financiera', icon: '❋', label: 'Salud financiera',      desc: 'Ingresos, gastos y proyecciones' },
  { id: 'riesgo_clientes',  icon: '◉', label: 'Riesgo en clientes',    desc: 'Detectar clientes en riesgo' },
  { id: 'oportunidades',    icon: '✦', label: 'Oportunidades',         desc: 'Acciones para aumentar ingresos' },
  { id: 'carga_equipo',     icon: '◧', label: 'Carga del equipo',      desc: 'Capacidad y distribución de trabajo' },
  { id: 'prediccion_mes',   icon: '⊙', label: 'Predicción del mes',    desc: 'Proyección basada en datos reales' },
];

// ── CONSTRUIR CONTEXTO ────────────────────────────────────────────
function buildContext(data) {
  const ingresos    = data.cobros.filter(c => c.status === 'paid').reduce((a,c) => a + (c.monto||0), 0);
  const porCobrar   = data.cobros.filter(c => c.status !== 'paid').reduce((a,c) => a + (c.monto||0), 0);
  const totalGastos = data.gastos.reduce((a,g) => a + (g.monto||0), 0);
  const meta        = data.studio.meta;
  const pctMeta     = Math.round(ingresos / (meta.objetivo || 1) * 100);
  const health      = calculateStudioHealth({ meta, ingresos, gastos:totalGastos, porCobrar, deudas:data.deudas || [] });
  const internalMessages = data.projectChatMessages || [];
  const projectMessages  = internalMessages.filter(m => String(m.source || 'project') === 'project').length;
  const directMessages   = internalMessages.filter(m => m.source === 'direct').length;
  const generalMessages  = internalMessages.filter(m => m.source === 'general').length;

  return `FERIA DESIGN STUDIO — Datos en tiempo real ${new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}

ESTUDIO: ${data.studio.name} | Roles activos: dirección, estrategia, diseño y producción
Sub-marcas: Feria Design (branding general) + Brand & Legacy (fotógrafos/videógrafos)
Mercados: Ecuador, LATAM, España, USA | Metodología: Método Ψ

FINANZAS:
- Meta mensual: $${(meta.objetivo||0).toLocaleString()} | Cobrado: $${ingresos.toLocaleString()} (${pctMeta}%)
- Por cobrar: $${porCobrar.toLocaleString()} | Gastos: $${totalGastos.toLocaleString()}
- Margen neto: $${(ingresos-totalGastos).toLocaleString()} | Días restantes: ${meta.diasRestantes}
- Cobros vencidos: ${data.cobros.filter(c=>c.status==='overdue').length}
- Cobros pendientes: ${data.cobros.filter(c=>c.status==='pending').length}
- Salud del estudio: ${health.status.label} (${health.score}/100). Dimension mas sensible: ${health.worst?.label} - ${health.worst?.note}
- Pasivo pendiente: $${health.debt.pending.toLocaleString()} | Cuotas mensuales de deuda: $${health.debt.monthlyQuota.toLocaleString()}

CLIENTES (${data.clientes.length} total):
${data.clientes.map(c=>`- ${c.nombre} | etapa ${c.stage}/10 | $${c.monto} | ${c.brand==='bl'?'Brand & Legacy':'Feria Design'}`).join('\n')}

LEADS (${data.leads.length} total):
- Calientes: ${data.leads.filter(l=>l.status==='caliente').length} | Tibios: ${data.leads.filter(l=>l.status==='tibio').length} | Fríos: ${data.leads.filter(l=>l.status==='frío').length}
${data.leads.map(l=>`- ${l.nombre} (${l.status}, ${l.dias}d sin respuesta)`).join('\n')}

PROYECTOS EN PRODUCCIÓN:
${data.proyectos.map(p=>{
  const c = data.clientes.find(cl=>cl.id===(p.clienteId||p.cliente_id));
  return `- ${c?.nombre||'?'}: interno ${p.pctInterno||p.pct_interno||0}% / cliente ${p.pctCliente||p.pct_cliente||0}% | ${p.diasEntrega||p.dias_entrega||0}d entrega`;
}).join('\n')}

GASTOS FIJOS:
${data.gastos.map(g=>`- ${g.nombre}: $${g.monto} [${g.status}]`).join('\n')}
Total gastos: $${totalGastos.toLocaleString()}

DEUDAS Y PASIVOS:
${(data.deudas || []).map(d=>`- ${d.nombre || d.concepto || d.acreedor}: saldo $${Number(d.saldo_actual ?? d.monto ?? 0).toLocaleString()} | original $${Number(d.deuda_original || d.monto || 0).toLocaleString()} | cuota $${Number(d.cuota_mensual || 0).toLocaleString()}`).join('\n') || '- Sin deudas registradas'}

COMUNICACION INTERNA:
- Mensajes totales del equipo: ${internalMessages.length}
- Chats de proyecto: ${projectMessages} mensajes | chats personales: ${directMessages} | canal general: ${generalMessages}
- La IA puede usar conversaciones internas, finanzas, proyectos, contratos, cobros, briefs y datos operativos presentes en Feria OS para emitir informes precisos.

ALERTAS ACTIVAS: ${data.notificaciones.filter(n=>!n.leida).length}
${data.notificaciones.filter(n=>!n.leida).slice(0,5).map(n=>`- ${n.titulo}`).join('\n')}`.trim();
}

// ── PROMPTS ───────────────────────────────────────────────────────
const PROMPTS = {
  estado_general: `Analiza el estado general de Feria Design Studio. Dame:
1. Diagnóstico ejecutivo en 2-3 párrafos
2. Los 3 puntos más fuertes esta semana
3. Las 3 alertas más importantes
4. Una recomendación de acción inmediata
Sé directo, usa los datos reales. Habla como consultor experto en estudios de diseño.`,

  salud_financiera: `Analiza la salud financiera de Feria Design Studio. Dame:
1. Estado financiero actual (bueno/regular/crítico y por qué)
2. ¿Hay riesgo de liquidez este mes? Análisis del flujo de caja
3. ¿Se alcanza la meta mensual? Proyección precisa
4. Los 2-3 movimientos financieros más urgentes
5. Una advertencia concreta si hay algo preocupante
Usa los números reales. Sé preciso.`,

  riesgo_clientes: `Analiza el riesgo en la cartera de clientes. Dame:
1. Clientes en riesgo de retraso o problema (por etapa y porcentaje)
2. Clientes cerca del cierre que necesitan atención prioritaria
3. Señales de alerta en el pipeline
4. Recomendaciones específicas por cliente en riesgo
Menciona clientes por nombre.`,

  oportunidades: `Identifica oportunidades de crecimiento para Feria Design Studio. Dame:
1. Las 3 mejores oportunidades de ingresos en los próximos 30 días
2. Qué leads activar ya y cómo
3. Oportunidades de upsell con clientes actuales
4. Una oportunidad de mediano plazo no aprovechada
Sé específico y accionable.`,

  carga_equipo: `Analiza la carga del equipo. Dame:
1. Carga actual por rol y miembro del equipo
2. ¿Hay riesgo de burnout o cuello de botella?
3. Proyectos en riesgo por capacidad
4. Recomendación de redistribución si es necesario
5. ¿Es momento de contratar o subcontratar?`,

  prediccion_mes: `Predice el cierre del mes. Dame:
1. Proyección de ingresos al cierre (escenario conservador y optimista)
2. ¿Se alcanza la meta? ¿Con cuánto margen?
3. Variables que pueden mejorar o empeorar la proyección
4. Qué debe pasar esta semana para cerrar bien
5. Benchmark implícito con un estudio saludable de este tamaño
Sé honesto aunque el panorama no sea ideal.`,
};

// ── PROMPT DEL INFORME COMPLETO ───────────────────────────────────
const INFORME_COMPLETO_PROMPT = `Genera un INFORME EJECUTIVO COMPLETO de Feria Design Studio. Este informe debe ser como el que entregaría un consultor senior de negocios con especialización en estudios creativos y agencias de diseño. Estructura:

## 1. RESUMEN EJECUTIVO
Diagnóstico de una página: estado actual, fortalezas, riesgos y oportunidad principal.

## 2. ANÁLISIS FINANCIERO
- Estado actual vs meta
- Proyección de cierre de mes (3 escenarios: pesimista, realista, optimista)
- Análisis de márgenes y rentabilidad
- Riesgos de liquidez
- Recomendaciones financieras prioritarias

## 3. ANÁLISIS DE CLIENTES Y PIPELINE
- Evaluación de cada cliente activo por etapa y riesgo
- Clientes en riesgo de fuga o retraso
- Oportunidades de expansión en clientes actuales
- Salud del pipeline por sub-marca

## 4. RENDIMIENTO DE LEADS Y MARKETING
- Conversión actual y benchmark de industria
- Canales más efectivos
- Leads que necesitan acción inmediata
- Recomendaciones de marketing para los próximos 30 días

## 5. CAPACIDAD Y EQUIPO
- Carga de trabajo por persona
- Cuellos de botella detectados
- Riesgo operativo
- Recomendación de estructura para el crecimiento

## 6. PREDICCIONES Y PROYECCIONES
- Proyección de ingresos próximos 3 meses
- Proyección de cartera de clientes
- Riesgos emergentes a vigilar
- Oportunidades de crecimiento identificadas

## 7. PLAN DE ACCIÓN PRIORITARIO
- 3 acciones críticas para esta semana (con responsable sugerido)
- 5 acciones para este mes
- 3 iniciativas estratégicas para los próximos 90 días

## 8. INDICADORES CLAVE A MONITOREAR
Lista los 8-10 KPIs más importantes para Feria Design con sus valores actuales y targets recomendados.

Usa los datos reales del estudio. Sé específico, menciona clientes y números concretos. Este es un documento de toma de decisiones, no un análisis genérico.`;

// ── LLAMADA A CLAUDE (via Edge Function segura) ───────────────────
function explainClaudeProxyError(error) {
  const raw = String(error?.message || error || '');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'este origen';

  if (raw.includes('Failed to send a request') || raw.includes('FunctionsFetchError') || raw.includes('fetch')) {
    return `No pude conectar con la Edge Function claude-proxy desde ${origin}. Lo más probable es CORS o deploy pendiente: la función debe estar desplegada y permitir este origen.`;
  }

  if (raw.includes('No autorizado') || raw.includes('403') || raw.includes('JWT')) {
    return 'La Edge Function respondió, pero rechazó la sesión. Inicia sesión con una cuenta del equipo autorizada o revisa el rol en profiles.';
  }

  if (raw.includes('ANTHROPIC_API_KEY')) {
    return 'La Edge Function respondió, pero no encuentra ANTHROPIC_API_KEY en sus secrets.';
  }

  if (raw.includes('Modelo no permitido') || raw.includes('model')) {
    return raw;
  }

  return raw || 'No se pudo obtener respuesta de la IA.';
}

async function callClaudeSecure(messages, system, maxTokens = 1500) {
  if (!isConfigured) {
    // Fallback directo si no hay Supabase (modo local)
    throw new Error('Configura Supabase y despliega claude-proxy para usar la IA');
  }

  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    },
  });

  if (error) throw new Error(explainClaudeProxyError(error));
  if (data?.error) throw new Error(explainClaudeProxyError(data.error));
  return data?.content?.[0]?.text || 'Sin respuesta';
}

// ── FORMATO RESPUESTA ─────────────────────────────────────────────
export default function Inteligencia() {
  const { data, ingresos, porCobrar, showToast } = useApp();
  const [tab, setTab]               = useState('chat');
  const [mensajes, setMensajes]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [activeAnalisis, setActive] = useState(null);
  const [informe, setInforme]       = useState(null);
  const [informeLoading, setIL]     = useState(false);
  const [informeFecha, setIF]       = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes, loading]);

  const contexto = buildContext(data);

  const SYSTEM = `Eres el analista de inteligencia de negocio de Feria Design Studio, un estudio de branding premium con base en Ecuador que opera en LATAM, España y USA.

Tu rol: consultor experto en diseño estratégico y gestión de estudios creativos. Conoces el Método Ψ del estudio (descubrimiento emocional antes del diseño), el modelo de cobro 60/40, y los mercados objetivo de cada sub-marca.

Responde siempre en español. Sé directo, específico y usa los datos reales. Menciona clientes y números concretos cuando sea relevante. Puedes analizar toda la informacion operativa disponible en Feria OS: clientes, briefs, contratos, cobros, deudas, proyectos, chats internos, mensajes y calendario. Tu tono informa al estudio; no juzga a personas.

DATOS ACTUALES:
${contexto}`;

  const callClaude = async (pregunta, tipo = 'custom') => {
    const prompt = tipo !== 'custom' && PROMPTS[tipo] ? PROMPTS[tipo] : pregunta;
    setLoading(true);
    setActive(tipo);
    setMensajes(prev => [...prev, { role:'user', content:pregunta, tipo }]);

    try {
      const text = await callClaudeSecure(
        [{ role:'user', content: prompt }],
        SYSTEM,
        1500
      );
      setMensajes(prev => [...prev, { role:'assistant', content:text, timestamp:new Date() }]);
    } catch (err) {
      setMensajes(prev => [...prev, {
        role: 'assistant',
        content: `⚠ ${err.message}\n\nChecklist técnico:\n1. Desplegar o redesplegar la Edge Function: \`supabase functions deploy claude-proxy --project-ref dldykrsikwbibiegtyyb\`\n2. Confirmar que CORS permite el origen actual: \`${window.location.origin}\`\n3. Verificar que el secret \`ANTHROPIC_API_KEY\` esté configurado en Supabase.\n4. Confirmar que la cuenta tenga rol de equipo autorizado: admin, crm o creativo.`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const generarInforme = async () => {
    setIL(true);
    setInforme(null);
    showToast('Generando informe completo — puede tardar 30 segundos…', '⊙');

    try {
      const text = await callClaudeSecure(
        [{ role:'user', content: INFORME_COMPLETO_PROMPT }],
        SYSTEM,
        4000
      );
      setInforme(text);
      setIF(new Date());
      showToast('Informe generado', '✦');
    } catch (err) {
      showToast(`Error: ${err.message}`, '⚠');
    } finally {
      setIL(false);
    }
  };

  const descargarInforme = () => {
    if (!informe) return;
    const fecha = informeFecha?.toLocaleDateString('es-ES');
    const blob = new Blob([`INFORME EJECUTIVO — FERIA DESIGN STUDIO\n${fecha}\n\n${informe}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-feria-os-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', flexShrink:0 }}>
        <div style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.03em' }}>
          Inteligencia <span style={{ color:'var(--text-m)', fontWeight:400 }}>· IA</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontSize:10, color:'var(--text-d)', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:20, padding:'4px 10px', display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:C.green }} />
            Claude Sonnet · Datos en tiempo real
          </div>
          {/* TABS */}
          <div style={{ display:'flex', background:'var(--s2)', borderRadius:8, padding:2, gap:2 }}>
            {[['chat','Chat'],['informe','Informe']].map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)} style={{ background:tab===v?'var(--s3)':'transparent', border:'none', borderRadius:6, padding:'5px 14px', fontSize:11, cursor:'pointer', color:tab===v?'var(--text)':'var(--text-d)', fontFamily:'inherit' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>

        {/* ══ CHAT TAB ══ */}
        {tab === 'chat' && (
          <>
            {/* Sidebar */}
            <div style={{ width:248, flexShrink:0, borderRight:'1px solid var(--border-s)', display:'flex', flexDirection:'column', background:'var(--s1)', overflow:'hidden' }}>
              <div style={{ padding:'12px 12px 8px', borderBottom:'1px solid var(--border-s)' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)', marginBottom:10 }}>Análisis rápidos</div>
                {ANALISIS_RAPIDOS.map(a => (
                  <button key={a.id} onClick={() => callClaude(a.label, a.id)} disabled={loading}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, cursor:loading?'not-allowed':'pointer', textAlign:'left', width:'100%', marginBottom:4, background:activeAnalisis===a.id?`${C.gold}15`:'transparent', border:`1px solid ${activeAnalisis===a.id?C.gold+'40':'var(--border-s)'}`, color:activeAnalisis===a.id?C.gold:'var(--text-m)', opacity:loading?.6:1, fontFamily:'inherit', transition:'all .15s' }}
                    onMouseEnter={e => { if (!loading && activeAnalisis!==a.id) e.currentTarget.style.background='var(--s2)'; }}
                    onMouseLeave={e => { if (activeAnalisis!==a.id) e.currentTarget.style.background='transparent'; }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize:11, fontWeight:500 }}>{a.label}</div>
                      <div style={{ fontSize:9, color:'var(--text-d)', marginTop:1 }}>{a.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ padding:'10px 12px' }}>
                <button onClick={generarInforme} disabled={informeLoading}
                  style={{ width:'100%', background:`${C.gold}15`, border:`1px solid ${C.gold}40`, borderRadius:8, padding:'10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.gold, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  {informeLoading ? '⏳ Generando…' : '✦ Generar informe completo'}
                </button>
                {informe && (
                  <button onClick={() => setTab('informe')}
                    style={{ width:'100%', marginTop:6, background:`${C.green}10`, border:`1px solid ${C.green}30`, borderRadius:8, padding:'8px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.green }}>
                    Ver informe →
                  </button>
                )}
              </div>
              {mensajes.length > 0 && (
                <div style={{ padding:'0 12px 12px', marginTop:'auto' }}>
                  <button onClick={() => { setMensajes([]); setActive(null); }} style={{ width:'100%', background:'transparent', border:'1px solid var(--border-s)', borderRadius:7, padding:'6px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'var(--text-d)' }}>
                    Nueva conversación
                  </button>
                </div>
              )}
            </div>

            {/* Chat area */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div ref={chatRef} style={{ flex:1, overflow:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:20 }}>

                {mensajes.length === 0 && (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 20px' }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', border:`2px solid ${C.gold}55`, color:C.gold, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:16 }}>⊙</div>
                    <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', marginBottom:8 }}>
                      Analista de <span style={{ color:C.gold, fontWeight:500 }}>Feria OS</span>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-d)', lineHeight:1.7, maxWidth:420, marginBottom:28 }}>
                      Tengo acceso a todos los datos reales del estudio en tiempo real. Pregúntame lo que necesites o usa un análisis rápido del sidebar.
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, maxWidth:480 }}>
                      {['¿Qué clientes necesitan atención urgente?','¿Vamos a alcanzar la meta del mes?','¿Qué lead conviene priorizar hoy?','¿Hay riesgo de caja este mes?'].map(q => (
                        <button key={q} onClick={() => setInput(q)}
                          style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'var(--text-m)', textAlign:'left', lineHeight:1.4, transition:'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor=C.gold+'44'; e.currentTarget.style.background='var(--s3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-s)'; e.currentTarget.style.background='var(--s2)'; }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mensajes.map((m, i) => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', flexDirection:m.role==='user'?'row-reverse':'row' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:m.role==='user'?'var(--gold-faint)':'rgba(91,155,213,0.15)', color:m.role==='user'?C.gold:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:m.role==='user'?11:14, fontWeight:600 }}>
                      {m.role==='user'?'DA':'⊙'}
                    </div>
                    <div style={{ maxWidth:'78%', padding:'14px 18px', borderRadius:m.role==='user'?'16px 4px 16px 16px':'4px 16px 16px 16px', background:m.role==='user'?'var(--gold-faint)':'var(--s2)', border:`1px solid ${m.role==='user'?'var(--gold-faint)':'var(--border-s)'}` }}>
                      {m.role==='user' ? (
                        <div style={{ fontSize:13 }}>{m.content}</div>
                      ) : (
                        <FormattedResponse text={m.content} />
                      )}
                      {m.timestamp && <div style={{ fontSize:9, color:'var(--text-d)', marginTop:8, textAlign:'right' }}>{m.timestamp.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(91,155,213,0.15)', color:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>⊙</div>
                    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:'4px 16px 16px 16px' }}>
                      <TypingDots />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-s)', background:'var(--s1)', flexShrink:0 }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(input.trim()&&!loading){callClaude(input.trim());setInput('');}} }}
                    placeholder="Pregunta sobre clientes, finanzas, proyecciones, riesgos… (Enter para enviar)"
                    rows={2} disabled={loading}
                    style={{ flex:1, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'11px 14px', fontSize:12, color:'var(--text)', resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5, maxHeight:100 }} />
                  <button onClick={() => { if(input.trim()&&!loading){callClaude(input.trim());setInput('');} }} disabled={!input.trim()||loading}
                    style={{ background:input.trim()&&!loading?C.gold:'var(--gold-faint)', color:input.trim()&&!loading?'#0a0a0a':'rgba(237,232,223,.3)', border:'none', borderRadius:10, padding:'11px 20px', fontSize:13, fontWeight:600, cursor:input.trim()&&!loading?'pointer':'not-allowed', fontFamily:'inherit', flexShrink:0 }}>
                    {loading?'…':'→'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ INFORME TAB ══ */}
        {tab === 'informe' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border-s)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--s1)', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>Informe Ejecutivo Completo</div>
                {informeFecha && <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2 }}>Generado el {informeFecha.toLocaleDateString('es-ES',{day:'numeric',month:'long'})} a las {informeFecha.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {informe && (
                  <button onClick={descargarInforme} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 14px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'var(--text-m)' }}>
                    ↓ Descargar
                  </button>
                )}
                <button onClick={generarInforme} disabled={informeLoading}
                  style={{ background:C.gold, color:'#0a0a0a', border:'none', borderRadius:8, padding:'7px 16px', fontSize:11, fontWeight:600, cursor:informeLoading?'not-allowed':'pointer', fontFamily:'inherit', opacity:informeLoading?.7:1 }}>
                  {informeLoading ? '⏳ Generando…' : informe ? '↺ Regenerar' : '✦ Generar informe'}
                </button>
              </div>
            </div>

            <div style={{ flex:1, overflow:'auto', padding:'32px 40px' }}>
              {informeLoading && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:16 }}>
                  <TypingDots />
                  <div style={{ fontSize:13, color:'var(--text-d)', textAlign:'center', lineHeight:1.6 }}>
                    Claude está analizando todos los datos del estudio…<br/>
                    <span style={{ fontSize:11 }}>Esto puede tardar hasta 30 segundos</span>
                  </div>
                </div>
              )}

              {!informe && !informeLoading && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', textAlign:'center' }}>
                  <div style={{ fontSize:24, color:'var(--text)', marginBottom:16, fontWeight:600, letterSpacing:'-0.03em' }}>Informe Ejecutivo</div>
                  <div style={{ fontSize:13, color:'var(--text-d)', lineHeight:1.7, maxWidth:440, marginBottom:28 }}>
                    Claude analizará todos los datos reales del estudio — finanzas, clientes, pipeline, leads, equipo y marketing — y entregará un informe completo con diagnóstico, proyecciones y plan de acción.
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, maxWidth:420, marginBottom:28 }}>
                    {['Resumen ejecutivo','Análisis financiero','Pipeline de clientes','Predicciones 3 meses','Carga del equipo','Plan de acción 90 días'].map(s => (
                      <div key={s} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 12px', fontSize:11, color:'var(--text-m)', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ color:C.gold, fontSize:10 }}>✓</span>{s}
                      </div>
                    ))}
                  </div>
                  <button onClick={generarInforme}
                    style={{ background:C.gold, color:'#0a0a0a', border:'none', borderRadius:10, padding:'13px 32px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    ✦ Generar informe ahora
                  </button>
                </div>
              )}

              {informe && !informeLoading && (
                <div style={{ maxWidth:760, margin:'0 auto' }}>
                  {/* ── PANEL DE GRÁFICAS ANALÍTICAS ────────────────────────── */}
                  <div style={{ marginBottom:32 }}>
                    <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:16 }}>Visualización analítica · datos en tiempo real</div>

                    {/* KPIs rápidos */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                      {[
                        { l:'Ingresos mes',   v:`$${ingresos.toLocaleString()}`,                                           c:C.gold   },
                        { l:'Por cobrar',     v:`$${porCobrar.toLocaleString()}`,                                          c:porCobrar>0?C.red:C.green },
                        { l:'Proyectos',      v:data.proyectos.filter(p=>p.pctInterno<100).length,                         c:C.teal   },
                        { l:'Leads pipeline', v:data.leads.length,                                                         c:C.blue   },
                      ].map(k => (
                        <div key={k.l} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                          <div style={{ fontWeight:600, fontSize:20, color:k.c }}>{k.v}</div>
                          <div style={{ fontSize:9, color:'var(--text-d)', marginTop:3, textTransform:'uppercase', letterSpacing:'.06em' }}>{k.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Gráfica de ingresos */}
                    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Ingresos · últimos 6 meses</div>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={buildMonthlyFinancialData(data.cobros, data.gastos, 6)} margin={{top:4,right:0,left:-16,bottom:0}}>
                          <defs>
                            <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={C.gold} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={C.gold} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" vertical={false}/>
                          <XAxis dataKey="mes" tick={{fontSize:10,fill:'var(--text-d)'}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:10,fill:'var(--text-d)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                          <Tooltip content={<TT/>}/>
                          <Area type="monotone" dataKey="ingresos" name="Ingresos $" stroke={C.gold} strokeWidth={2} fill="url(#igGrad)" dot={false} activeDot={{r:4,fill:C.gold,strokeWidth:0}}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Fila de dos gráficas */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                      {/* Pipeline por etapa */}
                      <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'16px 18px' }}>
                        <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Pipeline · clientes por etapa</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={[
                            { etapa:'Captación', n: data.clientes.filter(c=>c.stage<=1).length },
                            { etapa:'Propuesta', n: data.clientes.filter(c=>c.stage===2).length },
                            { etapa:'Contrato',  n: data.clientes.filter(c=>c.stage===3).length },
                            { etapa:'Brief',     n: data.clientes.filter(c=>c.stage>=4&&c.stage<=5).length },
                            { etapa:'Producción',n: data.clientes.filter(c=>c.stage>=6&&c.stage<=8).length },
                            { etapa:'Entregado', n: data.clientes.filter(c=>c.stage>=9).length },
                          ]} margin={{top:0,right:0,left:-28,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" vertical={false}/>
                            <XAxis dataKey="etapa" tick={{fontSize:8,fill:'var(--text-d)'}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:9,fill:'var(--text-d)'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                            <Tooltip content={<TT/>}/>
                            <Bar dataKey="n" name="Clientes" radius={[4,4,0,0]}>
                              {[C.blue,C.purple,C.teal,C.gold,C.gold,C.green].map((c,i)=><Cell key={i} fill={c}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Avance de proyectos */}
                      <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'16px 18px' }}>
                        <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Proyectos · avance promedio</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart layout="vertical"
                            data={data.proyectos.slice(0,4).map(p => {
                              const c = data.clientes.find(cl=>cl.id===(p.clienteId||p.cliente_id));
                              return { nombre:(c?.nombre||'Proyecto').slice(0,12), interno:p.pctInterno||0, cliente:p.pctCliente||0 };
                            })}
                            margin={{top:0,right:0,left:0,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" horizontal={false}/>
                            <XAxis type="number" domain={[0,100]} tick={{fontSize:9,fill:'var(--text-d)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                            <YAxis type="category" dataKey="nombre" tick={{fontSize:9,fill:'var(--text-d)'}} axisLine={false} tickLine={false} width={68}/>
                            <Tooltip content={<TT/>}/>
                            <Bar dataKey="interno" name="Interno %" fill={C.gold}  radius={[0,3,3,0]} barSize={8}/>
                            <Bar dataKey="cliente"  name="Cliente %" fill={C.teal} radius={[0,3,3,0]} barSize={8}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Alertas inteligentes */}
                    {(() => {
                      const alertas = [];
                      const pxPend  = data.cobros.filter(c=>c.status!=='paid');
                      if (pxPend.length>0) alertas.push({ tipo:'cobro',   msg:`$${pxPend.reduce((a,c)=>a+c.monto,0).toLocaleString()} pendientes de cobro — ${pxPend.length} factura${pxPend.length>1?'s':''}`, color:C.red });
                      const urgentes = data.proyectos.filter(p=>p.pctInterno<100&&(p.diasEntrega||30)<5);
                      if (urgentes.length>0) alertas.push({ tipo:'deadline', msg:`${urgentes.length} proyecto${urgentes.length>1?'s':''} con entrega en menos de 5 días`, color:C.red });
                      const frios    = data.leads.filter(l=>l.status==='frio'||l.daysAgo>=7);
                      if (frios.length>0) alertas.push({ tipo:'lead', msg:`${frios.length} lead${frios.length>1?'s':''} sin contacto por 7+ días — riesgo de pérdida`, color:C.gold });
                      const meta     = data.studio.meta;
                      const pct      = Math.round((meta.actual||ingresos)/(meta.objetivo||1)*100);
                      if (pct<60&&meta.diasRestantes<10) alertas.push({ tipo:'meta', msg:`Meta al ${pct}% con ${meta.diasRestantes} días restantes — necesitas $${Math.round((meta.objetivo-meta.actual)/meta.diasRestantes).toLocaleString()}/día`, color:C.red });
                      if (alertas.length===0) alertas.push({ tipo:'ok', msg:'Todo en orden — sin alertas críticas esta semana', color:C.green });
                      return (
                        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'16px 18px' }}>
                          <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Alertas inteligentes</div>
                          {alertas.map((a,i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:i<alertas.length-1?'1px solid var(--border-s)':'none' }}>
                              <div style={{ width:7, height:7, borderRadius:'50%', background:a.color, flexShrink:0 }}/>
                              <span style={{ fontSize:12, color:'var(--text-m)' }}>{a.msg}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── TEXTO DEL INFORME IA ───────────────────────────────────── */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, padding:'14px 18px', background:`${C.gold}0a`, border:`1px solid ${C.gold}25`, borderRadius:12 }}>
                    <div style={{ fontSize:18, color:'var(--text)', fontWeight:600, letterSpacing:'-0.03em' }}>Análisis IA · Feria Design Studio</div>
                    <div style={{ marginLeft:'auto', fontSize:10, color:'var(--text-d)' }}>
                      {informeFecha?.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
                    </div>
                  </div>
                  <FormattedResponse text={informe} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
