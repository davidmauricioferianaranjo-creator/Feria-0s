import React from 'react';
import { Check, Clock3, Download, FileText, Image as ImageIcon, Mic, RefreshCcw, Video } from 'lucide-react';

const PROXY = process.env.REACT_APP_SUPABASE_URL
  ? `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/media-proxy`
  : '';

function mediaKind(msg = {}) {
  const explicit = msg.media_tipo || msg.media_type || msg.tipo_media;
  const mime = msg.mime_type || msg.mimetype || msg.content_type || '';
  if (explicit) return String(explicit).toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime) return 'document';
  return null;
}

function mediaUrl(msg = {}) {
  const raw = msg.media_url || msg.url || msg.attachment_url;
  if (raw) {
    if (/^(data:|blob:)/i.test(raw) || !PROXY) return raw;
    return `${PROXY}?url=${encodeURIComponent(raw)}`;
  }
  if (msg.media_id && PROXY) return `${PROXY}?id=${encodeURIComponent(msg.media_id)}`;
  return null;
}

function MediaFallback({ kind, name }) {
  const meta = {
    image: { Icon: ImageIcon, label: 'Imagen recibida' },
    audio: { Icon: Mic, label: 'Nota de voz recibida' },
    video: { Icon: Video, label: 'Video recibido' },
    document: { Icon: FileText, label: 'Documento recibido' },
  }[kind] || { Icon: FileText, label: 'Adjunto recibido' };
  const Icon = meta.Icon;
  return (
    <div style={{ marginTop: 7, border: '1px solid var(--border-s)', background: 'rgba(255,255,255,.03)', borderRadius: 9, padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-m)', fontSize: 11 }}>
      <Icon size={15} strokeWidth={1.8} color="var(--gold)" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || meta.label}</span>
    </div>
  );
}

function MediaRenderer({ msg }) {
  const kind = mediaKind(msg);
  const url = mediaUrl(msg);
  if (!kind) return null;

  if (kind === 'image') {
    return url ? (
      <img src={url} alt={msg.media_name || 'Imagen recibida'} style={{ maxWidth: 230, borderRadius: 10, marginTop: 8, display: 'block', border: '1px solid var(--border-s)' }} />
    ) : <MediaFallback kind="image" name={msg.media_name} />;
  }

  if (kind === 'audio') {
    return url ? (
      <audio controls src={url} style={{ width: 240, maxWidth: '100%', marginTop: 8, display: 'block' }} />
    ) : <MediaFallback kind="audio" name={msg.media_name} />;
  }

  if (kind === 'video') {
    return url ? (
      <video controls src={url} style={{ width: 250, maxWidth: '100%', borderRadius: 10, marginTop: 8, display: 'block', border: '1px solid var(--border-s)' }} />
    ) : <MediaFallback kind="video" name={msg.media_name} />;
  }

  return url ? (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 11, color: 'var(--gold)', textDecoration: 'none', border: '1px solid var(--border-s)', borderRadius: 9, padding: '8px 10px' }}>
      <Download size={14} strokeWidth={1.8} />
      {msg.media_name || 'Descargar documento'}
    </a>
  ) : <MediaFallback kind="document" name={msg.media_name || msg.attachment_name} />;
}

export default function MessageBubble({ msg, isOwn, onRetry }) {
  const StatusIcon = msg._status === 'sending'
    ? Clock3
    : msg._status === 'error'
      ? RefreshCcw
      : isOwn
        ? Check
        : null;
  const hasText = Boolean(String(msg.texto || msg.caption || '').trim());

  return (
    <div style={{ maxWidth: '76%', alignSelf: isOwn ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', gap: 2, opacity: msg._status === 'sending' ? 0.7 : 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-d)', padding: '0 4px', textAlign: isOwn ? 'right' : 'left' }}>
        {msg.nombre || (isOwn ? 'Feria' : 'Cliente')}
      </div>
      <div style={{
        padding: '9px 13px',
        fontSize: 12,
        lineHeight: 1.5,
        borderRadius: isOwn ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        background: isOwn
          ? msg._status === 'error' ? 'rgba(224,96,96,0.15)' : 'rgba(201,169,110,0.1)'
          : 'var(--s2)',
        border: isOwn
          ? `1px solid ${msg._status === 'error' ? 'rgba(224,96,96,0.3)' : 'rgba(201,169,110,0.2)'}`
          : '1px solid var(--border-s)',
      }}>
        {hasText && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.texto || msg.caption}</div>}
        <MediaRenderer msg={msg} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-d)', padding: '0 4px', textAlign: isOwn ? 'right' : 'left', display: 'flex', gap: 5, justifyContent: isOwn ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''}
        {StatusIcon && <StatusIcon size={10} strokeWidth={2} color={msg._status === 'error' ? 'var(--red)' : 'var(--text-d)'} aria-label={msg._status || 'sent'} />}
        {msg._status === 'error' && onRetry && (
          <button onClick={() => onRetry(msg)}
            style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginLeft: 4 }}>
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
