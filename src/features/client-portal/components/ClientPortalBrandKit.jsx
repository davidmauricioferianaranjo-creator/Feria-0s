import React from 'react';
import { BadgeCheck, Download, FileCheck2, FileText, FolderOpen, Lock, PenLine, Sparkles } from 'lucide-react';

const ASSETS = [
  { title: 'Manual de identidad', detail: 'PDF maestro · uso de marca, color, tipografía y aplicaciones', type: 'PDF' },
  { title: 'Sistema de logotipo', detail: 'Principal, horizontal, isotipo, positivo y negativo', type: 'ZIP' },
  { title: 'Aplicaciones finales', detail: 'Piezas aprobadas y listas para usar', type: 'ZIP' },
  { title: 'Carpeta Brand Kit', detail: 'Enlace Drive con todos los archivos finales', type: 'Drive' },
];

export default function ClientPortalBrandKit({
  cliente,
  proyecto,
  isDark,
  accentColor = '#E11D48',
  kitUnlocked,
  approvalActSigned,
  deliveryActSigned,
  finalPaymentCobro,
  pct,
  onFinalPayment,
  onGoToApprovals,
  onSignDeliveryAct,
  onDownloadBrandKit,
}) {
  const gold = accentColor || '#E11D48';
  const text = isDark ? '#F4F4F5' : '#18181B';
  const muted = isDark ? '#A1A1AA' : '#71717A';
  const subtle = isDark ? 'rgba(244,244,245,.42)' : 'rgba(24,24,27,.42)';
  const card = isDark ? '#141416' : '#FFFFFF';
  const soft = isDark ? '#18181B' : '#F8F6F2';
  const border = isDark ? 'rgba(255,255,255,.09)' : 'rgba(24,24,27,.10)';
  const green = '#7BC67A';

  if (!kitUnlocked) {
    const blockedByAct = !approvalActSigned;
    return (
      <div style={{ padding: '28px 24px', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: 16, background: blockedByAct ? 'rgba(224,96,96,.10)' : `${gold}14`, color: blockedByAct ? '#E06060' : gold, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            {blockedByAct ? <Lock size={22} strokeWidth={1.8} /> : <FileCheck2 size={22} strokeWidth={1.8} />}
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: text, marginBottom: 8 }}>
            {blockedByAct ? 'Falta firmar la aprobación' : 'Pago final y liberación del Brand Kit'}
          </div>
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 20px' }}>
            {blockedByAct
              ? 'Antes de activar el pago final, necesitamos que el documento de aprobación creativa quede firmado en la sección de Aprobaciones.'
              : 'Las propuestas ya están aprobadas y firmadas. Completa el saldo final del 40% para desbloquear la descarga del Brand Kit.'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, margin: '0 auto 22px', maxWidth: 620 }}>
            {[
              ['Propuestas', true],
              ['Aprobación firmada', approvalActSigned],
              ['Pago final', false],
              ['Brand Kit', false],
            ].map(([label, done]) => (
              <div key={label} style={{ background: done ? 'rgba(123,198,122,.08)' : soft, border: `1px solid ${done ? 'rgba(123,198,122,.24)' : border}`, borderRadius: 10, padding: '10px 8px' }}>
                <div style={{ color: done ? green : subtle, display: 'grid', placeItems: 'center', marginBottom: 5 }}>
                  {done ? <BadgeCheck size={16} strokeWidth={1.8} /> : <Lock size={15} strokeWidth={1.7} />}
                </div>
                <div style={{ fontSize: 10, color: done ? green : muted, fontWeight: 750 }}>{label}</div>
              </div>
            ))}
          </div>

          <button onClick={blockedByAct ? onGoToApprovals : onFinalPayment} style={{ background: blockedByAct ? 'transparent' : gold, color: blockedByAct ? gold : '#fff', border: blockedByAct ? `1px solid ${gold}55` : 'none', borderRadius: 10, padding: '12px 20px', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit' }}>
            {blockedByAct ? 'Volver a Aprobaciones' : (finalPaymentCobro?.payment_link || finalPaymentCobro?.stripe_payment_link ? 'Pagar saldo final 40%' : 'Confirmar pago final 40%')}
          </button>
          <div style={{ height: 4, background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(24,24,27,.06)', borderRadius: 2, overflow: 'hidden', maxWidth: 220, margin: '18px auto 0' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: gold, borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 11, color: subtle, marginTop: 8 }}>{pct}% completado · falta el pago final</div>
        </div>
      </div>
    );
  }

  const signAndDownload = () => {
    if (!deliveryActSigned) onSignDeliveryAct?.();
    onDownloadBrandKit?.();
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, .9fr)', gap: 16, marginBottom: 16 }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: subtle, marginBottom: 8 }}>Entrega final</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, lineHeight: 1.05, color: text }}>
            Brand Kit <em style={{ color: gold }}>{cliente?.nombre?.split(' ')[0] || 'cliente'}</em>
          </div>
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.7, maxWidth: 520, marginTop: 10 }}>
            Aquí se concentra el manual, el sistema de logos, aplicaciones aprobadas y la carpeta final del proyecto.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid rgba(123,198,122,.26)`, background: 'rgba(123,198,122,.08)', color: green, borderRadius: 999, padding: '6px 10px', fontSize: 10, fontWeight: 800 }}>
              <Sparkles size={13} strokeWidth={1.8} /> Desbloqueado
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${border}`, color: muted, borderRadius: 999, padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
              {proyecto?.nombre || cliente?.servicio || 'Proyecto Feria'}
            </span>
          </div>
        </div>

        <div style={{ background: deliveryActSigned ? 'rgba(123,198,122,.08)' : card, border: `1px solid ${deliveryActSigned ? 'rgba(123,198,122,.25)' : border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: deliveryActSigned ? 'rgba(123,198,122,.14)' : `${gold}14`, color: deliveryActSigned ? green : gold, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            {deliveryActSigned ? <BadgeCheck size={19} strokeWidth={1.8} /> : <PenLine size={18} strokeWidth={1.8} />}
          </div>
          <div style={{ fontSize: 14, fontWeight: 850, color: deliveryActSigned ? green : text, marginBottom: 5 }}>
            {deliveryActSigned ? 'Acta de entrega firmada' : 'Acta de entrega final'}
          </div>
          <div style={{ fontSize: 11, color: muted, lineHeight: 1.6, marginBottom: 14 }}>
            {deliveryActSigned
              ? 'La recepción del material final quedó registrada. Puedes descargar nuevamente cuando lo necesites.'
              : 'Antes de descargar, confirma que recibes el manual, logos y aplicaciones finales del proyecto.'}
          </div>
          <button onClick={signAndDownload} style={{ width: '100%', background: deliveryActSigned ? 'transparent' : gold, color: deliveryActSigned ? gold : '#fff', border: deliveryActSigned ? `1px solid ${gold}55` : 'none', borderRadius: 10, padding: '11px 14px', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            {deliveryActSigned ? <Download size={15} strokeWidth={1.9} /> : <PenLine size={15} strokeWidth={1.9} />}
            {deliveryActSigned ? 'Descargar Brand Kit' : 'Firmar acta y descargar'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {ASSETS.map((asset, index) => (
          <button key={asset.title} onClick={deliveryActSigned ? onDownloadBrandKit : undefined} style={{ textAlign: 'left', background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 16, color: text, cursor: deliveryActSigned ? 'pointer' : 'default', fontFamily: 'inherit', opacity: deliveryActSigned ? 1 : .76 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: index === 3 ? 'rgba(91,155,213,.12)' : `${gold}12`, color: index === 3 ? '#6BA3E5' : gold, display: 'grid', placeItems: 'center' }}>
                {index === 3 ? <FolderOpen size={18} strokeWidth={1.7} /> : index === 0 ? <FileText size={18} strokeWidth={1.7} /> : <FileCheck2 size={18} strokeWidth={1.7} />}
              </div>
              <span style={{ border: `1px solid ${border}`, borderRadius: 999, padding: '3px 8px', color: muted, fontSize: 9, fontWeight: 800 }}>{asset.type}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 850, marginBottom: 5 }}>{asset.title}</div>
            <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{asset.detail}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
