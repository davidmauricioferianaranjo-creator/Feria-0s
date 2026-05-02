import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useMensajesConversations }  from '../../features/mensajes/hooks/useMensajesConversations';
import { useMensajesMessages }       from '../../features/mensajes/hooks/useMensajesMessages';
import { useMensajesRealtime }       from '../../features/mensajes/hooks/useMensajesRealtime';
import { useMensajesComposer }       from '../../features/mensajes/hooks/useMensajesComposer';
import MensajesConvList     from '../../features/mensajes/components/MensajesConvList';
import MensajesContactInfo  from '../../features/mensajes/components/MensajesContactInfo';
import MessageBubble        from '../../features/mensajes/components/MessageBubble';
import InternalCommsPanel   from '../../features/mensajes/components/InternalCommsPanel';
import EmojiPicker          from '../../features/mensajes/components/EmojiPicker';
import { CalendarClock, Camera, Clock3, Compass, FileImage, FileVideo, LoaderCircle, MessageCircle, MessageSquare, Music, Paperclip, Plus, Send, Smile, Sparkles, Tag, Users, X } from 'lucide-react';

const C = {
  gold: 'var(--gold)', teal: 'var(--teal)', green: 'var(--green)',
  red:  'var(--red)',  blue: 'var(--blue)', pink:  'var(--pink)',
};
const SCHEDULE_STORAGE_KEY = 'feria_whatsapp_scheduled_v1';
const TAG_COLORS = ['#C9A96E', '#4ECDC4', '#D4537E', '#7BC67A', '#8B5CF6', '#5B9BD5'];

function loadScheduledMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function persistScheduledMessages(items) {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(items));
}
const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, color: '#25D366' },
  instagram: { label: 'Instagram', Icon: Camera, color: '#D4537E' },
  facebook: { label: 'Messenger', Icon: MessageSquare, color: '#5B9BD5' },
  portal: { label: 'Portal', Icon: Compass, color: '#C9A96E' },
};

// ── Preview del adjunto en el composer ───────────────────────────
function AdjuntoPreview({ adjunto, onQuitar, loading }) {
  if (!adjunto) return null;
  const { file, previewUrl, metaTipo } = adjunto;
  const AttachmentIcon = metaTipo === 'image' ? FileImage : metaTipo === 'video' ? FileVideo : metaTipo === 'audio' ? Music : Paperclip;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
      background: 'var(--s2)', borderRadius: 8, border: '1px solid var(--border-s)',
      marginBottom: 6, position: 'relative',
    }}>
      {/* Miniatura si es imagen */}
      {previewUrl ? (
        <img src={previewUrl} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
      ) : (
        <div style={{ width: 40, height: 40, background: 'var(--s3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          <AttachmentIcon size={19} strokeWidth={1.8} color="var(--text-d)" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-d)' }}>
          {(file.size / 1024 / 1024).toFixed(2)} MB · {metaTipo}
          {loading && ' · Subiendo…'}
        </div>
      </div>
      {!loading && (
        <button onClick={onQuitar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-d)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>
          <X size={14} strokeWidth={1.8} />
        </button>
      )}
      {loading && (
        <div style={{ fontSize: 11, color: C.gold, flexShrink: 0, display:'grid', placeItems:'center' }}>
          <LoaderCircle size={14} strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}

function WhatsAppSchedulerModal({
  convs,
  etiquetas,
  crearEtiqueta,
  scheduledMessages,
  setScheduledMessages,
  onClose,
  showToast,
}) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const firstTag = etiquetas.find(e => e.id !== 'spam')?.id || 'nuevo';
  const [form, setForm] = useState({ etiqueta: firstTag, fecha: tomorrow, hora: '09:00', mensaje: '' });
  const [tagDraft, setTagDraft] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  const selectedTag = etiquetas.find(e => e.id === form.etiqueta);
  const targets = useMemo(() => convs.filter(c =>
    c.canal === 'whatsapp' &&
    c.etiqueta === form.etiqueta &&
    (c.telefono || c.id)
  ), [convs, form.etiqueta]);

  const createTag = () => {
    const id = crearEtiqueta?.({ nombre: tagDraft, color: tagColor });
    if (!id) {
      showToast('Escribe un nombre para la etiqueta', 'o');
      return;
    }
    setForm(f => ({ ...f, etiqueta: id }));
    setTagDraft('');
    showToast('Etiqueta creada', '+');
  };

  const schedule = () => {
    if (!form.mensaje.trim()) {
      showToast('Escribe el mensaje a programar', 'o');
      return;
    }
    if (!targets.length) {
      showToast('No hay contactos WhatsApp con esa etiqueta', 'o');
      return;
    }
    const job = {
      id: Date.now().toString(36),
      etiqueta: form.etiqueta,
      etiquetaNombre: selectedTag?.nombre || form.etiqueta,
      fecha: form.fecha,
      hora: form.hora,
      mensaje: form.mensaje.trim(),
      targets: targets.map(t => ({ id: t.id, nombre: t.nombre, telefono: t.telefono || t.id })),
      status: 'programado',
      created_at: new Date().toISOString(),
    };
    const next = [job, ...scheduledMessages];
    setScheduledMessages(next);
    persistScheduledMessages(next);
    setForm(f => ({ ...f, mensaje: '' }));
    showToast(`Programado para ${targets.length} contacto(s)`, 'ok');
  };

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', padding:22 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width:'min(1040px, 100%)', maxHeight:'92vh', overflow:'auto', background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:16, boxShadow:'0 24px 80px rgba(0,0,0,.35)' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border-s)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:18, fontWeight:800 }}>
              <CalendarClock size={20} color={C.green} /> Programar WhatsApp por etiqueta
            </div>
            <div style={{ fontSize:11, color:'var(--text-d)', marginTop:4 }}>
              Segmenta contactos, escribe un mensaje y deja la programacion lista para el envio operativo.
            </div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, display:'grid', placeItems:'center', border:'1px solid var(--border-s)', borderRadius:10, background:'var(--s2)', color:'var(--text-m)', cursor:'pointer' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap:16, padding:20 }}>
          <div style={{ display:'grid', gap:14 }}>
            <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:800, marginBottom:10 }}>
                <Tag size={15} color={C.gold} /> Crear etiqueta
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap:8 }}>
                <input
                  value={tagDraft}
                  onChange={e => setTagDraft(e.target.value)}
                  placeholder="Ej: leads tibios, antiguos clientes, VIP"
                  style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontFamily:'inherit', minWidth:0 }}
                />
                <select
                  value={tagColor}
                  onChange={e => setTagColor(e.target.value)}
                  style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontFamily:'inherit' }}>
                  {TAG_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={createTag} style={{ background:'var(--gold)', color:'var(--dark)', border:'none', borderRadius:9, padding:'10px 13px', fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                  <Plus size={15} /> Crear
                </button>
              </div>
            </div>

            <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:9 }}>Etiqueta destino</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {etiquetas.filter(e => e.id !== 'spam').map(e => (
                  <button
                    key={e.id}
                    onClick={() => setForm(f => ({ ...f, etiqueta: e.id }))}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:7, padding:'8px 10px', borderRadius:999,
                      border: form.etiqueta === e.id ? `1px solid ${e.color}` : '1px solid var(--border-s)',
                      background: form.etiqueta === e.id ? `${e.color}22` : 'var(--s1)',
                      color: form.etiqueta === e.id ? e.color : 'var(--text-m)',
                      cursor:'pointer', fontFamily:'inherit', fontWeight:700,
                    }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:e.color }} /> {e.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <label style={{ display:'grid', gap:6, color:'var(--text-d)', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em' }}>
                Fecha
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontFamily:'inherit' }} />
              </label>
              <label style={{ display:'grid', gap:6, color:'var(--text-d)', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em' }}>
                Hora
                <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora:e.target.value }))} style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 12px', color:'var(--text)', fontFamily:'inherit' }} />
              </label>
            </div>

            <label style={{ display:'grid', gap:8, color:'var(--text-d)', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em' }}>
              Mensaje
              <textarea
                value={form.mensaje}
                onChange={e => setForm(f => ({ ...f, mensaje:e.target.value }))}
                rows={7}
                placeholder="Hola {{nombre}}, queria compartirte..."
                style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:'12px 14px', color:'var(--text)', fontFamily:'inherit', resize:'vertical', textTransform:'none', letterSpacing:0, fontSize:13 }}
              />
            </label>

            <button onClick={schedule} style={{ justifySelf:'end', background:'var(--gold)', color:'var(--dark)', border:'none', borderRadius:10, padding:'12px 18px', fontWeight:900, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
              <Send size={16} /> Programar mensaje
            </button>
          </div>

          <div style={{ display:'grid', gap:12, alignContent:'start' }}>
            <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ fontSize:12, fontWeight:800 }}>Alcance del envio</div>
                <span style={{ color:selectedTag?.color || C.gold, fontWeight:900 }}>{targets.length}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-d)', marginTop:5 }}>Contactos WhatsApp con la etiqueta seleccionada.</div>
              <div style={{ display:'grid', gap:8, marginTop:12, maxHeight:190, overflow:'auto' }}>
                {targets.length ? targets.slice(0, 8).map(t => (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 9px', border:'1px solid var(--border-s)', borderRadius:9, background:'var(--s1)' }}>
                    <Users size={14} color={selectedTag?.color || C.gold} />
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.nombre}</div>
                      <div style={{ fontSize:10, color:'var(--text-d)' }}>{t.telefono || t.id}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ border:'1px dashed var(--border-s)', borderRadius:10, padding:14, color:'var(--text-d)', fontSize:11 }}>
                    Asigna esta etiqueta a contactos WhatsApp para incluirlos aqui.
                  </div>
                )}
              </div>
            </div>

            <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:800, marginBottom:10 }}>
                <Clock3 size={15} color={C.blue} /> Programados
              </div>
              <div style={{ display:'grid', gap:8 }}>
                {scheduledMessages.length ? scheduledMessages.slice(0, 4).map(item => (
                  <div key={item.id} style={{ border:'1px solid var(--border-s)', borderRadius:9, padding:9, background:'var(--s1)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:11, fontWeight:800 }}>
                      <span>{item.etiquetaNombre}</span>
                      <span style={{ color:C.blue }}>{item.fecha} {item.hora}</span>
                    </div>
                    <div style={{ color:'var(--text-d)', fontSize:10, marginTop:4 }}>{item.targets?.length || 0} contacto(s)</div>
                  </div>
                )) : (
                  <div style={{ color:'var(--text-d)', fontSize:11 }}>Aun no hay mensajes programados.</div>
                )}
              </div>
            </div>

            <div style={{ display:'flex', gap:8, alignItems:'flex-start', color:'var(--text-d)', fontSize:11, lineHeight:1.45 }}>
              <MessageCircle size={15} color={C.green} style={{ flexShrink:0, marginTop:2 }} />
              Esta pantalla prepara la segmentacion y la cola. El envio automatico debe conectarse al worker/API de WhatsApp para produccion.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Mensajes() {
  const { data, showToast, addProjectChatMessage } = useApp();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [busqueda, setBusqueda]                   = useState('');
  const [activeCanalFiltro, setActiveCanalFiltro] = useState('all');
  const [activeEtiqueta, setActiveEtiqueta]       = useState('all');
  const [showScheduler, setShowScheduler]         = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState(loadScheduledMessages);
  const [view, setView] = useState(searchParams.get('tab') === 'interno' ? 'interno' : 'cliente');
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const {
    convs, setConvs, etiquetas, activeConv, loading,
    selectConv, cambiarEtiqueta, crearEtiqueta, updateConvLastMsg, reload,
  } = useMensajesConversations();

  const { msgs, loadMsgs, appendMsg, updateMsgStatus } = useMensajesMessages();

  useMensajesRealtime({ activeConv, appendMsg, setConvs, reload });

  const {
    texto, setTexto, sending, enviar, reintentar,
    aiLoading, pedirSugerencia,
    adjunto, adjuntoLoading, abrirSelector, quitarAdjunto,
    onArchivoSeleccionado, onArchivoDrop, fileInputRef,
  } = useMensajesComposer({
    activeConv, appendMsg, updateMsgStatus, updateConvLastMsg,
  });
  const [draggingFile, setDraggingFile] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    if (activeConv) loadMsgs(activeConv.conv_id || activeConv.id);
  }, [activeConv, loadMsgs]);

  const filtradas = useMemo(() => convs.filter(c => {
    if (activeCanalFiltro !== 'all' && c.canal !== activeCanalFiltro) return false;
    if (activeEtiqueta === 'all' && c.etiqueta === 'spam') return false;
    if (activeEtiqueta !== 'all' && c.etiqueta !== activeEtiqueta) return false;
    if (busqueda && !c.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }), [convs, activeCanalFiltro, activeEtiqueta, busqueda]);

  const totalUnread = convs.reduce((sum, c) => sum + (c.noLeidos || 0), 0);

  const clienteEnCRM = activeConv
    ? data.clientes.find(c =>
        c.telefono?.replace(/\D/g,'') === activeConv.telefono?.replace(/\D/g,'') ||
        c.nombre?.toLowerCase() === activeConv.nombre?.toLowerCase()
      ) || null
    : null;

  const activeMsgs = activeConv ? msgs[activeConv.conv_id || activeConv.id] || [] : [];
  const activeChannel = activeConv ? (CHANNEL_META[activeConv.canal] || CHANNEL_META.whatsapp) : null;
  const ActiveChannelIcon = activeChannel?.Icon || MessageCircle;

  const handleEnviar   = () => {
    setEmojiOpen(false);
    enviar(activeConv?.canal || 'whatsapp');
  };
  const handlePedirIA  = () => pedirSugerencia(activeMsgs);
  const canEnviar      = (texto.trim() || adjunto) && !sending && !adjuntoLoading;
  const handleEmojiPick = (emoji) => {
    setTexto(v => `${v}${emoji}`);
    setEmojiOpen(false);
  };
  const handleSelectConv = (conv) => {
    selectConv(conv);
    setMobileListOpen(false);
  };
  const handleComposerDragOver = (e) => {
    e.preventDefault();
    if (!sending && !adjuntoLoading) setDraggingFile(true);
  };
  const handleComposerDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDraggingFile(false);
  };
  const handleComposerDrop = (e) => {
    e.preventDefault();
    setDraggingFile(false);
    if (sending || adjuntoLoading) return;
    if (onArchivoDrop(e.dataTransfer.files)) showToast?.('Archivo listo para enviar', 'ok');
  };
  const changeView = (next) => {
    setView(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'interno') params.set('tab', 'interno');
    else params.delete('tab');
    setSearchParams(params, { replace:true });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <style>{`
        .mensajes-client-shell { display:flex; flex:1; min-width:0; overflow:hidden; }
        .mensajes-chat-pane { flex:1; min-width:360px; display:flex; flex-direction:column; overflow:hidden; }
        .mensajes-composer-row textarea { min-width:180px; }
        .mensajes-page-topbar { display:grid !important; grid-template-columns:minmax(340px, 1fr) auto; align-items:center !important; padding:10px 20px !important; }
        .mensajes-title-row { min-width:0; }
        .mensajes-page-title { white-space:nowrap; }
        .mensajes-unread-pill { white-space:nowrap; transform:translateY(1px); }
        .mensajes-page-actions { justify-content:flex-end !important; }
        .mensajes-status-pill { max-width:min(100%, 650px); }
        @media (max-width: 1280px) {
          .mensajes-contact-info { display:none !important; }
          .mensajes-conv-list { width:min(360px, 42vw) !important; max-width:42vw !important; }
          .mensajes-chat-pane { min-width:0 !important; }
        }
        @media (max-width: 1100px) {
          .mensajes-composer-row { flex-wrap:wrap !important; align-items:stretch !important; }
          .mensajes-composer-row textarea { order:-1; flex:1 1 100% !important; min-height:48px; }
          .mensajes-composer-actions { flex-direction:row !important; width:100%; }
          .mensajes-composer-actions button { flex:1; justify-content:center; }
        }
        @media (max-width: 760px) {
          .mensajes-page-topbar { grid-template-columns:1fr !important; align-items:flex-start !important; }
          .mensajes-page-actions { justify-content:flex-start !important; width:100%; }
          .mensajes-page-title { font-size:18px !important; white-space:normal; }
          .mensajes-status-pill { width:100%; justify-content:flex-start !important; overflow-x:auto; }
          .mensajes-client-shell { display:block !important; position:relative; }
          .mensajes-conv-list { width:100% !important; max-width:none !important; height:100% !important; border-right:0 !important; }
          .mensajes-chat-pane { width:100% !important; min-width:0 !important; height:100% !important; }
          .mensajes-client-shell.has-active.show-chat .mensajes-conv-list { display:none !important; }
          .mensajes-client-shell.has-active.show-list .mensajes-chat-pane { display:none !important; }
          .mensajes-client-shell.no-active .mensajes-chat-pane { display:none !important; }
          .mensajes-mobile-back { display:inline-flex !important; }
          .mensajes-conversation-header { flex-wrap:wrap !important; align-items:flex-start !important; }
          .mensajes-conversation-header select { max-width:170px; }
          .mensajes-composer-row { flex-wrap:wrap !important; align-items:stretch !important; }
          .mensajes-composer-row textarea { order:-1; flex:1 1 100% !important; min-height:86px; }
          .mensajes-composer-actions { flex-direction:row !important; width:100%; }
          .mensajes-composer-actions button { flex:1; justify-content:center; }
        }
      `}</style>

      {/* TOPBAR */}
      <div className="mensajes-page-topbar" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', flexShrink:0, gap:12, flexWrap:'wrap' }}>
        <div className="mensajes-title-row" style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div className="mensajes-page-title" style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, lineHeight:1.05 }}>
            Mensajes <em style={{ color:C.gold }}>· Bandeja unificada</em>
          </div>
          {totalUnread > 0 && (
            <div className="mensajes-unread-pill" style={{ background:'rgba(224,96,96,.10)', color:C.red, border:'1px solid rgba(224,96,96,.28)', borderRadius:999, padding:'4px 9px', fontSize:10, fontWeight:850, lineHeight:1 }}>
              {totalUnread} sin leer
            </div>
          )}
        </div>
        <div className="mensajes-page-actions" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
        <div style={{ display:'inline-flex', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:3 }}>
          {[
            { id:'cliente', label:'Clientes' },
            { id:'interno', label:'Equipo' },
          ].map(item => (
            <button key={item.id} onClick={() => changeView(item.id)} style={{
              border:'none', borderRadius:8, padding:'7px 11px', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:900,
              background:view === item.id ? 'var(--s3)' : 'transparent',
              color:view === item.id ? 'var(--text)' : 'var(--text-d)',
            }}>{item.label}</button>
          ))}
        </div>
        <button
          onClick={() => setShowScheduler(true)}
          disabled={view !== 'cliente'}
          style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 12px', color:view === 'cliente' ? 'var(--text-m)' : 'var(--text-d)', fontSize:11, fontWeight:800, cursor:view === 'cliente' ? 'pointer' : 'default', fontFamily:'inherit', opacity:view === 'cliente' ? 1 : .55 }}>
          <CalendarClock size={15} color="#25D366" /> Programar WhatsApp
        </button>
        <div className="mensajes-status-pill" style={{ display:'inline-flex', alignItems:'center', gap:9, background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:10, padding:'7px 12px', fontSize:0, color:'#25D366', flexWrap:'wrap' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#25D366' }} />
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10 }}><MessageCircle size={13} /> WhatsApp</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10 }}><Camera size={13} /> Instagram</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10 }}><MessageSquare size={13} /> Messenger</span>
          <span style={{ fontSize:10 }}>conectados</span>
        </div>
        </div>
      </div>

      {view === 'interno' ? (
        <div style={{ flex:1, minHeight:0, overflow:'hidden' }}>
          <InternalCommsPanel
            data={data}
            user={user}
            addProjectChatMessage={addProjectChatMessage}
            showToast={showToast}
          />
        </div>
      ) : (
      <div className={`mensajes-client-shell ${activeConv ? 'has-active' : 'no-active'} ${mobileListOpen || !activeConv ? 'show-list' : 'show-chat'}`}>

        {/* SIDEBAR IZQUIERDO */}
        <MensajesConvList
          convs={convs} filtradas={filtradas} activeConv={activeConv}
          selectConv={handleSelectConv} busqueda={busqueda} setBusqueda={setBusqueda}
          activeCanalFiltro={activeCanalFiltro} setActiveCanalFiltro={setActiveCanalFiltro}
          activeEtiqueta={activeEtiqueta} setActiveEtiqueta={setActiveEtiqueta}
          etiquetas={etiquetas} crearEtiqueta={crearEtiqueta} showToast={showToast} C={C}
        />

        {/* ÁREA DE CONVERSACIÓN */}
        <div className="mensajes-chat-pane">
          {!activeConv ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10 }}>
              <MessageCircle size={38} strokeWidth={1.5} color="var(--text-d)" opacity={0.45} />
              <div style={{ fontSize:13, color:'var(--text-d)' }}>
                {loading ? 'Cargando conversaciones…' : convs.length === 0 ? 'Sin conversaciones aún' : 'Selecciona una conversación'}
              </div>
            </div>
          ) : (
            <>
              {/* Header conv */}
              <div className="mensajes-conversation-header" style={{ padding:'10px 16px', background:'var(--s1)', borderBottom:'1px solid var(--border-s)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <button
                  className="mensajes-mobile-back"
                  onClick={() => setMobileListOpen(true)}
                  style={{ display:'none', alignItems:'center', gap:6, border:'1px solid var(--border-s)', background:'var(--s2)', color:'var(--text-m)', borderRadius:8, padding:'7px 9px', fontSize:10, fontWeight:800, fontFamily:'inherit', cursor:'pointer' }}>
                  ← Conversaciones
                </button>
                <div style={{ width:36, height:36, borderRadius:'50%', background:`${activeConv.color}22`, color:activeConv.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600 }}>
                  {activeConv.avatar}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{activeConv.nombre}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', display:'flex', alignItems:'center', gap:5 }}>
                    <ActiveChannelIcon size={12} strokeWidth={1.8} color={activeChannel?.color || 'var(--text-d)'} />
                    {activeChannel?.label || activeConv.canal} · {activeConv.telefono || activeConv.id}
                  </div>
                </div>
                <select
                  value={activeConv.etiqueta || 'nuevo'}
                  onChange={e => cambiarEtiqueta(activeConv.conv_id || activeConv.id, e.target.value)}
                  style={{ fontSize:10, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'4px 8px', color:'var(--text-m)', fontFamily:'inherit' }}>
                  {etiquetas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              {/* Hilo de mensajes */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                {activeMsgs.length === 0 ? (
                  <div style={{ textAlign:'center', color:'var(--text-d)', fontSize:11, marginTop:40 }}>Sin mensajes en esta conversación</div>
                ) : activeMsgs.map((m, i) => (
                  <MessageBubble
                    key={m.id || i} msg={m} isOwn={!m.from_cliente}
                    onRetry={m._status === 'error' ? (msg) => reintentar(msg, activeConv?.canal) : null}
                  />
                ))}
              </div>

              {/* ── COMPOSER ── */}
              <div
                onDragOver={handleComposerDragOver}
                onDragLeave={handleComposerDragLeave}
                onDrop={handleComposerDrop}
                style={{
                  padding:'10px 16px', borderTop:'1px solid var(--border-s)', background:'var(--s1)', flexShrink:0,
                  position:'relative',
                  boxShadow: draggingFile ? `inset 0 0 0 2px ${C.gold}` : 'none',
                  transition:'box-shadow .15s ease, background .15s ease',
                }}>
                {draggingFile && (
                  <div style={{
                    position:'absolute', inset:8, zIndex:2, pointerEvents:'none', border:`1px dashed ${C.gold}`,
                    borderRadius:12, background:'rgba(201,169,110,.12)', backdropFilter:'blur(2px)',
                    display:'grid', placeItems:'center', color:C.gold, fontSize:12, fontWeight:900,
                  }}>
                    Suelta el archivo para adjuntarlo
                  </div>
                )}

                {/* Preview del adjunto seleccionado */}
                <AdjuntoPreview adjunto={adjunto} onQuitar={quitarAdjunto} loading={adjuntoLoading} />

                <div className="mensajes-composer-row" style={{ display:'flex', gap:8, alignItems:'flex-end' }}>

                  {/* Botón clip */}
                  <button
                    onClick={abrirSelector}
                    disabled={sending || adjuntoLoading}
                    title="Adjuntar imagen, PDF, video o audio (máx. 20 MB)"
                    style={{
                      background: adjunto ? C.gold : 'var(--s2)',
                      color:      adjunto ? '#000' : 'var(--text-d)',
                      border:     '1px solid var(--border-s)',
                      borderRadius: 8, padding: '10px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: (sending || adjuntoLoading) ? .5 : 1,
                      flexShrink: 0, transition: 'background .15s',
                    }}>
                    <Paperclip size={15} strokeWidth={1.8} />
                  </button>

                  {/* Input de archivo oculto */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,application/pdf"
                    onChange={onArchivoSeleccionado}
                    style={{ display: 'none' }}
                  />

                  <div style={{ position:'relative', flexShrink:0 }}>
                    <button
                      type="button"
                      onClick={() => setEmojiOpen(v => !v)}
                      disabled={sending || adjuntoLoading}
                      title="Agregar emoji"
                      style={{
                        width:40,
                        height:40,
                        background: emojiOpen ? 'rgba(201,169,110,.14)' : 'var(--s2)',
                        color: emojiOpen ? C.gold : 'var(--text-d)',
                        border:'1px solid var(--border-s)',
                        borderRadius:8,
                        cursor:(sending || adjuntoLoading) ? 'default' : 'pointer',
                        display:'grid',
                        placeItems:'center',
                        opacity:(sending || adjuntoLoading) ? .5 : 1,
                      }}>
                      <Smile size={15} strokeWidth={1.8} />
                    </button>
                    <EmojiPicker open={emojiOpen} onPick={handleEmojiPick} onClose={() => setEmojiOpen(false)} />
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
                    placeholder={adjunto ? 'Agrega un caption opcional...' : 'Escribe un mensaje...'}
                    rows={1}
                    style={{ flex:1, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', resize:'none', minHeight:40, maxHeight:96 }}
                  />

                  {/* Botones enviar + IA */}
                  <div className="mensajes-composer-actions" style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <button
                      onClick={handleEnviar}
                      disabled={!canEnviar}
                      style={{ background: canEnviar ? C.gold : 'var(--s3)', color: canEnviar ? '#000' : 'var(--text-d)', border:'none', borderRadius:8, padding:'8px 14px', fontSize:11, fontWeight:600, cursor: canEnviar ? 'pointer' : 'default', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      {adjuntoLoading ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><LoaderCircle size={13} strokeWidth={1.8} /> Subiendo...</span>
                      ) : sending ? (
                        <LoaderCircle size={13} strokeWidth={1.8} />
                      ) : (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><Send size={13} strokeWidth={1.9} /> Enviar</span>
                      )}
                    </button>
                    <button
                      onClick={handlePedirIA}
                      disabled={aiLoading || activeMsgs.length === 0}
                      style={{ background:'transparent', border:'1px solid var(--border-s)', borderRadius:8, padding:'6px 10px', fontSize:10, color: aiLoading ? 'var(--text-d)' : C.gold, cursor:'pointer', fontFamily:'inherit' }}>
                      {aiLoading ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><LoaderCircle size={12} strokeWidth={1.8} /> IA...</span>
                      ) : (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><Sparkles size={12} strokeWidth={1.8} /> Sugerir</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hint de tipos permitidos */}
                <div style={{ fontSize:9, color:'var(--text-d)', marginTop:5, paddingLeft:2, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                    <Paperclip size={11} strokeWidth={1.8} /> Arrastra o adjunta imagenes, PDF, video o audio · max. 20 MB
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SIDEBAR DERECHO */}
        <MensajesContactInfo
          activeConv={activeConv} clienteEnCRM={clienteEnCRM}
          etiquetas={etiquetas}
          onChangeEtiqueta={(etId) => cambiarEtiqueta(activeConv?.conv_id || activeConv?.id, etId)}
          C={C} showToast={showToast}
        />
      </div>
      )}

      {showScheduler && (
        <WhatsAppSchedulerModal
          convs={convs}
          etiquetas={etiquetas}
          crearEtiqueta={crearEtiqueta}
          scheduledMessages={scheduledMessages}
          setScheduledMessages={setScheduledMessages}
          onClose={() => setShowScheduler(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
