import React, { useState } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';

/**
 * TaskChecklist
 * Checklist de tareas para diseñadores dentro de un proyecto en Kanban.
 * Las tareas se guardan en Supabase (tabla project_tasks) o en estado local.
 *
 * Uso en Kanban — dentro del panel de detalle del proyecto:
 *   import TaskChecklist from '../../features/kanban/components/TaskChecklist';
 *   <TaskChecklist proyecto={proyecto} showToast={showToast} />
 */

// Tareas por defecto según tipo de proyecto
const TAREAS_DEFAULT = {
  branding: [
    'Brief de proyecto completado',
    'Investigación de mercado y competencia',
    'Moodboard visual aprobado',
    'Propuesta de naming (si aplica)',
    'Bocetos y exploración de símbolo/ícono',
    'Propuesta de logotipo — versión principal',
    'Variantes del logotipo (horizontal, ícono solo)',
    'Paleta de colores definida',
    'Tipografías seleccionadas',
    'Sistema visual (patrones, texturas)',
    'Aplicativos: tarjeta de presentación',
    'Aplicativos: firma de correo',
    'Manual de marca — borrador',
    'Revisión interna David',
    'Presentación al cliente',
    'Ajustes post-presentación',
    'Manual de marca — versión final',
    'Entrega de archivos (AI, PDF, PNG, SVG)',
  ],
  bl: [
    'Brief fotógrafo completado',
    'Investigación de referentes visuales',
    'Moodboard de marca personal',
    'Propuesta de logotipo/monograma',
    'Paleta y tipografías',
    'Watermark para fotografías',
    'Plantillas Instagram (feed + stories)',
    'Portafolio digital — layout',
    'Presets Lightroom (si aplica)',
    'Manual de marca compacto',
    'Revisión interna',
    'Presentación al fotógrafo',
    'Ajustes post-presentación',
    'Entrega de archivos',
  ],
  arte: [
    'Brief de campaña completado',
    'Análisis de referentes creativos',
    'Concept Board — versión 1',
    'Definición del concepto creativo central',
    'Lineamientos de storytelling',
    'Referencias visuales finales',
    'Guía creativa para equipo de producción',
    'Revisión y aprobación',
    'Entrega de documentos',
  ],
};

export default function TaskChecklist({ proyecto, showToast }) {
  const tipoDefault = proyecto?.brand === 'bl' ? 'bl' : proyecto?.paquete?.toLowerCase().includes('arte') ? 'arte' : 'branding';
  const tareasBase  = TAREAS_DEFAULT[tipoDefault] || TAREAS_DEFAULT.branding;

  const [tareas, setTareas] = useState(() => {
    // Inicializar desde proyecto.tareas si existen, sino usar default
    if (proyecto?.tareas && Array.isArray(proyecto.tareas) && proyecto.tareas.length > 0) {
      return proyecto.tareas;
    }
    return tareasBase.map((t, i) => ({ id: i, texto: t, done: false }));
  });

  const [nuevaTarea, setNuevaTarea] = useState('');

  const completadas = tareas.filter(t => t.done).length;
  const pct         = tareas.length > 0 ? Math.round(completadas / tareas.length * 100) : 0;

  // ── Toggle tarea ─────────────────────────────────────────────
  const toggleTarea = async (id) => {
    const nuevas = tareas.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTareas(nuevas);
    // Guardar en Supabase si está disponible
    if (isConfigured && proyecto?.id) {
      try {
        await supabase.from('proyectos').update({ tareas: nuevas }).eq('id', proyecto.id);
      } catch (err) {
        console.warn('TaskChecklist save error:', err.message);
      }
    }
  };

  // ── Agregar tarea ─────────────────────────────────────────────
  const agregarTarea = async () => {
    if (!nuevaTarea.trim()) return;
    const nueva = { id: Date.now(), texto: nuevaTarea.trim(), done: false };
    const nuevas = [...tareas, nueva];
    setTareas(nuevas);
    setNuevaTarea('');
    if (isConfigured && proyecto?.id) {
      try { await supabase.from('proyectos').update({ tareas: nuevas }).eq('id', proyecto.id); }
      catch (err) { console.warn('TaskChecklist save error:', err.message); }
    }
  };

  // ── Eliminar tarea ────────────────────────────────────────────
  const eliminarTarea = async (id) => {
    const nuevas = tareas.filter(t => t.id !== id);
    setTareas(nuevas);
    if (isConfigured && proyecto?.id) {
      try { await supabase.from('proyectos').update({ tareas: nuevas }).eq('id', proyecto.id); }
      catch (err) { console.warn('TaskChecklist save error:', err.message); }
    }
  };

  const pendientes    = tareas.filter(t => !t.done);
  const completadasL  = tareas.filter(t => t.done);

  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, overflow:'hidden' }}>

      {/* Header con progreso */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-s)', background:'var(--s3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:600 }}>Checklist de producción</div>
          <div style={{ fontSize:11, color:'var(--gold)', fontWeight:600 }}>{completadas}/{tareas.length} tareas</div>
        </div>
        {/* Barra de progreso */}
        <div style={{ height:6, background:'var(--s1)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--gold)', borderRadius:3, transition:'width .3s' }} />
        </div>
        <div style={{ fontSize:10, color:'var(--text-d)', marginTop:4 }}>{pct}% completado</div>
      </div>

      <div style={{ padding:'12px 16px', maxHeight:360, overflowY:'auto' }}>

        {/* Tareas pendientes */}
        {pendientes.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Pendientes</div>
            {pendientes.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid var(--border-s)' }}>
                <button onClick={() => toggleTarea(t.id)}
                  style={{ width:18, height:18, borderRadius:4, border:'1.5px solid var(--border-m)', background:'transparent', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                </button>
                <div style={{ flex:1, fontSize:12, color:'var(--text)' }}>{t.texto}</div>
                <button onClick={() => eliminarTarea(t.id)}
                  style={{ background:'none', border:'none', color:'var(--text-d)', cursor:'pointer', fontSize:12, padding:2, opacity:0.5, ':hover':{ opacity:1 } }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Tareas completadas */}
        {completadasL.length > 0 && (
          <div>
            <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Completadas</div>
            {completadasL.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', opacity:0.6 }}>
                <button onClick={() => toggleTarea(t.id)}
                  style={{ width:18, height:18, borderRadius:4, border:'none', background:'var(--green)', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontSize:10, fontWeight:700 }}>✓</button>
                <div style={{ flex:1, fontSize:11, color:'var(--text-d)', textDecoration:'line-through' }}>{t.texto}</div>
              </div>
            ))}
          </div>
        )}

        {/* Agregar tarea */}
        <div style={{ display:'flex', gap:6, marginTop:12 }}>
          <input
            value={nuevaTarea}
            onChange={e => setNuevaTarea(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarTarea()}
            placeholder="Agregar tarea…"
            style={{ flex:1, padding:'7px 10px', background:'var(--s3)', border:'1px dashed var(--border-m)', borderRadius:7, color:'var(--text)', fontSize:11, fontFamily:'inherit' }}
          />
          <button onClick={agregarTarea}
            style={{ background:'var(--gold)', color:'var(--dark)', border:'none', borderRadius:7, padding:'0 12px', fontSize:13, cursor:'pointer', fontWeight:700 }}>+</button>
        </div>
      </div>
    </div>
  );
}
