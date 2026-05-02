import React from 'react';
import { BadgeCheck, FileCheck2, PenLine } from 'lucide-react';

export default function ClientPortalApprovals({
  aprobaciones,
  onAprobar,
  aprobacionesComplete,
  approvalActSigned = false,
  onSignApprovalAct,
  kitUnlocked,
  onGoToBrandKit,
  isDark,
  accentColor = '#E11D48',
}) {
  const gold = accentColor || '#E11D48';
  const green = '#7BC67A';
  const text = isDark ? '#EDE8DF' : '#1A1815';
  const textD = isDark ? 'rgba(237,232,223,.52)' : 'rgba(26,24,21,.52)';
  const s1 = isDark ? '#131210' : '#F0EDE8';
  const s2 = isDark ? '#1A1815' : '#FFFFFF';
  const soft = isDark ? 'rgba(255,255,255,.035)' : 'rgba(26,24,21,.035)';
  const border = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
  const approvedCount = aprobaciones.filter(a => a.approved).length;
  const pct = aprobaciones.length ? Math.round((approvedCount / aprobaciones.length) * 100) : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 300, color: text, marginBottom: 4 }}>
            Propuestas para <em style={{ color: gold }}>revisar</em>
          </div>
          <div style={{ fontSize: 11, color: textD, lineHeight: 1.6 }}>
            Aprueba las piezas entregadas. Al terminar se firma el documento de aprobación creativa antes del pago final.
          </div>
        </div>
        <div style={{ fontSize: 10, color: textD, whiteSpace: 'nowrap' }}>Ronda 1 de 2</div>
      </div>

      <div style={{ background: s2, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 4, background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: green, borderRadius: 2, transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 10, color: textD, whiteSpace: 'nowrap' }}>{approvedCount} / {aprobaciones.length} aprobadas</div>
      </div>

      {aprobaciones.map((a, i) => (
        <div key={i} style={{ background: a.approved ? (isDark ? 'rgba(123,198,122,0.04)' : 'rgba(123,198,122,0.06)') : s2, border: `1px solid ${a.approved ? 'rgba(123,198,122,0.22)' : border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 12, transition: 'all .2s' }}>
          <div style={{ height: 124, background: s1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${border}` }}>
            <div style={{ textAlign: 'center', padding: '0 18px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: textD, marginBottom: 6 }}>Archivo de revisión · {a.version}</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 300, color: a.approved ? green : text }}>{a.approved ? 'Aprobado' : a.title.split('—')[0].trim()}</div>
              <div style={{ marginTop: 8, fontSize: 11, color: textD }}>PDF / Figma / imagen cargada por el equipo</div>
            </div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 3 }}>{a.title}</div>
            <div style={{ fontSize: 11, color: textD, marginBottom: 12 }}>{a.sub}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => alert('Vista previa del archivo de revisión. En producción se abrirá el PDF, Figma o archivo cargado por el equipo.')} style={{ background: 'transparent', border: `1px solid ${border}`, color: textD, fontSize: 11, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Ver archivo</button>
              <button onClick={() => onAprobar(i)} disabled={a.approved} style={{ background: a.approved ? 'rgba(123,198,122,0.15)' : 'rgba(123,198,122,0.1)', border: `1px solid rgba(123,198,122,${a.approved ? '.4' : '.22'})`, color: green, fontSize: 11, fontWeight: 700, padding: '7px 16px', borderRadius: 8, cursor: a.approved ? 'default' : 'pointer', fontFamily: 'inherit', opacity: a.approved ? .7 : 1 }}>
                {a.approved ? 'Aprobado' : 'Aprobar esta propuesta'}
              </button>
              {!a.approved && <button style={{ background: 'transparent', border: `1px solid ${border}`, color: textD, fontSize: 11, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Solicitar ajuste</button>}
            </div>
          </div>
        </div>
      ))}

      {aprobacionesComplete && (
        <div style={{ marginTop: 18, background: approvalActSigned ? 'rgba(123,198,122,0.08)' : soft, border: `1px solid ${approvalActSigned ? 'rgba(123,198,122,.24)' : border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: approvalActSigned ? 'rgba(123,198,122,.14)' : `${gold}14`, color: approvalActSigned ? green : gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {approvalActSigned ? <BadgeCheck size={19} strokeWidth={1.8} /> : <FileCheck2 size={19} strokeWidth={1.8} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: approvalActSigned ? green : text }}>
                {approvalActSigned ? 'Documento de aprobación firmado' : 'Documento de aprobación creativa'}
              </div>
              <div style={{ fontSize: 11, color: textD, lineHeight: 1.6, marginTop: 4 }}>
                {approvalActSigned
                  ? 'La aprobación de marca y aplicaciones quedó registrada. El siguiente paso es completar el pago final para liberar el Brand Kit.'
                  : 'Este documento deja constancia de que las propuestas de marca y aplicaciones fueron revisadas y aprobadas antes de pasar al pago final.'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
                {!approvalActSigned ? (
                  <button onClick={onSignApprovalAct} style={{ background: gold, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <PenLine size={14} strokeWidth={1.9} /> Firmar aprobación
                  </button>
                ) : (
                  <button onClick={onGoToBrandKit} style={{ background: kitUnlocked ? 'rgba(123,198,122,.12)' : `${gold}14`, color: kitUnlocked ? green : gold, border: `1px solid ${kitUnlocked ? 'rgba(123,198,122,.3)' : `${gold}40`}`, borderRadius: 9, padding: '9px 15px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {kitUnlocked ? 'Ver Brand Kit' : 'Ir al pago final'}
                  </button>
                )}
                <button style={{ background: 'transparent', color: textD, border: `1px solid ${border}`, borderRadius: 9, padding: '9px 13px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Vista previa del acta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
