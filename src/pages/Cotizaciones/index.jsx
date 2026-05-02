import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { SectionLabel } from '../../components/UI';
import { COUNTRY_CODES, buildInternationalPhone } from '../../lib/countries';
import {
  CATEGORIAS, PAQUETES, paquetesPorCategoria,
  AGENDAR_LINK,
  getPrecio,
} from '../../lib/packages';
import CotizacionLanding from './CotizacionLanding';
import { ArrowRight, Camera, FileText, Gem, Globe2, History, MapPin, Palette, Send, X, Eye } from 'lucide-react';
import { buildCorporateEmailHtml, getWhatsappImagePayload } from '../../lib/communicationTemplates';

const TEMPLATE_STORAGE_KEY = 'feria_message_templates_v1';
const QUOTE_TEMPLATE_FALLBACKS = {
  quotes_whatsapp: {
    label: 'Cotización enviada · WhatsApp',
    body: `Hola, {{nombre_cliente}}. Ya está lista tu cotización de {{nombre_estudio}}.\n\nServicio: {{servicio}}\nPaquete: {{paquete}}\nValor: {{valor_cotizacion}}\n\nPuedes revisarla aquí:\n{{cotizacion_url}}`,
  },
  quotes_email: {
    label: 'Cotización enviada · correo',
    subject: 'Tu cotización de Feria Design Studio',
    body: `Hola, {{nombre_cliente}}.\n\nTe compartimos la cotización preparada para tu proyecto.\n\nServicio: {{servicio}}\nPaquete: {{paquete}}\nValor: {{valor_cotizacion}}\n\nPuedes revisarla aquí:\n{{cotizacion_url}}\n\nQuedamos atentos a tus comentarios.\n\nCon cariño,\n{{nombre_estudio}}`,
  },
};

function getMessageTemplate(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '{}');
    return { ...(QUOTE_TEMPLATE_FALLBACKS[key] || {}), ...(stored?.[key] || {}) };
  } catch (_) {
    return QUOTE_TEMPLATE_FALLBACKS[key] || {};
  }
}

function renderMessageTemplate(text = '', values = {}) {
  return Object.entries(values).reduce((out, [key, value]) => out.split(key).join(value), text || '');
}

// ── CONSTANTES ────────────────────────────────────────────────────────────
// ── EDITOR DE COTIZACIÓN ──────────────────────────────────────────────────
// Preserva toda la funcionalidad existente: precio, descuento, ítems
// editables, nota, envío WA + email, validez, canal, paquetes visibles.
function EditorCotizacion({ base, clientes, categoriaId, onSend, onClose, showToast }) {
  const [campos, setCampos] = useState({
    clienteId:     '',
    clienteNombre: '',
    paquete:       base?.nombre    || '',
    paqueteId:     base?.id        || '',
    categoriaId:   categoriaId     || base?.categoria || 'branding',
    precio:        base?.precio    || 0,
    descuento:     0,
    duracion:      base?.duracion  || '45 días hábiles',
    items:         [...(base?.items || [])],
    nota:          '',
    validez:       '10 días',
    whatsapp:      '',
    codigoPais:    '+593',
    email:         '',
    mensajeWA:     '',
    asuntoEmail:   '',
    mensajeEmail:  '',
    // paquetesVisibles: cuáles mostrar en el landing (por defecto todos los de la cat)
    paquetesVisibles: paquetesPorCategoria(categoriaId || base?.categoria || 'branding', true).map(p => p.id),
  });

  const [enviando, setEnviando]     = useState(false);
  const [enviarWA,    setEnviarWA]  = useState(true);
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [showLanding, setShowLanding] = useState(false);

  const set = (k, v) => setCampos(p => ({ ...p, [k]: v }));

  const total       = Math.round(campos.precio * (1 - campos.descuento / 100));
  const anticipo60  = Math.round(total * 0.6);
  const saldo40     = total - anticipo60;

  const clienteSel    = clientes.find(c => String(c.id) === String(campos.clienteId));
  const nombreFinal   = clienteSel?.nombre || campos.clienteNombre || 'Cliente';
  const whatsappFinal = campos.whatsapp || clienteSel?.telefono || '';
  const whatsappEnvio = buildInternationalPhone(campos.codigoPais, whatsappFinal);
  const emailFinal    = campos.email || clienteSel?.email || '';

  const quoteUrl = `${window.location.origin}/cotizaciones`;
  const templateValues = {
    '{{nombre_cliente}}': nombreFinal,
    '{{nombre_estudio}}': 'Feria Design Studio',
    '{{servicio}}': campos.paquete,
    '{{paquete}}': campos.paquete,
    '{{valor_cotizacion}}': `$${total.toLocaleString()} USD + IVA`,
    '{{cotizacion_url}}': quoteUrl,
    '{{agendar_link}}': AGENDAR_LINK,
  };
  const whatsappTemplate = getMessageTemplate('quotes_whatsapp');
  const emailTemplate = getMessageTemplate('quotes_email');
  const msg = renderMessageTemplate(whatsappTemplate.body, templateValues);
  const asunto = renderMessageTemplate(emailTemplate.subject || `Tu cotización de Feria Design Studio - ${campos.paquete}`, templateValues);
  const msgEmail = renderMessageTemplate(emailTemplate.body, templateValues);
  const htmlEmail = buildCorporateEmailHtml({
    subject: emailTemplate.subject || `Tu cotizaciÃ³n de Feria Design Studio - ${campos.paquete}`,
    body: emailTemplate.body,
    values: templateValues,
    design: emailTemplate.email_design,
  });

  const handleSend = async () => {
    if (!enviarWA && !enviarEmail) {
      showToast('Selecciona al menos un canal de envío', '⚠');
      return;
    }
    setEnviando(true);
    try {
      if (enviarWA && whatsappEnvio) {
        if (isConfigured) {
          await supabase.functions.invoke('send-meta-message', {
            body: {
              canal: 'whatsapp',
              to: whatsappEnvio,
              destinatario: whatsappEnvio,
              text: msg,
              texto: msg,
              conv_id: `wa_${whatsappEnvio}`,
              nombre: nombreFinal,
              ...getWhatsappImagePayload(whatsappTemplate, 'quotes_whatsapp'),
            },
          });
        } else {
          const waUrl = `https://wa.me/${whatsappEnvio}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
      }
      if (enviarEmail && emailFinal) {
        if (isConfigured) {
          await supabase.functions.invoke('send-email', {
            body: {
              templateId: 'cotizacion',
              to:         emailFinal,
              subject:    asunto,
              text:       msgEmail,
              html:       htmlEmail,
              data: {
                clienteNombre: nombreFinal, paquete: campos.paquete,
                total, anticipo60, saldo40,
                duracion: campos.duracion, validez: campos.validez,
                agendarLink: AGENDAR_LINK,
                mensaje: msgEmail,
              },
            },
          });
        } else {
          showToast('Email demo: ' + emailFinal, '📧');
        }
      }
      onSend({
        clienteNombre: nombreFinal,
        paquete:       campos.paquete,
        categoriaId:   campos.categoriaId,
        precio:        total,
        descuento:     campos.descuento,
        duracion:      campos.duracion,
        items:         campos.items,
        nota:          campos.nota,
        validez:       campos.validez,
        enviadoPor:    [enviarWA && 'whatsapp', enviarEmail && 'email'].filter(Boolean),
        fecha:         new Date().toISOString(),
      });
      showToast(`Cotización enviada a ${nombreFinal}`, '✦');
      onClose();
    } catch (err) {
      showToast('Error al enviar: ' + err.message, '⚠');
    } finally {
      setEnviando(false);
    }
  };

  // Paquetes de la categoría para toggle de visibilidad
  const pkgsCategoria = paquetesPorCategoria(campos.categoriaId, false);

  const togglePaquete = (pkgId) => {
    set('paquetesVisibles',
      campos.paquetesVisibles.includes(pkgId)
        ? campos.paquetesVisibles.filter(id => id !== pkgId)
        : [...campos.paquetesVisibles, pkgId]
    );
  };

  return (
    <>
      {showLanding && (
        <CotizacionLanding
          categoriaId={campos.categoriaId}
          paquetesIds={campos.paquetesVisibles}
          nombreFinal={nombreFinal}
          descuento={campos.descuento}
          validez={campos.validez}
          nota={campos.nota}
          onClose={() => setShowLanding(false)}
          onEnviar={() => { setShowLanding(false); handleSend(); }}
        />
      )}

      <div style={{ background: 'var(--s1)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-s)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {base ? `Editar — ${base.nombre}` : 'Nueva cotización'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 2 }}>
              {CATEGORIAS.find(c => c.id === campos.categoriaId)?.nombre || ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-d)', lineHeight: 1, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cliente */}
          <div>
            <SectionLabel>Cliente</SectionLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <select
                value={campos.clienteId}
                onChange={e => {
                  set('clienteId', e.target.value);
                  const c = clientes.find(cl => String(cl.id) === e.target.value);
                  if (c) { set('clienteNombre', c.nombre); set('whatsapp', c.telefono || ''); set('email', c.email || ''); }
                }}
                style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }}>
                <option value="">Seleccionar del CRM…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input
                value={campos.clienteNombre}
                onChange={e => set('clienteNombre', e.target.value)}
                placeholder="O escribir nombre"
                style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Precio y descuento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <SectionLabel>Inversión (USD)</SectionLabel>
              <input
                type="number"
                value={campos.precio}
                onChange={e => set('precio', Number(e.target.value))}
                style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <SectionLabel>Descuento (%)</SectionLabel>
              <input
                type="number"
                min="0" max="50"
                value={campos.descuento}
                onChange={e => set('descuento', Number(e.target.value))}
                style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Resumen 60/40 */}
          {total > 0 && (
            <div style={{ background: 'rgba(201,169,110,.06)', border: '1px solid rgba(201,169,110,.2)', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              {[['Total', `$${total.toLocaleString()}`], ['Anticipo 60%', `$${anticipo60.toLocaleString()}`], ['Saldo 40%', `$${saldo40.toLocaleString()}`]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: 'var(--text-d)' }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Duración y validez */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <SectionLabel>Duración</SectionLabel>
              <input value={campos.duracion} onChange={e => set('duracion', e.target.value)}
                style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>
            <div>
              <SectionLabel>Validez</SectionLabel>
              <input value={campos.validez} onChange={e => set('validez', e.target.value)}
                style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* Ítems editables */}
          <div>
            <SectionLabel>Ítems del paquete</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {campos.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={item}
                    onChange={e => { const arr = [...campos.items]; arr[i] = e.target.value; set('items', arr); }}
                    style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--text)', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => set('items', campos.items.filter((_, j) => j !== i))}
                    aria-label="Eliminar item"
                    style={{ background: 'none', border: 'none', color: 'var(--text-d)', cursor: 'pointer', padding: '4px', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => set('items', [...campos.items, ''])}
                style={{ background: 'transparent', border: '1px dashed var(--border-m)', borderRadius: 6, padding: '6px', fontSize: 11, color: 'var(--text-d)', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Agregar ítem
              </button>
            </div>
          </div>

          {/* Paquetes visibles en el landing */}
          <div>
            <SectionLabel>Paquetes visibles en la propuesta del cliente</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {pkgsCategoria.map(pkg => (
                <label key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: campos.paquetesVisibles.includes(pkg.id) ? 'rgba(201,169,110,.08)' : 'var(--s2)', border: `1px solid ${campos.paquetesVisibles.includes(pkg.id) ? 'rgba(201,169,110,.25)' : 'var(--border-s)'}`, transition: 'all .15s' }}>
                  <input type="checkbox" checked={campos.paquetesVisibles.includes(pkg.id)} onChange={() => togglePaquete(pkg.id)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{pkg.nombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-d)' }}>${pkg.precio.toLocaleString()} USD</div>
                  </div>
                  {pkg.featured && <span style={{ fontSize: 10, color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 10, padding: '2px 8px' }}>destacado</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Nota personal */}
          <div>
            <SectionLabel>Nota personal al cliente (opcional)</SectionLabel>
            <textarea
              value={campos.nota}
              onChange={e => set('nota', e.target.value)}
              placeholder="Ej: Eduardo, estas opciones las preparé pensando en tu proyecto de restaurante…"
              rows={2}
              style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', resize: 'none' }}
            />
          </div>

          {/* Contacto del cliente */}
          <div>
            <SectionLabel>Contacto para envío</SectionLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <select value={campos.codigoPais} onChange={e => set('codigoPais', e.target.value)}
                style={{ width: 90, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }}>
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
              </select>
              <input value={campos.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                placeholder="WhatsApp"
                style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>
            <input value={campos.email} onChange={e => set('email', e.target.value)}
              placeholder="Email del cliente"
              style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', marginTop: 6 }} />
          </div>

          {/* Canales y envío */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'wa',    val: enviarWA,    set: setEnviarWA,    label: 'WhatsApp', color: '#25D366' },
              { key: 'email', val: enviarEmail, set: setEnviarEmail, label: 'Email',    color: '#5B9BD5' },
            ].map(ch => (
              <label key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: ch.val ? `rgba(${ch.key === 'wa' ? '37,211,102' : '91,155,213'}, .08)` : 'var(--s3)', border: `1px solid ${ch.val ? `rgba(${ch.key === 'wa' ? '37,211,102' : '91,155,213'}, .25)` : 'var(--border-s)'}`, transition: 'all .15s', flex: 1 }}>
                <input type="checkbox" checked={ch.val} onChange={e => ch.set(e.target.checked)} />
                <span style={{ fontSize: 11, fontWeight: 500, color: ch.val ? ch.color : 'var(--text-m)' }}>{ch.label}</span>
              </label>
            ))}
          </div>

          <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Plantillas aplicadas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {enviarWA && <span style={{ fontSize: 10, border: '1px solid rgba(37,211,102,.25)', borderRadius: 999, padding: '4px 8px', color: '#25D366' }}>{whatsappTemplate.label}</span>}
              {enviarEmail && <span style={{ fontSize: 10, border: '1px solid rgba(91,155,213,.25)', borderRadius: 999, padding: '4px 8px', color: '#5B9BD5' }}>{emailTemplate.label}</span>}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 8 }}>El texto se edita en Administración · Plantillas de mensajes.</div>
          </div>
        </div>

        {/* Footer acciones */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-s)', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLanding(true)}
            style={{ flex: 1, background: 'var(--s2)', color: 'var(--text-m)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Eye size={15} /> Ver propuesta del cliente
          </button>
          <button onClick={handleSend} disabled={enviando || (!enviarWA && !enviarEmail)}
            style={{ flex: 2, background: (!enviarWA && !enviarEmail) ? 'var(--s3)' : 'var(--gold)', color: (!enviarWA && !enviarEmail) ? 'var(--text-d)' : '#000', border: 'none', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 600, cursor: (!enviarWA && !enviarEmail) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {enviando ? 'Enviando…' : <><Send size={15} /> Enviar cotización</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── TARJETA DE PAQUETE EN EL PANEL INTERNO ────────────────────────────────
function PaqueteInternalCard({ pkg, onEditar, C, mercado }) {
  const precio = getPrecio(pkg.id, mercado);
  return (
    <div style={{ background: 'var(--s1)', border: `1px solid var(--border-s)`, borderLeft: `3px solid ${pkg.featured ? 'var(--gold)' : 'var(--border-m)'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{pkg.nombre}</div>
          {pkg.featured && <span style={{ fontSize: 9, color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 10, padding: '1px 8px' }}>Recomendado</span>}
          {!pkg.visible && <span style={{ fontSize: 9, color: 'var(--text-d)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '1px 8px' }}>Oculto</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-d)' }}>{pkg.subtitulo}</div>
        <div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 3 }}>{pkg.duracion} · {pkg.items.length} ítems</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>${precio.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: 'var(--text-d)' }}>USD</div>
      </div>
      <button onClick={() => onEditar(pkg)}
        style={{ background: 'var(--gold)', color: 'var(--dark)', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        Cotizar <ArrowRight size={13} />
      </button>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { data, showToast }     = useApp();
  const [editando, setEditando] = useState(null);
  const [mercado, setMercado]   = useState('internacional');
  const [catActiva, setCatActiva] = useState('branding');
  const [historial, setHistorial] = useState([]);
  const [tab, setTab]           = useState('paquetes'); // 'paquetes' | 'historial'

  const C = {
    gold: 'var(--gold)', teal: 'var(--teal)', green: 'var(--green)',
    red:  'var(--red)',  blue: 'var(--blue)',  pink:  'var(--pink)',
  };

  const handleSend = (cotizacion) => {
    setHistorial(h => [{ ...cotizacion, id: Date.now() }, ...h]);
  };

  const pkgsActivos = paquetesPorCategoria(catActiva, false);
  const catInfo     = CATEGORIAS.find(c => c.id === catActiva);
  const CategoryIcon = ({ id, color }) => {
    const icons = { branding: Gem, bl: Camera, arte: Palette };
    const Icon = icons[id] || FileText;
    return <Icon size={19} strokeWidth={1.8} color={color} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Modal editor */}
      {editando && (
        <div onClick={e => e.target === e.currentTarget && setEditando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <EditorCotizacion
            base={editando}
            clientes={data.clientes || []}
            categoriaId={catActiva}
            onSend={handleSend}
            onClose={() => setEditando(null)}
            showToast={showToast}
          />
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: '12px 24px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 20 }}>
          Cotizaciones <em style={{ color: 'var(--gold)' }}>· Servicios</em>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Switch Nacional / Internacional */}
          <div style={{ display:'flex', background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:3, gap:2 }}>
            {[{id:'nacional',icon:MapPin,label:'Nacional'},{id:'internacional',icon:Globe2,label:'Internacional'}].map(m => {
              const Icon = m.icon;
              return (
              <button key={m.id} onClick={() => setMercado(m.id)}
                style={{ padding:'5px 11px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                  background: mercado===m.id ? 'var(--s3)' : 'transparent',
                  boxShadow: mercado===m.id ? '0 1px 4px rgba(0,0,0,.25)' : 'none', display:'inline-flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, fontWeight:mercado===m.id?600:400, color:mercado===m.id?'var(--gold)':'var(--text-d)', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:6 }}>
                  <Icon size={13} strokeWidth={1.8} /> {m.label}
                </span>
              </button>
              );
            })}
          </div>
          {/* Tabs Paquetes / Historial */}
          {[{ id:'paquetes', icon:FileText }, { id:'historial', icon:History }].map(t => {
            const Icon = t.icon;
            return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: tab === t.id ? 'var(--gold)' : 'transparent', color: tab === t.id ? '#000' : 'var(--text-m)', border: tab === t.id ? 'none' : '1px solid var(--border-s)', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', display:'inline-flex', alignItems:'center', gap:7 }}>
              <Icon size={13} strokeWidth={1.8} /> {t.id === 'paquetes' ? 'Paquetes' : `Historial (${historial.length})`}
            </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {tab === 'paquetes' && (
          <>
            {/* Tabs de categorías */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {CATEGORIAS.sort((a, b) => a.orden - b.orden).map(cat => (
                <button key={cat.id} onClick={() => setCatActiva(cat.id)}
                  style={{
                    background: catActiva === cat.id ? 'var(--s2)' : 'transparent',
                    border: catActiva === cat.id ? `1px solid var(--border-m)` : '1px solid var(--border-s)',
                    borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all .15s',
                    borderLeft: catActiva === cat.id ? `3px solid var(--gold)` : '1px solid var(--border-s)',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: catActiva === cat.id ? 600 : 400, color: catActiva === cat.id ? 'var(--text)' : 'var(--text-m)' }}>{cat.nombre}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 1 }}>{cat.subtitulo}</div>
                </button>
              ))}
            </div>

            {/* Info de categoría activa */}
            {catInfo && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--s2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--s3)', border: '1px solid var(--border-s)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><CategoryIcon id={catInfo.id} color={catInfo.color} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{catInfo.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-d)' }}>{catInfo.subtitulo} · {pkgsActivos.length} planes disponibles</div>
                </div>
              </div>
            )}

            {/* Lista de paquetes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pkgsActivos.map(pkg => (
                <PaqueteInternalCard key={pkg.id} pkg={pkg} onEditar={setEditando} C={C} mercado={mercado} />
              ))}
            </div>
          </>
        )}

        {tab === 'historial' && (
          <div>
            {historial.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-d)', fontSize: 13, padding: '40px 0' }}>
                Aún no has enviado cotizaciones en esta sesión.
              </div>
            ) : historial.map(cot => (
              <div key={cot.id} style={{ background: 'var(--s1)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{cot.clienteNombre} — {cot.paquete}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 2 }}>
                    ${cot.precio.toLocaleString()} USD · {new Date(cot.fecha).toLocaleDateString('es-ES')} · {cot.enviadoPor?.join(' + ')}
                  </div>
                </div>
                <button
                  onClick={() => setEditando(PAQUETES.find(p => p.nombre === cot.paquete) || { nombre: cot.paquete, precio: cot.precio, duracion: cot.duracion, items: cot.items || [], categoria: cot.categoriaId })}
                  style={{ background: 'transparent', border: '1px solid var(--border-s)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--text-m)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Reenviar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
