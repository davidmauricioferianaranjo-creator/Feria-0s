import React from 'react';
import { Download, FileAudio, FileImage, FileText, FileVideo } from 'lucide-react';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'ogg', 'wav', 'webm'];
const VIDEO_EXT = ['mp4', 'mov', 'm4v', 'webm', 'ogv'];

function extensionFrom(value = '') {
  const clean = String(value).split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

export function getChatAttachmentKind({ url = '', name = '', mime = '' } = {}) {
  const type = String(mime || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf') return 'document';

  const ext = extensionFrom(name) || extensionFrom(url);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (AUDIO_EXT.includes(ext)) return 'audio';
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (ext === 'pdf') return 'document';
  return url || name ? 'file' : '';
}

function FileFallback({ kind, name, url, colors, compact }) {
  const meta = {
    image: { Icon: FileImage, label: 'Imagen adjunta' },
    audio: { Icon: FileAudio, label: 'Audio adjunto' },
    video: { Icon: FileVideo, label: 'Video adjunto' },
    document: { Icon: FileText, label: 'Documento adjunto' },
    file: { Icon: FileText, label: 'Archivo adjunto' },
  }[kind] || { Icon: FileText, label: 'Archivo adjunto' };
  const Icon = meta.Icon;
  const label = name || meta.label;
  const content = (
    <span style={{ display:'inline-flex', alignItems:'center', gap:8, minWidth:0 }}>
      <Icon size={compact ? 14 : 16} strokeWidth={1.8} color={colors.accent} style={{ flexShrink:0 }} />
      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
    </span>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{
        display:'inline-flex', alignItems:'center', justifyContent:'space-between', gap:10,
        width:'100%', color:colors.text, textDecoration:'none',
      }}>
        {content}
        <Download size={compact ? 13 : 15} strokeWidth={1.8} color={colors.muted} />
      </a>
    );
  }
  return content;
}

export default function ChatMediaAttachment({
  url = '',
  name = '',
  mime = '',
  compact = false,
  colors = {},
}) {
  const kind = getChatAttachmentKind({ url, name, mime });
  if (!kind) return null;

  const palette = {
    accent: colors.accent || 'var(--gold)',
    text: colors.text || 'var(--text-m)',
    muted: colors.muted || 'var(--text-d)',
    border: colors.border || 'var(--border-s)',
    bg: colors.bg || 'var(--s2)',
  };

  const wrap = {
    marginTop: compact ? 6 : 8,
    border:`1px solid ${palette.border}`,
    borderRadius: compact ? 9 : 12,
    padding: compact ? 8 : 10,
    background: palette.bg,
    color: palette.text,
    fontSize: compact ? 11 : 12,
    lineHeight:1.35,
    maxWidth:'100%',
  };

  if (kind === 'image' && url) {
    return (
      <div style={wrap}>
        <img src={url} alt={name || 'Imagen adjunta'} style={{ width:'100%', maxWidth:360, maxHeight:260, objectFit:'cover', borderRadius:8, display:'block' }} />
        {name && <div style={{ marginTop:7, color:palette.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>}
      </div>
    );
  }

  if (kind === 'audio' && url) {
    return (
      <div style={wrap}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, color:palette.muted }}>
          <FileAudio size={15} strokeWidth={1.8} color={palette.accent} />
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name || 'Audio adjunto'}</span>
        </div>
        <audio controls preload="metadata" src={url} style={{ width:'100%', display:'block' }} />
      </div>
    );
  }

  if (kind === 'video' && url) {
    return (
      <div style={wrap}>
        <video controls preload="metadata" src={url} style={{ width:'100%', maxWidth:420, borderRadius:8, display:'block', background:'#000' }} />
        {name && <div style={{ marginTop:7, color:palette.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>}
      </div>
    );
  }

  return (
    <div style={wrap}>
      <FileFallback kind={kind} name={name} url={url} colors={palette} compact={compact} />
    </div>
  );
}
