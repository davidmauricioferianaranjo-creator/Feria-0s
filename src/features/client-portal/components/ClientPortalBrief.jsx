import React, { useMemo, useState } from 'react';
import { APPLICATION_CATALOG } from '../../../lib/packages';

export default function ClientPortalBrief({
  sentirData,
  sentirIdx,
  setSentirIdx,
  setSentirData,
  briefComplete,
  onSave,
  briefDownloaded,
  setBriefDownloaded,
  downloadBriefPDF,
  cliente,
  isDark,
  accentColor = '#E11D48',
  questionsComplete = false,
  applicationSelectionComplete = false,
  packageName = 'Paquete 1',
  includedApplicationLimit = 3,
  selectedApplicationIds = [],
  paidExtraApplicationIds = [],
  recommendedApplicationIds = [],
  pendingExtraApplicationIds = [],
  pendingExtraApplication = null,
  onToggleApplication,
  onConfirmExtraApplication,
  onCancelExtraApplication,
  onFinishApplicationSelection,
  extraPaymentLoading = false,
}) {
  const gold = accentColor || '#E11D48';
  const text = isDark ? '#EDE8DF' : '#1A1815';
  const textD = isDark ? 'rgba(237,232,223,.52)' : 'rgba(26,24,21,.52)';
  const s2 = isDark ? '#131210' : '#F7F4EF';
  const s3 = isDark ? '#1A1815' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
  const extraAccent = isDark ? '#A78BFA' : '#7C3AED';
  const successAccent = isDark ? '#86EFAC' : '#16A34A';
  const recommendedSet = new Set(recommendedApplicationIds || []);

  const consentKey = useMemo(() => 'feria_brief_consent_v76_' + (cliente?.id || 'anon'), [cliente?.id]);
  const [consent, setConsent] = useState(() => localStorage.getItem(consentKey) || '');
  const totalQuestions = (sentirData || []).length;
  const safeSentirIdx = Math.min(Math.max(Number(sentirIdx) || 0, 0), Math.max(totalQuestions - 1, 0));
  const current = (sentirData || [])[safeSentirIdx] || {};
  const answeredCount = (sentirData || []).filter(s => s.filled).length;
  const missingOtherQuestions = (sentirData || []).filter((s, i) => i !== safeSentirIdx && !s.filled).length;
  const isLastBriefQuestion = safeSentirIdx === totalQuestions - 1;
  const briefPrimaryLabel = isLastBriefQuestion
    ? (missingOtherQuestions > 0 ? `Guardar y completar ${missingOtherQuestions} pendientes` : 'Continuar a aplicaciones ->')
    : 'Siguiente ->';
  const paidExtraGateSet = new Set(paidExtraApplicationIds || []);
  const includedSelectedGate = (selectedApplicationIds || []).filter(id => !paidExtraGateSet.has(id)).length;
  const hasEnoughApplications = includedSelectedGate >= Number(includedApplicationLimit || 0);
  const shouldShowApplicationSelection = questionsComplete && (!applicationSelectionComplete || !hasEnoughApplications || sentirIdx >= (sentirData || []).length);
  const stepProgress = totalQuestions ? Math.round(((safeSentirIdx + 1) / totalQuestions) * 100) : 0;
  const answeredProgress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const questionTitle = current?.titulo || current?.pregunta || `Pregunta ${safeSentirIdx + 1}`;
  const questionBody = current?.titulo && current?.pregunta ? current.pregunta : '';

  const acceptDisclaimer = () => {
    localStorage.setItem(consentKey, 'yes');
    setConsent('yes');
  };

  const resetDisclaimer = () => {
    localStorage.removeItem(consentKey);
    setConsent('');
  };

  if (!briefComplete && consent !== 'yes') {
    return (
      <div style={{ padding: 'clamp(28px, 6vw, 72px) 24px', maxWidth: 920, margin: '0 auto' }}>
        <div style={{ height:4, borderRadius:999, background:isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)', overflow:'hidden', marginBottom:42 }}>
          <div style={{ width:'6%', height:'100%', background:gold, borderRadius:999 }} />
        </div>
        <div style={{ fontSize: 11, textTransform:'uppercase', letterSpacing:'.18em', color: gold, marginBottom:10 }}>Antes de empezar</div>
        <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'clamp(38px, 7vw, 72px)', color:text, lineHeight:.94, marginBottom:30 }}>
          Compromiso del <em style={{ color:gold }}>brief</em>
        </div>
        <div style={{ background:s3, border:`1px solid ${border}`, borderRadius:26, padding:'clamp(24px, 5vw, 46px)', lineHeight:1.55, color:text }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:9, background:gold, color:'#fff', fontSize:13, fontWeight:900, marginBottom:20 }}>1</div>
          <p style={{ margin:'0 0 24px', fontSize:'clamp(25px, 4.2vw, 43px)', lineHeight:1.16, fontWeight:500 }}>
            ¿Confirmas que la información proporcionada en este brief será clara, completa y reflejará fielmente lo que esperas del proyecto?
          </p>
          <div style={{ display:'grid', gap:12, marginTop:18, maxWidth:700 }}>
            <button type="button" onClick={acceptDisclaimer} style={{ display:'flex', alignItems:'center', gap:14, background:isDark?'rgba(255,255,255,.04)':'rgba(0,0,0,.035)', color:text, border:`1px solid ${border}`, borderRadius:14, padding:'16px 18px', fontSize:16, fontWeight:750, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <span style={{ width:28, height:28, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', border:`1px solid ${border}`, color:gold, fontWeight:900, flex:'0 0 auto' }}>A</span>
              Sí, confirmo y asumo el compromiso
            </button>
            <button type="button" onClick={() => setConsent('no')} style={{ display:'flex', alignItems:'center', gap:14, background:'transparent', color:textD, border:`1px solid ${border}`, borderRadius:14, padding:'16px 18px', fontSize:16, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <span style={{ width:28, height:28, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', border:`1px solid ${border}`, color:textD, fontWeight:900, flex:'0 0 auto' }}>B</span>
              No, necesito revisar o complementar la información
            </button>
          </div>
          <button type="button" onClick={acceptDisclaimer} style={{ marginTop:28, background:gold, color:'#fff', border:'none', borderRadius:12, padding:'14px 26px', fontSize:16, fontWeight:900, cursor:'pointer', fontFamily:'inherit' }}>Aceptar</button>
          {consent === 'no' && (
            <div style={{ marginTop:16, background:isDark?'rgba(224,96,96,.08)':'rgba(224,96,96,.1)', border:'1px solid rgba(224,96,96,.22)', borderRadius:12, padding:16 }}>
              <div style={{ color:'#E06060', fontWeight:700, fontSize:13, marginBottom:4 }}>Lo sentimos, tu compromiso es importante para nosotros.</div>
              <div style={{ fontSize:12, color:textD }}>Por favor revisa o complementa la información antes de continuar. Será un placer ayudarte cuando tengas mayor claridad sobre el proyecto.</div>
              <button onClick={resetDisclaimer} style={{ marginTop:12, background:'transparent', border:'1px solid rgba(224,96,96,.3)', color:'#E06060', borderRadius:8, padding:'8px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Volver a empezar</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (shouldShowApplicationSelection) {
    const selectedSet = new Set(selectedApplicationIds || []);
    const paidExtraSet = new Set(paidExtraApplicationIds || []);
    const pendingIds = Array.from(new Set([...(pendingExtraApplicationIds || []), pendingExtraApplication?.id].filter(Boolean)));
    const pendingExtraSet = new Set(pendingIds);
    const pendingExtras = pendingIds.map(id => APPLICATION_CATALOG.find(app => app.id === id) || { id, name:id, category:'Extra', basePrice:0 });
    const includedSelected = (selectedApplicationIds || []).filter(id => !paidExtraSet.has(id)).length;
    const paidExtras = (selectedApplicationIds || []).filter(id => paidExtraSet.has(id));
    const canFinish = includedSelected >= Number(includedApplicationLimit || 0);
    const extrasTotal = pendingExtras.reduce((sum, app) => sum + Number(app.basePrice || 0), 0);

    return (
      <div style={{ padding: '28px 24px', maxWidth: 980, margin: '0 auto' }}>
        <div style={{ fontSize: 10, textTransform:'uppercase', letterSpacing:'.14em', color: textD, marginBottom:8 }}>Último paso del brief</div>
        <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:30, color:text, marginBottom:8 }}>Elige tus aplicaciones</div>
        <div style={{ fontSize:12, color:textD, lineHeight:1.75, marginBottom:18, maxWidth:760 }}>
          Tu paquete <strong style={{ color:text }}>{packageName}</strong> incluye <strong style={{ color:gold }}>{includedApplicationLimit}</strong> aplicaciones. El estudio te deja <strong style={{ color:text }}>4 aplicaciones sugeridas</strong> como punto de partida; la quinta la eliges tú. Después de escoger la quinta, las demás aplicaciones se activan como extras con su precio visible. Para continuar debes pagar los extras con Stripe o descartarlos.
        </div>

        {pendingExtras.length > 0 && (
          <div style={{ marginBottom:18, background:isDark?'rgba(167,139,250,.12)':'rgba(124,58,237,.07)', border:`1px solid ${extraAccent}66`, borderRadius:18, padding:20 }}>
            <div style={{ fontSize:10, color:extraAccent, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:8 }}>⚡ Aplicaciones extra por pagar</div>
            <div style={{ display:'grid', gap:8, marginBottom:14 }}>
              {pendingExtras.map(app => (
                <div key={app.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, background:isDark?'rgba(0,0,0,.18)':'rgba(255,255,255,.60)', border:`1px solid ${border}`, borderRadius:12, padding:'10px 12px' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:850, color:text }}>{app.name}</div>
                    <div style={{ fontSize:10, color:textD }}>{app.category}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:extraAccent }}>${Number(app.basePrice || 0).toLocaleString('en-US')}</div>
                    <button disabled={extraPaymentLoading} onClick={() => onToggleApplication?.(app.id)} style={{ background:'transparent', color:textD, border:`1px solid ${border}`, borderRadius:8, padding:'6px 8px', cursor: extraPaymentLoading ? 'not-allowed' : 'pointer', fontFamily:'inherit', fontSize:11 }}>Quitar</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:10, color:textD, textTransform:'uppercase', letterSpacing:'.1em' }}>Total extras</div>
                <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:32, color:extraAccent }}>${extrasTotal.toLocaleString('en-US')}</div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap' }}>
                <button disabled={extraPaymentLoading || !canFinish} onClick={() => { onCancelExtraApplication?.(); setTimeout(() => onFinishApplicationSelection?.(), 0); }} style={{ background:'transparent', color:text, border:`1px solid ${border}`, borderRadius:10, padding:'11px 14px', fontSize:12, cursor: extraPaymentLoading || !canFinish ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>Cancelar extras y continuar</button>
                <button disabled={extraPaymentLoading} onClick={onConfirmExtraApplication} style={{ background:extraAccent, color:'#fff', border:'none', borderRadius:10, padding:'11px 18px', fontSize:12, fontWeight:850, cursor: extraPaymentLoading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>{extraPaymentLoading ? 'Abriendo Stripe…' : 'Pagar extras con Stripe'}</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:10, marginBottom:18 }}>
          <div style={{ background:s2, border:`1px solid ${border}`, borderRadius:16, padding:16 }}>
            <div style={{ fontSize:10, color:textD, textTransform:'uppercase', letterSpacing:'.1em' }}>Incluidas</div>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:28, color: includedSelected >= includedApplicationLimit ? gold : text }}>{includedSelected}/{includedApplicationLimit}</div>
          </div>
          <div style={{ background:s2, border:`1px solid ${border}`, borderRadius:16, padding:16 }}>
            <div style={{ fontSize:10, color:textD, textTransform:'uppercase', letterSpacing:'.1em' }}>Extras pagadas</div>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:28, color:successAccent }}>{paidExtras.length}</div>
          </div>
          <div style={{ background:pendingExtras.length ? (isDark?'rgba(167,139,250,.12)':'rgba(124,58,237,.08)') : s2, border:`1px solid ${pendingExtras.length ? extraAccent : border}`, borderRadius:16, padding:16 }}>
            <div style={{ fontSize:10, color:textD, textTransform:'uppercase', letterSpacing:'.1em' }}>Extras por pagar</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
              <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:28, color:extraAccent }}>{pendingExtras.length}</div>
              {pendingExtras.length > 0 && <div style={{ fontSize:15, fontWeight:900, color:extraAccent }}>${extrasTotal.toLocaleString('en-US')}</div>}
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
          {APPLICATION_CATALOG.map(app => {
            const isIncluded = selectedSet.has(app.id) && !paidExtraSet.has(app.id);
            const isPaidExtra = paidExtraSet.has(app.id);
            const isPendingExtra = pendingExtraSet.has(app.id);
            const isSelected = isIncluded || isPaidExtra || isPendingExtra;
            const isRecommended = recommendedSet.has(app.id);
            const wouldBeExtra = !isSelected && includedSelected >= Number(includedApplicationLimit || 0);
            const cardBorder = isPaidExtra ? successAccent : isPendingExtra ? extraAccent : isIncluded ? gold : border;
            const cardBg = isPaidExtra
              ? (isDark ? 'rgba(134,239,172,.10)' : 'rgba(22,163,74,.07)')
              : isPendingExtra
                ? (isDark ? 'rgba(167,139,250,.14)' : 'rgba(124,58,237,.08)')
                : isIncluded
                  ? gold + '16'
                  : s2;
            return (
              <button key={app.id} onClick={() => onToggleApplication?.(app.id)} style={{
                textAlign:'left', background:cardBg, border:`1px solid ${cardBorder}`, borderRadius:16, padding:15,
                color:text, cursor:'pointer', fontFamily:'inherit', minHeight:130, boxShadow:isPendingExtra ? `0 0 0 3px ${extraAccent}22` : 'none'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:850, marginBottom:5 }}>{isSelected ? '✓ ' : ''}{app.name}</div>
                    <div style={{ fontSize:10, color:textD }}>{app.category}</div>
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    {isRecommended ? <span style={{ fontSize:9, color:isDark ? '#FBBF24' : '#B45309', border:`1px solid ${isDark ? 'rgba(251,191,36,.45)' : 'rgba(180,83,9,.35)'}`, borderRadius:999, padding:'3px 7px' }}>recomendado</span> : null}
                    {isIncluded ? <span style={{ fontSize:9, color:gold, border:`1px solid ${gold}70`, borderRadius:999, padding:'3px 7px' }}>incluida</span> : null}
                    {isPaidExtra ? <span style={{ fontSize:9, color:successAccent, border:`1px solid ${successAccent}70`, borderRadius:999, padding:'3px 7px' }}>extra pagada</span> : null}
                    {isPendingExtra ? <span style={{ fontSize:9, color:extraAccent, border:`1px solid ${extraAccent}70`, borderRadius:999, padding:'3px 7px' }}>por pagar</span> : null}
                  </div>
                </div>
                {(wouldBeExtra || isPendingExtra || isPaidExtra) && Number(app.basePrice || 0) > 0 && (
                  <div style={{ marginTop:12, display:'inline-flex', alignItems:'center', gap:6, background:isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.04)', border:`1px solid ${(isPaidExtra ? successAccent : extraAccent)}40`, color:isPaidExtra ? successAccent : extraAccent, borderRadius:999, padding:'6px 10px', fontSize:10, fontWeight:800 }}>
                    {isPaidExtra ? 'Pagada' : 'Extra'} · ${Number(app.basePrice || 0).toLocaleString('en-US')}
                  </div>
                )}
                {isRecommended && !isSelected && !wouldBeExtra && <div style={{ marginTop:10, fontSize:10, color:textD, lineHeight:1.5 }}>Recomendada por el estudio para este paquete. Puedes cambiarla si otra aplicación tiene más sentido para ti.</div>}
                {wouldBeExtra && <div style={{ marginTop:10, fontSize:10, color:textD, lineHeight:1.5 }}>Esta aplicación se sumará como extra si la seleccionas.</div>}
              </button>
            );
          })}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', marginTop:22 }}>
          <button onClick={() => setSentirIdx(Math.max(0, sentirData.length - 1))} style={{ background:'transparent', color:textD, border:`1px solid ${border}`, borderRadius:10, padding:'10px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>← Volver al brief</button>
          <button disabled={!canFinish || pendingExtras.length > 0} onClick={onFinishApplicationSelection} style={{ background: canFinish && pendingExtras.length === 0 ? gold : textD, color:'#fff', border:'none', borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:800, cursor: canFinish && pendingExtras.length === 0 ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            {pendingExtras.length > 0 ? 'Paga o descarta los extras' : 'Finalizar brief y crear proyecto →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px 52px', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:18, alignItems:'flex-end', flexWrap:'wrap', marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'clamp(34px, 4.8vw, 48px)', color:text, lineHeight:1, marginBottom:6 }}>
              Brief del <em style={{ color:gold }}>proyecto</em>
            </div>
            <div style={{ fontSize:13, color:textD }}>{answeredCount} de {totalQuestions} respondidas</div>
          </div>
          <div style={{ minWidth:180, textAlign:'right' }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.14em', color:textD, marginBottom:6 }}>Pregunta actual</div>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:30, color:text }}>
              {safeSentirIdx + 1}<span style={{ color:textD, fontSize:18 }}>/{totalQuestions}</span>
            </div>
          </div>
        </div>
        <div style={{ height:4, borderRadius:999, background:isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)', overflow:'hidden', marginBottom:10 }}>
          <div style={{ width:`${stepProgress}%`, height:'100%', background:gold, borderRadius:999, transition:'width .25s ease' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, color:textD, fontSize:11 }}>
          <span>Avance de lectura: {stepProgress}%</span>
          <span>Respuestas guardadas: {answeredProgress}%</span>
        </div>
      </div>

      <div style={{ background:'transparent', border:`1px solid ${border}`, borderRadius:18, padding:'clamp(38px, 8vw, 88px) clamp(24px, 9vw, 120px)', minHeight:380 }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:28 }}>
            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:7, background:gold, color:'#fff', fontSize:12, fontWeight:900, flex:'0 0 auto', marginTop:3 }}>
              {safeSentirIdx + 1}
            </span>
            <div style={{ fontSize:'clamp(22px, 3vw, 30px)', color:text, lineHeight:1.28, fontWeight:500 }}>
              {questionTitle}
            </div>
          </div>
          {questionBody && (
            <div style={{ fontSize:15, color:textD, lineHeight:1.6, margin:'-14px 0 26px 38px' }}>
              {questionBody}
            </div>
          )}
          <textarea
          id="sentirTA"
          key={safeSentirIdx}
          defaultValue={current?.respuesta || current?.draft || ''}
          onChange={e => setSentirData(prev => prev.map((item, i) => i === safeSentirIdx ? { ...item, draft: e.target.value } : item))}
          rows={4}
          placeholder={current?.placeholder || 'Escribe tu respuesta con claridad...'}
          style={{
            width:'100%',
            boxSizing:'border-box',
            background:'transparent',
            border:'none',
            borderBottom:`2px solid ${isDark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.24)'}`,
            color:text,
            borderRadius:0,
            padding:'0 0 12px',
            fontFamily:'inherit',
            fontSize:'clamp(18px, 2.2vw, 24px)',
            lineHeight:1.45,
            outline:'none',
            resize:'vertical',
            minHeight:120
          }}
        />
        <div style={{ display:'flex', justifyContent:'space-between', gap:14, marginTop:26, flexWrap:'wrap' }}>
          <button
            type="button"
            onClick={() => setSentirIdx(i => Math.max(0, i - 1))}
            disabled={safeSentirIdx === 0}
            style={{
              background:'transparent',
              color:safeSentirIdx === 0 ? textD : text,
              border:`1px solid ${border}`,
              borderRadius:10,
              padding:'11px 16px',
              fontSize:14,
              cursor:safeSentirIdx === 0 ? 'not-allowed' : 'pointer',
              fontFamily:'inherit',
              opacity:safeSentirIdx === 0 ? .45 : 1
            }}
          >
            &lt;- Anterior
          </button>
          <button type="button" onClick={onSave} style={{ background:gold, color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:15, fontWeight:850, cursor:'pointer', fontFamily:'inherit', minWidth:180 }}>
            {briefPrimaryLabel}
          </button>
        </div>
        </div>
      </div>

      {briefComplete && (
        <div style={{ marginTop:18, display:'flex', justifyContent:'center' }}>
          <button onClick={() => { downloadBriefPDF(cliente, sentirData); setBriefDownloaded?.(true); }} style={{ background:'transparent', color:gold, border:`1px solid ${gold}55`, borderRadius:10, padding:'10px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>{briefDownloaded ? 'Brief descargado ✓' : 'Descargar brief PDF'}</button>
        </div>
      )}
    </div>
  );
}
