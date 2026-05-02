import React, { useMemo, useRef, useState } from 'react';
import { AtSign, Bell, CheckCheck, Hash, Link2, LoaderCircle, MessageSquare, Paperclip, Pin, Search, Send, Smile, Users, X } from 'lucide-react';
import { supabase, isConfigured } from '../../../lib/supabase';
import EmojiPicker from './EmojiPicker';
import {
  buildInternalConversations,
  getCurrentMember,
  isAdminUser,
  memberPresence,
  searchInternalConversations,
} from '../../../lib/internalComms';

const C = {
  gold: 'var(--gold)',
  green: 'var(--green)',
  blue: 'var(--blue)',
  red: 'var(--red)',
  teal: 'var(--teal)',
};

const INTERNAL_TAGS_KEY = 'feria_internal_message_tags_v1';
const INTERNAL_CONV_TAGS_KEY = 'feria_internal_conversation_tags_v1';
const INTERNAL_TAG_COLORS = ['#D63A54', '#C9A96E', '#5B9BD5', '#7BC67A', '#D4537E', '#6EE7D8'];
const DEFAULT_INTERNAL_TAGS = [
  { id:'administracion', nombre:'Administracion', color:'#C9A96E' },
  { id:'finanzas', nombre:'Finanzas', color:'#7BC67A' },
  { id:'diseno', nombre:'Disenadores', color:'#D4537E' },
  { id:'produccion', nombre:'Produccion', color:'#5B9BD5' },
  { id:'urgente', nombre:'Urgente', color:'#D63A54' },
];
const INTERNAL_BUCKET = 'mensajes-adjuntos';
const INTERNAL_MAX_MB = 20;
const INTERNAL_ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav',
  'application/pdf',
]);

function validateInternalFile(file) {
  if (!file) return 'Selecciona un archivo.';
  if (file.size > INTERNAL_MAX_MB * 1024 * 1024) return `El archivo supera ${INTERNAL_MAX_MB} MB.`;
  if (!INTERNAL_ALLOWED_TYPES.has(file.type)) return 'Tipo de archivo no permitido. Usa imagen, PDF, video o audio.';
  return '';
}

async function uploadInternalFile(file, active) {
  if (!isConfigured) return URL.createObjectURL(file);
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeConv = String(active?.id || 'general').replace(/[^a-z0-9_-]/gi, '-');
  const safeName = file.name.replace(/[^\w.-]/g, '-').slice(-80);
  const ruta = `interno/${safeConv}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName || `archivo.${ext}`}`;
  const { error } = await supabase.storage
    .from(INTERNAL_BUCKET)
    .upload(ruta, file, { cacheControl:'3600', upsert:false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(INTERNAL_BUCKET).getPublicUrl(ruta);
  return data.publicUrl;
}

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed || fallback;
  } catch (_) {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function inferInternalTag(conv = {}) {
  const haystack = `${conv.title || ''} ${conv.subtitle || ''}`.toLowerCase();
  if (conv.type === 'general') return 'administracion';
  if (haystack.includes('finanza') || haystack.includes('cobro') || haystack.includes('pago')) return 'finanzas';
  if (haystack.includes('dise') || haystack.includes('brand kit') || haystack.includes('manual')) return 'diseno';
  if (conv.type === 'project') return 'produccion';
  return 'administracion';
}

function ConversationIcon({ type, color }) {
  const Icon = type === 'general' ? Bell : type === 'direct' ? MessageSquare : Hash;
  return (
    <div style={{ width:34, height:34, borderRadius:10, background:`${color}1f`, border:`1px solid ${color}45`, display:'grid', placeItems:'center', flexShrink:0 }}>
      <Icon size={16} strokeWidth={1.8} color={color} />
    </div>
  );
}

function Avatar({ member, fallback = 'EQ', size = 34 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:member?.bg || `${member?.color || C.blue}22`,
      color:member?.color || C.blue, display:'grid', placeItems:'center', fontWeight:900, fontSize:12, flexShrink:0,
      border:'1px solid var(--border-s)',
    }}>
      {member?.initials || String(fallback).slice(0, 2).toUpperCase()}
    </div>
  );
}

function MessageText({ text }) {
  const lines = String(text || '').split('\n');
  return (
    <div style={{ display:'grid', gap:4 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
          return <div key={i} style={{ display:'flex', gap:7 }}><span style={{ color:C.gold }}>•</span><span>{trimmed.slice(2)}</span></div>;
        }
        const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_|@[^\s]+)/g).filter(Boolean);
        return (
          <div key={i}>
            {parts.map((part, idx) => {
              if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx}>{part.slice(2, -2)}</strong>;
              if (part.startsWith('_') && part.endsWith('_')) return <em key={idx}>{part.slice(1, -1)}</em>;
              if (part.startsWith('@')) return <span key={idx} style={{ color:C.gold, fontWeight:850 }}>{part}</span>;
              return <span key={idx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function timeLabel(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' });
}

function ConversationItem({ conv, active, onClick }) {
  const last = conv.messages?.[conv.messages.length - 1];
  const label = conv.type === 'project' ? 'Proyecto' : conv.type === 'direct' ? 'Personal' : 'General';
  return (
    <button
      onClick={onClick}
      style={{
        width:'100%', display:'grid', gridTemplateColumns:'auto minmax(0, 1fr) auto', gap:10, alignItems:'center',
        padding:'11px 12px', borderRadius:12, border:active ? `1px solid ${conv.color}` : '1px solid var(--border-s)',
        background:active ? `${conv.color}14` : 'var(--s2)', color:'var(--text)', cursor:'pointer', textAlign:'left',
        fontFamily:'inherit',
      }}>
      <ConversationIcon type={conv.type} color={conv.color} />
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
          <span style={{ fontSize:12, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.title}</span>
          {conv.presence?.online && <span style={{ width:7, height:7, borderRadius:'50%', background:C.green, flexShrink:0 }} />}
        </div>
        <div style={{ fontSize:10, color:'var(--text-d)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {label} · {last ? `${last.sender_name || 'Equipo'}: ${last.message || 'Adjunto'}` : conv.subtitle}
        </div>
      </div>
      <div style={{ display:'grid', gap:5, justifyItems:'end' }}>
        {last?.created_at && <span style={{ fontSize:9, color:'var(--text-d)' }}>{timeLabel(last.created_at)}</span>}
        {conv.unread > 0 && <span style={{ minWidth:18, height:18, borderRadius:999, background:C.red, color:'#fff', fontSize:9, fontWeight:900, display:'grid', placeItems:'center' }}>{conv.unread}</span>}
      </div>
    </button>
  );
}

function Composer({ active, current, user, team, addProjectChatMessage, showToast }) {
  const [text, setText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef(null);
  const admin = isAdminUser(user) || isAdminUser(current);
  const disabled = active?.type === 'general' && !admin;
  const activeTeam = team.filter(m => String(m.id) !== String(current.id));

  const insertToken = (token) => setText(v => v ? `${v}${token}` : token.trimStart());
  const insertEmoji = (emoji) => {
    setText(v => `${v}${emoji}`);
    setEmojiOpen(false);
  };
  const selectAttachmentFile = (file) => {
    const error = validateInternalFile(file);
    if (error) {
      showToast?.(error, 'o');
      return false;
    }
    setAttachmentFile(file);
    return true;
  };
  const clearAttachmentFile = () => setAttachmentFile(null);
  const handleFileInput = (e) => {
    selectAttachmentFile(e.target.files?.[0]);
    e.target.value = '';
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    if (selectAttachmentFile(e.dataTransfer.files?.[0])) showToast?.('Archivo listo para enviar', 'ok');
  };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  };

  const send = async () => {
    if (disabled) return;
    if (!text.trim() && !attachmentFile) return;
    const source = active.type === 'general' ? 'general' : active.type === 'direct' ? 'direct' : 'project';
    let attachmentUrl = '';
    let attachmentName = attachmentFile?.name || '';
    let attachmentSize = attachmentFile?.size || 0;
    if (attachmentFile) {
      setUploading(true);
      try {
        attachmentUrl = await uploadInternalFile(attachmentFile, active);
      } catch (e) {
        showToast?.(`No se pudo subir el archivo: ${e.message}`, 'o');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    await addProjectChatMessage?.({
      proyectoId: active.projectId || null,
      message: text.trim(),
      senderName: current.name || user?.name || 'Equipo',
      senderId: current.id || user?.id,
      senderEmail: current.email || user?.email || '',
      source,
      etiqueta: active.type,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      conversationId: active.type === 'direct' ? active.id : active.type === 'general' ? 'general' : `project:${active.projectId}`,
      conversationType: active.type,
      targetMemberId: active.targetMemberId || null,
      replyToId: replyTo?.id || null,
    });
    setText('');
    setAttachmentFile(null);
    setReplyTo(null);
    showToast?.('Mensaje interno enviado', 'ok');
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderTop:'1px solid var(--border-s)', padding:10, background:dragging ? 'rgba(201,169,110,.08)' : 'var(--s1)',
        position:'relative', boxShadow:dragging ? `inset 0 0 0 2px ${C.gold}` : 'none',
        transition:'background .15s ease, box-shadow .15s ease',
      }}>
      {dragging && (
        <div style={{ position:'absolute', inset:6, zIndex:2, pointerEvents:'none', border:`1px dashed ${C.gold}`, borderRadius:12, background:'rgba(201,169,110,.10)', color:C.gold, display:'grid', placeItems:'center', fontSize:11, fontWeight:900 }}>
          Suelta el archivo en el chat
        </div>
      )}
      {replyTo && (
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', border:'1px solid var(--border-s)', borderRadius:10, padding:'7px 9px', marginBottom:6, background:'var(--s2)' }}>
          <div style={{ minWidth:0, fontSize:10, color:'var(--text-d)' }}>Respondiendo a <b style={{ color:'var(--text)' }}>{replyTo.sender_name}</b> · {String(replyTo.message || '').slice(0, 80)}</div>
          <button onClick={() => setReplyTo(null)} style={{ border:'none', background:'transparent', color:'var(--text-d)', cursor:'pointer' }}>x</button>
        </div>
      )}
      <div style={{ display:'flex', gap:6, marginBottom:6, overflow:'visible', paddingBottom:2, alignItems:'center', flexWrap:'wrap' }}>
        <button onClick={() => insertToken('**texto**')} disabled={disabled} style={miniButtonStyle}>B</button>
        <button onClick={() => insertToken('_texto_')} disabled={disabled} style={miniButtonStyle}>I</button>
        <button onClick={() => insertToken('\n- punto')} disabled={disabled} style={miniButtonStyle}>Lista</button>
        <span style={{ position:'relative', display:'inline-flex', flex:'0 0 auto' }}>
          <button
            type="button"
            onClick={() => setEmojiOpen(v => !v)}
            disabled={disabled}
            title="Agregar emoji"
            style={miniButtonStyle}>
            <Smile size={12} /> Emoji
          </button>
          <EmojiPicker open={emojiOpen} onPick={insertEmoji} onClose={() => setEmojiOpen(false)} align="right" />
        </span>
        {activeTeam.slice(0, 4).map(m => (
          <button key={m.id} onClick={() => insertToken(` @${String(m.name || '').split(' ')[0]}`)} disabled={disabled} style={miniButtonStyle}>
            <AtSign size={12} /> {String(m.name || 'Miembro').split(' ')[0]}
          </button>
        ))}
        {attachmentFile && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, maxWidth:220, border:'1px solid var(--border-s)', background:'var(--s2)', color:'var(--text-d)', borderRadius:999, padding:'5px 8px', fontSize:10, flex:'0 0 auto' }}>
            <Paperclip size={12} />
            <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{attachmentFile.name}</span>
            <button onClick={clearAttachmentFile} disabled={uploading} style={{ border:'none', background:'transparent', color:'var(--text-d)', cursor:'pointer', display:'grid', placeItems:'center', padding:0 }}><X size={12} /></button>
          </span>
        )}
      </div>
      <div className="internal-comms-composer-row" style={{ display:'flex', gap:8, alignItems:'stretch' }}>
        <textarea
          value={text}
          disabled={disabled}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          placeholder={disabled ? 'Solo administradores pueden publicar aqui.' : 'Escribe al equipo...'}
          style={{ flex:'1 1 auto', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 12px', color:'var(--text)', resize:'none', fontFamily:'inherit', minWidth:0, minHeight:42, maxHeight:96 }}
        />
        <div
          onDragOver={e => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            flex:'0 0 42px', width:42, minWidth:42, background:'transparent',
            border:'none',
            borderRadius:10, padding:0, display:'grid', gap:0,
          }}>
          <input ref={fileInputRef} type="file" onChange={handleFileInput} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,application/pdf" style={{ display:'none' }} />
          <div style={{ display:'contents' }}>
            <span style={{ display:'none' }}>
              {attachmentFile ? attachmentFile.name : 'Arrastra archivos al chat'}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              title="Adjuntar archivo"
              style={{ width:42, height:42, borderRadius:10, border:'1px solid var(--border-s)', background:attachmentFile ? 'rgba(201,169,110,.14)' : 'var(--s2)', color:attachmentFile ? C.gold : 'var(--text-m)', cursor:(disabled || uploading) ? 'default' : 'pointer', display:'grid', placeItems:'center', flex:'0 0 auto' }}>
              <Paperclip size={17} />
            </button>
          </div>
          {attachmentFile ? (
            <div style={{ display:'none' }}>
              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{attachmentFile.name} · {(attachmentFile.size / 1024 / 1024).toFixed(1)} MB</span>
              <button onClick={clearAttachmentFile} disabled={uploading} style={{ border:'none', background:'transparent', color:'var(--text-d)', cursor:'pointer', display:'grid', placeItems:'center' }}><X size={13} /></button>
            </div>
          ) : (
            <div style={{ display:'none' }}>Arrastra imagen, PDF, video o audio · max. 20 MB</div>
          )}
        </div>
        <button onClick={send} disabled={disabled || uploading || (!text.trim() && !attachmentFile)} style={{
          height:42, border:'none', borderRadius:10, padding:'0 18px', background:disabled ? 'var(--s3)' : C.gold,
          color:disabled ? 'var(--text-d)' : 'var(--dark)', fontWeight:900, cursor:(disabled || uploading) ? 'default' : 'pointer', display:'inline-flex', alignItems:'center', gap:7, justifyContent:'center',
        }}>
          {uploading ? <LoaderCircle size={15} /> : <Send size={15} />} {uploading ? 'Subiendo' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

const miniButtonStyle = {
  border:'1px solid var(--border-s)',
  background:'var(--s2)',
  color:'var(--text-m)',
  borderRadius:8,
  padding:'6px 9px',
  fontSize:10,
  fontWeight:800,
  display:'inline-flex',
  alignItems:'center',
  gap:5,
  cursor:'pointer',
  fontFamily:'inherit',
};

export default function InternalCommsPanel({ data, user, addProjectChatMessage, showToast }) {
  const current = useMemo(() => getCurrentMember(data, user), [data, user]);
  const admin = isAdminUser(user) || isAdminUser(current);
  const baseConversations = useMemo(() => buildInternalConversations(data, user), [data, user]);
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState(() => readStorage(INTERNAL_TAGS_KEY, DEFAULT_INTERNAL_TAGS));
  const [conversationTags, setConversationTags] = useState(() => readStorage(INTERNAL_CONV_TAGS_KEY, {}));
  const [activeTag, setActiveTag] = useState('all');
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(INTERNAL_TAG_COLORS[0]);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const tagById = useMemo(() => new Map(tags.map(tag => [tag.id, tag])), [tags]);
  const conversations = useMemo(() => baseConversations.map(conv => {
    const tagId = conversationTags[conv.id] || inferInternalTag(conv);
    return { ...conv, tagId, tag: tagById.get(tagId) };
  }), [baseConversations, conversationTags, tagById]);
  const searched = useMemo(() => searchInternalConversations(conversations, query), [conversations, query]);
  const filtered = useMemo(() => activeTag === 'all' ? searched : searched.filter(conv => conv.tagId === activeTag), [searched, activeTag]);
  const [activeId, setActiveId] = useState('general');
  const active = filtered.find(c => c.id === activeId) || conversations.find(c => c.id === activeId) || conversations[0];
  const messages = active?.messages || [];
  const teamById = useMemo(() => new Map((data.team || []).map(m => [String(m.id), m])), [data.team]);
  const onlineCount = (data.team || []).filter(m => memberPresence(m, data.projectChatMessages || []).online).length;
  const unread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const tagCounts = useMemo(() => conversations.reduce((acc, conv) => {
    acc[conv.tagId] = (acc[conv.tagId] || 0) + 1;
    return acc;
  }, {}), [conversations]);

  const createTag = () => {
    const nombre = newTagName.trim();
    if (!nombre) {
      showToast?.('Escribe un nombre para la etiqueta', 'o');
      return;
    }
    const id = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `tag-${Date.now()}`;
    if (tags.some(tag => tag.id === id)) {
      showToast?.('Esa etiqueta ya existe', 'o');
      return;
    }
    const next = [...tags, { id, nombre, color:newTagColor }];
    setTags(next);
    writeStorage(INTERNAL_TAGS_KEY, next);
    setActiveTag(id);
    setNewTagName('');
    setNewTagOpen(false);
    showToast?.('Etiqueta interna creada', 'ok');
  };

  const assignTag = (convId, tagId) => {
    const next = { ...conversationTags, [convId]: tagId };
    setConversationTags(next);
    writeStorage(INTERNAL_CONV_TAGS_KEY, next);
  };
  const openConversation = (convId) => {
    setActiveId(convId);
    setMobileListOpen(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <style>{`
        .internal-comms-layout { display:grid; grid-template-columns:minmax(280px, 360px) minmax(0, 1fr); flex:1; min-height:0; overflow:hidden; }
        .internal-mobile-list-button { display:none; }
        @media (max-width: 760px) {
          .internal-comms-layout { display:block !important; position:relative; }
          .internal-comms-sidebar { width:100% !important; height:100% !important; max-height:none !important; border-right:0 !important; }
          .internal-comms-main { width:100% !important; height:100% !important; }
          .internal-comms-layout.show-chat .internal-comms-sidebar { display:none !important; }
          .internal-comms-layout.show-list .internal-comms-main { display:none !important; }
          .internal-mobile-list-button { display:inline-flex !important; }
          .internal-comms-active-header { align-items:flex-start !important; flex-wrap:wrap !important; }
          .internal-comms-composer-row { flex-wrap:wrap !important; }
          .internal-comms-composer-row textarea { flex:1 0 100% !important; width:100% !important; }
          .internal-comms-composer-row > div { flex:0 0 42px !important; width:42px !important; }
          .internal-comms-composer-row > button:last-child { flex:1 1 0 !important; min-width:0 !important; }
        }
      `}</style>
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--border-s)', background:'var(--s1)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:19, lineHeight:1.05 }}>
            Comunicacion interna <em style={{ color:C.gold }}>· Estudio</em>
          </div>
          <div style={{ fontSize:10, color:'var(--text-d)', marginTop:4 }}>
            Chats de proyecto, personales y canal general en una sola vista{admin ? ' para administracion.' : '.'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <span style={statPillStyle}><Users size={14} color={C.green} /> {onlineCount} en linea</span>
          <span style={statPillStyle}><Bell size={14} color={unread ? C.red : C.gold} /> {unread} sin leer</span>
          {admin && <span style={statPillStyle}>Bandeja unificada admin</span>}
        </div>
      </div>

      <div className={`internal-comms-layout ${mobileListOpen ? 'show-list' : 'show-chat'}`}>
        <aside className="internal-comms-sidebar" style={{ borderRight:'1px solid var(--border-s)', background:'var(--s1)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:14, borderBottom:'1px solid var(--border-s)' }}>
            <div style={{ position:'relative' }}>
              <Search size={15} color="var(--text-d)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar mensajes internos..."
                style={{ width:'100%', boxSizing:'border-box', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'10px 12px 10px 36px', color:'var(--text)', fontFamily:'inherit' }}
              />
            </div>
            <div style={{ marginTop:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-d)' }}>Etiquetas</div>
                <button onClick={() => setNewTagOpen(v => !v)} style={{ border:'1px solid var(--border-s)', background:'var(--s2)', color:'var(--text-d)', borderRadius:999, padding:'4px 8px', fontSize:9, fontFamily:'inherit', cursor:'pointer' }}>+ Crear</button>
              </div>
              {newTagOpen && (
                <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', gap:6, marginBottom:8 }}>
                  <input
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createTag(); }}
                    placeholder="Nueva etiqueta"
                    style={{ minWidth:0, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, padding:'7px 9px', color:'var(--text)', fontFamily:'inherit', fontSize:10 }}
                  />
                  <button onClick={createTag} style={{ border:'none', background:C.gold, color:'#0a0a0a', borderRadius:8, padding:'7px 10px', fontSize:10, fontWeight:900, fontFamily:'inherit', cursor:'pointer' }}>Guardar</button>
                  <div style={{ gridColumn:'1 / -1', display:'flex', gap:5, flexWrap:'wrap' }}>
                    {INTERNAL_TAG_COLORS.map(color => (
                      <button key={color} onClick={() => setNewTagColor(color)} aria-label={`Color ${color}`} style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${newTagColor === color ? 'var(--text)' : 'transparent'}`, background:color, cursor:'pointer' }} />
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                <button onClick={() => setActiveTag('all')} style={{ border:`1px solid ${activeTag === 'all' ? 'rgba(201,169,110,.45)' : 'var(--border-s)'}`, background:activeTag === 'all' ? 'rgba(201,169,110,.12)' : 'var(--s2)', color:activeTag === 'all' ? C.gold : 'var(--text-d)', borderRadius:999, padding:'4px 9px', fontSize:9.5, fontFamily:'inherit', cursor:'pointer' }}>Todas ({conversations.length})</button>
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => setActiveTag(tag.id)} style={{ border:`1px solid ${activeTag === tag.id ? `${tag.color}55` : 'var(--border-s)'}`, background:activeTag === tag.id ? `${tag.color}18` : 'var(--s2)', color:activeTag === tag.id ? tag.color : 'var(--text-d)', borderRadius:999, padding:'4px 9px', fontSize:9.5, fontFamily:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:tag.color }} />
                    {tag.nombre} {tagCounts[tag.id] ? `(${tagCounts[tag.id]})` : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ overflow:'auto', padding:12, display:'grid', gap:8 }}>
            {filtered.map(conv => (
              <ConversationItem key={conv.id} conv={conv} active={active?.id === conv.id} onClick={() => openConversation(conv.id)} />
            ))}
          </div>
        </aside>

        <main className="internal-comms-main" style={{ display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
          {active ? (
            <>
              <div className="internal-comms-active-header" style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-s)', background:'var(--s1)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:220, flex:'1 1 auto' }}>
                  <button
                    className="internal-mobile-list-button"
                    onClick={() => setMobileListOpen(true)}
                    style={{ alignItems:'center', gap:6, border:'1px solid var(--border-s)', background:'var(--s2)', color:'var(--text-m)', borderRadius:8, padding:'7px 9px', fontSize:10, fontWeight:850, fontFamily:'inherit', cursor:'pointer', flexShrink:0 }}>
                    ← Conversaciones
                  </button>
                  <ConversationIcon type={active.type} color={active.color} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:900, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{active.title}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{active.subtitle}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end', flex:'0 0 auto' }}>
                  <select value={active.tagId || ''} onChange={e => assignTag(active.id, e.target.value)}
                    style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:8, color:'var(--text-m)', padding:'6px 8px', fontSize:10, fontFamily:'inherit' }}>
                    {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.nombre}</option>)}
                  </select>
                  {active.type === 'general' && <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:C.gold, fontSize:10, fontWeight:900 }}><Pin size={13} /> Mensaje fijable por administracion</span>}
                </div>
              </div>

              <div style={{ flex:1, overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                {messages.length ? messages.map(m => {
                  const member = teamById.get(String(m.sender_id || '')) || { name:m.sender_name, initials:String(m.sender_name || 'EQ').slice(0,2).toUpperCase(), color:'var(--blue)' };
                  const own = String(m.sender_id || '') === String(current.id || '');
                  const reply = messages.find(x => String(x.id) === String(m.reply_to_id || ''));
                  return (
                    <div key={m.id} style={{ alignSelf:own ? 'flex-end' : 'flex-start', width:'min(720px, 92%)', display:'flex', gap:9, flexDirection:own ? 'row-reverse' : 'row' }}>
                      <Avatar member={member} fallback={m.sender_name} size={32} />
                      <div style={{ minWidth:0, flex:1, background:own ? 'rgba(201,169,110,0.10)' : 'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:11 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:10, color:own ? C.gold : 'var(--text-d)', fontWeight:900 }}>{m.sender_name || member.name || 'Equipo'}</span>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:'var(--text-d)', fontSize:9 }}>
                            {timeLabel(m.created_at)} {own && <CheckCheck size={12} color={C.green} />}
                          </span>
                        </div>
                        {reply && (
                          <div style={{ borderLeft:`2px solid ${C.gold}`, padding:'5px 8px', marginBottom:8, background:'var(--s1)', borderRadius:8, color:'var(--text-d)', fontSize:10 }}>
                            {reply.sender_name}: {String(reply.message || '').slice(0, 110)}
                          </div>
                        )}
                        <div style={{ fontSize:12, color:'var(--text-m)', lineHeight:1.55 }}>
                          <MessageText text={m.message} />
                        </div>
                        {m.attachment_url && (
                          <a href={m.attachment_url} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:8, color:C.blue, fontSize:10, fontWeight:800 }}>
                            {String(m.attachment_url).startsWith('http') ? <Link2 size={13} /> : <Paperclip size={13} />}
                            {m.attachment_name || 'Abrir adjunto'}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ margin:'auto', textAlign:'center', color:'var(--text-d)', display:'grid', gap:8 }}>
                    <MessageSquare size={38} strokeWidth={1.5} style={{ margin:'0 auto', opacity:.45 }} />
                    <div>Sin mensajes todavia.</div>
                  </div>
                )}
              </div>

              <Composer
                active={active}
                current={current}
                user={user}
                team={data.team || []}
                addProjectChatMessage={addProjectChatMessage}
                showToast={showToast}
              />
            </>
          ) : (
            <div style={{ margin:'auto', color:'var(--text-d)' }}>No hay conversaciones disponibles.</div>
          )}
        </main>
      </div>
    </div>
  );
}

const statPillStyle = {
  display:'inline-flex',
  alignItems:'center',
  gap:7,
  background:'var(--s2)',
  border:'1px solid var(--border-s)',
  borderRadius:999,
  padding:'8px 11px',
  fontSize:10,
  fontWeight:900,
  color:'var(--text-m)',
};
