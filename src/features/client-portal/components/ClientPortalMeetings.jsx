import React from 'react';
import { supabase } from '../../../lib/supabase';

const HORAS = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function ClientPortalMeetings({
  reunionForm, setReunionForm,
  reunionEnviada, setReunionEnviada,
  reunionConfirmada, setReunionConfirmada,
  cliente, user, isDark, accentColor = '#E11D48', onMeetingConfirmed,
}) {
  const gold   = accentColor || '#E11D48';
  const green  = '#7BC67A';
  const text   = isDark ? '#EDE8DF' : '#1A1815';
  const textD  = isDark ? 'rgba(237,232,223,.5)' : 'rgba(26,24,21,.45)';
  const s1     = isDark ? '#131210' : '#F0EDE8';
  const s2     = isDark ? '#1A1815' : '#EDE8DF';
  const border = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)';

  const handleConfirmar = async () => {
    if (!reunionForm.fecha) return;
    const fechaObj   = new Date(reunionForm.fecha + 'T' + reunionForm.hora + ':00');
    const fechaLabel = `${fechaObj.getDate()} de ${MESES[fechaObj.getMonth()]} ${fechaObj.getFullYear()}`;

    const initialMeeting = {
      fecha: fechaLabel, hora: reunionForm.hora + 'hs',
      tipo: reunionForm.tipo, link: '⏳ Generando enlace…', notas: reunionForm.notas,
    };
    setReunionConfirmada(initialMeeting);
    setReunionEnviada('confirmada');
    onMeetingConfirmed?.(initialMeeting);

    try {
      const { data: result } = await supabase.functions.invoke('send-meeting-notification', {
        body: {
          clienteNombre:    cliente?.nombre || user?.name || 'Cliente',
          clienteEmail:     cliente?.email  || user?.email || '',
          clienteTelefono:  cliente?.telefono || '',
          fecha:            fechaLabel,
          hora:             reunionForm.hora + 'hs',
          tipo:             reunionForm.tipo,
          zoomLink:         reunionForm.tipo === 'virtual' ? 'https://zoom.us/j/feria-design' : '',
        },
      });
      if (result?.zoomLink) {
        const finalMeeting = { ...initialMeeting, link: result.zoomLink };
        setReunionConfirmada(finalMeeting);
        onMeetingConfirmed?.(finalMeeting);
      }
    } catch {
      const finalMeeting = {
        ...initialMeeting,
        link: reunionForm.tipo === 'virtual' ? 'https://zoom.us/j/feria-design' : '',
      };
      setReunionConfirmada(finalMeeting);
      onMeetingConfirmed?.(finalMeeting);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 300, color: text, marginBottom: 6 }}>
        Agendar <em style={{ color: gold }}>reunión</em>
      </div>
      <div style={{ fontSize: 11, color: textD, lineHeight: 1.6, marginBottom: 24 }}>
        Propone una fecha y el equipo de Feria la confirmará en menos de 24 horas.
      </div>

      {/* ── Reunión confirmada ── */}
      {reunionConfirmada && (
        <div style={{ background: 'rgba(123,198,122,0.08)', border: '1px solid rgba(123,198,122,0.25)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 20 }}>{reunionConfirmada.tipo === 'virtual' ? '🎥' : '📍'}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: green }}>✓ Reunión confirmada</div>
              <div style={{ fontSize: 11, color: textD, marginTop: 2 }}>El equipo de Feria ha confirmado tu reunión</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[
              { l: 'Fecha',    v: reunionConfirmada.fecha },
              { l: 'Hora',     v: reunionConfirmada.hora },
              { l: 'Tipo',     v: reunionConfirmada.tipo === 'virtual' ? '🎥 Virtual' : '📍 Presencial' },
              { l: 'Duración', v: '60 min' },
            ].map(({ l, v }) => (
              <div key={l} style={{ background: s1, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: textD, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: text }}>{v}</div>
              </div>
            ))}
          </div>
          {reunionConfirmada.link && !reunionConfirmada.link.startsWith('⏳') && (
            <a href={reunionConfirmada.link} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: gold, color: '#0C0B09', borderRadius: 8, padding: '9px 18px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              🎥 Unirse a la reunión
            </a>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#25D366' }}>WhatsApp enviado</div>
                <div style={{ fontSize: 10, color: textD }}>{cliente?.telefono || 'Número en tu perfil'}</div>
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(91,155,213,0.08)', border: '1px solid rgba(91,155,213,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📧</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#5B9BD5' }}>Email enviado</div>
                <div style={{ fontSize: 10, color: textD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente?.email || user?.email}</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => { setReunionConfirmada(null); setReunionEnviada(null); }}
              style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: textD }}>
              Solicitar cambio de fecha
            </button>
          </div>
        </div>
      )}

      {/* ── Pendiente ── */}
      {reunionEnviada === 'pendiente' && !reunionConfirmada && (
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}25`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: gold, animation: 'pulse 2s infinite' }} />
            <div style={{ fontSize: 13, fontWeight: 500, color: gold }}>Solicitud enviada — pendiente de confirmación</div>
          </div>
          <div style={{ fontSize: 11, color: textD }}>
            Fecha propuesta: <strong>{reunionForm.fecha}</strong> a las <strong>{reunionForm.hora}</strong> · {reunionForm.tipo === 'virtual' ? '🎥 Virtual' : '📍 Presencial'}
          </div>
        </div>
      )}

      {/* ── Formulario ── */}
      {!reunionEnviada && !reunionConfirmada && (
        <div>
          {/* Tipo */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: textD, marginBottom: 10 }}>¿Cómo prefieres reunirte?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { v: 'virtual',    icon: '🎥', t: 'Virtual',   d: 'Google Meet, Zoom o la plataforma que prefieras.' },
                { v: 'presencial', icon: '📍', t: 'Presencial', d: 'En nuestro estudio. Quito, Ecuador.' },
              ].map(({ v, icon, t, d }) => (
                <div key={v} onClick={() => setReunionForm(p => ({ ...p, tipo: v }))}
                  style={{ padding: 16, borderRadius: 12, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${reunionForm.tipo === v ? gold : border}`, background: reunionForm.tipo === v ? `${gold}08` : s2 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: reunionForm.tipo === v ? gold : text, marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 11, color: textD, lineHeight: 1.5 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fecha y hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: textD, marginBottom: 8 }}>Fecha preferida</div>
              <input type="date" value={reunionForm.fecha}
                min={new Date().toISOString().slice(0,10)}
                onChange={e => setReunionForm(p => ({ ...p, fecha: e.target.value }))}
                style={{ width: '100%', background: s2, border: `1px solid ${border}`, borderRadius: 9, padding: '11px 13px', fontSize: 13, color: text, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: textD, marginBottom: 8 }}>Hora preferida</div>
              <select value={reunionForm.hora} onChange={e => setReunionForm(p => ({ ...p, hora: e.target.value }))}
                style={{ width: '100%', background: s2, border: `1px solid ${border}`, borderRadius: 9, padding: '11px 13px', fontSize: 13, color: text, outline: 'none', fontFamily: 'inherit' }}>
                {HORAS.map(h => <option key={h} value={h}>{h}hs</option>)}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: textD, marginBottom: 8 }}>¿Sobre qué quieres hablar? (opcional)</div>
            <textarea value={reunionForm.notas} onChange={e => setReunionForm(p => ({ ...p, notas: e.target.value }))}
              placeholder="Ej: Tengo dudas sobre los colores propuestos…" rows={3}
              style={{ width: '100%', background: s2, border: `1px solid ${border}`, borderRadius: 9, padding: '11px 13px', fontSize: 12, color: text, outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6 }} />
          </div>

          <button disabled={!reunionForm.fecha} onClick={handleConfirmar}
            style={{ background: reunionForm.fecha ? gold : `${gold}30`, color: reunionForm.fecha ? '#0C0B09' : textD, border: 'none', borderRadius: 10, padding: '13px 24px', fontSize: 13, fontWeight: 600, cursor: reunionForm.fecha ? 'pointer' : 'not-allowed', fontFamily: 'inherit', width: '100%' }}>
            {reunionForm.tipo === 'virtual' ? '🎥' : '📍'} Confirmar reunión {reunionForm.tipo === 'virtual' ? 'virtual' : 'presencial'}
          </button>

          <div style={{ fontSize: 10, color: textD, textAlign: 'center', marginTop: 10 }}>
            Recibirás la confirmación por email y WhatsApp de inmediato.
          </div>
        </div>
      )}
    </div>
  );
}
