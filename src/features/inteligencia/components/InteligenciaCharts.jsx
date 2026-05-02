import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:'var(--text-d)', marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, fontWeight:500 }}>
          {p.name}: ${p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export function IngresoChart({ chartData }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={chartData} margin={{ top:4, right:0, left:-18, bottom:0 }}>
        <defs>
          <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--gold)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis dataKey="mes" tick={{ fontSize:9, fill:'var(--text-d)' }} />
        <YAxis tick={{ fontSize:9, fill:'var(--text-d)' }} />
        <Tooltip content={<TT />} />
        <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--gold)" fill="url(#ig)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="gastos"   name="Gastos"   stroke="var(--red)"  fill="none"      strokeWidth={1} dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProyectosChart({ proyectosData }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={proyectosData} margin={{ top:4, right:0, left:-18, bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis dataKey="estado" tick={{ fontSize:9, fill:'var(--text-d)' }} />
        <YAxis tick={{ fontSize:9, fill:'var(--text-d)' }} allowDecimals={false} />
        <Tooltip content={<TT />} />
        <Bar dataKey="cantidad" name="Proyectos" fill="var(--teal)" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
