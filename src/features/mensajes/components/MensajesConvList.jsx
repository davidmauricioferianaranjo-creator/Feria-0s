import React, { useState } from 'react';
import { Camera, Compass, FileText, Image as ImageIcon, MessageCircle, MessageSquare, Mic, Search, Users, Video } from 'lucide-react';

const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, color: '#25D366' },
  instagram: { label: 'Instagram', Icon: Camera, color: '#D4537E' },
  facebook: { label: 'Messenger', Icon: MessageSquare, color: '#5B9BD5' },
  portal: { label: 'Portal', Icon: Compass, color: '#C9A96E' },
};

const CLIENT_TAG_COLORS = ['#D63A54', '#C9A96E', '#5B9BD5', '#7BC67A', '#D4537E', '#6EE7D8'];

function ChannelIcon({ canal, size = 14 }) {
  const meta = CHANNEL_META[canal] || CHANNEL_META.whatsapp;
  const Icon = meta.Icon;
  return <Icon size={size} strokeWidth={1.8} color={meta.color} />;
}

function mediaPreviewMeta(c = {}) {
  const explicit = c.media_tipo || c.media_type || c.tipo_media;
  const mime = c.mime_type || '';
  const kind = explicit || (mime.startsWith('image/')
    ? 'image'
    : mime.startsWith('audio/')
      ? 'audio'
      : mime.startsWith('video/')
        ? 'video'
        : mime ? 'document' : null);
  const map = {
    image: { Icon: ImageIcon, label: 'Imagen recibida' },
    audio: { Icon: Mic, label: 'Audio recibido' },
    video: { Icon: Video, label: 'Video recibido' },
    document: { Icon: FileText, label: 'Documento recibido' },
  };
  return map[kind] || null;
}

export default function MensajesConvList({
  convs, filtradas, activeConv, selectConv,
  busqueda, setBusqueda,
  activeCanalFiltro, setActiveCanalFiltro,
  activeEtiqueta, setActiveEtiqueta,
  etiquetas, crearEtiqueta, showToast, C,
}) {
  const [showNewTag, setShowNewTag] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [tagColor, setTagColor] = useState(CLIENT_TAG_COLORS[0]);

  const handleCreateTag = () => {
    const id = crearEtiqueta?.({ nombre: tagDraft, color: tagColor });
    if (!id) {
      showToast?.('Escribe un nombre para la etiqueta', 'o');
      return;
    }
    setActiveEtiqueta(id);
    setTagDraft('');
    setShowNewTag(false);
    showToast?.('Etiqueta creada', 'ok');
  };

  return (
    <div className="mensajes-conv-list" style={{ width: 'clamp(280px, 30vw, 360px)', maxWidth: '42vw', flexShrink: 0, borderRight: '1px solid var(--border-s)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--s1)' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-s)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-d)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar conversación..."
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '9px 12px 9px 34px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, padding: '8px 12px', borderBottom: '1px solid var(--border-s)', flexShrink: 0 }}>
        {['all', 'whatsapp', 'instagram', 'facebook', 'portal'].map(c => {
          const meta = CHANNEL_META[c];
          const Icon = meta?.Icon;
          const active = activeCanalFiltro === c;
          return (
            <button
              key={c}
              onClick={() => setActiveCanalFiltro(c)}
              title={c === 'all' ? 'Todos' : meta.label}
              style={{
                flex: 1, minWidth: 0, padding: '7px 0', cursor: 'pointer', fontFamily: 'inherit',
                background: active ? 'var(--s3)' : 'transparent',
                border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
                borderRadius: 8, color: active ? 'var(--text)' : 'var(--text-d)',
                display: 'grid', placeItems: 'center',
              }}>
              {c === 'all'
                ? <Users size={14} strokeWidth={1.8} />
                : <Icon size={14} strokeWidth={1.8} color={meta.color} />}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-s)', flexShrink: 0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:7 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-d)' }}>Etiquetas</div>
          <button
            onClick={() => setShowNewTag(v => !v)}
            style={{ border:'1px solid var(--border-s)', background:'var(--s2)', color:'var(--text-d)', borderRadius:999, padding:'3px 8px', fontSize:9, fontFamily:'inherit', cursor:'pointer' }}>
            + Crear
          </button>
        </div>
        {showNewTag && (
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', gap:6, marginBottom:8 }}>
            <input
              value={tagDraft}
              onChange={e => setTagDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); }}
              placeholder="Nueva etiqueta"
              style={{ minWidth:0, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 9px', color:'var(--text)', fontFamily:'inherit', fontSize:10 }}
            />
            <button onClick={handleCreateTag} style={{ border:'none', background:C.gold, color:'#0a0a0a', borderRadius:8, padding:'7px 10px', fontSize:10, fontWeight:900, fontFamily:'inherit', cursor:'pointer' }}>
              Guardar
            </button>
            <div style={{ gridColumn:'1 / -1', display:'flex', gap:5, flexWrap:'wrap' }}>
              {CLIENT_TAG_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setTagColor(color)}
                  aria-label={`Color ${color}`}
                  style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${tagColor === color ? 'var(--text)' : 'transparent'}`, background:color, cursor:'pointer' }}
                />
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <button onClick={() => setActiveEtiqueta('all')} style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            background: activeEtiqueta === 'all' ? 'rgba(201,169,110,0.15)' : 'var(--s2)',
            border: `1px solid ${activeEtiqueta === 'all' ? 'rgba(201,169,110,0.4)' : 'var(--border-s)'}`,
            color: activeEtiqueta === 'all' ? C.gold : 'var(--text-d)',
          }}>Activos ({convs.filter(c => c.etiqueta !== 'spam').length})</button>
          {etiquetas.map(e => (
            <button key={e.id} onClick={() => setActiveEtiqueta(e.id)} style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              background: activeEtiqueta === e.id ? `${e.color}20` : 'var(--s2)',
              border: `1px solid ${activeEtiqueta === e.id ? `${e.color}50` : 'var(--border-s)'}`,
              color: activeEtiqueta === e.id ? e.color : 'var(--text-d)',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color }} />
              {e.nombre} {e.count > 0 && <span style={{ fontSize: 9 }}>({e.count})</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtradas.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-d)' }}>Sin conversaciones</div>
        ) : filtradas.map(c => {
          const etiq = etiquetas.find(e => e.id === c.etiqueta);
          const isActive = activeConv?.id === c.id;
          const brandLabel = c.accountName || c.account_name || (c.brand === 'bl' ? 'Brand & Legacy' : 'Feria Design');
          const canalLabel = CHANNEL_META[c.canal]?.label || c.canal;
          const media = mediaPreviewMeta(c);
          const MediaIcon = media?.Icon;
          return (
            <div key={c.id} onClick={() => selectConv(c)} style={{
              padding: '12px 14px', cursor: 'pointer', transition: 'background .1s',
              background: isActive ? 'var(--s3)' : 'transparent',
              borderLeft: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
              borderBottom: '1px solid var(--border-s)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${c.color}22`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, position: 'relative' }}>
                  {c.avatar}
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--s1)', border: '1px solid var(--border-s)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChannelIcon canal={c.canal} size={11} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: c.noLeidos > 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
                    {c.noLeidos > 0 && (
                      <div style={{ background: C.gold, color: '#000', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{c.noLeidos}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 4 }}>{canalLabel} · {brandLabel}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-d)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
                    {MediaIcon ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, maxWidth:'100%' }}>
                        <MediaIcon size={12} strokeWidth={1.8} />
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.ultimoMsg || media.label}</span>
                      </span>
                    ) : c.ultimoMsg}
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-d)' }}>{c.hora}</div>
                    {etiq && (
                      <div style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: `${etiq.color}15`, color: etiq.color, border: `1px solid ${etiq.color}30` }}>{etiq.nombre}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
