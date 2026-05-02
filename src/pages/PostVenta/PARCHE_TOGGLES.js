// PARCHE: src/pages/PostVenta/index.jsx
// Busca el array FLUJO_AUTO y reemplaza el useState de sent por este:
//
//   const [sent,       setSent]       = useState({});
//   const [activado,   setActivado]   = useState(false);
//   const [customDelays, setCustomDelays] = useState(() => [0,1,2,7,14,30]);
//   const [pasoActivo, setPasoActivo] = useState(() => [true,true,true,true,true,true]); // ← NUEVO
//
// Luego en el render de FLUJO_AUTO.map, añade el toggle:
// Ver PARCHE_POSTVENTA.md para instrucciones exactas.

// ── COMPONENTE ModalSecuencia COMPLETO CON TOGGLES ────────────────────────
// Reemplaza la función ModalSecuencia completa por esta versión.
// Esta es la única función que cambia en PostVenta/index.jsx.

export function ModalSecuenciaConToggles({ data, showToast, onClose }) {
  // Los imports necesarios ya existen en PostVenta/index.jsx
  // Este bloque es solo referencia — ver PARCHE_POSTVENTA.md
}

/*
INSTRUCCIONES — busca en PostVenta/index.jsx:

1. Agrega este useState después de `customDelays`:
   const [pasoActivo, setPasoActivo] = useState([true,true,true,true,true,true]);

2. En sendStep, antes de setSent, agrega:
   if (!pasoActivo[i]) { showToast(`Paso "${FLUJO_AUTO[i].title}" desactivado`, '⚠'); return; }

3. En activarTodo, filtra los pasos inactivos:
   for (let i = 1; i < FLUJO_AUTO.length; i++) {
     if (!pasoActivo[i]) continue;  // ← AÑADIR ESTA LÍNEA
     const delay = ...

4. En el render de cada paso (dentro del .map), añade el toggle ANTES del botón de enviar:
   <label title={pasoActivo[i] ? 'Desactivar este paso' : 'Activar este paso'}
     style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
     <div onClick={() => setPasoActivo(arr => arr.map((v,idx) => idx===i ? !v : v))}
       style={{ width:30, height:16, borderRadius:8, background:pasoActivo[i]?paso.color:'var(--border-m)', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
       <div style={{ position:'absolute', top:2, left:pasoActivo[i]?14:2, width:12, height:12, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }} />
     </div>
   </label>
*/
