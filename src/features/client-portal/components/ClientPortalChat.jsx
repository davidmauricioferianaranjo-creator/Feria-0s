import React, { useRef, useState } from 'react';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import { supabase, isConfigured } from '../../../lib/supabase';
import EmojiPicker from '../../mensajes/components/EmojiPicker';
import ChatMediaAttachment from '../../mensajes/components/ChatMediaAttachment';

const PORTAL_BUCKET = 'mensajes-adjuntos';
const MAX_FILE_MB = 20;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf',
]);

function validateFile(file) {
  if (!file) return 'Selecciona un archivo.';
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `El archivo supera ${MAX_FILE_MB} MB.`;
  if (file.type && !ALLOWED_TYPES.has(file.type)) return 'Usa imagen, PDF, video o audio.';
  return '';
}

async function uploadPortalFile(file, fallbackUrl, key = 'cliente') {
  if (!isConfigured) return fallbackUrl || URL.createObjectURL(file);
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeKey = String(key || 'cliente').replace(/[^a-z0-9_-]/gi, '-');
  const safeName = file.name.replace(/[^\w.-]/g, '-').slice(-80) || `archivo.${ext}`;
  const path = `portal-cliente/${safeKey}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const { error } = await supabase.storage.from(PORTAL_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PORTAL_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function ClientPortalChat({ chatMsgs, chatInput, setChatInput, onSend, isDark, accentColor = '#E11D48' }) {
  const gold  = accentColor || '#E11D48';
  const text  = isDark ? '#EDE8DF' : '#1A1815';
  const textD = isDark ? 'rgba(237,232,223,.56)' : 'rgba(26,24,21,.52)';
  const s2    = isDark ? '#131210' : '#F7F4EF';
  const s3    = isDark ? '#1A1815' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.08)';
  const fileInput = useRef(null);
  const [attachment, setAttachment] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState('');

  const selectAttachment = (file) => {
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return false;
    }
    setError('');
    setAttachment({ file, name: file.name, size: file.size, mime: file.type, previewUrl: URL.createObjectURL(file) });
    return true;
  };

  const clearAttachment = () => {
    setAttachment(null);
    setError('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    selectAttachment(e.dataTransfer.files?.[0]);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  };

  const send = async () => {
    if (!chatInput.trim() && !attachment) return;
    let attachmentUrl = '';
    if (attachment?.file) {
      setUploading(true);
      try {
        attachmentUrl = await uploadPortalFile(attachment.file, attachment.previewUrl, attachment.name);
      } catch (_) {
        attachmentUrl = attachment.previewUrl;
      }
      setUploading(false);
    }
    await onSend({
      attachmentName: attachment?.name || '',
      attachmentSize: attachment?.size || 0,
      attachmentUrl,
      attachmentMime: attachment?.mime || '',
    });
    setAttachment(null);
    setEmojiOpen(false);
    setError('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const canSend = Boolean(chatInput.trim() || attachment);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ padding: '24px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 560, position:'relative' }}>
      {dragging && (
        <div style={{ position:'absolute', inset:12, zIndex:5, border:`1px dashed ${gold}`, borderRadius:18, background:isDark?'rgba(225,29,72,.12)':'rgba(225,29,72,.08)', color:gold, display:'grid', placeItems:'center', fontSize:13, fontWeight:900, pointerEvents:'none' }}>
          Suelta el archivo para adjuntarlo
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: text, marginBottom: 5 }}>Mensajes</div>
          <div style={{ fontSize: 12, color: textD }}>Canal directo con Feria. Puedes enviar imagenes, PDF, audio o video.</div>
        </div>
        <div style={{ background:'rgba(224,96,96,.12)', color:'#E06060', border:'1px solid rgba(224,96,96,.25)', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{chatMsgs.filter(m => m.from === 'studio').length}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14, background:s2, border:`1px solid ${border}`, borderRadius:14, padding:16 }}>
        {chatMsgs.map((m, i) => {
          const own = m.from === 'client';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '82%', minWidth: 0, background: own ? `${gold}14` : s3, border: `1px solid ${own ? gold + '30' : border}`, borderRadius: own ? '14px 4px 14px 14px' : '4px 14px 14px 14px', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: own ? gold : textD, marginBottom: 4, fontWeight:700 }}>{m.name || (own ? 'Tu' : 'Feria')} · {m.time}</div>
                {m.text && <div style={{ fontSize: 12, color: text, lineHeight: 1.5, whiteSpace:'pre-line' }}>{m.text}</div>}
                {(m.attachmentUrl || m.attachment_url || m.attachmentName || m.attachment_name) && (
                  <ChatMediaAttachment
                    url={m.attachmentUrl || m.attachment_url || ''}
                    name={m.attachmentName || m.attachment_name || ''}
                    mime={m.attachmentMime || m.attachment_mime || m.mime_type || ''}
                    colors={{ accent:gold, text, muted:textD, border, bg:isDark?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {attachment && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, background:s2, border:`1px solid ${border}`, borderRadius:10, padding:'8px 10px', fontSize:11, color:textD, marginBottom:8 }}>
          <ChatMediaAttachment
            url={attachment.previewUrl}
            name={attachment.name}
            mime={attachment.mime}
            compact
            colors={{ accent:gold, text, muted:textD, border, bg:'transparent' }}
          />
          <button onClick={clearAttachment} style={{ background:'transparent', border:'none', color:textD, cursor:'pointer', padding:3 }} aria-label="Quitar archivo"><X size={14} /></button>
        </div>
      )}

      {error && <div style={{ color:'#E06060', fontSize:11, marginBottom:8 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 8, alignItems:'center' }}>
        <button onClick={() => setEmojiOpen(v => !v)} title="Emoji" style={{ position:'relative', background:s3, border:`1px solid ${border}`, color:textD, borderRadius:10, width:42, height:42, cursor:'pointer', display:'grid', placeItems:'center' }}>
          <Smile size={17} strokeWidth={1.8} />
          <EmojiPicker open={emojiOpen} onPick={(emoji) => { setChatInput(v => `${v}${emoji}`); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />
        </button>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(); }}
          placeholder="Escribe un mensaje..."
          style={{ minWidth:0, background: s3, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: text, outline: 'none', fontFamily: 'inherit' }}
        />
        <input ref={fileInput} type="file" accept="image/*,audio/*,video/*,.pdf" style={{ display:'none' }} onChange={e => { selectAttachment(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => fileInput.current?.click()} title="Adjuntar archivo" style={{ background:s3, border:`1px solid ${border}`, color:textD, borderRadius:10, width:42, height:42, cursor:'pointer', display:'grid', placeItems:'center' }}>
          <Paperclip size={17} strokeWidth={1.8} />
        </button>
        <button onClick={send} disabled={!canSend || uploading} style={{ background: canSend && !uploading ? gold : s2, color: canSend && !uploading ? '#fff' : textD, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 800, cursor: canSend && !uploading ? 'pointer' : 'default', fontFamily: 'inherit', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <Send size={15} strokeWidth={1.9} />
          {uploading ? 'Subiendo' : 'Enviar'}
        </button>
      </div>
      <div style={{ color:textD, fontSize:10, marginTop:7, display:'flex', alignItems:'center', gap:6 }}>
        <Paperclip size={12} strokeWidth={1.8} />
        Arrastra o adjunta imagen, PDF, video o audio · max. 20 MB
      </div>
    </div>
  );
}
