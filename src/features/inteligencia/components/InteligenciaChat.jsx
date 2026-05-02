import React from 'react';

export function FormattedResponse({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        if (line.startsWith('###')) return <div key={i} style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginTop: 10, marginBottom: 2 }}>{line.replace(/^###\s*/, '')}</div>;
        if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontSize: 12, fontWeight: 600 }}>{line.replace(/\*\*/g, '')}</div>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ fontSize: 12, paddingLeft: 12, display: 'flex', gap: 6 }}><span style={{ color: 'var(--gold)', flexShrink: 0 }}>·</span><span>{line.replace(/^[-*]\s/, '')}</span></div>;
        if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
        return <div key={i} style={{ fontSize: 12, lineHeight: 1.6 }}>{line}</div>;
      })}
    </div>
  );
}

export function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '6px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', opacity: 0.4, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}
