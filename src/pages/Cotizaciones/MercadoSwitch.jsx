import React from 'react';

/**
 * MercadoSwitch
 * Switch nacional / internacional para la sección de Cotizaciones.
 * Cuando se cambia el mercado, los precios pueden mostrar la moneda correcta
 * y el mensaje de forma de pago se adapta.
 *
 * Uso en Cotizaciones/index.jsx:
 *   import MercadoSwitch from './MercadoSwitch';
 *   const [mercado, setMercado] = useState('internacional');
 *   <MercadoSwitch mercado={mercado} onChange={setMercado} />
 */
export default function MercadoSwitch({ mercado, onChange }) {
  const opts = [
    {
      id:       'nacional',
      label:    'Nacional',
      sublabel: 'Ecuador · USD',
      icon:     '🇪🇨',
      desc:     'Precio en USD. Acepta Stripe y transferencia bancaria Banco Pichincha.',
    },
    {
      id:       'internacional',
      label:    'Internacional',
      sublabel: 'LATAM · USA · Europa',
      icon:     '🌎',
      desc:     'Precio en USD. Solo Stripe / tarjeta de crédito o débito internacional.',
    },
  ];

  return (
    <div style={{ display:'flex', gap:8, marginBottom:16 }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{
            flex:1, display:'flex', alignItems:'center', gap:10,
            padding:'10px 14px', cursor:'pointer', fontFamily:'inherit',
            background: mercado === o.id ? 'var(--s2)' : 'transparent',
            border: `1px solid ${mercado === o.id ? 'var(--gold)' : 'var(--border-s)'}`,
            borderLeft: mercado === o.id ? '3px solid var(--gold)' : '1px solid var(--border-s)',
            borderRadius:10, transition:'all .15s',
          }}>
          <span style={{ fontSize:20, flexShrink:0 }}>{o.icon}</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:12, fontWeight: mercado === o.id ? 600 : 400, color: mercado === o.id ? 'var(--text)' : 'var(--text-m)' }}>
              {o.label}
            </div>
            <div style={{ fontSize:10, color:'var(--text-d)', marginTop:1 }}>{o.sublabel}</div>
          </div>
          {mercado === o.id && (
            <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }} />
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Retorna la información de forma de pago según el mercado
 */
export function getFormaPago(mercado) {
  if (mercado === 'nacional') {
    return {
      stripe: true,
      transferencia: true,
      texto: '60% al inicio · 40% antes de la entrega',
      metodos: [
        { label: 'Stripe / Tarjeta',          icon: '💳', desc: 'Visa, Mastercard, American Express' },
        { label: 'Transferencia bancaria',     icon: '🏦', desc: 'Banco Pichincha · Cta. 2201062504' },
      ],
    };
  }
  return {
    stripe: true,
    transferencia: false,
    texto: '60% al inicio · 40% antes de la entrega',
    metodos: [
      { label: 'Stripe / Tarjeta internacional', icon: '💳', desc: 'Visa, Mastercard, Amex · Wise · PayPal' },
    ],
  };
}
