import React from 'react';

const EMOJI_OPTIONS = [
  '🙂', '😊', '🙌', '✨', '💛', '🔥', '👏', '💪',
  '👀', '👌', '✅', '🙏', '🎉', '💡', '📌', '🗓️',
  '💬', '📎', '❤️', '⭐', '🚀', '☕', '🎨', '📣',
];

export default function EmojiPicker({ open, onPick, onClose, align = 'left' }) {
  if (!open) return null;

  return (
    <div
      style={{
        position:'absolute',
        bottom:'calc(100% + 8px)',
        [align === 'right' ? 'right' : 'left']:0,
        zIndex:20,
        width:236,
        background:'var(--s1)',
        border:'1px solid var(--border-s)',
        borderRadius:12,
        boxShadow:'0 18px 48px rgba(0,0,0,.18)',
        padding:8,
      }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:900, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>Emojis</span>
        <button
          type="button"
          onClick={onClose}
          style={{ border:'none', background:'transparent', color:'var(--text-d)', cursor:'pointer', fontSize:14, lineHeight:1 }}>
          x
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:4 }}>
        {EMOJI_OPTIONS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            style={{
              width:24,
              height:24,
              display:'grid',
              placeItems:'center',
              border:'1px solid transparent',
              background:'var(--s2)',
              borderRadius:7,
              cursor:'pointer',
              fontSize:14,
              lineHeight:1,
            }}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
