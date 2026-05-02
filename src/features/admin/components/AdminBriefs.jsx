import React, { useMemo, useState } from 'react';
import { BRIEF_TYPES, normalizeBriefs } from '../../../lib/briefs';
import {
  APPLICATION_CATALOG,
  DEFAULT_APPLICATION_CATALOG,
  DEFAULT_PACKAGE_RULES,
  PACKAGE_CONFIG_STORAGE_KEY,
  PACKAGE_RULES,
} from '../../../lib/packages';
import { Badge, Button, SectionLabel } from '../../../components/UI';
import { ArrowDown, ArrowUp, Check, Eye, PackageCheck, Pencil, Plus, RotateCcw, Save, Sparkles, Trash2, X } from 'lucide-react';

function loadPackageConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(PACKAGE_CONFIG_STORAGE_KEY) || 'null');
    return {
      applications: Array.isArray(saved?.applications) ? saved.applications : APPLICATION_CATALOG,
      rules: saved?.rules && typeof saved.rules === 'object' ? saved.rules : PACKAGE_RULES,
    };
  } catch {
    return { applications: APPLICATION_CATALOG, rules: PACKAGE_RULES };
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
}

export default function AdminBriefs({ showToast }) {
  const [briefs, setBriefs] = useState(() => {
    try { return normalizeBriefs(JSON.parse(localStorage.getItem('feria_briefs') || 'null')); }
    catch { return normalizeBriefs(null); }
  });
  const [activeBrief, setActiveBrief] = useState('branding');
  const [editingIdx, setEditingIdx]   = useState(null);
  const [editingText, setEditingText] = useState('');
  const [preview, setPreview] = useState(false);

  const packageConfig = useMemo(loadPackageConfig, []);
  const [applications, setApplications] = useState(packageConfig.applications);
  const [rules, setRules] = useState(packageConfig.rules);
  const [activeRule, setActiveRule] = useState(Object.keys(packageConfig.rules)[0] || 'Brand Starter');
  const [newApp, setNewApp] = useState({ name: '', category: 'Aplicación', basePrice: 0 });

  const saveBriefs = (nb) => {
    setBriefs(nb);
    try { localStorage.setItem('feria_briefs', JSON.stringify(nb)); } catch {}
    showToast('Brief actualizado', 'ok');
  };

  const savePackageConfig = (nextApplications = applications, nextRules = rules) => {
    try {
      localStorage.setItem(PACKAGE_CONFIG_STORAGE_KEY, JSON.stringify({ applications: nextApplications, rules: nextRules }));
      APPLICATION_CATALOG.splice(0, APPLICATION_CATALOG.length, ...nextApplications);
      Object.keys(PACKAGE_RULES).forEach(key => delete PACKAGE_RULES[key]);
      Object.assign(PACKAGE_RULES, nextRules);
      showToast('Aplicaciones y precios guardados', 'ok');
    } catch {
      showToast('No se pudo guardar la configuración', 'x');
    }
  };

  const updatePregunta = (tipo, idx, valor) => {
    const next = { ...briefs, [tipo]: { ...briefs[tipo], preguntas: briefs[tipo].preguntas.map((p, i) => i === idx ? { ...p, text: valor } : p) } };
    saveBriefs(next);
    setEditingIdx(null);
  };
  const addPregunta = (tipo) => {
    const nextQuestion = { active: true, text: 'Nueva pregunta' };
    saveBriefs({ ...briefs, [tipo]: { ...briefs[tipo], preguntas: [...briefs[tipo].preguntas, nextQuestion] } });
    setEditingIdx(briefs[tipo].preguntas.length);
    setEditingText('Nueva pregunta');
  };
  const removePregunta = (tipo, idx) => {
    saveBriefs({ ...briefs, [tipo]: { ...briefs[tipo], preguntas: briefs[tipo].preguntas.filter((_, i) => i !== idx) } });
  };
  const togglePregunta = (tipo, idx) => {
    saveBriefs({ ...briefs, [tipo]: { ...briefs[tipo], preguntas: briefs[tipo].preguntas.map((p, i) => i === idx ? { ...p, active: p.active === false } : p) } });
  };
  const movePregunta = (tipo, idx, dir) => {
    const arr = [...briefs[tipo].preguntas];
    const next = idx + dir;
    if (next < 0 || next >= arr.length) return;
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    saveBriefs({ ...briefs, [tipo]: { ...briefs[tipo], preguntas: arr } });
  };
  const resetBrief = (tipo) => saveBriefs({ ...briefs, [tipo]: BRIEF_TYPES[tipo] });

  const updateApplication = (id, patch) => {
    setApplications(prev => prev.map(app => app.id === id ? { ...app, ...patch } : app));
  };
  const addApplication = () => {
    if (!newApp.name.trim()) {
      showToast('Escribe el nombre de la aplicación', 'x');
      return;
    }
    const id = slugify(newApp.name) || `app_${Date.now()}`;
    if (applications.some(app => app.id === id)) {
      showToast('Ya existe una aplicación con ese nombre', 'x');
      return;
    }
    setApplications(prev => [...prev, { id, name: newApp.name.trim(), category: newApp.category.trim() || 'Aplicación', basePrice: Number(newApp.basePrice) || 0 }]);
    setNewApp({ name: '', category: 'Aplicación', basePrice: 0 });
  };
  const removeApplication = (id) => {
    setApplications(prev => prev.filter(app => app.id !== id));
    setRules(prev => Object.fromEntries(Object.entries(prev).map(([name, rule]) => [
      name,
      { ...rule, suggestedApplicationIds: (rule.suggestedApplicationIds || []).filter(appId => appId !== id) },
    ])));
  };

  const updateRule = (name, patch) => {
    setRules(prev => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  };
  const resetPackageConfig = () => {
    setApplications(DEFAULT_APPLICATION_CATALOG);
    setRules(DEFAULT_PACKAGE_RULES);
    setActiveRule(Object.keys(DEFAULT_PACKAGE_RULES)[0] || 'Brand Starter');
    savePackageConfig(DEFAULT_APPLICATION_CATALOG, DEFAULT_PACKAGE_RULES);
  };
  const suggestedIdsForRule = (rule) => {
    if (Array.isArray(rule.suggestedApplicationIds)) return rule.suggestedApplicationIds;
    return applications.slice(0, Math.max(0, Number(rule.includedApplications) || 0)).map(app => app.id);
  };
  const toggleSuggested = (appId) => {
    const rule = rules[activeRule] || {};
    const current = new Set(suggestedIdsForRule(rule));
    current.has(appId) ? current.delete(appId) : current.add(appId);
    updateRule(activeRule, { suggestedApplicationIds: Array.from(current) });
  };

  const active = briefs[activeBrief];
  const activeCount = active.preguntas.filter(p => p.active !== false).length;
  const selectedRule = rules[activeRule] || {};
  const selectedSuggested = new Set(suggestedIdsForRule(selectedRule));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr)', gap:16, minWidth:0, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap:8, minWidth:0 }}>
        <div style={{ gridColumn:'1/-1', fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>Plantillas definitivas</div>
        {Object.entries(briefs).map(([tipo, b]) => (
          <button key={tipo} onClick={() => { setActiveBrief(tipo); setEditingIdx(null); }} style={{ textAlign:'left', padding:'12px 13px', borderRadius:10, border:`1px solid ${activeBrief===tipo?'var(--gold)':'var(--border-s)'}`, background:activeBrief===tipo?'var(--gold-faint)':'var(--s2)', color:activeBrief===tipo?'var(--gold)':'var(--text-m)', fontSize:12, cursor:'pointer', fontFamily:'inherit', minWidth:0 }}>
            <div style={{ fontWeight:700, marginBottom:3, lineHeight:1.25 }}>{b.nombre}</div>
            <div style={{ fontSize:10, color:'var(--text-d)' }}>{b.preguntas.filter(p=>p.active!==false).length}/{b.preguntas.length} activas</div>
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gap:16, minWidth:0 }}>
        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:20, minWidth:0, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                <div style={{ fontSize:15, fontWeight:800, lineHeight:1.2 }}>{active.nombre}</div>
                <Badge color="teal">{activeCount} visibles</Badge>
              </div>
              <div style={{ fontSize:11, color:'var(--text-d)', marginTop:2, lineHeight:1.5 }}>{active.descripcion}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
              <Button size="sm" variant="ghost" onClick={() => setPreview(true)}><span style={buttonIcon}><Eye size={13} /> Previsualizar</span></Button>
              <Button size="sm" variant="ghost" onClick={() => resetBrief(activeBrief)}><span style={buttonIcon}><RotateCcw size={13} /> Restaurar</span></Button>
              <Button size="sm" variant="gold" onClick={() => addPregunta(activeBrief)}><span style={buttonIcon}><Plus size={13} /> Pregunta</span></Button>
            </div>
          </div>

          <SectionLabel>Preguntas</SectionLabel>
          <div style={{ display:'grid', gap:8 }}>
            {active.preguntas.map((p, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'28px minmax(0,1fr)', gap:10, alignItems:'flex-start', opacity: p.active===false ? .62 : 1, minWidth:0 }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:p.active===false?'var(--s3)':'var(--gold-faint)', color:p.active===false?'var(--text-d)':'var(--gold)', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>{i+1}</div>
                {editingIdx === i ? (
                  <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto auto', gap:6, minWidth:0 }}>
                    <input value={editingText} onChange={e => setEditingText(e.target.value)} autoFocus onKeyDown={e => { if (e.key==='Enter') updatePregunta(activeBrief,i,editingText); if (e.key==='Escape') setEditingIdx(null); }} style={inputStyle} />
                    <button style={miniBtn} onClick={() => updatePregunta(activeBrief,i,editingText)} title="Guardar"><Check size={14} /></button>
                    <button style={miniBtn} onClick={() => setEditingIdx(null)} title="Cancelar"><X size={14} /></button>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:10, alignItems:'center', minWidth:0 }}>
                    <div style={{ fontSize:12, color:p.active===false?'var(--text-d)':'var(--text-m)', padding:'6px 0', lineHeight:1.45, minWidth:0 }}>{p.text}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                      <Button size="sm" variant="ghost" onClick={() => togglePregunta(activeBrief,i)}>{p.active===false?'Activar':'Desactivar'}</Button>
                      <button style={miniBtn} onClick={() => { setEditingIdx(i); setEditingText(p.text); }} title="Editar"><Pencil size={13} /></button>
                      <button onClick={() => movePregunta(activeBrief,i,-1)} style={miniBtn} title="Subir"><ArrowUp size={13} /></button>
                      <button onClick={() => movePregunta(activeBrief,i,1)} style={miniBtn} title="Bajar"><ArrowDown size={13} /></button>
                      <button onClick={() => removePregunta(activeBrief,i)} style={{ ...miniBtn, color:'var(--red)', borderColor:'rgba(224,96,96,.25)' }} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, padding:'12px 14px', background:'var(--s3)', borderRadius:8, fontSize:11, color:'var(--text-d)', lineHeight:1.6 }}>
            El cliente verá preguntas numeradas normales. La metodología interna no se muestra al cliente.
          </div>
        </div>

        <div style={{ background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:12, padding:20, minWidth:0, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap', marginBottom:14 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:15, fontWeight:800 }}>
                <PackageCheck size={17} color="var(--gold)" /> Aplicaciones y precios
              </div>
              <div style={{ fontSize:11, color:'var(--text-d)', marginTop:4, lineHeight:1.5 }}>
                Edita precios de paquetes, cantidad incluida y aplicaciones sugeridas para cotizaciones.
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Button size="sm" variant="ghost" onClick={resetPackageConfig}><span style={buttonIcon}><RotateCcw size={13} /> Restaurar</span></Button>
              <Button size="sm" variant="gold" onClick={() => savePackageConfig()}><span style={buttonIcon}><Save size={13} /> Guardar catálogo</span></Button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr)', gap:14, minWidth:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap:8, alignContent:'start', minWidth:0 }}>
              {Object.entries(rules).map(([name, rule]) => (
                <button key={name} onClick={() => setActiveRule(name)} style={{ textAlign:'left', padding:'10px 12px', borderRadius:10, border:`1px solid ${activeRule===name?'var(--gold)':'var(--border-s)'}`, background:activeRule===name?'var(--gold-faint)':'var(--s1)', color:activeRule===name?'var(--gold)':'var(--text-m)', fontFamily:'inherit', cursor:'pointer' }}>
                  <div style={{ fontSize:12, fontWeight:800 }}>{rule.label || name}</div>
                  <div style={{ fontSize:10, color:'var(--text-d)', marginTop:3 }}>${Number(rule.price || 0).toLocaleString()} · {rule.includedApplications || 0} apps</div>
                </button>
              ))}
            </div>

            <div style={{ minWidth:0, display:'grid', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap:10 }}>
                <Field label="Precio">
                  <input type="number" value={selectedRule.price || 0} onChange={e => updateRule(activeRule, { price:Number(e.target.value) || 0 })} style={inputStyle} />
                </Field>
                <Field label="Aplicaciones incluidas">
                  <input type="number" value={selectedRule.includedApplications || 0} onChange={e => updateRule(activeRule, { includedApplications:Number(e.target.value) || 0 })} style={inputStyle} />
                </Field>
                <Field label="Servicio base">
                  <input value={selectedRule.defaultService || ''} onChange={e => updateRule(activeRule, { defaultService:e.target.value })} style={inputStyle} />
                </Field>
              </div>

              <div>
                <SectionLabel>Aplicaciones sugeridas</SectionLabel>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap:8 }}>
                  {applications.map(app => {
                    const checked = selectedSuggested.has(app.id);
                    return (
                      <button key={app.id} onClick={() => toggleSuggested(app.id)} style={{ textAlign:'left', padding:'9px 10px', borderRadius:10, border:`1px solid ${checked?'rgba(201,169,110,.45)':'var(--border-s)'}`, background:checked?'rgba(201,169,110,.10)':'var(--s1)', color:checked?'var(--gold)':'var(--text-m)', cursor:'pointer', fontFamily:'inherit', minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
                          <Sparkles size={13} strokeWidth={1.8} />
                          <span style={{ fontSize:11, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{app.name}</span>
                        </div>
                        <div style={{ fontSize:10, color:'var(--text-d)', marginTop:3 }}>{app.category} · ${Number(app.basePrice || 0).toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionLabel>Catálogo editable</SectionLabel>
                <div style={{ display:'grid', gap:7, maxHeight:260, overflow:'auto', paddingRight:4, minWidth:0 }}>
                  {applications.map(app => (
                    <div key={app.id} style={{ display:'grid', gridTemplateColumns:'minmax(min(100%,160px),1.1fr) minmax(min(100%,120px),.8fr) minmax(76px,.35fr) 34px', gap:7, alignItems:'center', minWidth:0 }}>
                      <input value={app.name} onChange={e => updateApplication(app.id, { name:e.target.value })} style={inputStyle} />
                      <input value={app.category} onChange={e => updateApplication(app.id, { category:e.target.value })} style={inputStyle} />
                      <input type="number" value={app.basePrice || 0} onChange={e => updateApplication(app.id, { basePrice:Number(e.target.value) || 0 })} style={inputStyle} />
                      <button onClick={() => removeApplication(app.id)} style={{ ...miniBtn, color:'var(--red)', borderColor:'rgba(224,96,96,.25)' }} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'minmax(min(100%,160px),1.1fr) minmax(min(100%,120px),.8fr) minmax(76px,.35fr) auto', gap:7, alignItems:'center', marginTop:9, minWidth:0 }}>
                  <input value={newApp.name} onChange={e => setNewApp(prev => ({ ...prev, name:e.target.value }))} placeholder="Nueva aplicación" style={inputStyle} />
                  <input value={newApp.category} onChange={e => setNewApp(prev => ({ ...prev, category:e.target.value }))} placeholder="Categoría" style={inputStyle} />
                  <input type="number" value={newApp.basePrice} onChange={e => setNewApp(prev => ({ ...prev, basePrice:e.target.value }))} style={inputStyle} />
                  <Button size="sm" variant="ghost" onClick={addApplication}><span style={buttonIcon}><Plus size={13} /> Agregar</span></Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.74)', zIndex:220, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e => e.target===e.currentTarget && setPreview(false)}>
          <div style={{ width:560, maxWidth:'94vw', background:'var(--s2)', border:'1px solid var(--border-m)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-s)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:14, fontWeight:700 }}>{active.nombre}</div><div style={{ fontSize:11, color:'var(--text-d)' }}>Así lo verá el cliente en su portal</div></div>
              <Button variant="ghost" size="sm" onClick={() => setPreview(false)}>Cerrar</Button>
            </div>
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10, maxHeight:'72vh', overflow:'auto' }}>
              {active.preguntas.filter(p=>p.active!==false).map((p, i) => (
                <div key={i} style={{ background:'var(--s1)', border:'1px solid var(--border-s)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Pregunta {i+1}</div>
                  <div style={{ fontSize:13, color:'var(--text)' }}>{p.text}</div>
                  <div style={{ marginTop:10, height:54, borderRadius:8, background:'var(--s3)', border:'1px dashed var(--border-m)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display:'grid', gap:6 }}>
      <div style={{ fontSize:10, color:'var(--text-d)', textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = { width:'100%', minWidth:0, background:'var(--s3)', border:'1px solid var(--border-s)', borderRadius:8, padding:'8px 10px', fontSize:12, color:'var(--text)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' };
const miniBtn = { width:32, minWidth:32, height:32, background:'transparent', border:'1px solid var(--border-s)', borderRadius:8, cursor:'pointer', color:'var(--text-d)', display:'inline-grid', placeItems:'center' };
const buttonIcon = { display:'inline-flex', alignItems:'center', gap:6 };
