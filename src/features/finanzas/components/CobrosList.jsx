import React, { useState } from 'react';
import { StatusPill } from '../../../components/UI';
import { createPaymentLink, savePaymentLink, openPaymentLink } from '../../../lib/stripe';

const C = { gold:'var(--gold)', teal:'var(--teal)', green:'var(--green)', red:'var(--red)', blue:'var(--blue)', pink:'var(--pink)' };
export default
function CobrosList({ data, ingresos, porCobrar, showToast, updateCobro }) {
  const [loadingId, setLoadingId] = useState(null);
  const [links, setLinks]         = useState({});

  const getCliente = (cobro) => (data.clientes || []).find(cl => String(cl.id) === String(cobro.clienteId || cobro.cliente_id));
  const isRealStripeUrl = (url) => {
    const value = String(url || '');
    return value.startsWith('https://checkout.stripe.com/') || value.startsWith('https://buy.stripe.com/') || value.includes('stripe.com/');
  };
  const getStoredLink = (cobro) => {
    const possible = links[cobro.id] || cobro.payment_link || cobro.stripe_payment_link || cobro.link_pago || '';
    // Evita reusar links demo internos de versiones anteriores.
    return isRealStripeUrl(possible) ? possible : '';
  };

  const handleCobrar = async (cobro) => {
    const cliente = getCliente(cobro);
    setLoadingId(cobro.id);
    try {
      if (typeof updateCobro === 'function') {
        await updateCobro(cobro.id, {
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_via: cobro.via || 'Stripe',
        });
        showToast(`Pago registrado${cliente?.nombre ? ` · ${cliente.nombre}` : ''}`, '✓');
      } else {
        showToast('No se encontró la función para registrar el pago', '⚠');
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleGenerateLink = async (cobro, options = {}) => {
    const cliente = getCliente(cobro) || {
      nombre: cobro.cliente || cobro.clienteNombre || 'Cliente',
      email: cobro.email || cobro.clienteEmail || '',
    };

    const existing = getStoredLink(cobro);
    if (existing) {
      if (options.open) openPaymentLink(existing);
      return existing;
    }

    setLoadingId(cobro.id + '-link');
    if (!options.silent) showToast(`Generando link · ${cliente.nombre}`, '💳');

    const result = await createPaymentLink({
      clienteNombre: cliente.nombre || 'Cliente',
      clienteEmail:  cliente.email || '',
      monto:         cobro.monto,
      tipo:          cobro.tipo || cobro.nombre || 'Cobro',
      cobro_id:      cobro.id,
      cliente_id:    cobro.clienteId || cobro.cliente_id || '',
      payment_stage: cobro.payment_stage || '',
      success_url:   `${window.location.origin}/pago-completado?session_id={CHECKOUT_SESSION_ID}&return_to=/finanzas`,
      cancel_url:    `${window.location.origin}/finanzas`,
    });

    setLoadingId(null);
    if (result.ok) {
      setLinks(prev => ({ ...prev, [cobro.id]: result.url }));
      await savePaymentLink(cobro.id, result.url);
      if (typeof updateCobro === 'function') {
        await updateCobro(cobro.id, { stripe_payment_link: result.url, payment_link: result.url });
      }
      if (!options.silent) showToast(`Link generado · ${cliente.nombre}`, '✦');
      if (options.open) openPaymentLink(result.url);
      return result.url;
    }

    showToast(`Stripe no abrió: ${result.error}`, '⚠');
    return '';
  };

  const handleOpenStripe = async (cobro) => {
    const url = await handleGenerateLink(cobro, { open: false });
    if (!url) return;
    openPaymentLink(url);
  };

  const handleCopyLink = async (cobro) => {
    const url = await handleGenerateLink(cobro, { silent: true });
    if (!url) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temp = document.createElement('textarea');
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      showToast('Link de pago copiado', '🔗');
    } catch (error) {
      showToast('No se pudo copiar. Se abrió el link para copiarlo manualmente.', '⚠');
      openPaymentLink(url);
    }
  };

  const handleReenviarCobro = async (cobro) => {
    const cliente = getCliente(cobro);
    setLoadingId(cobro.id + '-resend');
    try {
      const url = await handleGenerateLink(cobro, { silent: true });
      if (!url) return;

      if (typeof updateCobro === 'function') {
        await updateCobro(cobro.id, {
          stripe_payment_link: url,
          payment_link: url,
          last_sent_at: new Date().toISOString(),
          sent_count: Number(cobro.sent_count || 0) + 1,
        });
      }

      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      } catch (_) {}
      showToast(`Cobro reenviado y link listo${cliente?.nombre ? ` · ${cliente.nombre}` : ''}`, '✉');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { l: 'Cobrado',     v: `$${ingresos.toLocaleString()}`,              c: C.green },
          { l: 'Pendiente',   v: `$${porCobrar.toLocaleString()}`,             c: C.gold  },
          { l: 'Total fact.', v: `$${(ingresos+porCobrar).toLocaleString()}`,  c: 'var(--text)' },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 24, fontFamily: 'var(--font-serif)', color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {data.cobros.map(c => {
        const cliente  = getCliente(c);
        const isLoading = loadingId === c.id;
        const isLinkLoading = loadingId === c.id + '-link';
        const isResending = loadingId === c.id + '-resend';
        const hasLink   = getStoredLink(c);
        const isPending = c.status === 'pending' || c.status === 'overdue';

        return (
          <div key={c.id} style={{ background: 'var(--s1)', border: '1px solid var(--border-s)', borderLeft: `3px solid ${cliente?.color || C.gold}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente?.nombre || '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 2 }}>{c.tipo} · {c.via || 'Stripe'}</div>
              {hasLink && (
                <div style={{ fontSize: 10, color: C.green, marginTop: 3, cursor: 'pointer' }} onClick={() => openPaymentLink(hasLink)}>
                  🔗 Link generado — clic para abrir
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: c.status === 'overdue' ? C.red : 'var(--text)' }}>${c.monto?.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 4 }}>{c.vence || ''}</div>
              <StatusPill status={c.status} />
            </div>
            {isPending && (
              <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                <button onClick={() => handleReenviarCobro(c)} disabled={isResending || isLinkLoading}
                  title="Reenviar solicitud de cobro al cliente"
                  style={{ background: 'transparent', color: 'var(--text-m)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (isResending || isLinkLoading) ? .7 : 1 }}>
                  {isResending ? '…' : '↻ Reenviar cobro'}
                </button>
                <button onClick={() => handleOpenStripe(c)} disabled={isLinkLoading}
                  title="Abrir pago con tarjeta en Stripe"
                  style={{ background: C.gold, color: 'var(--dark)', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isLinkLoading ? .7 : 1 }}>
                  {isLinkLoading ? '…' : '💳 Pagar'}
                </button>
                <button onClick={() => handleCopyLink(c)} disabled={isLinkLoading}
                  title="Copiar link de pago"
                  style={{ background: 'transparent', color: 'var(--text-m)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: isLinkLoading ? .7 : 1 }}>
                  🔗 Copiar link
                </button>
                <button onClick={() => handleCobrar(c)} disabled={isLoading}
                  title="Marcar manualmente como pagado"
                  style={{ background: 'var(--s2)', color: C.green, border: `1px solid ${C.green}`, borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: isLoading ? .7 : 1, fontFamily: 'inherit' }}>
                  {isLoading ? '…' : '✓ Registrar pago'}
                </button>
              </div>
            )}
            {c.status === 'paid' && <div style={{ fontSize: 12, color: C.green, flexShrink: 0 }}>✓ Pagado</div>}
          </div>
        );
      })}
    </>
  );
}

// ── EXCEL UPLOADER & ANALYZER ─────────────────────────────────────
