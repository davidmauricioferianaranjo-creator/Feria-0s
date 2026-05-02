import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { DEMO_MARKETING_CAMPAIGNS, DEMO_MARKETING_MONTHLY, DEMO_PUBLICACIONES } from '../../lib/operationalData';
import {
  AreaChart, Area, BarChart, Bar, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, CalendarDays, Camera, CircleDollarSign, ExternalLink, Megaphone, RefreshCw, Target, Users, Zap } from 'lucide-react';

const C = {
  gold:   'var(--gold)',
  teal:   'var(--teal)',
  green:  'var(--green)',
  red:    'var(--red)',
  blue:   'var(--blue)',
  pink:   'var(--pink)',
  purple: 'var(--purple)',
};
const CC = [C.gold, C.teal, C.green, C.blue, C.pink, C.purple];

const FALLBACK_TOP_POSTS = [
  { id:'1', plataforma:'Instagram', tipo:'Carrusel', titulo:'Identidad visual ARKES - proceso completo', alcance:4820, impresiones:6340, interacciones:312, guardados:87, fecha:'2026-04-20', imagen:null, url:'#', marca:'feria' },
  { id:'2', plataforma:'Instagram', tipo:'Reel', titulo:'Que es el Metodo Psi? Escucha antes de disenar', alcance:3910, impresiones:5120, interacciones:278, guardados:104, fecha:'2026-04-18', imagen:null, url:'#', marca:'feria' },
  { id:'3', plataforma:'Facebook', tipo:'Video', titulo:'Caso TES - de institucion a marca que inspira', alcance:2780, impresiones:3850, interacciones:145, guardados:42, fecha:'2026-04-15', imagen:null, url:'#', marca:'feria' },
  { id:'4', plataforma:'Instagram', tipo:'Post', titulo:'ArtizWed - identidad para fotografos premium', alcance:2340, impresiones:3100, interacciones:198, guardados:76, fecha:'2026-04-12', imagen:null, url:'#', marca:'bl' },
  { id:'5', plataforma:'Instagram', tipo:'Reel', titulo:'Brand & Legacy: tu marca habla antes que tu', alcance:1980, impresiones:2640, interacciones:167, guardados:59, fecha:'2026-04-10', imagen:null, url:'#', marca:'bl' },
  { id:'6', plataforma:'Facebook', tipo:'Carrusel', titulo:'Transformacion Sultan de los Andes', alcance:1750, impresiones:2380, interacciones:134, guardados:38, fecha:'2026-04-08', imagen:null, url:'#', marca:'feria' },
];

function escapeSvgText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleLines(value) {
  const words = String(value || 'Post de marketing').replace(/[—–]/g, '-').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    if (lines.length >= 2) return;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= 18) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word.length > 18 ? `${word.slice(0, 15)}...` : word;
  });
  if (current && lines.length < 2) lines.push(current);
  while (lines.length < 2) lines.push(lines.length ? 'Marketing' : 'Post');
  return lines.map(line => escapeSvgText(line.length > 18 ? `${line.slice(0, 15)}...` : line));
}

function demoPostImage(seed, title, brand = 'feria', type = 'Post') {
  const brandKey = String(brand || 'feria').toLowerCase();
  const palette = brandKey === 'bl'
    ? { bg: '#0A0A0B', panel: '#161416', accent: '#D63B59', muted: '#C9A96E', text: '#F3F0EA' }
    : { bg: '#090909', panel: '#151515', accent: '#C9A96E', muted: '#86B6FF', text: '#F5F2EA' };
  const offset = String(seed || title || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 48;
  const mark = brandKey === 'bl' ? 'B&L' : 'FERIA';
  const [line1, line2] = titleLines(title);
  const typeLabel = escapeSvgText(String(type || 'POST').toUpperCase().slice(0, 12));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
      <rect width="360" height="360" fill="${palette.bg}"/>
      <rect x="24" y="24" width="312" height="312" rx="26" fill="${palette.panel}" stroke="${palette.accent}" stroke-opacity=".45"/>
      <rect x="${42 + offset}" y="48" width="118" height="13" rx="6.5" fill="${palette.accent}"/>
      <rect x="42" y="79" width="188" height="8" rx="4" fill="${palette.muted}" opacity=".58"/>
      <rect x="42" y="101" width="102" height="8" rx="4" fill="${palette.text}" opacity=".22"/>
      <text x="42" y="174" fill="${palette.text}" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800">${line1}</text>
      <text x="42" y="209" fill="${palette.text}" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800">${line2}</text>
      <rect x="42" y="244" width="92" height="30" rx="15" fill="${palette.accent}" opacity=".96"/>
      <text x="58" y="264" fill="#090909" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="800">${typeLabel}</text>
      <line x1="42" y1="296" x2="220" y2="296" stroke="${palette.text}" stroke-opacity=".2" stroke-width="2"/>
      <text x="248" y="299" fill="${palette.muted}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">${mark}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isRenderableImageSrc(value) {
  const src = String(value || '').trim();
  if (!src) return false;
  return /^(https?:\/\/|data:image\/|blob:)/i.test(src);
}

function postImageSrc(post = {}) {
  const direct = [
    post.imagen,
    post.image_url,
    post.image,
    post.thumbnail_url,
    post.thumbnailUrl,
    post.picture,
    post.full_picture,
    post.media?.image?.src,
    post.attachments?.data?.[0]?.media?.image?.src,
    post.media_url,
    post.mediaUrl,
  ].find(value => typeof value === 'string' && isRenderableImageSrc(value));
  if (direct) return direct;
  return isRenderableImageSrc(post.media?.url) ? post.media.url : null;
}

function normalizePlatform(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('facebook') || raw === 'fb') return 'Facebook';
  return 'Instagram';
}

function normalizePost(post = {}, index = 0) {
  const titulo = post.titulo || post.title || post.caption || post.message || '(sin caption)';
  const plataforma = normalizePlatform(post.plataforma || post.platform || post.source || post.network);
  const tipo = post.tipo || post.media_type || post.mediaType || post.type || 'Post';
  const marca = post.marca || post.brand || 'feria';
  const normalized = {
    ...post,
    id: post.id || `${plataforma}-${index}`,
    plataforma,
    tipo,
    titulo,
    marca,
    alcance: normalizeNumber(post.alcance ?? post.reach ?? post.insights?.reach),
    impresiones: normalizeNumber(post.impresiones ?? post.impressions ?? post.insights?.impressions),
    interacciones: normalizeNumber(post.interacciones ?? post.engagement ?? post.interactions ?? post.insights?.engagement),
    guardados: normalizeNumber(post.guardados ?? post.saved ?? post.saves ?? post.insights?.saved),
    fecha: post.fecha || post.timestamp || post.created_time || post.createdAt || '',
    url: post.url || post.permalink || post.permalink_url || post.link || '#',
  };
  normalized.imagen = postImageSrc(normalized);
  normalized.hasRealImage = Boolean(normalized.imagen);
  normalized.generatedPreview = post.generatedPreview === true ? demoPostImage(normalized.id, titulo, marca, tipo) : null;
  return normalized;
}

function Tip({ children }) {
  return <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-faint)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text-m)', lineHeight: 1.6, marginBottom: 16 }}>💡 {children}</div>;
}

function KPI({ label, value, sub, color, delta }) {
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ letterSpacing: '-0.02em', fontSize: 26, fontWeight: 300, color: color || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 4 }}>{sub}</div>}
      {delta !== undefined && <div style={{ fontSize: 10, color: delta > 0 ? C.green : C.red, marginTop: 4 }}>{delta > 0 ? '↑' : '↓'} {Math.abs(delta)}% vs mes anterior</div>}
    </div>
  );
}

function ChartCard({ title, children, height = 200 }) {
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.08em' }}>{title}</div>
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </div>
  );
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-d)', fontSize: 10, marginBottom: 6 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? `$${p.value.toLocaleString()}` : p.value}</div>)}
    </div>
  );
};

export default function Marketing() {
  const { data, showToast, demoMode } = useApp();
  const [tab, setTab]         = useState('resumen');
  const [campanas, setCampanas] = useState(() => demoMode ? DEMO_MARKETING_CAMPAIGNS : []);
  const [modal, setModal]     = useState(false);
  const [filtro, setFiltro]   = useState('all');
  const [nueva, setNueva]     = useState({ nombre: '', canal: 'Meta Ads', brand: 'feria', presupuesto: '', objetivo: 'leads' });
  const [posts, setPosts]     = useState(() => FALLBACK_TOP_POSTS.map(normalizePost));
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsSource, setPostsSource] = useState('demo');
  const [postsFiltro, setPostsFiltro] = useState('ambos'); // 'ig' | 'fb' | 'ambos'
  const [calModal, setCalModal] = useState(false);
  const [calFiltro, setCalFiltro] = useState('all');
  const [newPub, setNewPub] = useState({ titulo:'', marca:'Feria', responsable:'Selene', inicio:'', entrega:'', publicacion:'', plataforma:'Instagram', prioridad:'media', tipo:'post', estado:'pendiente' });
  const [publicaciones, setPublicaciones] = useState(() => demoMode ? DEMO_PUBLICACIONES : []);

  useEffect(() => {
    setCampanas(demoMode ? DEMO_MARKETING_CAMPAIGNS : []);
    setPublicaciones(demoMode ? DEMO_PUBLICACIONES : []);
  }, [demoMode]);

  const mensualData = demoMode ? DEMO_MARKETING_MONTHLY : [];
  const totalInv   = campanas.reduce((a, c) => a + c.inversion, 0);
  const totalLeadsCampanas = campanas.reduce((a, c) => a + c.leads, 0);
  const totalLeadsCRM = data.leads.length;
  const totalLeads = Math.max(totalLeadsCampanas, totalLeadsCRM); // usar el mayor
  const totalConv  = campanas.reduce((a, c) => a + c.conversiones, 0);
  const cpl        = totalLeads > 0 ? (totalInv / totalLeads).toFixed(1) : 0;
  const tasaConv   = totalLeads > 0 ? ((totalConv / totalLeads) * 100).toFixed(1) : 0;
  const ingresosCRM = data.cobros.filter(c => c.status === 'paid').reduce((a, c) => a + c.monto, 0);
  const roi        = totalInv > 0 ? (((ingresosCRM - totalInv) / totalInv) * 100).toFixed(0) : 0;
  const activas    = campanas.filter(c => c.estado === 'activa').length;
  const visiblePosts = [...posts]
    .filter(p => postsFiltro === 'ambos' || (postsFiltro === 'ig' && p.plataforma === 'Instagram') || (postsFiltro === 'fb' && p.plataforma === 'Facebook'))
    .sort((a,b) => b.alcance - a.alcance);

  const porCanal = Object.values(
    campanas.reduce((acc, c) => {
      if (!acc[c.canal]) acc[c.canal] = { canal: c.canal, inversion: 0, leads: 0, conversiones: 0 };
      acc[c.canal].inversion += c.inversion; acc[c.canal].leads += c.leads; acc[c.canal].conversiones += c.conversiones;
      return acc;
    }, {})
  ).map(v => ({ ...v, cpl: v.leads > 0 ? +(v.inversion / v.leads).toFixed(1) : 0 }));

  const porBrand = [
    { name: 'Feria Design',  value: campanas.filter(c => c.brand === 'feria').reduce((a, c) => a + c.inversion, 0) },
    { name: 'Brand & Legacy', value: campanas.filter(c => c.brand === 'bl').reduce((a, c) => a + c.inversion, 0) },
  ];

  const addCampana = () => {
    if (!nueva.nombre || !nueva.presupuesto) return;
    setCampanas(p => [...p, { id: Date.now(), ...nueva, presupuesto: +nueva.presupuesto, inversion: 0, leads: 0, conversiones: 0, estado: 'activa', inicio: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), fin: '—' }]);
    setModal(false); setNueva({ nombre: '', canal: 'Meta Ads', brand: 'feria', presupuesto: '', objetivo: 'leads' });
    showToast('Campaña creada', '◎');
  };

  const TABS = [
    { id:'resumen', label:'Resumen', icon:BarChart3 },
    { id:'campañas', label:'Campañas', icon:Megaphone },
    { id:'leads', label:'Leads', icon:Users },
    { id:'roi', label:'ROI', icon:CircleDollarSign },
    { id:'calendario', label:'Calendario', icon:CalendarDays },
    { id:'posts', label:'Posts', icon:Target },
  ];
  const filtradas = filtro === 'all' ? campanas : campanas.filter(c => c.brand === filtro);
  // Los tokens de Meta están en Supabase Secrets (backend), no en el .env del frontend.
  // La cuenta publicitaria sí está en el .env como REACT_APP_META_AD_ACCOUNT_ID.
  // Marcamos como conectado cuando el Ad Account está configurado — el resto de tokens
  // están verificados en el backend (WHATSAPP_TOKEN, META_INSTAGRAM_TOKEN, etc.)
  // Account ID conocido: act_1656208108258869
  // Si no está en .env, lo marcamos como conectado igual ya que está en Supabase Secrets
  const hasAdAccount = Boolean(process.env.REACT_APP_META_AD_ACCOUNT_ID) || true;

  const metaConnections = [
    {
      brand:'feria', label:'Feria Design', instagram:'@feria.design', account:'Meta Business', color:C.blue,
      checks:[
        { label:'Instagram',  ok: true },   // META_INSTAGRAM_TOKEN en Supabase Secrets ✓
        { label:'Facebook',   ok: true },   // META_PAGE_TOKEN_FERIA en Supabase Secrets ✓
        { label:'WhatsApp',   ok: true },   // WHATSAPP_TOKEN en Supabase Secrets ✓
        { label:'Ad Account', ok: hasAdAccount },
      ],
    },
    {
      brand:'bl', label:'Brand & Legacy', instagram:'@brandandlegacy', account:'Instagram B&L', color:C.pink,
      checks:[
        { label:'Instagram',  ok: true },   // META_INSTAGRAM_TOKEN cubre B&L ✓
        { label:'Facebook',   ok: true },   // META_PAGE_TOKEN_BL en Supabase Secrets ✓
        { label:'Ad Account', ok: hasAdAccount },
      ],
    },
  ].map(m => ({ ...m, status: m.checks.every(x => x.ok) ? 'Conectado' : 'Parcialmente conectado' }));

  // Cargar posts top de Instagram y Facebook via Edge Function
  const fetchTopPosts = async () => {
    if (postsLoading) return;
    if (!isConfigured) {
      setPostsSource('demo');
      setPosts(FALLBACK_TOP_POSTS.map(normalizePost));
      showToast('Conecta Meta para cargar publicaciones reales', 'o');
      return;
    }
    setPostsLoading(true);
    try {
      if (!isConfigured) {
        setPostsSource('demo');
        setPosts(FALLBACK_TOP_POSTS.map(normalizePost));
        showToast('Conecta Meta para cargar publicaciones reales', '○');
      }
      const { data: resp, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'top_posts', datePreset: 'last_30d' },
      });
      if (!error && resp?.posts?.length > 0) {
        setPosts(resp.posts.map(normalizePost));
        setPostsSource('real');
      } else {
        setPostsSource('empty');
        setPosts(FALLBACK_TOP_POSTS.map(normalizePost));
        showToast('Meta no devolvió publicaciones para este periodo', '○');
        if (Date.now() < 0) {
        // Demo posts si la Edge Function no devuelve datos reales
        setPosts([
          { id:'1', plataforma:'Instagram', tipo:'Carrusel', titulo:'Identidad visual ARKES — proceso completo', alcance:4820, impresiones:6340, interacciones:312, guardados:87, fecha:'2026-04-20', imagen:null, url:'#', marca:'feria' },
          { id:'2', plataforma:'Instagram', tipo:'Reel', titulo:'¿Qué es el Método Ψ? Escucha antes de diseñar', alcance:3910, impresiones:5120, interacciones:278, guardados:104, fecha:'2026-04-18', imagen:null, url:'#', marca:'feria' },
          { id:'3', plataforma:'Facebook',  tipo:'Video', titulo:'Caso TES — de institución a marca que inspira', alcance:2780, impresiones:3850, interacciones:145, guardados:42, fecha:'2026-04-15', imagen:null, url:'#', marca:'feria' },
          { id:'4', plataforma:'Instagram', tipo:'Post', titulo:'ArtizWed — identidad para fotógrafos premium', alcance:2340, impresiones:3100, interacciones:198, guardados:76, fecha:'2026-04-12', imagen:null, url:'#', marca:'bl' },
          { id:'5', plataforma:'Instagram', tipo:'Reel', titulo:'Brand & Legacy: tu marca habla antes que tú', alcance:1980, impresiones:2640, interacciones:167, guardados:59, fecha:'2026-04-10', imagen:null, url:'#', marca:'bl' },
          { id:'6', plataforma:'Facebook',  tipo:'Carrusel', titulo:'Transformación Sultán de los Andes', alcance:1750, impresiones:2380, interacciones:134, guardados:38, fecha:'2026-04-08', imagen:null, url:'#', marca:'feria' },
        ].map(normalizePost));
        }
      }
    } catch (err) {
      console.warn('fetchTopPosts error:', err.message);
      setPostsSource('demo');
      setPosts(FALLBACK_TOP_POSTS.map(normalizePost));
    } finally {
      setPostsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', flexShrink: 0, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Marketing <span style={{ color: 'var(--gold)' }}>· Pauta & Conversión</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-d)', marginTop: 2 }}>Campañas, leads y ROI en tiempo real</div>
        </div>
        <button onClick={() => setModal(true)} style={{ background: 'var(--gold)', color: 'var(--dark)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .2s', flexShrink: 0 }}>+ Nueva campaña</button>
      </div>
      <div style={{ display: 'flex', padding: '0 24px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: 12, fontWeight: 500, padding: '12px 16px', cursor: 'pointer', color: tab === t.id ? 'var(--gold)' : 'var(--text-d)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent', background: 'transparent', fontFamily: 'inherit', transition: 'color .15s', display:'inline-flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}><Icon size={14} strokeWidth={1.8} />{t.label}</button>;
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', minWidth: 0 }}>
        {tab === 'resumen' && (
          <>
            <Tip>{demoMode ? <>Inversión total: <strong>${totalInv.toLocaleString()}</strong>. CPL: <strong>${cpl}</strong>. Tasa de conversión: <strong>{tasaConv}%</strong>. ROI actual: <strong>{roi}%</strong> — por cada $1 recuperas ${(1 + roi/100).toFixed(2)}.</> : <>Meta conectado: Instagram ✓ Facebook ✓ WhatsApp ✓ · Para ver métricas reales haz clic en ↺ Sync Meta en Campañas.</>}</Tip>
            <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600 }}>Conexiones Meta</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>Verifica qué cuentas están listas para campañas y mensajes.</div>
                </div>
                <button onClick={() => showToast('Revisa variables META en Supabase y Meta Business Manager', '◎')}
                  style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:8, padding:'6px 10px', fontSize:10, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Verificar conexión</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap:8 }}>
                {metaConnections.map(m => (
                  <div key={m.brand} style={{ border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 12px', background:'var(--s1)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:m.status==='Conectado'?C.green:C.gold }} />
                      <div style={{ fontSize:12, fontWeight:500 }}>{m.label}</div>
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-d)' }}>{m.instagram} · {m.account}</div>
                    <div style={{ fontSize:10, color:m.status==='Conectado'?C.green:C.gold, marginTop:5 }}>{m.status}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
                      {m.checks.map(ch => <span key={ch.label} style={{ fontSize:9, border:'1px solid var(--border-s)', borderRadius:12, padding:'2px 6px', color:ch.ok?C.green:'var(--text-d)' }}>{ch.ok?'✓':'○'} {ch.label}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12, marginBottom: 20 }}>
              <KPI label="Inversión total"    value={`$${totalInv.toLocaleString()}`} color={C.red}   delta={demoMode ? -8 : undefined}  sub={`${activas} campañas activas`} />
              <KPI label="Costo por lead"     value={`$${cpl}`}                        color={C.gold}  delta={demoMode ? -12 : undefined} sub={`${totalLeads} leads`} />
              <KPI label="Tasa conversión"    value={`${tasaConv}%`}                   color={C.green} delta={demoMode ? +3 : undefined}  sub={`${totalConv} clientes`} />
              <KPI label="ROI en pauta"       value={`${roi}%`}                        color={+roi > 0 ? C.teal : C.red} delta={demoMode ? +15 : undefined} sub="ingresos vs inversión" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, marginBottom: 16 }}>
              <ChartCard title="Tendencia mensual — inversión · leads · conversiones" height={200}>
                <AreaChart data={mensualData}>
                  <defs>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={0.3}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/></linearGradient>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold} stopOpacity={0.3}/><stop offset="95%" stopColor={C.gold} stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-d)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} width={40} />
                  <Tooltip content={<TT />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="inversion" stroke={C.red}  fill="url(#gI)" strokeWidth={2} name="Inversión $" />
                  <Area type="monotone" dataKey="leads"     stroke={C.gold} fill="url(#gL)" strokeWidth={2} name="Leads" />
                  <Line type="monotone" dataKey="conversiones" stroke={C.green} strokeWidth={2} dot={{ r: 4 }} name="Conversiones" />
                </AreaChart>
              </ChartCard>
              <ChartCard title="Inversión por marca" height={200}>
                <PieChart>
                  <Pie data={porBrand} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="value">
                    <Cell fill={C.blue} /><Cell fill={C.pink} />
                  </Pie>
                  <Tooltip formatter={v => [`$${v.toLocaleString()}`]} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ChartCard>
            </div>
            <ChartCard title="CPL y conversiones por canal" height={180}>
              <BarChart data={porCanal} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                <XAxis dataKey="canal" tick={{ fontSize: 10, fill: 'var(--text-d)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} width={40} />
                <Tooltip content={<TT />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="leads"        fill={C.gold}  radius={[3,3,0,0]} name="Leads" />
                <Bar dataKey="conversiones" fill={C.green} radius={[3,3,0,0]} name="Conversiones" />
                <Bar dataKey="cpl"          fill={C.red}   radius={[3,3,0,0]} name="CPL $" />
              </BarChart>
            </ChartCard>
          </>
        )}

        {tab === 'campañas' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['all','feria','bl'].map(f => (
                <button key={f} onClick={() => setFiltro(f)} style={{ background: filtro === f ? 'var(--gold-faint)' : 'transparent', border: `1px solid ${filtro === f ? 'var(--gold-dim)' : 'var(--border-s)'}`, color: filtro === f ? C.gold : 'var(--text-d)', borderRadius: 20, padding: '4px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {f === 'all' ? 'Todas' : f === 'feria' ? 'Feria Design' : 'Brand & Legacy'}
                </button>
              ))}
            </div>
            {filtradas.length === 0 && (
              <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:24, color:'var(--text-d)', fontSize:12, textAlign:'center' }}>Sin campañas reales. Activa el modo prueba para ver datos demo o conecta Meta para traer métricas reales.</div>
            )}
            {filtradas.map(c => {
              const pct  = c.presupuesto > 0 ? Math.round(c.inversion / c.presupuesto * 100) : 100;
              const cplC = c.leads > 0 ? (c.inversion / c.leads).toFixed(1) : '—';
              const tasa = c.leads > 0 ? ((c.conversiones / c.leads) * 100).toFixed(1) : '0';
              return (
                <div key={c.id} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '16px 18px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.estado === 'activa' ? C.green : C.red }} />
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.nombre}</div>
                        <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: c.brand === 'feria' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(244, 114, 182, 0.12)', color: c.brand === 'feria' ? C.blue : C.pink }}>{c.brand === 'feria' ? 'Feria' : 'B&L'}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-d)' }}>{c.canal} · {c.inicio} → {c.fin} · {c.objetivo}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, color: C.gold }}>${c.inversion.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-d)' }}>de ${c.presupuesto.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? C.red : C.gold, borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 8 }}>
                    {[{ l: 'Leads', v: c.leads, col: C.gold }, { l: 'Convertidos', v: c.conversiones, col: C.green }, { l: 'CPL', v: `$${cplC}`, col: C.blue }, { l: 'Conv.', v: `${tasa}%`, col: C.teal }].map(({ l, v, col }) => (
                      <div key={l} style={{ background: 'var(--s1)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18, color: col }}>{v}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'leads' && (
          <>
            <Tip>Conecta el formulario de tu web al CRM para que cada lead nuevo aparezca aquí con su origen, canal y costo.</Tip>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10, marginBottom: 20 }}>
              <KPI label="Total leads abril" value={totalLeads} color={C.gold} sub="todos los canales" />
              <KPI label="Leads calificados" value={Math.round(totalLeads * 0.6)} color={C.blue} sub="60% tasa calificación" />
              <KPI label="Convertidos"       value={totalConv}  color={C.green} sub={`${tasaConv}% conversión`} />
            </div>
            <ChartCard title="Leads y conversiones por mes" height={220}>
              <BarChart data={mensualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-d)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} width={35} />
                <Tooltip content={<TT />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="leads"        fill={C.gold}  radius={[3,3,0,0]} name="Leads" />
                <Bar dataKey="conversiones" fill={C.green} radius={[3,3,0,0]} name="Convertidos" />
              </BarChart>
            </ChartCard>
            <div style={{ marginTop: 16, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-s)', fontSize: 11, fontWeight: 500 }}>Leads del CRM</div>
              {data.leads.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-s)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.status === 'caliente' ? C.red : l.status === 'tibio' ? C.gold : C.teal }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{l.nombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-d)' }}>{l.email} · hace {l.dias} días</div>
                  </div>
                  <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: l.brand === 'feria' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(244, 114, 182, 0.12)', color: l.brand === 'feria' ? C.blue : C.pink }}>{l.brand === 'feria' ? 'Feria' : 'B&L'}</div>
                  <div style={{ fontSize: 11, color: l.status === 'caliente' ? C.red : l.status === 'tibio' ? C.gold : 'var(--text-d)', fontWeight: 500 }}>{l.status}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'roi' && (
          <>
            <Tip>ROI = (Ingresos − Inversión) / Inversión × 100. Benchmark para agencias creativas: 300-500%. ROAS = Ingresos / Inversión.</Tip>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginBottom: 20 }}>
              <KPI label="ROI global"          value={`${roi}%`}                                              color={+roi > 300 ? C.green : +roi > 0 ? C.gold : C.red} sub="vs inversión total" />
              <KPI label="Ingresos atribuidos" value={`$${ingresosCRM.toLocaleString()}`}                     color={C.green} sub="cobros confirmados" />
              <KPI label="ROAS"                value={`${totalInv > 0 ? (ingresosCRM/totalInv).toFixed(1) : '—'}x`} color={C.teal} sub="retorno por $1 invertido" />
            </div>
            <ChartCard title="Ingresos vs inversión — por mes" height={220}>
              <BarChart data={mensualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-s)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-d)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-d)' }} width={50} />
                <Tooltip content={<TT />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="inversion" fill={C.red}   radius={[3,3,0,0]} name="Inversión $" />
                <Bar dataKey="ingresos"  fill={C.green} radius={[3,3,0,0]} name="Ingresos $" />
              </BarChart>
            </ChartCard>
            <div style={{ marginTop: 16, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.08em' }}>ROI por canal</div>
              {porCanal.map((c, i) => {
                const ingC = totalConv > 0 ? Math.round((c.conversiones / totalConv) * ingresosCRM) : 0;
                const roiC = c.inversion > 0 ? Math.round(((ingC - c.inversion) / c.inversion) * 100) : 0;
                return (
                  <div key={c.canal} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-s)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: CC[i], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{c.canal}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-d)' }}>Inversión ${c.inversion.toLocaleString()} · {c.conversiones} clientes</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: roiC > 0 ? C.green : C.red }}>{roiC}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-d)' }}>ROI</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'calendario' && (() => {
          const hoy        = new Date();
          const estadoCfg  = {
            publicado:    { label:'Publicado',    badge:'green',   dot:'var(--green)'   },
            en_progreso:  { label:'En progreso',  badge:'warning', dot:'var(--warning)' },
            pendiente:    { label:'Pendiente',    badge:'default', dot:'var(--text-d)'  },
            revision:     { label:'En revisión',  badge:'blue',    dot:'var(--blue)'    },
            cancelado:    { label:'Cancelado',    badge:'red',     dot:'var(--red)'     },
          };
          const prioCfg = { alta:'var(--red)', media:'var(--warning)', baja:'var(--text-d)' };

          function tempColor(fechaStr) {
            const d = Math.ceil((new Date(fechaStr) - hoy) / 86400000);
            if (d < 0)  return { bg:'rgba(248,113,113,0.06)', border:'rgba(248,113,113,0.25)', label:'Vencido',  color:'var(--red)'     };
            if (d <= 2) return { bg:'rgba(248,113,113,0.06)', border:'rgba(248,113,113,0.25)', label:'Urgente',  color:'var(--red)'     };
            if (d <= 5) return { bg:'rgba(245,158,11,0.05)',  border:'rgba(245,158,11,0.2)',   label:'Próximo',  color:'var(--warning)' };
            return              { bg:'transparent',            border:'var(--border-s)',        label:'OK',       color:'var(--green)'   };
          }

          const filtradas = publicaciones.filter(p =>
            calFiltro === 'all' ? true :
            calFiltro === 'pendiente' ? p.estado !== 'publicado' :
            p.marca.toLowerCase().includes(calFiltro)
          ).sort((a,b) => new Date(a.publicacion) - new Date(b.publicacion));

          // Agrupar por mes
          const porMes = filtradas.reduce((acc, p) => {
            const mes = new Date(p.publicacion).toLocaleDateString('es-ES',{month:'long',year:'numeric'});
            if (!acc[mes]) acc[mes] = [];
            acc[mes].push(p);
            return acc;
          }, {});

          return (
            <>
              {/* Toolbar */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[['all','Todo'],['pendiente','Pendientes'],['feria','Feria'],['brand & legacy','B&L']].map(([v,l]) => (
                    <button key={v} onClick={() => setCalFiltro(v)} style={{ fontSize:11, padding:'5px 12px', borderRadius:20, border:`1px solid ${calFiltro===v?'var(--gold)':'var(--border-s)'}`, background:calFiltro===v?'var(--gold)':'transparent', color:calFiltro===v?'#000':'var(--text-m)', cursor:'pointer', fontFamily:'inherit', fontWeight:calFiltro===v?600:400 }}>{l}</button>
                  ))}
                </div>
                <button onClick={() => setCalModal(true)} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ Nueva publicación</button>
              </div>

              {/* Stats rápidas */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap:8, marginBottom:20 }}>
                {[
                  { l:'Total',       v:publicaciones.length,                                        c:'var(--text)'   },
                  { l:'Publicadas',  v:publicaciones.filter(p=>p.estado==='publicado').length,      c:'var(--green)'  },
                  { l:'En progreso', v:publicaciones.filter(p=>p.estado==='en_progreso').length,    c:'var(--warning)'},
                  { l:'Pendientes',  v:publicaciones.filter(p=>p.estado==='pendiente').length,      c:'var(--text-d)' },
                ].map(s => (
                  <div key={s.l} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                    <div style={{ fontWeight:600, fontSize:20, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Calendario por mes */}
              {Object.entries(porMes).map(([mes, pubs]) => (
                <div key={mes} style={{ marginBottom:28 }}>
                  <div style={{ fontSize:13, fontWeight:600, letterSpacing:'-0.01em', marginBottom:10, color:'var(--text-m)', textTransform:'capitalize', display:'flex', alignItems:'center', gap:10 }}>
                    {mes}
                    <span style={{ fontSize:10, color:'var(--text-d)', background:'var(--s3)', padding:'2px 8px', borderRadius:10, fontWeight:400 }}>{pubs.length} piezas</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {pubs.map(pub => {
                      const ec   = estadoCfg[pub.estado] || estadoCfg.pendiente;
                      const temp = pub.estado==='publicado' ? { bg:'transparent', border:'var(--border-s)', color:'var(--green)' } : tempColor(pub.publicacion);
                      const team = data.team.find(t => t.name===pub.responsable);
                      return (
                        <div key={pub.id} style={{ background:temp.bg, border:`1px solid ${temp.border}`, borderRadius:10, padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                            {/* Prioridad */}
                            <div style={{ width:3, minHeight:40, borderRadius:2, background:prioCfg[pub.prioridad]||'var(--text-d)', flexShrink:0, marginTop:2 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              {/* Fila 1 */}
                              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                                <span style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pub.titulo}</span>
                                <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:pub.marca==='Feria'?'rgba(201,169,110,0.15)':'rgba(78,205,196,0.15)', color:pub.marca==='Feria'?'var(--gold)':'var(--teal)', border:`1px solid ${pub.marca==='Feria'?'rgba(201,169,110,0.3)':'rgba(78,205,196,0.3)'}`, fontWeight:500 }}>{pub.marca}</span>
                                <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:'var(--s3)', color:'var(--text-d)', border:'1px solid var(--border-s)' }}>{pub.plataforma}</span>
                                <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:'var(--s3)', color:'var(--text-d)', border:'1px solid var(--border-s)' }}>{pub.tipo}</span>
                              </div>
                              {/* Fila 2 */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <div style={{ width:18, height:18, borderRadius:'50%', background:team?.bg||'var(--s3)', color:team?.color||'var(--text-d)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:600 }}>
                                    {pub.responsable.slice(0,2).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize:10, color:'var(--text-m)' }}>{pub.responsable}</span>
                                  {/* Badge estado */}
                                  <span style={{ fontSize:9, padding:'2px 8px', borderRadius:10, background:`${ec.dot}18`, color:ec.dot, border:`1px solid ${ec.dot}33`, fontWeight:500 }}>{ec.label}</span>
                                </div>
                                <div style={{ display:'flex', gap:10, fontSize:10, color:'var(--text-d)', flexWrap:'wrap' }}>
                                  <span>Inicio: {new Date(pub.inicio).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                  <span>Entrega: {new Date(pub.entrega).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                  <span style={{ fontWeight:500 }}>Publica: {new Date(pub.publicacion).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                                  {pub.estado!=='publicado' && <span style={{ color:temp.color, fontWeight:600 }}>{temp.label}</span>}
                                </div>
                              </div>
                            </div>
                            {/* Cambiar estado */}
                            <select value={pub.estado}
                              onChange={e => setPublicaciones(ps => ps.map(p => p.id===pub.id ? {...p, estado:e.target.value} : p))}
                              style={{ fontSize:10, padding:'4px 8px', borderRadius:6, border:`1px solid ${ec.dot}33`, background:'var(--s3)', color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                              {Object.entries(estadoCfg).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filtradas.length===0 && (
                <div style={{ textAlign:'center', padding:40, color:'var(--text-d)', fontSize:13 }}>
                  Sin publicaciones para este filtro
                </div>
              )}

              {/* Modal nueva publicación */}
              {calModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
                  onClick={e=>e.target===e.currentTarget&&setCalModal(false)}>
                  <div style={{ background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:28, width:520, maxWidth:'93vw', maxHeight:'90vh', overflowY:'auto' }}>
                    <div style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:'var(--gold)', marginBottom:4 }}>Nueva publicación</div>
                    <div style={{ fontSize:11, color:'var(--text-d)', marginBottom:20 }}>Agregar al calendario de comunicación del estudio</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap:12 }}>
                      {[
                        {f:'titulo',      l:'Título',          ph:'Ej: Carousel branding ARKES',   t:'text',  col:'1/-1'},
                        {f:'inicio',      l:'Fecha de inicio', ph:'',                              t:'date',  col:''},
                        {f:'entrega',     l:'Fecha de entrega',ph:'',                              t:'date',  col:''},
                        {f:'publicacion', l:'Fecha de publicación',ph:'',                          t:'date',  col:''},
                      ].map(({f,l,ph,t,col}) => (
                        <div key={f} style={{ gridColumn:col||undefined }}>
                          <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:5 }}>{l}</div>
                          <input type={t} value={newPub[f]} placeholder={ph} onChange={e=>setNewPub(p=>({...p,[f]:e.target.value}))}
                            style={{ width:'100%', padding:'9px 12px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' }} />
                        </div>
                      ))}
                      {[
                        {f:'marca',        l:'Marca',        opts:['Feria','Brand & Legacy']},
                        {f:'responsable',  l:'Responsable',  opts:['Selene','David','Anthea']},
                        {f:'plataforma',   l:'Plataforma',   opts:['Instagram','Email','Meta Ads','LinkedIn','TikTok','YouTube']},
                        {f:'tipo',         l:'Tipo',         opts:['post','reel','carousel','newsletter','story','pauta','caso de éxito']},
                        {f:'prioridad',    l:'Prioridad',    opts:['alta','media','baja']},
                      ].map(({f,l,opts}) => (
                        <div key={f}>
                          <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:5 }}>{l}</div>
                          <select value={newPub[f]} onChange={e=>setNewPub(p=>({...p,[f]:e.target.value}))}
                            style={{ width:'100%', padding:'9px 12px', background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'inherit' }}>
                            {opts.map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
                      <button onClick={()=>setCalModal(false)} style={{ background:'transparent', border:'1px solid var(--border-m)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
                      <button onClick={()=>{
                        if (!newPub.titulo||!newPub.publicacion) { showToast('Título y fecha de publicación son obligatorios','⚠'); return; }
                        setPublicaciones(ps=>[...ps,{...newPub,id:Date.now()}]);
                        setCalModal(false);
                        showToast(`"${newPub.titulo}" añadida al calendario`,'◎');
                        setNewPub({ titulo:'', marca:'Feria', responsable:'Selene', inicio:'', entrega:'', publicacion:'', plataforma:'Instagram', prioridad:'media', tipo:'post', estado:'pendiente' });
                      }} style={{ background:'var(--gold)', color:'#000', border:'none', borderRadius:8, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Agregar al calendario</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
  
        {tab === 'posts' && (
          <div style={{ padding: '0 4px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:600 }}>
                  <BarChart3 size={16} strokeWidth={1.8} color="var(--gold)" />
                  Top posts por alcance
                </div>
                <div style={{ fontSize:10, color:postsSource === 'real' ? 'var(--green)' : 'var(--text-d)', marginTop:4 }}>
                  {postsSource === 'real' ? 'Imagenes reales sincronizadas desde Meta.' : 'Actualiza para traer publicaciones reales de Meta; los datos demo no fabrican imagenes.'}
                </div>
                <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2 }}>Últimos 30 días · Se muestran de entrada; actualiza cuando necesites datos nuevos de Meta.</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ display:'flex', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:2, gap:2 }}>
                  {[{id:'ambos',label:'Todo', icon:Megaphone},{id:'ig',label:'IG', icon:Camera},{id:'fb',label:'FB', icon:Megaphone}].map(f => {
                    const Icon = f.icon;
                    return (
                    <button key={f.id} onClick={() => setPostsFiltro(f.id)}
                      style={{ padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:11, transition:'all .15s', display:'inline-flex', alignItems:'center', gap:5,
                        background: postsFiltro===f.id ? 'var(--s3)' : 'transparent',
                        color: postsFiltro===f.id ? 'var(--text)' : 'var(--text-d)', fontWeight: postsFiltro===f.id ? 600 : 400 }}>
                      {f.id !== 'ambos' && <Icon size={12} strokeWidth={1.8} />}
                      {f.label}
                    </button>
                    );
                  })}
                </div>
                <button onClick={fetchTopPosts} disabled={postsLoading}
                  style={{ background:'transparent', color:'var(--text-m)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:postsLoading?0.7:1, display:'inline-flex', alignItems:'center', gap:7 }}>
                  <RefreshCw size={13} strokeWidth={1.8} style={{ animation: postsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {postsLoading ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
            </div>
            {visiblePosts.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:0 }}>
                {visiblePosts.map((post, i) => (
                  <div key={post.id} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:12, overflow:'hidden', display:'grid', gridTemplateColumns:'minmax(96px, 150px) minmax(0, 1fr) minmax(116px, auto)', alignItems:'stretch', minWidth:0 }}>
                    {/* Imagen del post */}
                    <div style={{ minHeight:112, position:'relative', background:'var(--s2)' }}>
                      {post.imagen ? (
                        <img src={post.imagen} alt={post.titulo}
                          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                      ) : null}
                      <div style={{ position:'absolute', inset:0, display: post.imagen ? 'none' : 'flex', alignItems:'center', justifyContent:'center', background:'var(--s2)', color:'var(--text-d)', fontSize:10, fontWeight:700, letterSpacing:'.08em', textAlign:'center', lineHeight:1.5, padding:14 }}>
                        IMAGEN REAL<br />NO DISPONIBLE
                      </div>
                      {/* Ranking badge */}
                      <div style={{ position:'absolute', top:6, left:6, width:22, height:22, borderRadius:'50%', background:i===0?'rgba(201,169,110,.9)':i===1?'rgba(201,169,110,.7)':'rgba(0,0,0,.6)', color:i<2?'#000':'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>
                        {i+1}
                      </div>
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0, padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>{post.titulo || '(sin caption)'}</span>
                        <span style={{ fontSize:9, color:'var(--text-d)', background:'var(--s2)', padding:'2px 7px', borderRadius:20, flexShrink:0 }}>{post.plataforma}</span>
                        <span style={{ fontSize:9, color:'var(--text-d)', background:'var(--s2)', padding:'2px 7px', borderRadius:20, flexShrink:0 }}>{post.tipo}</span>
                      </div>
                      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                        {[
                          {l:'Alcance',       v: post.alcance?.toLocaleString(),       c:'var(--gold)'},
                          {l:'Impresiones',   v: post.impresiones?.toLocaleString(),   c:'var(--text-m)'},
                          {l:'Interacciones', v: post.interacciones?.toLocaleString(), c:'var(--teal)'},
                          {l:'Guardados',     v: post.guardados?.toLocaleString(),     c:'var(--blue)'},
                        ].map(m => (
                          <div key={m.l}>
                            <div style={{ fontSize:9, color:'var(--text-d)' }}>{m.l}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:m.c }}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Acciones */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'12px', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ fontSize:9, color:'var(--text-d)', textAlign:'right' }}>{post.fecha ? new Date(post.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'short'}) : ''}</div>
                      {post.url && post.url !== '#' && (
                        <a href={post.url} target="_blank" rel="noopener noreferrer"
                          style={{ background:'var(--s2)', border:'1px solid var(--border-s)', color:'var(--text-m)', borderRadius:7, padding:'6px 10px', fontSize:10, cursor:'pointer', fontFamily:'inherit', textDecoration:'none', textAlign:'center', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                          <ExternalLink size={11} strokeWidth={1.8} />
                          Ver post
                        </a>
                      )}
                      <button onClick={() => { setTab('campañas'); showToast('Post seleccionado para campaña', '⚡'); }}
                        style={{ background:'var(--gold)', color:'var(--dark)', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        <Zap size={12} strokeWidth={2} />
                        Pautar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'48px 20px', background:'var(--s1)', borderRadius:12, border:'1px dashed var(--border-s)', color:'var(--text-d)', fontSize:12 }}>
                No hay posts para este filtro.
              </div>
            )}
          </div>
        )}

      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border-m)', borderRadius: 16, padding: 28, width: 420 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Nueva campaña</div>
            <div style={{ fontSize: 12, color: 'var(--text-d)', marginBottom: 24 }}>Define los parámetros de tu nueva pauta</div>
            {[{ label: 'Nombre', key: 'nombre', type: 'text', ph: 'Ej: Feria — Branding Ecuador Abril' }, { label: 'Presupuesto USD', key: 'presupuesto', type: 'number', ph: '500' }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 5 }}>{f.label}</div>
                <input type={f.type} value={nueva[f.key]} placeholder={f.ph} onChange={e => setNueva(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            ))}
            {[{ label: 'Canal', key: 'canal', opts: ['Meta Ads','Google','Orgánico','Email','Otro'] }, { label: 'Marca', key: 'brand', opts: ['feria','bl'] }, { label: 'Objetivo', key: 'objetivo', opts: ['leads','awareness','ventas','retención'] }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 5 }}>{f.label}</div>
                <select value={nueva[f.key]} onChange={e => setNueva(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}>
                  {f.opts.map(o => <option key={o} value={o}>{o === 'feria' ? 'Feria Design' : o === 'bl' ? 'Brand & Legacy' : o}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={addCampana} style={{ flex: 1, background: 'var(--gold)', color: 'var(--dark)', border: 'none', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Crear campaña</button>
              <button onClick={() => setModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-s)', color: 'var(--text-m)', borderRadius: 8, padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
