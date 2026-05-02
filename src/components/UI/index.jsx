import React from 'react';

// ── BADGE ─────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'gold', style }) {
  const palette = {
    gold:   { bg: 'var(--gold-faint)', color: 'var(--gold)' },
    warning:{ bg: 'rgba(251, 191, 36, 0.15)', color: 'var(--warning)' },
    green:  { bg: 'rgba(74, 222, 128, 0.15)', color: 'var(--green)' },
    red:    { bg: 'rgba(248, 113, 113, 0.15)',   color: 'var(--red)' },
    blue:   { bg: 'rgba(96, 165, 250, 0.15)',  color: 'var(--blue)' },
    teal:   { bg: 'rgba(45, 212, 191, 0.15)',  color: 'var(--teal)' },
    gray:   { bg: 'var(--border-m)', color: 'var(--text-m)' },
    purple: { bg: 'rgba(192, 132, 252, 0.15)', color: 'var(--purple)' },
    pink:   { bg: 'rgba(244, 114, 182, 0.15)',  color: 'var(--pink)' },
  };
  const p = palette[color] || palette.gold;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, fontWeight: 500, letterSpacing: '0.02em',
      padding: '3px 8px', borderRadius: 12,
      background: p.bg, color: p.color, ...style,
    }}>
      {children}
    </span>
  );
}

// ── BUTTON ────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'ghost', onClick, style, size = 'md' }) {
  const base = {
    fontFamily: 'inherit', fontWeight: 500, border: 'none',
    borderRadius: 8, cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: size === 'sm' ? 11 : 12,
    padding: size === 'sm' ? '5px 12px' : '8px 16px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
  };
  const variants = {
    ghost: { background: 'transparent', color: 'var(--text-m)', border: '1px solid var(--border-s)' },
    gold:  { background: 'var(--gold)', color: '#ffffff', fontWeight: 600, letterSpacing: '0.01em' },
    danger:{ background: 'rgba(248, 113, 113, 0.1)', color: 'var(--red)', border: '1px solid rgba(248, 113, 113, 0.2)' },
    text:  { background: 'transparent', color: 'var(--text-d)', border: 'none', padding: 0 },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }} 
      onMouseEnter={e => {
        if(variant === 'ghost') { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.transform = 'translateY(-1px)'; }
        if(variant === 'gold') { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--gold-faint)'; }
      }}
      onMouseLeave={e => {
        if(variant === 'ghost') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-m)'; e.currentTarget.style.transform = 'translateY(0)'; }
        if(variant === 'gold') { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }
      }}
    >
      {children}
    </button>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────────
export function Card({ children, style, highlight, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--s2)',
        border: highlight ? '1px solid var(--border)' : '1px solid var(--border-s)',
        borderRadius: 12,
        padding: '16px 20px',
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--s3)';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.borderColor = highlight ? 'var(--border)' : 'var(--border-s)';
        e.currentTarget.style.background = 'var(--s2)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      } : undefined}
    >
      {children}
    </div>
  );
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, textTransform: 'uppercase',
      letterSpacing: '.06em', color: 'var(--text-d)',
      fontWeight: 600, marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  );
}

// ── PROGRESS BAR ─────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'var(--text)', height = 4, style }) {
  return (
    <div style={{ height, background: 'var(--s4)', borderRadius: height / 2, overflow: 'hidden', ...style }}>
      <div style={{
        height: '100%', width: `${Math.min(value, 100)}%`,
        background: color, borderRadius: height / 2,
        transition: 'width .6s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}

// ── AVATAR ────────────────────────────────────────────────────────────────
export function Avatar({ initials, color, bg, size = 32, style }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg || 'var(--s4)', color: color || 'var(--text-m)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 500, flexShrink: 0, ...style,
    }}>
      {initials}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, delta, color }) {
  const deltaColor = delta === 'up' ? 'var(--green)' : delta === 'down' ? 'var(--red)' : 'var(--text)';
  return (
    <Card>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-d)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: color || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-m)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {delta && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${deltaColor}22`, color: deltaColor, fontWeight: 500 }}>
          {delta === 'up' ? '↑' : delta === 'down' ? '↓' : '!'}
        </span>}
        {sub}
      </div>}
    </Card>
  );
}

// ── DIVIDER ───────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <div style={{ height: 1, background: 'var(--border-s)', margin: '16px 0', ...style }} />;
}

// ── INPUT ─────────────────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', style }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: '100%', background: 'var(--s2)',
        border: '1px solid var(--border-s)', borderRadius: 8,
        padding: '10px 14px', fontSize: 13, color: 'var(--text)',
        outline: 'none', transition: 'all .2s ease', ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--text-m)'; e.target.style.background = 'var(--s3)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-s)'; e.target.style.background = 'var(--s2)'; }}
    />
  );
}

// ── SELECT ────────────────────────────────────────────────────────────────
export function Select({ value, onChange, children, style }) {
  return (
    <select
      value={value} onChange={onChange}
      style={{
        background: 'var(--s2)', border: '1px solid var(--border-s)',
        borderRadius: 8, color: 'var(--text)', fontSize: 12,
        padding: '8px 12px', fontFamily: 'inherit', outline: 'none', 
        transition: 'all .2s ease', cursor: 'pointer', ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--text-m)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-s)'}
    >
      {children}
    </select>
  );
}

// ── BRAND PILL ────────────────────────────────────────────────────────────
export function BrandPill({ brand }) {
  const isBL = brand === 'bl';
  return (
    <span style={{
      fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 600, letterSpacing: '0.04em',
      background: isBL ? 'rgba(244, 114, 182, 0.15)' : 'rgba(96, 165, 250, 0.15)',
      color: isBL ? 'var(--pink)' : 'var(--blue)',
    }}>
      {isBL ? 'B&L' : 'Feria'}
    </span>
  );
}

// ── STATUS PILL ───────────────────────────────────────────────────────────
export function StatusPill({ status }) {
  const map = {
    paid:    { label: 'Pagado',    color: 'green' },
    pending: { label: 'Pendiente', color: 'warning' },
    overdue: { label: 'Vencido',   color: 'red'   },
    waiting: { label: 'En espera', color: 'gray'  },
  };
  const s = map[status] || map.pending;
  return <Badge color={s.color}>{s.label}</Badge>;
}

// ── PULSE DOT ─────────────────────────────────────────────────────────────
export function PulseDot({ color = 'var(--green)', size = 7 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      animation: 'pulse 2s infinite', flexShrink: 0,
    }} />
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────
export function EmptyState({ icon = '◌', title, sub, action, onAction }) {
  const isIconComponent = typeof icon === 'function' || (icon && typeof icon === 'object' && typeof icon.render === 'function');
  const iconNode = React.isValidElement(icon)
    ? icon
    : isIconComponent
      ? React.createElement(icon, { size: 30, strokeWidth: 1.7 })
      : icon;
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--s1)', borderRadius: 12, border: '1px dashed var(--border-m)' }}>
      <div style={{ fontSize: 32, color: 'var(--text-d)', marginBottom: 12, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{iconNode}</div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-d)', marginBottom: 16 }}>{sub}</div>}
      {action && <Button variant="ghost" onClick={onAction}>{action}</Button>}
    </div>
  );
}
