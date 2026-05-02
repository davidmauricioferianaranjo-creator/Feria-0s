import React from 'react';
import { Camera, Compass, MessageCircle, MessageSquare, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, color: '#25D366' },
  instagram: { label: 'Instagram', Icon: Camera, color: '#D4537E' },
  facebook: { label: 'Messenger', Icon: MessageSquare, color: '#5B9BD5' },
  portal: { label: 'Portal', Icon: Compass, color: '#C9A96E' },
};

export default function MensajesContactInfo({ activeConv, clienteEnCRM, etiquetas, onChangeEtiqueta, C, showToast }) {
  const navigate = useNavigate();
  if (!activeConv) return null;

  const cliente = clienteEnCRM;
  const channel = CHANNEL_META[activeConv.canal] || CHANNEL_META.whatsapp;
  const ChannelIcon = channel.Icon;

  return (
    <aside className="mensajes-contact-info" style={{ width: 'clamp(220px, 22vw, 300px)', flexShrink: 0, borderLeft: '1px solid var(--border-s)', padding: '16px 14px', overflow: 'auto', background: 'var(--s1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-s)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${activeConv.color}22`, color: activeConv.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, margin: '0 auto 9px', position: 'relative' }}>
          {activeConv.avatar}
          <span style={{ position:'absolute', right:-3, bottom:-3, width:22, height:22, borderRadius:'50%', background:'var(--s2)', border:'1px solid var(--border-s)', display:'grid', placeItems:'center' }}>
            <ChannelIcon size={13} strokeWidth={1.8} color={channel.color} />
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{activeConv.nombre}</div>
        <div style={{ fontSize: 10, color: channel.color, marginTop: 4, display:'inline-flex', alignItems:'center', gap:5 }}>
          <ChannelIcon size={12} strokeWidth={1.8} color={channel.color} /> {channel.label}
        </div>
      </div>

      {!cliente ? (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 10 }}>No encontrado en CRM</div>
          <button onClick={() => { navigate('/crm'); showToast('Agrega el cliente en el CRM', '+'); }}
            style={{ width: '100%', background: C.gold, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <UserPlus size={14} /> Agregar al CRM
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>En el CRM</div>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '11px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{cliente.nombre}</div>
            <div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 7 }}>{cliente.servicio}</div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={{ color: 'var(--text-d)' }}>Etapa {cliente.stage || 0} de 10</span>
            </div>
          </div>
          <button onClick={() => navigate('/crm')}
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px', fontSize: 11, color: 'var(--text-m)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Ver en CRM
          </button>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Etiqueta</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {etiquetas.map(e => (
            <button key={e.id} onClick={() => onChangeEtiqueta(e.id)}
              style={{ fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', background: activeConv.etiqueta === e.id ? `${e.color}20` : 'var(--s2)', border: `1px solid ${activeConv.etiqueta === e.id ? `${e.color}50` : 'var(--border-s)'}`, color: activeConv.etiqueta === e.id ? e.color : 'var(--text-d)', display:'inline-flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:e.color }} />
              {e.nombre}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
