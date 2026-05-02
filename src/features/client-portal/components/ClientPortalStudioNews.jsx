import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Globe2,
  Image as ImageIcon,
  Images,
  Megaphone,
  PenTool,
  Save,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'feria_portal_studio_news';

const ICONS = {
  brush: Brush,
  sparkles: Sparkles,
  globe: Globe2,
  images: Images,
  pen: PenTool,
};

export const DEFAULT_STUDIO_NEWS_ITEMS = [
  {
    id: 'mantenimiento',
    icon: 'brush',
    tag: 'Crecimiento',
    title: 'Mantenimiento mensual de marca',
    copy: 'Acompanamiento para que tu identidad se mantenga consistente en piezas, redes y campanas.',
    cta: 'Pedir propuesta',
    tone: '#C9A96E',
    accent: '#E06060',
    imageUrl: '',
  },
  {
    id: 'lanzamiento',
    icon: 'sparkles',
    tag: 'Lanzamiento',
    title: 'Campana de salida al mercado',
    copy: 'Estrategia visual y piezas clave para presentar tu nueva marca con direccion y claridad.',
    cta: 'Explorar campana',
    tone: '#D94F68',
    accent: '#C9A96E',
    imageUrl: '',
  },
  {
    id: 'digital',
    icon: 'globe',
    tag: 'Digital',
    title: 'Landing o sitio web',
    copy: 'Convierte tu identidad en una experiencia digital preparada para vender, agendar o captar leads.',
    cta: 'Quiero verlo',
    tone: '#60A5FA',
    accent: '#5EEAD4',
    imageUrl: '',
  },
  {
    id: 'contenido',
    icon: 'images',
    tag: 'Contenido',
    title: 'Sistema de plantillas para redes',
    copy: 'Un set editable para comunicar con la misma calidad visual despues de la entrega del Brand Kit.',
    cta: 'Solicitar opciones',
    tone: '#D4537E',
    accent: '#8B5CF6',
    imageUrl: '',
  },
];

function normalizeNewsItems(items) {
  const source = Array.isArray(items) && items.length ? items : DEFAULT_STUDIO_NEWS_ITEMS;
  return source.map((item, index) => ({
    ...DEFAULT_STUDIO_NEWS_ITEMS[index % DEFAULT_STUDIO_NEWS_ITEMS.length],
    ...item,
    id: item.id || `news-${index}`,
    icon: item.icon || 'sparkles',
    tone: item.tone || '#D94F68',
    accent: item.accent || '#C9A96E',
    imageUrl: item.imageUrl || '',
  }));
}

export function readStoredStudioNewsItems() {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_NEWS_ITEMS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return normalizeNewsItems(saved);
  } catch (_) {
    return DEFAULT_STUDIO_NEWS_ITEMS;
  }
}

function persistStudioNewsItems(items) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function VisualPanel({ item, isDark, compact = false, hero = false }) {
  const Icon = ICONS[item.icon] || PenTool;
  const paper = isDark ? '#161616' : '#F8F4EC';
  const ink = isDark ? '#F5F5F4' : '#171717';
  const line = isDark ? 'rgba(255,255,255,.18)' : 'rgba(23,23,23,.18)';
  const imageUrl = String(item.imageUrl || '').trim();
  return (
    <div className={`studio-news-visual ${hero ? 'studio-news-visual-hero' : ''} ${compact ? 'studio-news-visual-compact' : ''}`} style={{
      height: compact ? 132 : '100%',
      minHeight: compact ? 132 : hero ? 320 : 240,
      maxHeight: compact ? 132 : 'none',
      width: '100%',
      borderRadius: hero ? 0 : compact ? '18px 18px 0 0' : 20,
      border: hero || compact ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(24,24,27,.10)'}`,
      background: imageUrl
        ? `linear-gradient(0deg, rgba(12,10,9,.28), rgba(12,10,9,.08)), url("${imageUrl}") center / cover`
        : `radial-gradient(circle at 76% 16%, ${item.accent}24, transparent 36%), linear-gradient(145deg, ${paper}, ${isDark ? '#0F0F10' : '#EFE8DD'})`,
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: hero || compact ? 'none' : isDark ? 'none' : '0 18px 45px rgba(23,23,23,.08)',
    }}>
      {!imageUrl && (
        <>
          <div style={{ position:'absolute', inset: compact ? 18 : 28, border:`2px solid ${line}`, borderRadius: compact ? 12 : 18 }} />
          <div style={{ position:'absolute', left: compact ? 22 : 38, top: compact ? 22 : 36, width: compact ? 64 : 116, height: compact ? 8 : 12, borderRadius: 20, background: item.tone }} />
          <div style={{ position:'absolute', left: compact ? 22 : 38, top: compact ? 38 : 58, width: compact ? 92 : 160, height: compact ? 6 : 9, borderRadius: 20, background: `${item.accent}AA` }} />
          <div style={{ position:'absolute', left: compact ? 22 : 38, bottom: compact ? 22 : 40, width: compact ? 76 : 118, height: compact ? 5 : 7, borderRadius: 20, background: line }} />
          <div style={{ width: compact ? 48 : 80, height: compact ? 48 : 80, borderRadius: compact ? 16 : 24, background: `${item.tone}18`, border:`1px solid ${item.tone}44`, color: item.tone, display:'grid', placeItems:'center', zIndex: 1 }}>
            <Icon size={compact ? 22 : 34} strokeWidth={1.8} />
          </div>
          <span style={{ position:'absolute', left: compact ? 26 : 44, bottom: compact ? 40 : 64, color: ink, fontFamily:"'DM Serif Display', serif", fontSize: compact ? 18 : 28, lineHeight:1 }}>
            {item.tag}
          </span>
        </>
      )}
      <div style={{ position:'absolute', right: compact ? 24 : 42, bottom: compact ? 20 : 38, color: imageUrl ? '#fff' : item.tone, fontWeight: 900, fontSize: compact ? 10 : 15, letterSpacing: '.08em', textShadow: imageUrl ? '0 2px 10px rgba(0,0,0,.35)' : 'none' }}>FERIA</div>
    </div>
  );
}

function EditableNewsPanel({ item, items, active, onActiveChange, onChangeItem, text, muted, border, card, gold }) {
  const fieldStyle = {
    width: '100%',
    minWidth: 0,
    background: card,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: '9px 11px',
    color: text,
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 18, padding: 14, marginBottom: 18, background: card }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: text }}>Editar novedades del portal</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>Estos textos e imagenes aparecen en la seccion Novedades del cliente.</div>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:7, color: gold, fontSize: 11, fontWeight: 850 }}>
          <Save size={14} strokeWidth={1.8} /> Guardado local del preview
        </div>
      </div>

      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom: 8, marginBottom: 10 }}>
        {items.map((news, idx) => (
          <button key={news.id} type="button" onClick={() => onActiveChange(idx)} style={{
            flex:'0 0 auto',
            border:`1px solid ${idx === active ? gold : border}`,
            background: idx === active ? `${gold}12` : 'transparent',
            color: idx === active ? gold : muted,
            borderRadius: 999,
            padding:'6px 10px',
            fontSize: 11,
            fontWeight: 800,
            cursor:'pointer',
            fontFamily:'inherit',
          }}>
            {idx + 1}. {news.tag}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 10 }}>
        <label style={{ fontSize: 10, color: muted, textTransform:'uppercase', letterSpacing:'.1em' }}>
          Etiqueta
          <input value={item.tag} onChange={e => onChangeItem({ tag: e.target.value })} style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 10, color: muted, textTransform:'uppercase', letterSpacing:'.1em' }}>
          Titulo
          <input value={item.title} onChange={e => onChangeItem({ title: e.target.value })} style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 10, color: muted, textTransform:'uppercase', letterSpacing:'.1em' }}>
          Boton
          <input value={item.cta} onChange={e => onChangeItem({ cta: e.target.value })} style={{ ...fieldStyle, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 10, color: muted, textTransform:'uppercase', letterSpacing:'.1em' }}>
          Color
          <input type="color" value={item.tone} onChange={e => onChangeItem({ tone: e.target.value })} style={{ ...fieldStyle, height: 40, padding: 5, marginTop: 6 }} />
        </label>
        <label style={{ gridColumn:'1 / -1', fontSize: 10, color: muted, textTransform:'uppercase', letterSpacing:'.1em' }}>
          Imagen de la novedad
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', gap:8, marginTop: 6 }}>
            <input value={item.imageUrl || ''} onChange={e => onChangeItem({ imageUrl: e.target.value })} placeholder="URL de imagen, banner o pieza promocional" style={fieldStyle} />
            <div style={{ width:42, borderRadius:10, border:`1px solid ${border}`, display:'grid', placeItems:'center', color: muted }}>
              <ImageIcon size={17} strokeWidth={1.8} />
            </div>
          </div>
        </label>
        <label style={{ gridColumn:'1 / -1', fontSize: 10, color: muted, textTransform:'uppercase', letterSpacing:'.1em' }}>
          Descripcion
          <textarea value={item.copy} onChange={e => onChangeItem({ copy: e.target.value })} rows={3} style={{ ...fieldStyle, marginTop: 6, resize:'vertical', lineHeight:1.55 }} />
        </label>
      </div>
    </div>
  );
}

export default function ClientPortalStudioNews({ isDark, accentColor = '#E11D48', onRequest, editable = false, items, onItemsChange }) {
  const [active, setActive] = useState(0);
  const [newsItems, setNewsItems] = useState(() => normalizeNewsItems(items || readStoredStudioNewsItems()));
  const gold = accentColor || '#E11D48';
  const text = isDark ? '#F4F4F5' : '#18181B';
  const muted = isDark ? '#A1A1AA' : '#71717A';
  const subtle = isDark ? 'rgba(244,244,245,.48)' : 'rgba(24,24,27,.48)';
  const card = isDark ? '#141416' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,.09)' : 'rgba(24,24,27,.10)';
  const slide = newsItems[active] || newsItems[0] || DEFAULT_STUDIO_NEWS_ITEMS[0];

  useEffect(() => {
    if (items) setNewsItems(normalizeNewsItems(items));
  }, [items]);

  useEffect(() => {
    if (newsItems.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActive(current => (current + 1) % newsItems.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [newsItems.length]);

  const updateActiveItem = (changes) => {
    const next = newsItems.map((item, idx) => idx === active ? { ...item, ...changes } : item);
    setNewsItems(next);
    onItemsChange?.(next);
    if (editable) persistStudioNewsItems(next);
  };

  const next = () => setActive((active + 1) % newsItems.length);
  const prev = () => setActive((active - 1 + newsItems.length) % newsItems.length);

  return (
    <div style={{ padding: editable ? '20px 20px 28px' : '28px 24px 36px' }}>
      <div style={{ maxWidth: editable ? 1040 : 940, margin: '0 auto' }}>
        {editable && (
          <EditableNewsPanel
            item={slide}
            items={newsItems}
            active={active}
            onActiveChange={setActive}
            onChangeItem={updateActiveItem}
            text={text}
            muted={muted}
            border={border}
            card={card}
            gold={gold}
          />
        )}

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent:'space-between', marginBottom: 22, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: `${gold}14`, color: gold, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Megaphone size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, lineHeight: 1.05, color: text }}>
                Novedades del <em style={{ color: gold }}>estudio</em>
              </div>
              <div style={{ fontSize: 12, color: muted, lineHeight: 1.7, maxWidth: 560, marginTop: 8 }}>
                Ideas, servicios y recursos para extender el valor de tu marca cuando tenga sentido para tu siguiente etapa.
              </div>
            </div>
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            {[ArrowLeft, ArrowRight].map((Control, idx) => (
              <button key={idx ? 'next' : 'prev'} type="button" onClick={idx ? next : prev} style={{ width:38, height:38, borderRadius:12, border:`1px solid ${border}`, background:card, color:text, display:'grid', placeItems:'center', cursor:'pointer' }}>
                <Control size={16} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>

        <section className="studio-news-hero" style={{
          display:'grid',
          gridTemplateColumns:'minmax(0, .95fr) minmax(300px, 1fr)',
          gap:0,
          alignItems:'stretch',
          background: card,
          border:`1px solid ${border}`,
          borderRadius: 22,
          padding: 0,
          marginBottom: 18,
          overflow: 'hidden',
        }}>
          <VisualPanel item={slide} isDark={isDark} hero />
          <div className="studio-news-hero-copy" style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:'clamp(20px, 4vw, 42px)' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, alignSelf:'flex-start', color: slide.tone, background:`${slide.tone}12`, border:`1px solid ${slide.tone}35`, borderRadius:999, padding:'6px 11px', fontSize:11, fontWeight:850, marginBottom:16 }}>
              <Sparkles size={13} strokeWidth={1.8} /> {slide.tag}
            </div>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'clamp(28px, 4vw, 42px)', lineHeight:1.02, color:text, marginBottom:12 }}>
              {slide.title}
            </div>
            <div style={{ color: muted, fontSize:13, lineHeight:1.75, maxWidth:440 }}>
              {slide.copy}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:22, flexWrap:'wrap' }}>
              <button type="button" onClick={() => onRequest?.(slide)} style={{ background: gold, color:'#fff', border:'none', borderRadius:12, padding:'11px 15px', fontSize:12, fontWeight:850, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:8 }}>
                {slide.cta} <ArrowRight size={14} strokeWidth={2} />
              </button>
              <div style={{ display:'inline-flex', gap:6 }}>
                {newsItems.map((item, idx) => (
                  <button key={item.id} type="button" onClick={() => setActive(idx)} aria-label={`Ver ${item.title}`} style={{ width: idx === active ? 22 : 8, height:8, borderRadius:999, border:'none', background: idx === active ? gold : subtle, cursor:'pointer', transition:'width .2s' }} />
                ))}
              </div>
            </div>
          </div>
        </section>
        <style>{`
          @media (max-width: 720px){
            .studio-news-hero{grid-template-columns:1fr!important}
            .studio-news-visual-hero{min-height:220px!important;height:220px!important;border-radius:0!important}
            .studio-news-hero-copy{padding:22px!important}
          }
          @media (max-width: 420px){
            .studio-news-visual-hero{min-height:196px!important;height:196px!important}
          }
        `}</style>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {newsItems.map((item, idx) => (
            <div key={item.id} onClick={() => setActive(idx)} style={{ background: card, border: `1px solid ${idx === active ? gold : border}`, borderRadius: 18, padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
              <VisualPanel item={item} isDark={isDark} compact />
              <div style={{ padding:'14px 4px 2px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: item.tone, background: `${item.tone}12`, border: `1px solid ${item.tone}35`, borderRadius: 999, padding: '4px 9px', fontSize: 10, fontWeight: 850, marginBottom: 12 }}>
                  <Sparkles size={12} strokeWidth={1.8} /> {item.tag}
                </div>
                <div style={{ fontSize: 15, fontWeight: 850, color: text, marginBottom: 7 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: muted, lineHeight: 1.6, minHeight: 54 }}>{item.copy}</div>
                <button type="button" onClick={(event) => { event.stopPropagation(); onRequest?.(item); }} style={{ marginTop: 14, background: 'transparent', border: `1px solid ${border}`, color: text, borderRadius: 10, padding: '9px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  {item.cta} <ArrowRight size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
