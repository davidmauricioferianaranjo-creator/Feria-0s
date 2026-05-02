import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const C = { gold:'var(--gold)', teal:'var(--teal)', green:'var(--green)', red:'var(--red)', blue:'var(--blue)', pink:'var(--pink)', purple:'var(--purple)' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:'var(--text-d)', marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:500 }}>{p.name}: {p.value}</div>)}
    </div>
  );
}

export default
function ExcelAnalyzer() {
  const [sheets, setSheets]   = useState(null);
  const [active, setActive]   = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb    = XLSX.read(e.target.result, { type: 'binary' });
      const data  = wb.SheetNames.map(name => {
        const ws   = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        return { name, rows };
      });
      setSheets(data);
      setActive(0);
    };
    reader.readAsBinaryString(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  if (!sheets) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C.gold : 'var(--border)'}`,
          borderRadius: 16, padding: '60px 20px', textAlign: 'center',
          cursor: 'pointer', transition: 'all .2s',
          background: dragging ? 'var(--gold-faint)' : 'transparent',
        }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => processFile(e.target.files[0])} />
        <div style={{ fontSize: 32, marginBottom: 14 }}>📊</div>
        <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18, marginBottom: 6 }}>Carga tu Excel financiero</div>
        <div style={{ fontSize: 12, color: 'var(--text-d)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Arrastra o haz clic para cargar tu archivo .xlsx o .csv. El sistema detecta las columnas automáticamente y genera gráficas de análisis.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          {['Flujo de caja', 'Ingresos vs gastos', 'Por cliente', 'Por período'].map(l => (
            <div key={l} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 20, padding: '4px 12px', fontSize: 10, color: 'var(--text-d)' }}>{l}</div>
          ))}
        </div>
      </div>
    );
  }

  const sheet = sheets[active];
  const rows  = sheet.rows;
  const cols  = rows.length ? Object.keys(rows[0]) : [];

  // Auto-detect numeric columns for charts
  const numCols = cols.filter(k => rows.some(r => typeof r[k] === 'number' || (!isNaN(parseFloat(r[k])) && r[k] !== '')));
  const strCols = cols.filter(k => !numCols.includes(k));
  const labelCol = strCols[0] || cols[0];
  const valCols  = numCols.slice(0, 4);

  // Prepare chart data (max 24 rows)
  const chartData = rows.slice(0, 24).map(r => {
    const obj = { name: String(r[labelCol] || '').slice(0, 12) };
    valCols.forEach(k => { obj[k] = parseFloat(r[k]) || 0; });
    return obj;
  });

  // Summary stats
  const summaries = valCols.map(k => {
    const vals  = rows.map(r => parseFloat(r[k]) || 0);
    const total = vals.reduce((a, b) => a + b, 0);
    const avg   = total / vals.length;
    const max   = Math.max(...vals);
    const min   = Math.min(...vals);
    return { k, total, avg, max, min };
  });

  const CHART_COLORS = [C.gold, C.teal, C.green, C.blue, C.pink];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Análisis — {sheet.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-d)' }}>{rows.length} filas · {cols.length} columnas</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {sheets.length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {sheets.map((s, i) => (
                <button key={i} onClick={() => setActive(i)} style={{
                  background: i === active ? 'var(--s3)' : 'transparent',
                  border: '1px solid var(--border-s)', borderRadius: 6, padding: '4px 10px',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: i === active ? 'var(--text)' : 'var(--text-d)',
                }}>{s.name}</button>
              ))}
            </div>
          )}
          <button onClick={() => setSheets(null)} style={{ background: 'transparent', border: '1px solid var(--border-s)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-d)' }}>
            ↑ Cambiar archivo
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {summaries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(summaries.length, 4)},1fr)`, gap: 8, marginBottom: 20 }}>
          {summaries.map(({ k, total, avg, max }, i) => (
            <div key={k} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: CHART_COLORS[i], textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</div>
              <div style={{ fontSize: 20, fontWeight: 300, marginBottom: 4 }}>
                {total >= 1000 ? `$${Math.round(total).toLocaleString()}` : Math.round(total * 100) / 100}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-d)' }}>
                Prom: {avg >= 1000 ? `$${Math.round(avg).toLocaleString()}` : Math.round(avg)} · Máx: {max >= 1000 ? `$${Math.round(max).toLocaleString()}` : Math.round(max)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && valCols.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Area Chart */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Tendencia</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  {valCols.map((k, i) => (
                    <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[i]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-d)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-d)' }} width={45} />
                <Tooltip content={<ChartTooltip />} />
                {valCols.map((k, i) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i]} fill={`url(#g${i})`} strokeWidth={2} dot={false} name={k} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Comparativo</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-d)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-d)' }} width={45} />
                <Tooltip content={<ChartTooltip />} />
                {valCols.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={CHART_COLORS[i]} radius={[3,3,0,0]} name={k} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Evolución</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-d)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-d)' }} width={45} />
                <Tooltip content={<ChartTooltip />} />
                {valCols.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i] }} name={k} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart — first numeric col */}
          {valCols.length > 0 && (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12 }}>Distribución — {valCols[0]}</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={chartData.slice(0,8)} dataKey={valCols[0]} nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {chartData.slice(0,8).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, valCols[0]]} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-s)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 500 }}>Tabla de datos</div>
          <div style={{ fontSize: 10, color: 'var(--text-d)' }}>{rows.length} filas</div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 300 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--s3)' }}>
                {cols.map(k => (
                  <th key={k} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-d)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-s)' }}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-s)', background: i % 2 === 0 ? 'transparent' : 'var(--s1)' }}>
                  {cols.map(k => (
                    <td key={k} style={{ padding: '7px 12px', color: numCols.includes(k) ? C.teal : 'var(--text)', whiteSpace: 'nowrap' }}>
                      {numCols.includes(k) && typeof row[k] === 'number'
                        ? `$${row[k].toLocaleString()}`
                        : String(row[k] || '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 50 && (
          <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--text-d)', borderTop: '1px solid var(--border-s)' }}>
            Mostrando 50 de {rows.length} filas
          </div>
        )}
      </div>
    </div>
  );
}
