import React from 'react';
import { buildWALink, CALENDLY_LINK, paquetesPorCategoria, categoriaById } from '../../lib/packages';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';

const FONT_SERIF = "'DM Serif Display', serif";
const FONT_SANS = "'DM Sans', sans-serif";
const INK = '#111111';
const PAPER = '#FFFDF8';
const CREAM = '#F4EFE6';
const ROSE = '#D9485F';
const GOLD = '#BFA46A';
const BLUE = '#5B82C3';
const MINT = '#4EC6A6';
const BORDER = '#E4DCD1';
const MUTED = '#766E66';

function money(value) {
  return `$${Number(value || 0).toLocaleString()} USD`;
}

function SoftIcon({ children, tone = ROSE }) {
  return (
    <span style={{
      width: 34,
      height: 34,
      borderRadius: 10,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `${tone}18`,
      color: tone,
      border: `1px solid ${tone}30`,
      flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

function Cover({ categoriaId, nombre }) {
  const cat = categoriaById(categoriaId);
  return (
    <section style={{
      minHeight: 430,
      padding: '42px clamp(24px, 6vw, 64px)',
      background: `linear-gradient(135deg, ${INK} 0%, #181413 52%, #2A171B 100%)`,
      color: PAPER,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
      gap: 34,
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 32, letterSpacing: '-0.02em' }}>
          Feria <em style={{ color: ROSE }}>Design</em>
        </div>
        <div style={{ marginTop: 42, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${GOLD}55`, borderRadius: 999, color: '#E6D2A4', fontFamily: FONT_SANS, fontSize: 12 }}>
          <ShieldCheck size={15} /> Cotizacion personalizada
        </div>
        <h1 style={{ margin: '18px 0 0', fontFamily: FONT_SERIF, fontSize: 'clamp(42px, 7vw, 76px)', lineHeight: .95, letterSpacing: '-0.01em', fontWeight: 400 }}>
          Una marca con direccion, sistema y memoria.
        </h1>
        <p style={{ maxWidth: 560, margin: '22px 0 0', color: '#BEB7B1', fontFamily: FONT_SANS, fontSize: 16, lineHeight: 1.7 }}>
          {nombre ? `${nombre}, preparamos estas opciones para el momento actual de tu proyecto.` : 'Preparamos estas opciones para el momento actual de tu proyecto.'}
        </p>
      </div>

      <div style={{
        minHeight: 260,
        border: `1px solid ${GOLD}55`,
        borderRadius: 8,
        padding: 24,
        background: 'linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: '#9F988F', letterSpacing: '.12em', textTransform: 'uppercase' }}>Servicio</div>
          <div style={{ marginTop: 10, fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 1.05 }}>
            {cat?.nombre || 'Branding'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 34 }}>
          <div style={{ borderTop: `1px solid ${BORDER}33`, paddingTop: 12 }}>
            <div style={{ color: GOLD, fontFamily: FONT_SERIF, fontSize: 28 }}>60/40</div>
            <div style={{ color: '#928B86', fontFamily: FONT_SANS, fontSize: 12 }}>Forma de pago</div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}33`, paddingTop: 12 }}>
            <div style={{ color: MINT, fontFamily: FONT_SERIF, fontSize: 28 }}>Portal</div>
            <div style={{ color: '#928B86', fontFamily: FONT_SANS, fontSize: 12 }}>Brief y avance</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro({ nota, validez }) {
  return (
    <section style={{ background: PAPER, padding: '44px clamp(24px, 6vw, 64px)', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 26, alignItems: 'start' }}>
        <div>
          <div style={{ color: ROSE, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase' }}>Propuesta clara</div>
          <h2 style={{ margin: '10px 0 0', color: INK, fontFamily: FONT_SERIF, fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.03, fontWeight: 400 }}>
            Elige el nivel de acompanamiento que tu marca necesita.
          </h2>
        </div>
        <div style={{ color: MUTED, fontFamily: FONT_SANS, fontSize: 15, lineHeight: 1.8 }}>
          Cada plan incluye una ruta de trabajo guiada: contrato, anticipo, brief en portal, produccion, presentacion, aprobaciones y entrega final. Los datos personales y legales se capturan una sola vez para documentos, facturas y notificaciones.
          {nota && (
            <div style={{ marginTop: 18, borderLeft: `3px solid ${ROSE}`, padding: '10px 0 10px 16px', color: '#4D4540', fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 1.55, fontStyle: 'italic' }}>
              {nota}
            </div>
          )}
          <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: `${BLUE}12`, color: BLUE, fontSize: 13, fontWeight: 700 }}>
            <Clock3 size={15} /> Validez: {validez}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessStrip() {
  const steps = [
    ['Seleccion', 'Confirmamos paquete y metodo de pago.'],
    ['Contrato', 'El equipo registra la ficha maestra y envia el PDF.'],
    ['Anticipo', 'Stripe o transferencia, segun el acuerdo.'],
    ['Portal', 'Brief, avances, aprobaciones y entregas.'],
  ];
  return (
    <section style={{ background: CREAM, padding: '26px clamp(20px, 5vw, 54px)', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {steps.map(([title, desc], index) => (
          <div key={title} style={{ background: PAPER, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, minHeight: 112 }}>
            <div style={{ color: ROSE, fontFamily: FONT_SERIF, fontSize: 26 }}>{String(index + 1).padStart(2, '0')}</div>
            <div style={{ marginTop: 8, color: INK, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 14 }}>{title}</div>
            <div style={{ marginTop: 6, color: MUTED, fontFamily: FONT_SANS, fontSize: 12.5, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaqueteCard({ pkg, clienteNombre, descuento = 0 }) {
  const total = Math.round(pkg.precio * (1 - descuento / 100));
  const waLink = buildWALink({ ...pkg, precio: total }, clienteNombre);
  const isFeatured = Boolean(pkg.featured);

  const handleWA = () => window.open(waLink, '_blank', 'noopener,noreferrer');
  const handleCalendly = () => window.open(`${CALENDLY_LINK}?utm_source=cotizacion&utm_medium=${pkg.id}`, '_blank', 'noopener,noreferrer');

  return (
    <article style={{
      background: isFeatured ? '#14100F' : PAPER,
      color: isFeatured ? PAPER : INK,
      border: `1px solid ${isFeatured ? ROSE : BORDER}`,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: isFeatured ? '0 24px 60px rgba(17,17,17,.22)' : '0 18px 45px rgba(24,20,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
    }}>
      <div style={{ padding: 22, borderBottom: `1px solid ${isFeatured ? 'rgba(255,255,255,.12)' : BORDER}` }}>
        {isFeatured && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${ROSE}22`, color: '#FF7084', border: `1px solid ${ROSE}66`, borderRadius: 999, padding: '6px 10px', fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            <CheckCircle2 size={14} /> Recomendado
          </div>
        )}
        <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 1, fontWeight: 400 }}>{pkg.nombre}</h3>
        <p style={{ margin: '9px 0 0', minHeight: 42, fontFamily: FONT_SANS, color: isFeatured ? '#AFA8A2' : MUTED, fontSize: 14, lineHeight: 1.45 }}>{pkg.subtitulo}</p>
        {descuento > 0 && (
          <div style={{ marginTop: 14, color: isFeatured ? '#827A75' : '#A39C95', fontFamily: FONT_SANS, fontSize: 13, textDecoration: 'line-through' }}>
            {money(pkg.precio)}
          </div>
        )}
        <div style={{ marginTop: 10, fontFamily: FONT_SERIF, fontSize: 42, lineHeight: 1, color: isFeatured ? '#FF7084' : ROSE }}>
          {money(total)}
        </div>
      </div>

      <div style={{ padding: '18px 22px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', fontFamily: FONT_SANS, fontSize: 13, color: isFeatured ? '#CFC9C4' : '#514942' }}>
          <SoftIcon tone={GOLD}><CalendarDays size={17} /></SoftIcon>
          <span>{pkg.duracion}</span>
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', fontFamily: FONT_SANS, fontSize: 13, color: isFeatured ? '#CFC9C4' : '#514942' }}>
          <SoftIcon tone={MINT}><ShieldCheck size={17} /></SoftIcon>
          <span>60% inicio</span>
        </div>
      </div>

      <div style={{ padding: '10px 22px 20px', flex: 1 }}>
        {pkg.items.filter(Boolean).map((item, i) => (
          <div key={`${pkg.id}-${i}`} style={{
            display: 'grid',
            gridTemplateColumns: '18px minmax(0, 1fr)',
            gap: 8,
            padding: '8px 0',
            borderBottom: i < pkg.items.filter(Boolean).length - 1 ? `1px solid ${isFeatured ? 'rgba(255,255,255,.08)' : '#EFE8DE'}` : 'none',
            color: isFeatured ? '#D9D4CE' : '#4F4741',
            fontFamily: FONT_SANS,
            fontSize: 13,
            lineHeight: 1.45,
          }}>
            <CheckCircle2 size={15} color={isFeatured ? '#FF7084' : ROSE} style={{ marginTop: 2 }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: 18, borderTop: `1px solid ${isFeatured ? 'rgba(255,255,255,.12)' : BORDER}`, display: 'grid', gap: 9 }}>
        <button onClick={handleWA} style={{
          border: 'none',
          borderRadius: 8,
          background: isFeatured ? ROSE : INK,
          color: '#fff',
          padding: '13px 16px',
          fontFamily: FONT_SANS,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <MessageCircle size={17} /> Me interesa este plan
        </button>
        <button onClick={handleCalendly} style={{
          border: `1px solid ${isFeatured ? 'rgba(255,255,255,.22)' : BORDER}`,
          borderRadius: 8,
          background: 'transparent',
          color: isFeatured ? '#D7D0CB' : '#514942',
          padding: '12px 16px',
          fontFamily: FONT_SANS,
          fontSize: 13,
          cursor: 'pointer',
        }}>
          Agendar llamada para dudas
        </button>
      </div>
    </article>
  );
}

function PackagesSection({ paquetes, nombreFinal, descuento, validez }) {
  return (
    <section style={{ background: CREAM, padding: '46px clamp(20px, 5vw, 54px)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto 28px', textAlign: 'center' }}>
        <div style={{ color: ROSE, fontFamily: FONT_SANS, fontWeight: 800, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase' }}>Planes sugeridos</div>
        <h2 style={{ margin: '10px 0 0', color: INK, fontFamily: FONT_SERIF, fontSize: 'clamp(34px, 5vw, 54px)', fontWeight: 400, lineHeight: 1.03 }}>
          Compara sin perder el contexto.
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
        {paquetes.map(pkg => (
          <PaqueteCard key={pkg.id} pkg={pkg} clienteNombre={nombreFinal} descuento={descuento} />
        ))}
      </div>
      <div style={{ marginTop: 18, textAlign: 'center', color: MUTED, fontFamily: FONT_SANS, fontSize: 13 }}>
        Precios validos por {validez}. No incluyen IVA cuando aplique.
      </div>
    </section>
  );
}

function Methodology() {
  const steps = [
    ['Brief', 'Preguntas que definen contexto, objetivos, mercado y tono de marca.'],
    ['Analisis', 'Convertimos la informacion en direccion visual y decisiones concretas.'],
    ['Sistema', 'Disenamos logotipo, color, tipografia y aplicaciones coherentes.'],
    ['Aprobacion', 'Presentamos, ajustamos y dejamos registro de aprobacion final.'],
  ];
  return (
    <section style={{ background: '#111', color: PAPER, padding: '48px clamp(24px, 6vw, 64px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 28 }}>
        <div>
          <div style={{ color: '#777', fontFamily: FONT_SANS, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }}>Metodo de trabajo</div>
          <h2 style={{ margin: '10px 0 0', fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 46, lineHeight: 1 }}>Estrategia antes de forma.</h2>
        </div>
        <div>
          {steps.map(([title, desc], i) => (
            <div key={title} style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 14, padding: '16px 0', borderBottom: i < steps.length - 1 ? '1px solid #262626' : 'none' }}>
              <div style={{ fontFamily: FONT_SERIF, color: i === 0 ? ROSE : '#6E6862', fontSize: 30 }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 15 }}>{title}</div>
                <div style={{ marginTop: 4, fontFamily: FONT_SANS, color: '#8D8782', fontSize: 13, lineHeight: 1.55 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaymentSection() {
  return (
    <section style={{ background: '#FAD9D2', padding: '48px clamp(24px, 6vw, 64px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 26, alignItems: 'start' }}>
        <div>
          <div style={{ color: '#B96458', fontFamily: FONT_SANS, fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Inversion</div>
          <h2 style={{ margin: '10px 0 0', color: INK, fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 46, lineHeight: 1 }}>Forma de pago</h2>
        </div>
        <div style={{ background: 'rgba(255,255,255,.48)', border: '1px solid rgba(255,255,255,.55)', borderRadius: 8, padding: 22 }}>
          {[
            ['60%', 'Anticipo para iniciar', 'Activa contrato, calendario y brief del portal.'],
            ['40%', 'Saldo al aprobar', 'Se cancela antes de liberar el Brand Kit final.'],
          ].map(([amount, title, desc], i) => (
            <div key={title} style={{ display: 'grid', gridTemplateColumns: '74px minmax(0,1fr)', gap: 16, padding: i === 0 ? '0 0 18px' : '18px 0 0', borderBottom: i === 0 ? '1px solid rgba(17,17,17,.12)' : 'none' }}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 40, lineHeight: 1, color: INK }}>{amount}</div>
              <div>
                <div style={{ fontFamily: FONT_SANS, fontWeight: 800, color: INK, fontSize: 15 }}>{title}</div>
                <div style={{ marginTop: 5, fontFamily: FONT_SANS, color: '#6B615B', fontSize: 13, lineHeight: 1.55 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 22, fontFamily: FONT_SANS, color: '#6B615B', fontSize: 13, lineHeight: 1.7 }}>
            Ecuador: transferencia bancaria. Internacional: enlace de pago Stripe. El metodo queda definido en el contrato para automatizar facturas y notificaciones.
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: PAPER, padding: '36px clamp(24px, 6vw, 64px)', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 28, color: INK }}>Feria <em style={{ color: ROSE }}>Design</em></div>
          <div style={{ marginTop: 5, fontFamily: FONT_SANS, color: MUTED, fontSize: 13 }}>info@feria.design · www.feria.design</div>
        </div>
        <div style={{ fontFamily: FONT_SANS, color: MUTED, fontSize: 13 }}>+593 98 025 0889 · @feria.designstudio</div>
      </div>
    </footer>
  );
}

export default function CotizacionLanding({
  categoriaId = 'branding',
  paquetesIds = null,
  nombreFinal = 'Cliente',
  descuento = 0,
  validez = '10 dias',
  nota,
  onClose,
  onEnviar,
}) {
  const todos = paquetesPorCategoria(categoriaId, true);
  const paquetes = paquetesIds ? todos.filter(p => paquetesIds.includes(p.id)) : todos;
  const ordenados = [...paquetes].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.92)',
      zIndex: 400,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '20px 14px',
      overflowY: 'auto',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;700;800&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 980, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, padding: '0 2px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#8E8780', fontFamily: FONT_SANS }}>
            Vista previa del cliente
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #444', color: '#B8B0AA', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: FONT_SANS, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <ArrowLeft size={14} /> Editar
            </button>
            {onEnviar && (
              <button onClick={onEnviar} style={{ background: ROSE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: FONT_SANS, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Send size={14} /> Enviar al cliente
              </button>
            )}
          </div>
        </div>

        <div style={{ background: CREAM, borderRadius: 8, overflow: 'hidden', border: '1px solid #333', boxShadow: '0 28px 90px rgba(0,0,0,.38)' }}>
          <Cover categoriaId={categoriaId} nombre={nombreFinal} />
          <Intro nota={nota} validez={validez} />
          <ProcessStrip />
          <PackagesSection paquetes={ordenados} nombreFinal={nombreFinal} descuento={descuento} validez={validez} />
          <Methodology />
          <PaymentSection />
          <Footer />
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', fontSize: 12, cursor: 'pointer', fontFamily: FONT_SANS }}>
            Cerrar vista previa
          </button>
        </div>
      </div>
    </div>
  );
}
