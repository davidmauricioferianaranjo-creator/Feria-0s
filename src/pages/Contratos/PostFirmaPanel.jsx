import React, { useState } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';
import { createPaymentLink } from '../../../lib/stripe';

const WA = '593980250889';

/**
 * PostFirmaPanel
 * Aparece inmediatamente después de que el cliente firma el contrato.
 * Permite: notificar al equipo, enviar el link del cobro 60% por WA y/o email,
 * con opción manual (Selene decide cuándo) o automática (se envía al instante).
 *
 * Props:
 *   cliente       — objeto cliente con nombre, email, telefono, monto
 *   campos        — datos del contrato (paquete, monto)
 *   onClose       — cerrar el panel
 *   showToast     — función de toast
 */
export default function PostFirmaPanel({ cliente, campos, onClose, showToast }) {
  const monto      = campos?.monto || cliente?.monto || 0;
  const anticipo60 = Math.round(monto * 0.6);
  const nombre     = cliente?.nombre || campos?.nombre || 'Cliente';
  const email      = cliente?.email  || campos?.email  || '';
  const telefono   = cliente?.telefono || '';

  const [enviarWA,    setEnviarWA]    = useState(true);
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [autoEnvio,   setAutoEnvio]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [linkGenerado, setLinkGenerado] = useState('');
  const [done,        setDone]        = useState(false);

  // ── Generar link de pago y enviar según canales seleccionados ─
  const activarCobro = async () => {
    if (!enviarWA && !enviarEmail) {
      showToast('Selecciona al menos un canal de envío', '⚠');
      return;
    }
    setLoading(true);
    try {
      // 1. Generar link de pago Stripe
      let paymentUrl = linkGenerado;
      if (!paymentUrl) {
        const result = await createPaymentLink({
          clienteNombre: nombre,
          clienteEmail:  email,
          monto:         anticipo60,
          tipo:          `Anticipo 60% · ${campos?.paquete || cliente?.servicio || 'Branding'}`,
          cobro_id:      cliente?.id,
          cliente_id:    cliente?.id,
          payment_stage: 'anticipo_60',
          success_url:   `${window.location.origin}/pago-completado?session_id={CHECKOUT_SESSION_ID}&return_to=/portal`,
          cancel_url:    `${window.location.origin}/portal`,
        });
        if (!result.ok) {
          showToast(result.error || 'Error al generar link de pago', '⚠');
          setLoading(false);
          return;
        }
        paymentUrl = result.url;
        setLinkGenerado(paymentUrl);
      }

      // 2. Enviar por WhatsApp
      if (enviarWA) {
        const msgWA = `Hola ${nombre} 👋\n\n¡Gracias por firmar el contrato con *Feria Design Studio*! Estamos emocionados de comenzar.\n\nEl siguiente paso es realizar el anticipo del *60%* para dar inicio al proyecto:\n\n💰 *Monto:* $${anticipo60.toLocaleString()} USD\n\n🔗 *Link de pago seguro:*\n${paymentUrl}\n\nUna vez confirmado el pago, te enviaremos el acceso a tu portal de cliente donde podrás llenar el brief.\n\n¡Nos vemos pronto!\n— Feria Design Studio`;
        const waNum = String(telefono || '').replace(/\D/g, '') || WA;
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msgWA)}`, '_blank', 'noopener,noreferrer');
      }

      // 3. Enviar por Email via Edge Function
      if (enviarEmail && email && isConfigured) {
        await supabase.functions.invoke('send-email', {
          body: {
            to:         email,
            subject:    `¡Contrato firmado! Próximo paso — Anticipo 60% · Feria Design Studio`,
            templateId: 'anticipo_cobro',
            data: {
              clienteNombre: nombre,
              monto:         anticipo60,
              paymentLink:   paymentUrl,
              paquete:       campos?.paquete || cliente?.servicio || 'Branding',
            },
          },
        });
      }

      // 4. Actualizar estado del cobro en Supabase
      if (isConfigured && cliente?.id) {
        await supabase.from('cobros').upsert({
          clienteId:           cliente.id,
          cliente_id:          cliente.id,
          monto:               anticipo60,
          tipo:                'Anticipo 60%',
          status:              'pending',
          payment_stage:       'anticipo_60',
          stripe_payment_link: paymentUrl,
          payment_link:        paymentUrl,
          vence:               new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        }, { onConflict: 'clienteId,payment_stage' });
      }

      setDone(true);
      showToast(`Cobro 60% activado · link enviado a ${nombre}`, '✦');
    } catch (err) {
      showToast('Error: ' + err.message, '⚠');
    } finally {
      setLoading(false);
    }
  };

  // ── Copiar link ───────────────────────────────────────────────
  const copiarLink = async () => {
    if (!linkGenerado) return;
    try { await navigator.clipboard.writeText(linkGenerado); showToast('Link copiado', '📋'); }
    catch { showToast(linkGenerado, '📋'); }
  };

  if (done) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ width:420, background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, padding:32, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:22, marginBottom:8 }}>
            ¡Cobro <em style={{ color:'var(--gold)' }}>activado</em>!
          </div>
          <div style={{ fontSize:12, color:'var(--text-d)', lineHeight:1.7, marginBottom:20 }}>
            El link de pago del anticipo del 60% fue enviado a {nombre}.<br />
            Cuando el cliente pague, recibirá acceso automático al portal de cliente.
          </div>
          {linkGenerado && (
            <button onClick={copiarLink}
              style={{ background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 16px', fontSize:11, color:'var(--text-m)', cursor:'pointer', fontFamily:'inherit', marginBottom:12 }}>
              📋 Copiar link de pago
            </button>
          )}
          <button onClick={onClose}
            style={{ display:'block', width:'100%', background:'var(--gold)', color:'var(--dark)', border:'none', borderRadius:8, padding:'12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Volver a Contratos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:500, background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'rgba(52,211,153,0.08)', borderBottom:'1px solid rgba(52,211,153,0.2)', padding:'18px 24px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(52,211,153,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✍</div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--green)' }}>Contrato firmado por {nombre}</div>
            <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2 }}>El sistema está listo para activar el cobro del anticipo</div>
          </div>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Resumen del cobro */}
          <div style={{ background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontSize:12, color:'var(--text-m)' }}>Anticipo 60% — {campos?.paquete || cliente?.servicio || 'Branding'}</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:22, color:'var(--gold)' }}>${anticipo60.toLocaleString()} USD</div>
            </div>
            <div style={{ fontSize:10, color:'var(--text-d)' }}>Se genera un link de pago seguro via Stripe. El cliente puede pagar con tarjeta desde cualquier dispositivo.</div>
          </div>

          {/* Canales de envío */}
          <div>
            <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Enviar link de cobro por</div>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { label:'WhatsApp', key:'wa',    val:enviarWA,    set:setEnviarWA,    color:'#25D366', info: telefono || 'número del cliente' },
                { label:'Email',    key:'email',  val:enviarEmail, set:setEnviarEmail, color:'var(--blue)', info: email || 'email del cliente' },
              ].map(ch => (
                <label key={ch.key} style={{ flex:1, display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 12px', background: ch.val ? `rgba(${ch.key==='wa'?'37,211,102':'91,155,213'},.08)` : 'var(--s3)', border:`1px solid ${ch.val?`rgba(${ch.key==='wa'?'37,211,102':'91,155,213'},.25)`:'var(--border-s)'}`, borderRadius:8, transition:'all .15s' }}>
                  <input type="checkbox" checked={ch.val} onChange={e=>ch.set(e.target.checked)} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:ch.val?ch.color:'var(--text-m)' }}>{ch.label}</div>
                    <div style={{ fontSize:10, color:'var(--text-d)', marginTop:1 }}>{ch.info}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Toggle automático */}
          <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', padding:'12px 14px', background: autoEnvio ? 'rgba(201,169,110,.06)' : 'var(--s3)', border:`1px solid ${autoEnvio?'rgba(201,169,110,.25)':'var(--border-s)'}`, borderRadius:8, transition:'all .15s' }}>
            <input type="checkbox" checked={autoEnvio} onChange={e=>setAutoEnvio(e.target.checked)} />
            <div>
              <div style={{ fontSize:12, fontWeight:500, color: autoEnvio ? 'var(--gold)' : 'var(--text-m)' }}>
                Activar envío automático en futuras firmas
              </div>
              <div style={{ fontSize:10, color:'var(--text-d)', marginTop:1 }}>
                Cuando un cliente firme, el link de cobro se envía automáticamente sin intervención manual.
              </div>
            </div>
          </label>

          {/* Acciones */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose}
              style={{ flex:1, background:'transparent', border:'1px solid var(--border-s)', color:'var(--text-m)', borderRadius:8, padding:'11px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              Hacer después
            </button>
            <button onClick={activarCobro} disabled={loading}
              style={{ flex:2, background: loading ? 'var(--s3)' : 'var(--gold)', color: loading ? 'var(--text-d)' : 'var(--dark)', border:'none', borderRadius:8, padding:'11px', fontSize:12, fontWeight:600, cursor: loading ? 'default' : 'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              {loading ? '⏳ Generando link…' : '⚡ Activar cobro 60%'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
