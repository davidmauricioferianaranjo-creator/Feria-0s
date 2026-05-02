import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusPill } from '../../components/UI';
import { buildMonthlyFinancialData } from '../../lib/operationalData';
import { calculateStudioHealth, getDebtNumbers } from '../../lib/studioHealth';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ModalNuevoCobro, ModalNuevoGasto } from '../../features/finanzas/components/FinanzasModales';
import CobrosList    from '../../features/finanzas/components/CobrosList';
import { Activity, AlertTriangle, BarChart3, CircleDollarSign, CreditCard, Download, Landmark, Plus, ReceiptText, ShieldCheck, Target, TrendingUp, WalletCards } from 'lucide-react';

// ── COLORES ──────────────────────────────────────────────────────
const C = {
  gold:   'var(--gold)',
  teal:   'var(--teal)',
  green:  'var(--green)',
  red:    'var(--red)',
  blue:   'var(--blue)',
  pink:   'var(--pink)',
  purple: 'var(--purple)',
};

// ── CUSTOM TOOLTIP ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = '$' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:'var(--text-d)', marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color, fontWeight:500 }}>{prefix}{p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
}

// ── META HERO ──────────────────────────────────────────────────
function MetaHero({ meta, ingresos, gastos, onChangeMeta }) {
  const objetivoActual = Number(meta?.objetivo) > 0 ? Number(meta.objetivo) : 14000;
  const [metaDraft, setMetaDraft] = useState(objetivoActual);

  useEffect(() => {
    setMetaDraft(objetivoActual);
  }, [objetivoActual]);

  const pct = metaDraft > 0 ? Math.min(100, Math.round(ingresos / metaDraft * 100)) : 0;
  const margen = ingresos - gastos;
  const hasChanges = Number(metaDraft) !== objetivoActual;

  const saveMeta = () => {
    const next = Number(metaDraft);
    if (!next || next <= 0) return;
    onChangeMeta(next);
  };

  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:14, padding:'20px 24px', marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:4 }}>Meta del mes</div>
          <div style={{ fontSize:28, fontWeight:700, color:'var(--gold)' }}>${ingresos.toLocaleString()}</div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2 }}>de ${Number(metaDraft).toLocaleString()} objetivo · {meta?.diasRestantes || 0} días restantes</div>
        </div>
        <div style={{ display:'flex', gap:14 }}>
          {[{ l:'Gastos', v:gastos, c:'var(--red)' }, { l:'Margen', v:margen, c: margen >= 0 ? 'var(--green)' : 'var(--red)' }].map(({ l, v, c }) => (
            <div key={l} style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:'var(--text-d)', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:600, color:c }}>${Math.abs(v).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height:6, background:'var(--s3)', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?'var(--green)':'var(--gold)', borderRadius:3, transition:'width .4s' }} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, alignItems:'center' }}>
        <div>
          <input
            aria-label="Cambiar meta financiera mensual"
            type="range"
            min="1000"
            max="50000"
            step="100"
            value={metaDraft}
            onChange={(e) => setMetaDraft(Number(e.target.value))}
            style={{ width:'100%', accentColor:'var(--gold)', cursor:'pointer' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-d)', marginTop:2 }}>
            <span>$1,000</span>
            <span>{pct}% de la meta mensual</span>
            <span>$50,000</span>
          </div>
        </div>

        <input
          type="number"
          min="1"
          value={metaDraft}
          onChange={(e) => setMetaDraft(Number(e.target.value))}
          style={{ width:110, background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 10px', color:'var(--text)', fontFamily:'inherit', fontSize:12 }}
        />

        <button
          onClick={saveMeta}
          disabled={!hasChanges}
          style={{ fontSize:10, color:hasChanges?'var(--dark)':'var(--text-d)', background:hasChanges?'var(--gold)':'transparent', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 12px', cursor:hasChanges?'pointer':'default', fontFamily:'inherit', fontWeight:600 }}>
          Guardar meta
        </button>
      </div>
    </div>
  );
}

function MetaHeroPro({ meta, ingresos, gastos, onChangeMeta, metaDraft, setMetaDraft }) {
  const objetivoActual = Number(meta?.objetivo) > 0 ? Number(meta.objetivo) : 14000;
  const [localDraft, setLocalDraft] = useState(objetivoActual);
  const draftValue = metaDraft ?? localDraft;
  const setDraftValue = setMetaDraft || setLocalDraft;

  useEffect(() => {
    if (!setMetaDraft) setLocalDraft(objetivoActual);
  }, [objetivoActual, setMetaDraft]);

  const pct = draftValue > 0 ? Math.min(100, Math.round((ingresos / draftValue) * 100)) : 0;
  const margen = ingresos - gastos;
  const objetivoRestante = Math.max(0, Number(draftValue || 0) - ingresos);
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const diasRestantes = Number.isFinite(Number(meta?.diasRestantes)) ? Number(meta.diasRestantes) : Math.max(0, lastDay - today.getDate());
  const necesarioDia = diasRestantes > 0 ? Math.ceil(objetivoRestante / diasRestantes) : objetivoRestante;
  const hasChanges = Number(draftValue) !== objetivoActual;

  const saveMeta = () => {
    const next = Number(draftValue);
    if (!next || next <= 0) return;
    onChangeMeta(next);
  };

  return (
    <div style={{ background:'linear-gradient(135deg, var(--s2), var(--s1))', border:'1px solid var(--border-s)', borderRadius:14, padding:'20px 24px', marginBottom:16, boxShadow:'0 18px 50px rgba(0,0,0,.08)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, gap:18, flexWrap:'wrap' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)', marginBottom:8 }}>
            <Target size={14} strokeWidth={1.8} color="var(--gold)" /> Meta del mes
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
            <div style={{ fontSize:34, lineHeight:1, fontWeight:800, color:'var(--gold)', letterSpacing:'-0.04em' }}>${ingresos.toLocaleString()}</div>
            <div style={{ fontSize:12, color:'var(--text-d)' }}>de ${Number(draftValue).toLocaleString()}</div>
          </div>
          <div style={{ fontSize:11, color:'var(--text-d)', marginTop:8 }}>{diasRestantes} dias restantes · faltan ${objetivoRestante.toLocaleString()}</div>
        </div>
        <div style={{ width:86, height:86, borderRadius:'50%', background:`conic-gradient(${pct >= 100 ? 'var(--green)' : 'var(--gold)'} ${pct * 3.6}deg, var(--s3) 0deg)`, display:'grid', placeItems:'center', flexShrink:0 }}>
          <div style={{ width:66, height:66, borderRadius:'50%', background:'var(--s1)', display:'grid', placeItems:'center', border:'1px solid var(--border-s)' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:17, fontWeight:800, color:pct >= 100 ? 'var(--green)' : 'var(--text)' }}>{pct}%</div>
              <div style={{ fontSize:8, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>avance</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height:8, background:'var(--s3)', borderRadius:999, overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?'var(--green)':'var(--gold)', borderRadius:999, transition:'width .4s' }} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap:8, marginBottom:14 }}>
        {[
          { l:'Gastos', v:gastos, c:'var(--red)', icon:ReceiptText },
          { l:'Margen', v:margen, c:margen >= 0 ? 'var(--green)' : 'var(--red)', icon:TrendingUp },
          { l:'Necesario / dia', v:necesarioDia, c:'var(--blue)', icon:CircleDollarSign },
        ].map(({ l, v, c, icon:Icon }) => (
          <div key={l} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 12px', display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:9, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:800, color:c, marginTop:3 }}>${Math.abs(v).toLocaleString()}</div>
            </div>
            <Icon size={18} strokeWidth={1.8} color={c} />
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 120px auto', gap:12, alignItems:'center' }}>
        <div style={{ minWidth:0 }}>
          <input
            aria-label="Cambiar meta financiera mensual"
            type="range"
            min="1000"
            max="50000"
            step="100"
            value={metaDraft}
            onChange={(e) => setDraftValue(Number(e.target.value))}
            style={{ width:'100%', accentColor:'var(--gold)', cursor:'pointer' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-d)', marginTop:3 }}>
            <span>$1,000</span>
            <span>{pct}% de la meta mensual</span>
            <span>$50,000</span>
          </div>
        </div>
        <input
          type="number"
          min="1"
          value={metaDraft}
          onChange={(e) => setDraftValue(Number(e.target.value))}
          style={{ width:'100%', boxSizing:'border-box', background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit', fontSize:12 }}
        />
        <button
          onClick={saveMeta}
          disabled={!hasChanges}
          style={{ fontSize:11, color:hasChanges?'var(--dark)':'var(--text-d)', background:hasChanges?'var(--gold)':'transparent', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 13px', cursor:hasChanges?'pointer':'default', fontFamily:'inherit', fontWeight:700, whiteSpace:'nowrap' }}>
          Guardar meta
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function StudioHealthBanner({ meta, ingresos, gastos, porCobrar, data }) {
  const objetivo = Number(meta?.objetivo || 0) || 1;
  const pctMeta = Math.min(100, Math.round((ingresos / objetivo) * 100));
  const margen = ingresos - gastos;
  const margenPct = ingresos > 0 ? Math.round((margen / ingresos) * 100) : 0;
  const cobrosVencidos = (data.cobros || []).filter(c => c.status === 'overdue').length;
  const pipelineActivo = (data.clientes || []).filter(c => c.stage >= 1 && c.stage < 9).length;
  const diasRestantes = Number(meta?.diasRestantes || 0);

  let score = 42;
  score += Math.min(34, Math.round(pctMeta * 0.34));
  score += margenPct >= 55 ? 16 : margenPct >= 30 ? 10 : margenPct >= 0 ? 5 : -10;
  score += porCobrar <= ingresos * 0.6 ? 8 : porCobrar <= ingresos ? 4 : -6;
  score += pipelineActivo >= 3 ? 8 : pipelineActivo >= 1 ? 4 : -4;
  score -= cobrosVencidos * 8;
  score -= pctMeta < 45 && diasRestantes <= 10 ? 8 : 0;
  score = Math.max(0, Math.min(100, score));

  const state = score >= 78
    ? { label:'Salud fuerte', color:'var(--green)', Icon:ShieldCheck, note:'El estudio tiene buen margen y avance saludable hacia la meta.' }
    : score >= 58
      ? { label:'Salud estable', color:'var(--blue)', Icon:Activity, note:'La operación está controlada; conviene empujar cobros y ventas activas.' }
      : { label:'Salud en vigilancia', color:'var(--gold)', Icon:AlertTriangle, note:'Prioriza cierre de cobros, seguimiento comercial y reducción de gastos no esenciales.' };
  const Icon = state.Icon;

  const checks = [
    { label:'Meta', value:`${pctMeta}%`, color:pctMeta >= 70 ? 'var(--green)' : pctMeta >= 40 ? 'var(--gold)' : 'var(--red)' },
    { label:'Margen', value:`${margenPct}%`, color:margen >= 0 ? 'var(--green)' : 'var(--red)' },
    { label:'Por cobrar', value:`$${porCobrar.toLocaleString()}`, color:porCobrar > ingresos ? 'var(--gold)' : 'var(--blue)' },
    { label:'Pipeline', value:String(pipelineActivo), color:pipelineActivo ? 'var(--teal)' : 'var(--text-d)' },
  ];

  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:14, padding:'14px 16px', marginBottom:14, display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', gap:14, alignItems:'center' }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', minWidth:0 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:`${state.color}18`, border:`1px solid ${state.color}35`, display:'grid', placeItems:'center', flexShrink:0 }}>
          <Icon size={20} strokeWidth={1.8} color={state.color} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:3 }}>Salud del estudio</div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:18, fontWeight:850, color:state.color }}>{state.label}</span>
            <span style={{ fontSize:11, color:'var(--text-d)' }}>{score}/100</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.5, marginTop:3 }}>{state.note}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(74px, 1fr))', gap:8, minWidth:0 }}>
        {checks.map(item => (
          <div key={item.label} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:'8px 10px', minWidth:0 }}>
            <div style={{ fontSize:9, color:'var(--text-d)', marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:13, fontWeight:850, color:item.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MODAL NUEVO COBRO ─────────────────────────────────────────────
// ── MAIN ──────────────────────────────────────────────────────────
function StudioHealthBannerPro({ meta, ingresos, gastos, porCobrar, data }) {
  const health = calculateStudioHealth({ meta, ingresos, gastos, porCobrar, deudas:data.deudas || [] });
  const state = health.status;
  const Icon = health.score >= 80 ? ShieldCheck : health.score >= 60 ? Activity : AlertTriangle;

  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:14, padding:16, marginBottom:14, display:'grid', gap:14 }}>
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
    </div>
  );
}

function DebtPanel({ data, debtNumbers, deudaForm, setDeudaForm, debtPayment, setDebtPayment, saveDebt, saveDebtPayment }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 380px', gap:16, alignItems:'start' }}>
      <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:10, marginBottom:14 }}>
          {[
            { l:'Pasivos totales', v:`$${debtNumbers.pending.toLocaleString()}`, c:C.gold },
            { l:'Pagado hasta hoy', v:`$${debtNumbers.paid.toLocaleString()}`, c:C.green },
            { l:'Cuota mensual', v:`$${debtNumbers.monthlyQuota.toLocaleString()}`, c:C.blue },
          ].map(card => (
            <div key={card.l} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'13px 14px' }}>
              <div style={{ fontSize:18, fontWeight:900, color:card.c }}>{card.v}</div>
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:5 }}>{card.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Deudas y pasivos</div>
        {(data.deudas || []).length === 0 ? (
          <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:24, color:'var(--text-d)', fontSize:12, textAlign:'center' }}>Sin deudas registradas.</div>
        ) : (data.deudas || []).map(d => {
          const original = Number(d.deuda_original || d.monto || 0);
          const saldo = Number(d.saldo_actual ?? d.monto ?? original);
          const paid = Math.max(0, original - saldo);
          const pct = original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0;
          return (
            <div key={d.id} style={{ padding:'14px 16px', border:'1px solid var(--border-s)', borderRadius:12, background:'var(--s2)', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:900 }}>{d.nombre || d.concepto || d.acreedor || 'Deuda'}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:3 }}>{d.tipo || 'deuda'} · {d.acreedor || 'sin acreedor'} · liquidacion {d.liquidacion_estimada || d.vence || 'sin fecha'}</div>
                </div>
                <span style={{ fontSize:10, border:'1px solid var(--border-s)', borderRadius:999, padding:'4px 8px', color:d.status === 'pagada' ? C.green : C.gold, background:'var(--s1)' }}>{d.status === 'pagada' ? 'Pagada' : 'Activa'}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:8, marginBottom:10 }}>
                {[
                  { l:'Original', v:original, c:'var(--text)' },
                  { l:'Pagado', v:paid, c:C.green },
                  { l:'Pendiente', v:saldo, c:C.gold },
                  { l:'Cuota mensual', v:Number(d.cuota_mensual || d.cuota || 0), c:C.blue },
                ].map(x => (
                  <div key={x.l} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:9, padding:'8px 9px' }}>
                    <div style={{ fontSize:9, color:'var(--text-d)' }}>{x.l}</div>
                    <div style={{ fontSize:12, fontWeight:900, color:x.c, marginTop:2 }}>${Number(x.v || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{ height:8, borderRadius:999, overflow:'hidden', background:'var(--s3)', display:'flex' }}>
                <div style={{ width:`${pct}%`, background:C.green }} />
                <div style={{ flex:1, background:'rgba(255,255,255,.04)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, color:'var(--text-d)', fontSize:10, marginTop:7 }}>
                <span>{pct}% amortizado</span>
                <span>${saldo.toLocaleString()} pendientes de ${original.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid', gap:12 }}>
        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:800, marginBottom:10 }}>Registrar deuda</div>
          {[
            { k:'nombre', label:'Nombre de la deuda' },
            { k:'acreedor', label:'Acreedor' },
            { k:'deuda_original', label:'Deuda original', type:'number' },
            { k:'saldo_actual', label:'Saldo actual', type:'number' },
            { k:'cuota_mensual', label:'Cuota mensual', type:'number' },
            { k:'liquidacion_estimada', label:'Liquidacion estimada', type:'date' },
          ].map(field => (
            <label key={field.k} style={{ display:'grid', gap:4, fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>
              {field.label}
              <input type={field.type || 'text'} value={deudaForm[field.k]} onChange={e=>setDeudaForm(f=>({...f,[field.k]:e.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit', textTransform:'none', letterSpacing:0 }} />
            </label>
          ))}
          <button onClick={saveDebt} style={{ width:'100%', background:C.gold, color:'#000', border:'none', borderRadius:8, padding:'9px 12px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>+ Guardar deuda</button>
        </div>

        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:800, marginBottom:10 }}>Registrar abono</div>
          <select value={debtPayment.deudaId} onChange={e=>setDebtPayment(f=>({...f,deudaId:e.target.value}))} style={{ width:'100%', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit', marginBottom:8 }}>
            <option value="">Selecciona deuda</option>
            {(data.deudas || []).map(d => <option key={d.id} value={d.id}>{d.nombre || d.concepto || d.acreedor}</option>)}
          </select>
          {[
            { k:'fecha', label:'Fecha', type:'date' },
            { k:'monto_total', label:'Total pagado', type:'number' },
            { k:'capital', label:'Capital amortizado', type:'number' },
            { k:'interes', label:'Interes financiero', type:'number' },
          ].map(field => (
            <label key={field.k} style={{ display:'grid', gap:4, fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>
              {field.label}
              <input type={field.type} value={debtPayment[field.k]} onChange={e=>setDebtPayment(f=>({...f,[field.k]:e.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit', textTransform:'none', letterSpacing:0 }} />
            </label>
          ))}
          <button onClick={saveDebtPayment} style={{ width:'100%', background:'var(--s1)', color:'var(--text)', border:'1px solid var(--border-s)', borderRadius:8, padding:'9px 12px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>Guardar abono</button>
          <div style={{ fontSize:10, color:'var(--text-d)', lineHeight:1.45, marginTop:10 }}>El capital reduce el pasivo. El interes se registra como gasto financiero y recalcula la salud del estudio.</div>
        </div>
      </div>
    </div>
  );
}

MetaHero.displayName = 'MetaHeroLegacy';

export default function Finanzas() {
  const { data, ingresos, porCobrar, totalGastos, updateMeta, showToast, addCobro, updateCobro, addGasto, addDeuda, updateDeuda } = useApp();
  const [tab, setTab] = useState('resumen');
  const [showModalCobro, setShowModalCobro] = useState(false);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [gastoFiltro, setGastoFiltro] = useState('all');
  const [deudaForm, setDeudaForm] = useState({ nombre:'', tipo:'prestamo', acreedor:'', deuda_original:'', saldo_actual:'', cuota_mensual:'', tasa_interes:'', liquidacion_estimada:'' });
  const [debtPayment, setDebtPayment] = useState({ deudaId:'', monto_total:'', capital:'', interes:'', fecha:new Date().toISOString().slice(0,10) });

  const meta   = data.studio.meta;
  const margen = ingresos - totalGastos;
  const objetivoActual = Number(meta?.objetivo) > 0 ? Number(meta.objetivo) : 14000;
  const [metaDraft, setMetaDraft] = useState(objetivoActual);

  useEffect(() => {
    setMetaDraft(objetivoActual);
  }, [objetivoActual]);

  const previewMeta = useMemo(() => ({ ...meta, objetivo: metaDraft }), [meta, metaDraft]);
  const debtNumbers = useMemo(() => getDebtNumbers(data.deudas || []), [data.deudas]);
  useEffect(() => {
    if (tab === 'analisis') setTab('resumen');
  }, [tab]);

  const TABS = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'cobros',  label: 'Cobros',  icon: CreditCard },
    { id: 'ventas',  label: 'Ventas',  icon: WalletCards },
    { id: 'gastos',  label: 'Gastos',  icon: ReceiptText },
    { id: 'deudas',  label: 'Deudas',  icon: Landmark },
  ];

  // Monthly trend from real cobros/gastos only
  const monthlyData = useMemo(() => buildMonthlyFinancialData(data.cobros, data.gastos, 4), [data.cobros, data.gastos]);

  const ventas = useMemo(() => {
    const clientesById = new Map((data.clientes || []).map(c => [String(c.id), c]));
    const cobrosByClient = new Map();
    (data.cobros || []).forEach(c => {
      const key = String(c.clienteId || c.cliente_id || '');
      if (!key) return;
      if (!cobrosByClient.has(key)) cobrosByClient.set(key, []);
      cobrosByClient.get(key).push(c);
    });

    const packageSales = (data.proyectos || []).map(p => {
      const clienteId = p.clienteId || p.cliente_id;
      const cliente = clientesById.get(String(clienteId));
      const amount = Number(p.package_price || p.precioPaquete || p.precio || p.monto || 0);
      const relatedCobros = cobrosByClient.get(String(clienteId)) || [];
      const paid = relatedCobros.some(c => c.status === 'paid' && Number(c.monto || 0) >= amount * 0.5);
      return {
        id: `pkg-${p.id}`,
        fecha: p.created_at || p.fecha || '',
        cliente: cliente?.nombre || p.cliente || 'Cliente',
        concepto: p.paquete || p.package_name || p.servicio || 'Paquete de branding',
        tipo: 'Paquete',
        monto: amount,
        estado: paid ? 'paid' : 'pending',
      };
    }).filter(v => v.monto > 0);

    const extraSales = (data.projectApplications || [])
      .filter(app => app.is_extra || Number(app.extra_price || 0) > 0)
      .map(app => {
        const proyecto = (data.proyectos || []).find(p => String(p.id) === String(app.proyecto_id));
        const cliente = proyecto ? clientesById.get(String(proyecto.clienteId || proyecto.cliente_id)) : null;
        const extraStatus = String(app.extra_status || app.status || '').toLowerCase();
        return {
          id: `extra-${app.id || app.application_id}`,
          fecha: app.created_at || proyecto?.created_at || '',
          cliente: cliente?.nombre || 'Cliente',
          concepto: app.name || app.application_name || app.application_id || 'Aplicación extra',
          tipo: 'Aplicación extra',
          monto: Number(app.extra_price || app.price || 0),
          estado: ['paid', 'pagado', 'pagada', 'comprada'].includes(extraStatus) ? 'paid' : 'pending',
        };
      }).filter(v => v.monto > 0);

    const manualSales = (data.cobros || [])
      .filter(c => !packageSales.some(v => String(v.cliente) === String(clientesById.get(String(c.clienteId || c.cliente_id))?.nombre || '') && Number(v.monto) === Number(c.monto)))
      .map(c => {
        const cliente = clientesById.get(String(c.clienteId || c.cliente_id));
        return {
          id: `cobro-${c.id}`,
          fecha: c.created_at || c.vence || '',
          cliente: cliente?.nombre || c.cliente || 'Cliente',
          concepto: c.tipo || c.nombre || 'Venta / cobro manual',
          tipo: 'Cobro manual',
          monto: Number(c.monto || 0),
          estado: c.status === 'paid' ? 'paid' : 'pending',
        };
      }).filter(v => v.monto > 0);

    return [...packageSales, ...extraSales, ...manualSales]
      .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  }, [data.clientes, data.proyectos, data.projectApplications, data.cobros]);

  const ventasTotal = ventas.reduce((sum, v) => sum + Number(v.monto || 0), 0);
  const ventasPagadas = ventas.filter(v => v.estado === 'paid').reduce((sum, v) => sum + Number(v.monto || 0), 0);
  const ventasPendientes = ventasTotal - ventasPagadas;
  const saveDebt = () => {
    const original = Number(deudaForm.deuda_original || deudaForm.saldo_actual || 0);
    const saldo = Number(deudaForm.saldo_actual || original || 0);
    if (!deudaForm.nombre || !saldo) {
      showToast('Completa nombre y saldo de la deuda', 'o');
      return;
    }
    addDeuda?.({
      ...deudaForm,
      concepto: deudaForm.nombre,
      monto: saldo,
      deuda_original: original,
      saldo_actual: saldo,
      cuota_mensual: Number(deudaForm.cuota_mensual || 0),
      tasa_interes: Number(deudaForm.tasa_interes || 0),
      pagos: [],
      status:'pendiente',
    });
    setDeudaForm({ nombre:'', tipo:'prestamo', acreedor:'', deuda_original:'', saldo_actual:'', cuota_mensual:'', tasa_interes:'', liquidacion_estimada:'' });
    showToast('Deuda registrada', 'ok');
  };

  const saveDebtPayment = () => {
    const debt = (data.deudas || []).find(d => String(d.id) === String(debtPayment.deudaId));
    if (!debt) {
      showToast('Selecciona una deuda', 'o');
      return;
    }
    const capital = Number(debtPayment.capital || 0);
    const interes = Number(debtPayment.interes || 0);
    const total = Number(debtPayment.monto_total || capital + interes || 0);
    if (!total || (capital <= 0 && interes <= 0)) {
      showToast('Registra capital o interes pagado', 'o');
      return;
    }
    const saldo = Number(debt.saldo_actual ?? debt.monto ?? debt.deuda_original ?? 0);
    const nextSaldo = Math.max(0, saldo - capital);
    const paymentRow = { id: crypto.randomUUID?.() || Date.now().toString(), fecha:debtPayment.fecha, monto_total:total, capital, interes, saldo_resultante:nextSaldo };
    updateDeuda?.(debt.id, {
      saldo_actual: nextSaldo,
      monto: nextSaldo,
      pagos: [paymentRow, ...(Array.isArray(debt.pagos) ? debt.pagos : [])],
      status: nextSaldo <= 0 ? 'pagada' : 'pendiente',
      updated_at: new Date().toISOString(),
    });
    if (interes > 0) {
      addGasto?.({
        nombre:`Interes deuda - ${debt.nombre || debt.concepto || debt.acreedor || 'deuda'}`,
        cat:'Gasto financiero',
        monto:interes,
        status:'paid',
        tipo_egreso:'interes_deuda',
        deuda_id:debt.id,
        interes_pago:interes,
      });
    }
    setDebtPayment({ deudaId:'', monto_total:'', capital:'', interes:'', fecha:new Date().toISOString().slice(0,10) });
    showToast('Pago de deuda registrado', 'ok');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', flexShrink: 0, gap:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Finanzas <span style={{ color: 'var(--gold)' }}>· Contabilidad</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-d)', marginTop: 2 }}>Ingresos, cobros y análisis financiero</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap:'wrap' }}>
          <button
            onClick={() => showToast('Exportando reporte PDF…', '↓')}
            style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '7px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-m)', display:'inline-flex', alignItems:'center', gap:7 }}>
            <Download size={14} strokeWidth={1.8} />
            Exportar
          </button>
          <button
            onClick={() => setShowModalCobro(true)}
            style={{ background: 'var(--gold)', color: 'var(--dark)', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display:'inline-flex', alignItems:'center', gap:7 }}>
            <Plus size={15} strokeWidth={2} /> Cobro
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', padding: '0 24px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', flexShrink: 0 }}>
        {TABS.filter(t => t.id !== 'analisis').map(t => {
          const Icon = t.icon;
          return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 12, padding: '10px 16px', cursor: 'pointer', display:'inline-flex', alignItems:'center', gap:7,
            color: tab === t.id ? 'var(--gold)' : 'var(--text-d)',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
            background: 'transparent', fontFamily: 'inherit', transition: 'all .15s',
          }}>{Icon && <Icon size={14} strokeWidth={1.8} />}{t.label}</button>
          );
        })}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          <>
            <MetaHeroPro meta={meta} ingresos={ingresos} gastos={totalGastos} onChangeMeta={updateMeta} metaDraft={metaDraft} setMetaDraft={setMetaDraft} />
            <StudioHealthBannerPro meta={previewMeta} ingresos={ingresos} gastos={totalGastos} porCobrar={porCobrar} data={data} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
              {/* Tendencia mensual */}
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Ingresos vs gastos — últimos 4 meses</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.red} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-d)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="ingresos" stroke={C.teal} fill="url(#gIngresos)" strokeWidth={2} dot={false} name="Ingresos" />
                    <Area type="monotone" dataKey="gastos"   stroke={C.red}  fill="url(#gGastos)"   strokeWidth={2} dot={false} name="Gastos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Distribución de cobros */}
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Estado de cobros</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pagado',    value: ingresos },
                        { name: 'Pendiente', value: porCobrar },
                        { name: 'Gastos',    value: totalGastos },
                      ]}
                      cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                      dataKey="value"
                    >
                      <Cell fill={C.green} />
                      <Cell fill={C.gold} />
                      <Cell fill={C.red} />
                    </Pie>
                    <Tooltip formatter={(v) => [`$${v.toLocaleString()}`]} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Cobros recientes */}
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Cobros recientes</div>
                {[...data.cobros].sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0)).slice(0,5).map(c => {
                  const cliente = data.clientes.find(cl => cl.id === (c.clienteId || c.cliente_id));
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-s)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'paid' ? C.green : c.status === 'overdue' ? C.red : C.gold, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente?.nombre || '—'}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: c.status === 'paid' ? C.green : 'var(--text)' }}>${c.monto?.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Gastos por categoría */}
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Gastos por categoría</div>
                {Object.entries(
                  data.gastos.reduce((acc, g) => { acc[g.cat || 'Otros'] = (acc[g.cat || 'Otros'] || 0) + g.monto; return acc; }, {})
                ).sort((a,b) => b[1] - a[1]).map(([cat, monto], i) => {
                  const pct = Math.round(monto / totalGastos * 100);
                  return (
                    <div key={cat} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span>{cat}</span>
                        <span style={{ color: 'var(--text-d)' }}>${monto.toLocaleString()} · {pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: [C.red, C.gold, C.blue, C.teal, C.pink][i % 5], borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── COBROS ── */}
        {tab === 'cobros' && <CobrosList data={data} ingresos={ingresos} porCobrar={porCobrar} showToast={showToast} updateCobro={updateCobro} />}

        {/* ── VENTAS ── */}
        {tab === 'ventas' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
              {[
                { l:'Ventas totales', v: ventasTotal, c:'var(--text)' },
                { l:'Pagadas', v: ventasPagadas, c:C.green },
                { l:'Pendientes', v: ventasPendientes, c:C.gold },
              ].map(card => (
                <div key={card.l} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontWeight:700, fontSize:24, color:card.c, lineHeight:1 }}>${card.v.toLocaleString()}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:5 }}>{card.l}</div>
                </div>
              ))}
            </div>

            <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1.6fr .8fr .8fr .8fr', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border-s)', fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-d)' }}>
                <div>Cliente</div><div>Venta</div><div>Tipo</div><div>Monto</div><div>Estado</div>
              </div>
              {ventas.length ? ventas.map(v => (
                <div key={v.id} style={{ display:'grid', gridTemplateColumns:'1.3fr 1.6fr .8fr .8fr .8fr', gap:12, alignItems:'center', padding:'13px 16px', borderBottom:'1px solid var(--border-s)' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{v.cliente}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{v.fecha ? new Date(v.fecha).toLocaleDateString('es-EC') : 'Sin fecha'}</div>
                  </div>
                  <div style={{ fontSize:12 }}>{v.concepto}</div>
                  <div style={{ fontSize:11, color:'var(--text-d)' }}>{v.tipo}</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>${Number(v.monto || 0).toLocaleString()}</div>
                  <StatusPill status={v.estado === 'paid' ? 'paid' : 'pending'} />
                </div>
              )) : (
                <div style={{ padding:24, color:'var(--text-d)', fontSize:12 }}>Aún no hay ventas registradas.</div>
              )}
            </div>
          </>
        )}

        {/* ── GASTOS ── */}
        {tab === 'gastos' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <select value={gastoFiltro} onChange={e=>setGastoFiltro(e.target.value)} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:12, fontFamily:'inherit' }}>
                <option value='all'>Todos los gastos</option>
                {[...new Set(data.gastos.map(g=>g.cat || 'Otros'))].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setShowModalGasto(true)}
                style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                + Agregar gasto
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Gastos registrados</div>
                {data.gastos.filter(g => gastoFiltro === 'all' || (g.cat || 'Otros') === gastoFiltro).map((g, i) => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-s)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: g.status === 'overdue' ? C.red : g.status === 'pending' ? C.gold : C.green, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12 }}>{g.nombre}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-d)' }}>{g.cat}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>${g.monto?.toLocaleString()}</span>
                      <StatusPill status={g.status} />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-d)' }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>${totalGastos.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Margen</div>
                <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  {[
                    { l: 'Ingresos',   v: ingresos,     c: C.green },
                    { l: 'Gastos',     v: totalGastos,  c: C.red   },
                    { l: 'Margen neto',v: margen,       c: margen >= 0 ? C.teal : C.red },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-s)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-d)' }}>{l}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: c }}>${v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={[{ name: 'Abril', ingresos, gastos: totalGastos, margen: Math.max(margen, 0) }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-d)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} width={45} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="ingresos" fill={C.green} radius={[3,3,0,0]} name="Ingresos" />
                      <Bar dataKey="gastos"   fill={C.red}   radius={[3,3,0,0]} name="Gastos" />
                      <Bar dataKey="margen"   fill={C.teal}  radius={[3,3,0,0]} name="Margen" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}


        {/* ── DEUDAS ── */}
        {tab === 'deudas' && (
          <DebtPanel
            data={data}
            debtNumbers={debtNumbers}
            deudaForm={deudaForm}
            setDeudaForm={setDeudaForm}
            debtPayment={debtPayment}
            setDebtPayment={setDebtPayment}
            saveDebt={saveDebt}
            saveDebtPayment={saveDebtPayment}
          />
        )}

        {tab === 'deudas_legacy' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Deudas del estudio</div>
                {(data.deudas || []).length === 0 ? (
                  <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:24, color:'var(--text-d)', fontSize:12, textAlign:'center' }}>Sin deudas registradas</div>
                ) : (data.deudas || []).map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', border:'1px solid var(--border-s)', borderRadius:10, background:'var(--s2)', marginBottom:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:d.status==='pagada'?C.green:d.status==='vencida'?C.red:C.gold }} />
                    <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:600 }}>{d.acreedor || 'Acreedor'}</div><div style={{ fontSize:10, color:'var(--text-d)' }}>{d.concepto || '—'} · vence {d.vence || 'sin fecha'}</div></div>
                    <div style={{ fontWeight:600 }}>${Number(d.monto||0).toLocaleString()}</div>
                    <button onClick={() => updateDeuda?.(d.id, { status: d.status==='pagada' ? 'pendiente' : 'pagada' })} style={{ fontSize:10, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border-s)', background:'transparent', color:'var(--text-m)', cursor:'pointer' }}>{d.status==='pagada'?'Reabrir':'Marcar pagada'}</button>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Registrar deuda</div>
                {['acreedor','concepto','monto','vence'].map(k => <div key={k} style={{ marginBottom:8 }}><div style={{ fontSize:10, color:'var(--text-d)', marginBottom:4 }}>{k==='monto'?'Monto USD':k==='vence'?'Vence':k[0].toUpperCase()+k.slice(1)}</div><input type={k==='monto'?'number':k==='vence'?'date':'text'} value={deudaForm[k]} onChange={e=>setDeudaForm(f=>({...f,[k]:e.target.value}))} style={{ width:'100%', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontFamily:'inherit' }} /></div>)}
                <button onClick={() => { if(!deudaForm.acreedor || !deudaForm.monto){ showToast('Completa acreedor y monto','⚠'); return; } addDeuda?.({ ...deudaForm, monto:Number(deudaForm.monto)||0 }); setDeudaForm({ acreedor:'', concepto:'', monto:'', vence:'', status:'pendiente' }); showToast('Deuda registrada','✦'); }} style={{ width:'100%', background:C.gold, color:'#000', border:'none', borderRadius:8, padding:'9px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ Guardar deuda</button>
              </div>
            </div>
          </>
        )}

        {/* ── ANÁLISIS EXCEL ── */}

      </div>

      {/* MODALS */}
      {showModalCobro && (
        <ModalNuevoCobro
          data={data} addCobro={addCobro} showToast={showToast}
          onClose={() => setShowModalCobro(false)}
        />
      )}
      {showModalGasto && (
        <ModalNuevoGasto
          data={data} addGasto={addGasto} showToast={showToast}
          onClose={() => setShowModalGasto(false)}
        />
      )}
    </div>
  );
}
