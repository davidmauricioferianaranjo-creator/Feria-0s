import React, { useRef, useState } from 'react';
import { useApp, STAGE_LABELS } from '../../context/AppContext';
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Eye,
  KeyRound,
  Lock,
  Megaphone,
  MessagesSquare,
  PackageCheck,
  PanelRight,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import StageAnimation from '../../features/client-portal/components/StageAnimation';
import ChatMediaAttachment from '../../features/mensajes/components/ChatMediaAttachment';
import ClientPortalBrandKit from '../../features/client-portal/components/ClientPortalBrandKit';
import ClientPortalStudioNews from '../../features/client-portal/components/ClientPortalStudioNews';
import { getBriefQuestionsForService } from '../../lib/briefs';

// ── BRIEF DATA ────────────────────────────────────────────────────────────
const BRIEF_FLOW = [
  { letra: 'S', full: 'Sensaciones',  pregunta: '¿Qué sensación debe despertar tu marca en quien la ve por primera vez?',              placeholder: 'Ej: Confianza inmediata, elegancia discreta, fuerza sin arrogancia…',      filled: true,  respuesta: 'Autoridad serena. Que inspire confianza antes de que el cliente lea una sola palabra.' },
  { letra: 'E', full: 'Esencia',      pregunta: 'Si tu marca fuera una persona, ¿cómo la describirías en tres palabras?',              placeholder: 'Ej: Precisa, visionaria, cercana…',                                         filled: true,  respuesta: 'Precisa. Visionaria. Cercana sin ser informal.' },
  { letra: 'N', full: 'Narrativa',    pregunta: '¿Cuál es la historia que quieres que tu marca cuente al mundo?',                      placeholder: 'Ej: Transformamos espacios ordinarios en experiencias que perduran…',       filled: true,  respuesta: 'No construimos edificios. Construimos el escenario donde ocurre la vida de nuestros clientes.' },
  { letra: 'T', full: 'Territorio',   pregunta: '¿En qué espacio visual se mueve tu marca? ¿Qué colores o atmósferas resuenan?',       placeholder: 'Ej: Oscuro, mineral, austero pero cálido…',                                filled: true,  respuesta: 'Negro y concreto como base. Crudo natural como contrapunto. Sin ornamento.' },
  { letra: 'I', full: 'Influencias',  pregunta: '¿Qué marcas o referentes admiras — dentro o fuera de tu industria?',                  placeholder: 'Ej: Zaha Hadid, Kengo Kuma, la línea visual de Muji…',                     filled: true,  respuesta: 'Kengo Kuma, Studio Mumbai, Alvaro Siza. Fuera del sector: Muji, Aesop.' },
  { letra: 'R', full: 'Resultado',    pregunta: '¿Cómo sabrás que tu nueva identidad funcionó? ¿Qué debería cambiar?',                 placeholder: 'Ej: Que mis clientes perciban precio más alto antes de ver los números…',  filled: false, respuesta: '' },
];

const CHAT_MSGS_INIT = [
  { from: 'studio', name: 'David · Feria', time: 'Ayer 16:04', text: 'Hola! Los ajustes tipográficos están listos. La combinación Cormorant + DM Sans le da exactamente el balance entre autoridad y modernidad que buscabas.' },
  { from: 'studio', name: 'David · Feria', time: 'Ayer 16:05', text: 'Mañana te llegará el link para la reunión de presentación final — prepárate para ver tu marca completa.' },
  { from: 'client', name: 'ARKES',         time: 'Ayer 16:48', text: 'Perfecto, gracias. Quedé muy bien impresionado con la propuesta del logo — el isotipo geométrico en negativo funciona increíble.' },
  { from: 'studio', name: 'Selene · Feria',time: 'Hoy 09:15',  text: '¡Buenos días! Confirmamos la reunión de presentación para mañana. El equipo ha trabajado algo que creemos te va a emocionar.' },
];

const APROBACIONES = [
  { title: 'Sistema de logo — versión final', sub: 'Isotipo geométrico · variantes positivo y negativo · horizontal', version: 'v3', approved: false },
  { title: 'Paleta cromática y tipografía',   sub: 'Negro arquitecto · Crudo natural · Bronce · Cormorant + DM Sans',  version: 'v2', approved: false },
];

function mergePortalBriefData(baseQuestions, savedData) {
  if (!Array.isArray(savedData) || !savedData.length) return baseQuestions;
  if (savedData.length === baseQuestions.length) {
    return baseQuestions.map((q, i) => ({ ...q, respuesta: savedData[i]?.respuesta || '', filled: Boolean(savedData[i]?.filled || savedData[i]?.respuesta) }));
  }
  const savedByQuestion = new Map(
    savedData
      .map(item => [String(item?.pregunta || '').trim().toLowerCase(), item])
      .filter(([key]) => key)
  );
  return baseQuestions.map(q => {
    const saved = savedByQuestion.get(String(q.pregunta || '').trim().toLowerCase());
    return saved ? { ...q, respuesta: saved.respuesta || '', filled: Boolean(saved.filled || saved.respuesta) } : q;
  });
}

function buildPortalBriefData(cliente, proyecto) {
  const service = proyecto?.service_type || proyecto?.servicio || cliente?.service_type || cliente?.servicio || '';
  const questions = getBriefQuestionsForService(service);
  const base = (questions.length ? questions : BRIEF_FLOW)
    .map(q => ({ ...q, respuesta: q.respuesta || '', filled: Boolean(q.filled || q.respuesta) }));
  const saved = proyecto?.brief_responses || proyecto?.briefResponses || proyecto?.sentir_data || cliente?.brief_responses || cliente?.sentir_data;
  return mergePortalBriefData(base, saved);
}

// ── PORTAL SCREEN ─────────────────────────────────────────────────────────
function PortalScreen({ cliente, proyecto, equipo, adminPreview = false }) {
  const { saveBrief, saveAprobacion } = useApp();
  const [screen, setScreen] = useState('progreso');
  const [sentirIdx, setSentirIdx] = useState(0);
  const [sentirData, setSentirData] = useState(() => buildPortalBriefData(cliente, proyecto));
  const [aprobaciones, setAprobaciones] = useState(APROBACIONES);
  const [approvalActSigned, setApprovalActSigned] = useState(false);
  const [deliveryActSigned, setDeliveryActSigned] = useState(false);
  const [chatMsgs, setChatMsgs] = useState(CHAT_MSGS_INIT);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachment, setChatAttachment] = useState(null);
  const [chatDragging, setChatDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [, setSaving] = useState(false);

  React.useEffect(() => {
    setSentirData(buildPortalBriefData(cliente, proyecto));
    setSentirIdx(0);
  }, [cliente, proyecto]);

  const pct = Math.round((proyecto.pctCliente / 100) * 100);
  const daysLeft = proyecto.diasEntrega - Math.round(proyecto.diasEntrega * proyecto.pctCliente / 100);
  const trigger = daysLeft <= 1;

  const SCREENS = [
    { id: 'progreso',     label: 'Mi proyecto',  icon: PanelRight },
    { id: 'brief',        label: 'Brief',        icon: ClipboardList },
    { id: 'aprobaciones', label: 'Aprobaciones', icon: BadgeCheck },
    { id: 'brandkit',     label: 'Brand Kit',    icon: PackageCheck },
    { id: 'novedades',    label: 'Novedades',    icon: Megaphone },
    { id: 'mensajes',     label: 'Mensajes',     icon: MessagesSquare },
  ];

  // Guardar respuesta del brief en DB
  const handleBriefChange = async (idx, value) => {
    const updated = sentirData.map((s, i) =>
      i === idx ? { ...s, respuesta: value, filled: value.trim().length > 0 } : s
    );
    setSentirData(updated);
    if (idx < sentirData.length - 1) setSentirIdx(i => i + 1);

    // Persistir en DB — objeto directo a jsonb (no JSON.stringify)
    const respuestas = Object.fromEntries(updated.map((s, i) => [`pregunta_${i + 1}`, s.respuesta]));
    setSaving(true);
    try {
      await saveBrief(cliente.id, respuestas);
    } catch { /* fallo silencioso — el estado local ya está actualizado */ }
    finally { setSaving(false); }
  };

  // Guardar aprobación en DB
  const handleAprobar = async (i, aprobado) => {
    const updated = aprobaciones.map((a, idx) =>
      idx === i ? { ...a, approved: aprobado, approvedAt: new Date().toISOString() } : a
    );
    setAprobaciones(updated);
    try {
      await saveAprobacion(cliente.id, updated[i].title, aprobado);
    } catch { /* fallo silencioso */ }
  };

  const selectChatFile = (file) => {
    if (!file || file.size > 20 * 1024 * 1024) return;
    setChatAttachment({ file, name: file.name, size: file.size, mime: file.type, url: URL.createObjectURL(file) });
  };

  const sendMsg = () => {
    if (!chatInput.trim() && !chatAttachment) return;
    setChatMsgs(prev => [...prev, { from: 'client', name: cliente.nombre, time: 'Ahora', text: chatInput.trim() || 'Archivo adjunto', attachmentName: chatAttachment?.name || '', attachmentUrl: chatAttachment?.url || '', attachmentMime: chatAttachment?.mime || '' }]);
    setChatInput('');
    setChatAttachment(null);
    setTimeout(() => {
      setChatMsgs(prev => [...prev, { from: 'studio', name: 'Feria · Sistema', time: 'Ahora', text: 'Mensaje recibido. El equipo te responderá en breve.' }]);
    }, 1000);
  };

  const saveSentir = () => {
    const ta = document.getElementById('sentirTA');
    if (!ta?.value.trim()) return;
    handleBriefChange(sentirIdx, ta.value);
  };

  const isKitUnlocked = adminPreview || proyecto.pctCliente >= 88 || Boolean(approvalActSigned);
  const answeredBrief = sentirData.filter(s => s.filled).length;
  const activeBrief = sentirData[sentirIdx] || sentirData[0];

  // ── BRAND KIT COLORS ──
  const COLORS = [
    { name: 'Negro arquitecto',   hex: '#1A1A18', rgb: '26,26,24',    cmyk: '0,0,8,90' },
    { name: 'Crudo natural',      hex: '#F2EDE4', rgb: '242,237,228', cmyk: '0,2,6,5' },
    { name: 'Bronce estructural', hex: '#8C7355', rgb: '140,115,85',  cmyk: '0,18,39,45' },
    { name: 'Gris concreto',      hex: '#6B6B68', rgb: '107,107,104', cmyk: '0,0,3,58' },
    { name: 'Blanco puro',        hex: '#FFFFFF', rgb: '255,255,255', cmyk: '0,0,0,0' },
  ];

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100%', color: '#18181B' }}>

      {/* PORTAL HEADER */}
      <div className="admin-client-portal-header" style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid rgba(24,24,27,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, gap: 12, flexWrap: 'wrap' }}>
        <div className="admin-client-portal-brand" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#D13A52' }}>
          Feria <em>Design</em>
        </div>
        <div className="admin-client-portal-head-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0 }}>
          <div className="admin-client-portal-title-pill" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#A1A1AA' }}>Portal del cliente</div>
          <div className="admin-client-portal-profile" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${cliente.color}22`, color: cliente.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
              {cliente.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="admin-client-portal-profile-name" style={{ fontSize: 11, fontWeight: 500 }}>{cliente.nombre}</div>
              <div className="admin-client-portal-profile-service" style={{ fontSize: 9, color: '#A1A1AA' }}>{cliente.servicio}</div>
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="admin-client-portal-nav" style={{ display: 'flex', padding: '0 24px', background: '#FFFFFF', borderBottom: '1px solid rgba(24,24,27,.08)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {SCREENS.map(s => {
          const Icon = s.icon;
          const isActive = screen === s.id;
          const isDone = (s.id === 'brief' && answeredBrief === sentirData.length) ||
                         (s.id === 'aprobaciones' && approvalActSigned) ||
                         (s.id === 'brandkit' && deliveryActSigned);
          const isLocked = s.id === 'brandkit' && !isKitUnlocked;
          const navColor = isLocked ? '#D4D4D8' : isActive ? '#D13A52' : isDone ? '#64D49A' : '#71717A';
          const navIconBg = isActive ? 'rgba(209,58,82,.10)' : isDone ? 'rgba(100,212,154,.12)' : 'rgba(24,24,27,.025)';
          const navIconBorder = isActive ? 'rgba(209,58,82,.30)' : isDone ? 'rgba(100,212,154,.30)' : 'rgba(24,24,27,.10)';
          return (
            <button key={s.id} onClick={() => !isLocked && setScreen(s.id)} style={{
              fontSize: 11, padding: '9px 12px', cursor: isLocked ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8,
              color: navColor,
              borderBottom: isActive ? '1px solid #C9A96E' : '1px solid transparent',
              background: 'transparent', border: 'none', fontFamily: 'inherit',
              opacity: isLocked ? .58 : 1,
            }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: navIconBg, border: `1px solid ${navIconBorder}`, color: navColor }}>
                {isDone ? <CheckCircle2 size={13} strokeWidth={2} /> : isLocked ? <Lock size={12} strokeWidth={1.8} /> : <Icon size={13} strokeWidth={1.8} />}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @media (max-width:520px){
          .admin-client-portal-header{align-items:flex-start!important;padding:10px 14px!important;gap:8px!important}
          .admin-client-portal-brand{width:100%;font-size:15px!important}
          .admin-client-portal-head-actions{width:100%;justify-content:space-between!important;gap:8px!important}
          .admin-client-portal-title-pill{order:3;width:100%;text-align:left;font-size:9px!important}
          .admin-client-portal-profile{flex:1 1 132px}
          .admin-client-portal-profile-name,.admin-client-portal-profile-service{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .admin-client-portal-nav{padding:0 12px!important}
          .admin-client-portal-nav button{padding:8px 10px!important}
        }
      `}</style>

      <div style={{ padding: '0 0 40px' }}>

        {/* ══ MI PROYECTO ══ */}
        {screen === 'progreso' && (
          <>
            {/* Hero */}
            <div style={{ display: 'none', padding: '40px 24px 28px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold-dim)', marginBottom: 10 }}>Bienvenido a tu espacio</div>
              <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.2, marginBottom: 8 }}>
                Tu marca está <em style={{ color: 'var(--gold)' }}>tomando forma</em>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-m)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
                Aquí puedes seguir el avance, revisar entregas y comunicarte con el equipo de Feria.
              </div>
            </div>

            <div style={{ padding: '22px 24px 0', maxWidth: 980, margin: '0 auto' }}>
              <StageAnimation stage={proyecto.fase} daysLeft={daysLeft} isDark={false} accentColor="#C9A96E" forceIllustration compact />
            </div>

            {/* Progress */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-d)' }}>Progreso del proyecto</div>
                <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 20, color: 'var(--gold)' }}>{pct}%</div>
              </div>
              <div style={{ height: 2, background: 'var(--border-m)', borderRadius: 1, marginBottom: 20, position: 'relative' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 1, transition: 'width .8s' }} />
                <div style={{ position: 'absolute', right: `${100 - pct}%`, top: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', border: '2px solid #0C0B09', transform: 'translateX(50%)' }} />
              </div>

              {/* Stage dots */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                {STAGE_LABELS.map((l, i) => {
                  const done = i < proyecto.fase;
                  const curr = i === proyecto.fase;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 8, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? 'var(--gold)' : curr ? 'transparent' : 'var(--border-s)',
                        color: done ? 'var(--dark)' : curr ? 'var(--gold)' : 'var(--text-d)',
                        border: curr ? '1.5px solid #C9A96E' : 'none',
                        boxShadow: curr ? '0 0 0 3px rgba(201,169,110,0.15)' : 'none',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-d)' }}>
                <span>Iniciado: 8 de abril</span>
                <span>Entrega estimada: 16 de abril</span>
              </div>
            </div>

            {/* Status cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '0 24px', marginBottom: 20 }}>
              {[
                { val: daysLeft, lbl: 'Días para entrega', c: 'var(--gold)' },
                { val: `${proyecto.fase + 1} / ${STAGE_LABELS.length}`, lbl: 'Etapas completadas', c: 'var(--green)' },
                { val: cliente.servicio, lbl: 'Tipo de proyecto', c: 'var(--text)' },
              ].map(s => (
                <div key={s.lbl} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18, color: s.c, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Next step */}
            {trigger && (
              <div style={{ margin: '0 24px 20px', background: 'var(--gold-faint)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setScreen('mensajes')}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--gold-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📅</div>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--gold-dim)', marginBottom: 2 }}>Próximo paso · mañana</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Reunión de presentación final</div>
                  <div style={{ fontSize: 11, color: 'var(--text-m)', marginTop: 1 }}>El link de Zoom llegó a tu email · 30 min estimados</div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ padding: '0 24px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-d)', marginBottom: 14 }}>Historial del proyecto</div>
              {[
                { date: '15 abr', title: 'Contrato firmado',         desc: 'Firmado digitalmente · pago 60% confirmado', done: true,  c: 'var(--green)' },
                { date: '15 abr', title: 'Brief enviado',            desc: 'Brief completado',         done: true,  c: 'var(--green)' },
                { date: '16 abr', title: 'Reunión EL ORIGEN',        desc: 'Zoom · 45 minutos · escucha activa',         done: true,  c: 'var(--green)' },
                { date: '16 abr', title: 'Producción iniciada',      desc: 'Exploración de identidad visual',            done: true,  c: 'var(--gold)', curr: true },
                { date: 'Mañana', title: 'Presentación final',       desc: 'Link de reunión enviado a tu email',         done: false, c: 'var(--text-d)' },
              ].map((e, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 2 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${e.c}22`, border: `1px solid ${e.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: e.c, flexShrink: 0 }}>
                      {e.done ? '✓' : i + 1}
                    </div>
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 14, background: 'var(--border-s)', margin: '3px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 2 }}>{e.date}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: e.curr ? 'var(--gold)' : e.done ? 'var(--text)' : 'var(--text-d)' }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 1 }}>{e.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ BRIEF ══ */}
        {screen === 'brief' && (
          <div style={{ padding: '24px', maxWidth: 980 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 18 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 6 }}>
                  Brief del <em style={{ color: 'var(--gold)' }}>proyecto</em>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-m)', lineHeight: 1.6 }}>
                  Antes de diseñar, necesitamos escucharte. Responde una pregunta a la vez con calma y claridad.
                </div>
              </div>
              <div style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-d)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 7 }}>
                  <span>{answeredBrief} de {sentirData.length}</span>
                  <span>{Math.round((answeredBrief / sentirData.length) * 100)}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: 'var(--s2)', overflow: 'hidden', border: '1px solid var(--border-s)' }}>
                  <div style={{ width: `${(answeredBrief / sentirData.length) * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: 999 }} />
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 14, padding: 'clamp(18px, 4vw, 34px)', boxShadow: '0 18px 45px rgba(0,0,0,.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--gold)', fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.12em' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 999, border: '1px solid var(--gold-dim)', background: 'var(--gold-faint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0 }}>{sentirIdx + 1}</span>
                  Pregunta {sentirIdx + 1} de {sentirData.length}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setSentirIdx(i => Math.max(0, i - 1))} disabled={sentirIdx === 0} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-s)', background: 'transparent', color: 'var(--text-m)', opacity: sentirIdx === 0 ? .35 : 1, cursor: sentirIdx === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>←</button>
                  <button onClick={() => setSentirIdx(i => Math.min(sentirData.length - 1, i + 1))} disabled={sentirIdx === sentirData.length - 1} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-s)', background: 'transparent', color: 'var(--text-m)', opacity: sentirIdx === sentirData.length - 1 ? .35 : 1, cursor: sentirIdx === sentirData.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>→</button>
                </div>
              </div>

              <div style={{ fontSize: 20, lineHeight: 1.25, fontWeight: 650, color: 'var(--text)', marginBottom: 8 }}>{activeBrief.full}</div>
              <div style={{ fontSize: 12, color: 'var(--text-m)', lineHeight: 1.55, marginBottom: 18 }}>{activeBrief.pregunta}</div>
              <textarea
                key={sentirIdx}
                id="sentirTA"
                defaultValue={activeBrief.respuesta}
                placeholder={activeBrief.placeholder || 'Escribe tu respuesta aqui...'}
                style={{
                  width: '100%', background: 'var(--s1)', border: '1px solid var(--border-s)',
                  borderRadius: 12, padding: '14px 16px', fontSize: 14, color: 'var(--text)',
                  resize: 'vertical', minHeight: 150, outline: 'none', fontFamily: 'inherit', lineHeight: 1.55,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setSentirIdx(i => Math.max(0, i - 1))} disabled={sentirIdx === 0} style={{ background: 'transparent', color: 'var(--text-m)', fontSize: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-s)', cursor: sentirIdx === 0 ? 'default' : 'pointer', opacity: sentirIdx === 0 ? .35 : 1, fontFamily: 'inherit' }}>
                  ← Anterior
                </button>
                <button onClick={saveSentir} style={{ background: 'var(--gold)', color: '#fff', fontSize: 12, fontWeight: 800, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Guardar y continuar →
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, background: 'var(--s2)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: 'var(--text-d)', lineHeight: 1.6, border: '1px solid var(--border-s)' }}>
              Estas respuestas orientan la estrategia, la dirección creativa y las decisiones finales del proyecto.
            </div>
          </div>
        )}

        {/* ══ APROBACIONES ══ */}
        {screen === 'aprobaciones' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 300, marginBottom: 4 }}>
                  Propuestas para <em style={{ color: 'var(--gold)' }}>revisar</em>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-d)' }}>Tienes 2 rondas de ajuste incluidas en tu proyecto</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-d)' }}>Ronda 1 de 2</div>
            </div>

            {aprobaciones.map((a, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: 140, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-s)', cursor: 'pointer' }}
                  onClick={() => {}}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-d)', marginBottom: 6 }}>Propuesta {a.version}</div>
                    <div style={{ fontSize: 20, fontWeight: 300, color: 'var(--text-m)' }}>{a.title.split('—')[0].trim()}</div>
                  </div>
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, color: 'var(--text-d)', padding: '3px 8px', border: '1px solid rgba(255,255,255,.06)', borderRadius: 6 }}>⤢ Ver</div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-m)', marginBottom: 12 }}>{a.sub}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => handleAprobar(i, true)}
                      style={{
                        background: a.approved ? 'rgba(52, 211, 153, 0.15)' : 'rgba(52, 211, 153, 0.1)', border: `1px solid ${a.approved ? 'rgba(52, 211, 153, 0.4)' : 'rgba(52, 211, 153, 0.2)'}`,
                        color: 'var(--green)', fontSize: 11, fontWeight: 500, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', opacity: a.approved ? .7 : 1,
                      }}
                    >
                      {a.approved ? '✓ Aprobado' : '✓ Aprobar'}
                    </button>
                    <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.06)', color: 'var(--text-m)', fontSize: 11, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Solicitar ajuste
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-d)' }}>{a.version}</span>
                  </div>
                </div>
              </div>
            ))}

            {aprobaciones.every(a => a.approved) && (
              <div style={{ background: approvalActSigned ? 'rgba(52,211,153,.08)' : 'var(--s2)', border: `1px solid ${approvalActSigned ? 'rgba(52,211,153,.25)' : 'var(--border-s)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: approvalActSigned ? 'var(--green)' : 'var(--text)' }}>{approvalActSigned ? 'Documento de aprobación firmado' : 'Documento de aprobación creativa'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-d)', lineHeight: 1.6, marginTop: 4 }}>Constancia de que marca y aplicaciones fueron revisadas antes de activar el pago final.</div>
                {!approvalActSigned && (
                  <button onClick={() => setApprovalActSigned(true)} style={{ marginTop: 12, background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Firmar aprobación
                  </button>
                )}
              </div>
            )}

            <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-d)', marginBottom: 10 }}>Versiones anteriores</div>
              {[
                { v: 'v3', title: 'Versión actual — refinamiento final', date: '16 abr', current: true },
                { v: 'v2', title: 'Segunda propuesta — ajuste tipográfico', date: '15 abr', current: false },
                { v: 'v1', title: 'Primera propuesta — exploración inicial', date: '14 abr', current: false },
              ].map(ver => (
                <div key={ver.v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-s)' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 5, background: ver.current ? 'var(--gold-faint)' : 'var(--border-s)', color: ver.current ? 'var(--gold)' : 'var(--text-d)', minWidth: 30, textAlign: 'center' }}>{ver.v}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{ver.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-d)' }}>{ver.date}</div>
                  </div>
                  <button style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,.06)', color: 'var(--text-d)', cursor: 'pointer', fontFamily: 'inherit' }}>↓</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ BRAND KIT ══ */}
        {screen === 'brandkit' && (
          <ClientPortalBrandKit
            cliente={cliente}
            proyecto={proyecto}
            isDark={false}
            accentColor={cliente.color || 'var(--gold)'}
            kitUnlocked={isKitUnlocked}
            approvalActSigned={approvalActSigned}
            deliveryActSigned={deliveryActSigned}
            finalPaymentCobro={null}
            pct={pct}
            onFinalPayment={() => setApprovalActSigned(true)}
            onGoToApprovals={() => setScreen('aprobaciones')}
            onSignDeliveryAct={() => setDeliveryActSigned(true)}
            onDownloadBrandKit={() => {}}
          />
        )}

        {false && screen === 'brandkit' && (
          <div style={{ padding: '24px' }}>
            {!isKitUnlocked ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>🔒</div>
                <div style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 22, marginBottom: 8 }}>Brand Kit disponible al completar</div>
                <div style={{ fontSize: 11, color: 'var(--text-d)', lineHeight: 1.7 }}>El Brand Kit se desbloquea automáticamente cuando el proyecto llega al 100% y el pago final es confirmado.</div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 4, background: 'var(--border-s)', borderRadius: 2, overflow: 'hidden', maxWidth: 240, margin: '0 auto' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 6 }}>{pct}% completado</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', paddingBottom: 24, borderBottom: '1px solid var(--border-s)', marginBottom: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold-dim)', marginBottom: 8 }}>Tu identidad completa</div>
                  <div style={{ fontSize: 26, fontWeight: 300 }}>Brand Kit <em style={{ color: 'var(--gold)' }}>{cliente.nombre.split(' ')[0]}</em></div>
                  <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--gold-faint)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 10, color: 'var(--gold)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 2s infinite' }} />
                    Desbloqueado
                  </div>
                </div>

                {/* Logos */}
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-d)', marginBottom: 12 }}>Logos — clic para descargar</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
                  {[
                    { name: 'Principal', dark: false }, { name: 'Blanco', dark: true },
                    { name: 'Isotipo',   dark: false }, { name: 'Horizontal', dark: false },
                  ].map(l => (
                    <div key={l.name}
                      style={{ background: l.dark ? 'var(--s3)' : 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 10, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-s)'}
                    >
                      <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <svg viewBox="0 0 50 34" width="46">
                          <polygon points="25,2 48,32 2,32" fill="none" stroke={l.dark ? '#fff' : 'var(--text)'} strokeWidth="1.5" />
                          <polygon points="25,10 40,32 10,32" fill={l.dark ? '#fff' : 'var(--text)'} />
                        </svg>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: l.dark ? 'var(--text-m)' : 'rgba(237,232,223,.6)' }}>{l.name}</div>
                    </div>
                  ))}
                </div>

                {/* Colors */}
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-d)', marginBottom: 12 }}>Colores — clic para copiar HEX</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 24 }}>
                  {COLORS.map(c => (
                    <div key={c.hex} style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-s)', transition: 'transform .15s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = ''}
                      onClick={() => { navigator.clipboard?.writeText(c.hex).catch(() => {}); }}
                    >
                      <div style={{ height: 48, background: c.hex }} />
                      <div style={{ background: 'var(--s2)', padding: '7px 8px' }}>
                        <div style={{ fontSize: 10, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name.split(' ')[0]}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-d)', fontFamily: 'monospace' }}>{c.hex}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-d)', marginTop: 1 }}>RGB {c.rgb}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Manual PDF */}
                <div style={{ background: 'var(--s2)', border: '1px solid var(--border-s)', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-faint)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-s)'}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(224,96,96,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Manual de identidad {cliente.nombre.split(' ')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 2 }}>PDF · 42 páginas · uso de marca, tipografía, color, fotografía</div>
                  </div>
                  <div style={{ background: 'var(--gold)', color: 'var(--dark)', fontSize: 11, fontWeight: 600, padding: '7px 16px', borderRadius: 8, flexShrink: 0 }}>↓ PDF</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ MENSAJES ══ */}
        {screen === 'novedades' && (
          <ClientPortalStudioNews
            isDark={false}
            accentColor={cliente.color || 'var(--gold)'}
            editable={adminPreview}
            onRequest={(item) => {
              setScreen('mensajes');
              setChatInput(`Hola Feria, me interesa recibir más información sobre: ${item.title}.`);
            }}
          />
        )}

        {screen === 'mensajes' && (
          <div
            onDragOver={e => { e.preventDefault(); setChatDragging(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setChatDragging(false); }}
            onDrop={e => { e.preventDefault(); setChatDragging(false); selectChatFile(e.dataTransfer.files?.[0]); }}
            style={{ display: 'flex', flexDirection: 'column', height: 440, position:'relative', boxShadow: chatDragging ? 'inset 0 0 0 2px var(--gold)' : 'none', borderRadius: 12 }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '75%', alignSelf: m.from === 'client' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', padding: '0 4px', textAlign: m.from === 'client' ? 'right' : 'left' }}>{m.name}</div>
                  <div style={{
                    padding: '10px 13px', fontSize: 12, lineHeight: 1.5,
                    background: m.from === 'client' ? 'var(--gold-faint)' : 'var(--s2)',
                    border: m.from === 'client' ? '1px solid rgba(201,169,110,0.2)' : '1px solid rgba(255,255,255,.05)',
                    borderRadius: m.from === 'client' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  }}>
                    <div>{m.text}</div>
                    {(m.attachmentUrl || m.attachment_url || m.attachmentName || m.attachment_name) && (
                      <ChatMediaAttachment
                        url={m.attachmentUrl || m.attachment_url || ''}
                        name={m.attachmentName || m.attachment_name || ''}
                        mime={m.attachmentMime || m.attachment_mime || ''}
                        compact
                        colors={{ bg:'rgba(255,255,255,.04)' }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-d)', padding: '0 4px', textAlign: m.from === 'client' ? 'right' : 'left' }}>{m.time}</div>
                </div>
              ))}
            </div>
            {chatDragging && <div style={{ position:'absolute', inset:8, border:'1px dashed var(--gold)', borderRadius:12, display:'grid', placeItems:'center', background:'rgba(201,169,110,.10)', color:'var(--gold)', fontSize:12, fontWeight:800, pointerEvents:'none' }}>Suelta el archivo en el chat</div>}
            {chatAttachment && (
              <div style={{ margin:'0 20px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, background:'var(--s2)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'6px 8px' }}>
                <ChatMediaAttachment url={chatAttachment.url} name={chatAttachment.name} mime={chatAttachment.mime} compact colors={{ bg:'transparent' }} />
                <button onClick={() => setChatAttachment(null)} style={{ background:'transparent', border:'none', color:'var(--text-d)', cursor:'pointer' }} aria-label="Quitar archivo"><X size={14} /></button>
              </div>
            )}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'grid', gridTemplateColumns:'minmax(0, 1fr) auto auto', gap: 8, background: 'var(--s1)' }}>
              <input
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Escribe un mensaje al equipo de Feria…"
                style={{ minWidth:0, background: 'var(--s2)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
              />
              <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*,.pdf" style={{ display:'none' }} onChange={e => { selectChatFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ background:'var(--s2)', border:'1px solid rgba(255,255,255,.06)', color:'var(--text-d)', borderRadius:8, width:38, display:'grid', placeItems:'center', cursor:'pointer' }} aria-label="Adjuntar archivo"><Paperclip size={16} /></button>
              <button onClick={sendMsg} style={{ background: 'var(--gold)', color: 'var(--dark)', fontSize: 11, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display:'inline-flex', alignItems:'center', gap:7 }}>
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.2)}}`}</style>
    </div>
  );
}

// ── MAIN PORTAL PAGE ──────────────────────────────────────────────────────
export default function Portal() {
  const { data } = useApp();
  const [selectedClienteId, setSelectedClienteId] = useState(data.clientes[0]?.id);

  const clientesConProyecto = data.clientes.filter(c => data.proyectos.some(p => String(p.clienteId || p.cliente_id) === String(c.id)));
  const cliente = data.clientes.find(c => String(c.id) === String(selectedClienteId)) || clientesConProyecto[0];
  const proyecto = data.proyectos.find(p => cliente && String(p.clienteId || p.cliente_id) === String(cliente.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: 'var(--s0)' }}>
      {/* SELECTOR — internal view to switch clients */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px clamp(16px, 3vw, 28px)', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', flexWrap:'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 12, background: 'var(--gold-faint)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Eye size={17} strokeWidth={1.8} />
        </div>
        <div style={{ marginRight: 6, minWidth: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 850, color: 'var(--text)' }}>Vista sincronizada del cliente</div>
          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-m)', lineHeight: 1.45 }}>Audita el portal real y edita las novedades visibles para el cliente.</div>
        </div>
        {clientesConProyecto.map(c => (
          <button key={c.id} onClick={() => setSelectedClienteId(c.id)} style={{
            fontSize: 12, fontWeight: 800, padding: '8px 13px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${String(c.id) === String(cliente?.id) ? 'var(--gold)' : 'var(--border-s)'}`,
            background: String(c.id) === String(cliente?.id) ? 'var(--gold-faint)' : 'var(--s2)',
            color: String(c.id) === String(cliente?.id) ? 'var(--gold)' : 'var(--text-m)', fontFamily: 'inherit', transition: 'all .15s',
          }}>
            {c.nombre}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '8px 12px', background: 'var(--gold-faint)', border: '1px solid var(--gold-dim)', borderRadius: 999, color: 'var(--gold)', display:'inline-flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
          <KeyRound size={14} strokeWidth={1.8} />
          Datos del mismo cliente y proyecto
        </div>
      </div>

      {/* PORTAL */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px clamp(12px, 2.5vw, 24px)' }}>
        {cliente && proyecto
          ? (
            <div style={{ maxWidth: 1220, margin: '0 auto 28px', border: '1px solid var(--border-s)', borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 24px 60px rgba(15, 23, 42, .08)' }}>
              <PortalScreen cliente={cliente} proyecto={proyecto} equipo={data.team} adminPreview />
            </div>
          )
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-d)' }}>Selecciona un cliente con proyecto activo</div>
        }
      </div>
    </div>
  );
}
