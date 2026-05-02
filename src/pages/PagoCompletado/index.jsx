import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isConfigured } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

export default function PagoCompletado() {
  const { updateCobro, showToast } = useApp();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = useMemo(() => params.get('session_id'), [params]);
  const returnTo = useMemo(() => params.get('return_to'), [params]);
  const demoPayment = useMemo(() => params.get('demo') === '1', [params]);
  const cobroId = useMemo(() => params.get('cobro_id'), [params]);
  const [state, setState] = useState({
    status: 'loading',
    message: 'Verificando pago con Stripe…',
    portalAccess: null,
  });

  useEffect(() => {
    let mounted = true;
    async function verify() {
      if (!sessionId) {
        setState({ status: 'warning', message: 'Stripe confirmó la salida, pero no llegó el identificador de sesión. Revisa el webhook o vuelve al panel.', portalAccess: null });
        return;
      }
      if (demoPayment) {
        if (cobroId && typeof updateCobro === 'function') {
          await updateCobro(cobroId, {
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_via: 'Stripe demo',
          });
          showToast?.('Pago registrado correctamente', '✓');
          setState({ status: 'success', message: 'Pago demo confirmado. El cobro ya aparece como pagado en Finanzas.', portalAccess: null });
          return;
        }
        setState({ status: 'warning', message: 'Pago demo confirmado, pero no se encontró el cobro para actualizar.', portalAccess: null });
        return;
      }
      if (!isConfigured) {
        setState({ status: 'warning', message: 'Supabase no está configurado en este entorno. El pago no puede sincronizarse con el panel aquí.', portalAccess: null });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment-session', {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        if (!mounted) return;

        const access = data?.portal_access || data?.cobro?.portal_access || null;

        if (data?.ok) {
          let message = 'Pago confirmado. Feria OS ya marcó el cobro como pagado y activó el siguiente paso del cliente.';
          if (access?.status === 'created' || access?.status === 'reset') {
            message = 'Pago confirmado. Tu acceso al portal fue creado automáticamente.';
          } else if (access?.status === 'already_active') {
            message = 'Pago confirmado. Tu acceso al portal ya estaba activo.';
          } else if (access?.status === 'waiting_contract') {
            message = 'Pago confirmado. El acceso al portal se creará automáticamente cuando el contrato esté firmado.';
          }
          setState({ status: 'success', message, portalAccess: access });
        } else if (data?.pending) {
          setState({ status: 'warning', message: 'El pago todavía aparece pendiente en Stripe. Actualiza en unos segundos o revisa el evento en Stripe.', portalAccess: null });
        } else {
          setState({ status: 'error', message: data?.error || 'No se pudo confirmar el pago automáticamente.', portalAccess: null });
        }
      } catch (e) {
        if (!mounted) return;
        setState({ status: 'error', message: e?.message || 'No se pudo verificar el pago con Stripe.', portalAccess: null });
      }
    }
    verify();
    return () => { mounted = false; };
  }, [sessionId, demoPayment, cobroId, updateCobro, showToast]);

  useEffect(() => {
    if (state.status !== 'success' || !returnTo || !returnTo.startsWith('/')) return;
    const timer = setTimeout(() => { window.location.href = returnTo; }, 1800);
    return () => clearTimeout(timer);
  }, [state.status, returnTo]);

  const color = state.status === 'success' ? 'var(--green)' : state.status === 'error' ? 'var(--red)' : 'var(--gold)';
  const icon = state.status === 'success' ? '✓' : state.status === 'error' ? '!' : '…';
  const access = state.portalAccess;
  const showCredentials = Boolean(access?.email && access?.password);

  return (
    <div style={{ minHeight:'100vh', background:'var(--dark)', color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:18, padding:'34px 32px', textAlign:'center', boxShadow:'0 18px 60px rgba(0,0,0,.25)' }}>
        <div style={{ width:58, height:58, borderRadius:'50%', margin:'0 auto 18px', display:'flex', alignItems:'center', justifyContent:'center', background:`${color}18`, color, fontSize:26, fontWeight:700 }}>{icon}</div>
        <div style={{ fontSize:24, fontWeight:700, letterSpacing:'-.03em', marginBottom:8 }}>Pago completado</div>
        <p style={{ fontSize:14, color:'var(--text-m)', lineHeight:1.65, margin:'0 auto 18px' }}>{state.message}</p>

        {showCredentials && (
          <div style={{ textAlign:'left', background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:14, padding:'16px 18px', margin:'0 auto 18px' }}>
            <div style={{ fontSize:11, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Acceso al portal</div>
            <div style={{ display:'grid', gap:8, fontSize:13 }}>
              <div><strong style={{ color:'var(--text)' }}>Usuario:</strong> <span style={{ color:'var(--gold)' }}>{access.email}</span></div>
              <div><strong style={{ color:'var(--text)' }}>Contraseña temporal:</strong> <code style={{ color:'var(--gold)', background:'var(--dark)', padding:'4px 7px', borderRadius:6 }}>{access.password}</code></div>
            </div>
            <div style={{ fontSize:11, color:'var(--text-d)', lineHeight:1.55, marginTop:12 }}>
              Guarda esta contraseña. También se envió al correo del cliente si Resend está configurado.
            </div>
          </div>
        )}

        {access?.status === 'already_active' && (
          <div style={{ fontSize:12, color:'var(--text-m)', background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:12, padding:'12px 14px', marginBottom:18 }}>
            Usuario activo: <strong>{access.email}</strong>. Puede entrar al portal con su contraseña actual.
          </div>
        )}

        {sessionId && <div style={{ fontSize:10, color:'var(--text-d)', wordBreak:'break-all', marginBottom:18 }}>Session ID: {sessionId}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <a href={returnTo && returnTo.startsWith('/') ? returnTo : '/'} style={{ textDecoration:'none', background:'var(--gold)', color:'var(--dark)', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:700 }}>{returnTo ? 'Volver a mi proyecto' : 'Volver al panel'}</a>
          <a href="/login" style={{ textDecoration:'none', border:'1px solid var(--border-s)', color:'var(--text-m)', borderRadius:10, padding:'10px 16px', fontSize:13 }}>Iniciar sesión</a>
        </div>
      </div>
    </div>
  );
}
