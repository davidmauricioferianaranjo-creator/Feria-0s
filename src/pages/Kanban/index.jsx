import React, { useMemo, useRef, useState } from 'react';
import { FilePlus2, Link2, Paperclip, Send, Smile, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Card, SectionLabel, BrandPill } from '../../components/UI';
import { APPLICATION_CATALOG, PACKAGE_RULES, getPackageRule, applicationById } from '../../lib/packages';
import { downloadSimplePdf } from '../../lib/pdf';
import { normText } from '../../lib/operationalData';
import { supabase, isConfigured } from '../../lib/supabase';
import EmojiPicker from '../../features/mensajes/components/EmojiPicker';
import ChatMediaAttachment from '../../features/mensajes/components/ChatMediaAttachment';

const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 8, color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 };
const tabButtonStyle = active => ({ border: `1px solid ${active ? 'var(--gold)' : 'var(--border-s)'}`, background: active ? 'var(--gold-faint)' : 'transparent', color: active ? 'var(--gold)' : 'var(--text-m)', borderRadius: 999, padding: '8px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' });
const CHAT_BUCKET = 'mensajes-adjuntos';
const CHAT_MAX_MB = 20;
const CHAT_ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf',
]);

function validateChatFile(file) {
  if (!file) return 'Selecciona un archivo.';
  if (file.size > CHAT_MAX_MB * 1024 * 1024) return `El archivo supera ${CHAT_MAX_MB} MB.`;
  if (file.type && !CHAT_ALLOWED_TYPES.has(file.type)) return 'Usa imagen, PDF, video o audio.';
  return '';
}

async function uploadProjectChatFile(file, projectId) {
  if (!isConfigured) return URL.createObjectURL(file);
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeProject = String(projectId || 'equipo').replace(/[^a-z0-9_-]/gi, '-');
  const safeName = file.name.replace(/[^\w.-]/g, '-').slice(-80) || `archivo.${ext}`;
  const path = `project-chat/${safeProject}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function daysUntil(dateLike) { if (!dateLike) return null; const d = new Date(dateLike); if (Number.isNaN(d.getTime())) return null; return Math.ceil((d.getTime() - Date.now()) / 86400000); }
function formatDate(dateLike) { if (!dateLike) return 'Por definir'; const d = new Date(dateLike); if (Number.isNaN(d.getTime())) return String(dateLike); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
function getClientId(project = {}) { return project.clienteId || project.cliente_id; }
function getDesignerId(project = {}) { return project.creativo || project.creativo_id || project.designer_id; }
function memberMatchesUser(member, user) { if (!member || !user) return false; return normText(member.email || '') === normText(user.email || '') || String(member.id) === String(user.id); }
function isDesignerMember(member = {}) { const accessRole = normText(member.perms || member.role_id || member.access_role || ''); const visibleRole = normText(member.role || member.cargo || ''); return ['creativo', 'designer', 'disenador', 'diseñador'].includes(accessRole) || visibleRole.includes('disen') || visibleRole.includes('diseñ'); }
function designerLabel(member) { if (!member) return 'Sin diseñador asignado'; return `${member.name || member.nombre || member.email || 'Diseñador'}${member.role ? ` · ${member.role}` : ''}`; }
function projectStatus(project = {}, apps = []) { if (!getDesignerId(project)) return 'pendiente_asignacion'; if (String(project.production_status || '').trim()) return project.production_status; if (apps.some(a => a.status === 'revision')) return 'subido_revision'; if (apps.some(a => a.status === 'aprobada')) return 'aprobado_interno'; return 'asignado'; }
function statusLabel(status) { const labels = { brief_completado: 'Brief completado', pendiente_asignacion: 'Pendiente de asignar diseñador', asignado: 'Asignado', en_produccion: 'En producción', subido_revision: 'Subido para revisión', cambios_solicitados: 'Cambios solicitados', aprobado_interno: 'Aprobado internamente', presentado_cliente: 'Presentado al cliente', aprobado_cliente: 'Aprobado por cliente', pago_final_pendiente: 'Pago final pendiente', pago_final_confirmado: 'Pago final confirmado', brandkit_liberado: 'Brand Kit liberado', entregado: 'Entregado' }; return labels[status] || String(status || 'Sin estado').replaceAll('_', ' '); }
function statusColor(status) { if (!status || status === 'pendiente_asignacion') return 'warning'; if (String(status).includes('aprob')) return 'green'; if (String(status).includes('revision') || String(status).includes('cambios')) return 'purple'; if (String(status).includes('pago')) return 'blue'; if (String(status).includes('entregado') || String(status).includes('brandkit')) return 'teal'; return 'gold'; }

function InfoBox({ label, value, sub }) { return <div style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 12 }}><div style={labelStyle}>{label}</div><div style={{ fontSize: 13, fontWeight: 750 }}>{value || 'Por definir'}</div>{sub && <div style={{ fontSize: 9, color: 'var(--text-d)', marginTop: 4 }}>{sub}</div>}</div>; }

function QuickAssign({ project, data, updateProyecto, showToast, compact = false }) {
  const designers = (data.team || []).filter(isDesignerMember);
  const assignedId = String(getDesignerId(project) || '');
  const [selectedId, setSelectedId] = useState(assignedId);
  React.useEffect(() => { setSelectedId(assignedId); }, [project.id, assignedId]);
  const saveAssignment = async () => { await updateProyecto(project.id, { creativo: selectedId || null, production_status: selectedId ? 'asignado' : 'pendiente_asignacion', designer_assigned_at: selectedId ? new Date().toISOString() : null }); showToast(selectedId ? 'Diseñador asignado y notificado' : 'Proyecto sin diseñador asignado', selectedId ? '✓' : '⚠'); };
  return <div style={{ minWidth: compact ? 210 : 0, width: '100%', maxWidth: compact ? 260 : 'none' }}><div style={{ ...labelStyle, marginBottom: 5 }}>Diseñador</div><div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) auto', gap: 6 }}><select style={{ ...inputStyle, minWidth: 0, height: 38, padding: compact ? '8px 10px' : inputStyle.padding, fontSize: compact ? 11 : inputStyle.fontSize }} value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Sin asignar</option>{designers.map(d => <option key={d.id} value={d.id}>{designerLabel(d)}</option>)}</select><Button variant="ghost" size="sm" onClick={saveAssignment} style={{ width: compact ? '100%' : undefined, justifyContent: 'center', minHeight: 34 }}>Asignar</Button></div></div>;
}

function ProjectDashboard({ projects, data, isDesignerOnly, onOpen, updateProyecto, showToast }) {
  const projectApps = useMemo(() => data.projectApplications || [], [data.projectApplications]);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('feria-projects-view') || 'blocks');
  const setMode = mode => { setViewMode(mode); localStorage.setItem('feria-projects-view', mode); };
  const visibleStats = useMemo(() => {
    const active = projects.filter(p => !['entregado', 'completado'].includes(normText(p.production_status || p.estado || '')));
    const pending = projects.filter(p => !getDesignerId(p));
    const inProduction = projects.filter(p => ['asignado', 'en_produccion'].includes(normText(p.production_status || '')) || getDesignerId(p));
    const inReview = projects.filter(p => projectApps.some(a => String(a.proyecto_id) === String(p.id) && a.status === 'revision'));
    const approved = projects.filter(p => projectApps.some(a => String(a.proyecto_id) === String(p.id) && a.status === 'aprobada'));
    const delayed = projects.filter(p => { const days = daysUntil(p.fechaEntregaInterna || p.internal_due_date); return days !== null && days < 0 && !['entregado', 'brandkit_liberado'].includes(normText(p.production_status || '')); });
    return { active, pending, inProduction, inReview, approved, delayed };
  }, [projects, projectApps]);
  const cards = [
    { label: 'Proyectos activos', value: visibleStats.active.length, color: 'var(--gold)' },
    { label: 'Pendientes de asignar', value: visibleStats.pending.length, color: 'var(--warning)' },
    { label: 'En producción', value: visibleStats.inProduction.length, color: 'var(--blue)' },
    { label: 'En revisión', value: visibleStats.inReview.length, color: 'var(--purple)' },
    { label: 'Aprobados', value: visibleStats.approved.length, color: 'var(--green)' },
    { label: 'Retrasados', value: visibleStats.delayed.length, color: 'var(--red)' },
  ];
  const rows = projects.map(project => { const cliente = data.clientes.find(c => String(c.id) === String(getClientId(project))); const apps = projectApps.filter(a => String(a.proyecto_id) === String(project.id)); const status = projectStatus(project, apps); const internalDays = daysUntil(project.fechaEntregaInterna || project.internal_due_date); const clientDays = daysUntil(project.fechaEntregaCliente || project.client_due_date || project.fechaEntrega); return { project, cliente, apps, status, internalDays, clientDays }; });
  const ViewToggle = () => <div style={{ display: 'flex', gap: 6, background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 999, padding: 3 }}><button onClick={() => setMode('blocks')} style={{ ...tabButtonStyle(viewMode === 'blocks'), padding: '6px 10px' }}>Bloques</button><button onClick={() => setMode('list')} style={{ ...tabButtonStyle(viewMode === 'list'), padding: '6px 10px' }}>Lista</button></div>;
  return <div style={{ minWidth: 0 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10, marginBottom: 14 }}>{cards.map(card => <Card key={card.label} style={{ padding: 14 }}><div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 6 }}>{card.label}</div><div style={{ fontSize: 24, fontWeight: 750, color: card.color }}>{card.value}</div></Card>)}</div><Card style={{ padding: 0, overflow: 'hidden' }}><div style={{ padding: 14, borderBottom: '1px solid var(--border-s)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div style={{ minWidth: 0, flex: '1 1 260px' }}><div style={{ fontSize: 14, fontWeight: 750 }}>{isDesignerOnly ? 'Mis proyectos asignados' : 'Panel de control de proyectos'}</div><div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>{isDesignerOnly ? 'Solo ves tu fecha interna y tus entregables.' : 'Administra estado, diseñador, paquete, fechas y producción.'}</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><ViewToggle /><Badge color="gray">{projects.length} proyectos</Badge></div></div>{viewMode === 'blocks' ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 10, padding: 12 }}>{rows.map(({ project, cliente, apps, status, internalDays, clientDays }) => <div key={project.id} style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 14, padding: 14, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' }}><div style={{ minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}><strong style={{ fontSize: 13 }}>{cliente?.nombre || project.nombre}</strong><BrandPill brand={project.brand || cliente?.brand} /></div><div style={{ fontSize: 10, color: 'var(--text-d)' }}>{project.servicio || project.service_type || 'Servicio'} · {project.paquete || project.package_name || 'Paquete sin definir'}</div></div><Badge color={statusColor(status)}>{statusLabel(status)}</Badge></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8, marginBottom: 10 }}><InfoBox label="Fecha interna" value={formatDate(project.fechaEntregaInterna || project.internal_due_date)} sub={internalDays === null ? '' : String(internalDays) + ' días'} />{!isDesignerOnly && <InfoBox label="Fecha cliente" value={formatDate(project.fechaEntregaCliente || project.client_due_date || project.fechaEntrega)} sub={clientDays === null ? '' : String(clientDays) + ' días'} />}<InfoBox label="Entregables" value={String(apps.filter(a => !(a.is_extra && a.extra_status !== 'pagada')).length) + ' activos'} /></div>{!isDesignerOnly && <QuickAssign project={project} data={data} updateProyecto={updateProyecto} showToast={showToast} compact />}<div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}><Button variant="gold" size="sm" onClick={() => onOpen(project.id)}>Ver proyecto</Button></div></div>)}{!projects.length && <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-d)', fontSize: 12, gridColumn: '1/-1' }}>{isDesignerOnly ? 'No tienes proyectos asignados todavía.' : 'No hay proyectos creados. Cuando un cliente complete el brief, aparecerá aquí para asignar diseñador.'}</div>}</div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}><thead><tr>{['Proyecto','Paquete','Estado','Diseñador','Fecha interna', !isDesignerOnly ? 'Fecha cliente' : null, 'Entregables','Acción'].filter(Boolean).map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--text-d)', padding: '10px 12px', borderBottom: '1px solid var(--border-s)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{h}</th>)}</tr></thead><tbody>{rows.map(({ project, cliente, apps, status, internalDays, clientDays }) => <tr key={project.id}><td style={{ padding: 12, borderBottom: '1px solid var(--border-s)' }}><div style={{ fontSize: 12, fontWeight: 750 }}>{cliente?.nombre || project.nombre}</div><div style={{ fontSize: 9, color: 'var(--text-d)' }}>{project.servicio || project.service_type || 'Servicio'}</div></td><td style={{ padding: 12, borderBottom: '1px solid var(--border-s)', fontSize: 11 }}>{project.paquete || project.package_name || 'Sin paquete'}</td><td style={{ padding: 12, borderBottom: '1px solid var(--border-s)' }}><Badge color={statusColor(status)}>{statusLabel(status)}</Badge></td><td style={{ padding: 12, borderBottom: '1px solid var(--border-s)' }}>{!isDesignerOnly ? <QuickAssign project={project} data={data} updateProyecto={updateProyecto} showToast={showToast} compact /> : <span style={{ fontSize: 11, color: 'var(--text-d)' }}>Asignado a ti</span>}</td><td style={{ padding: 12, borderBottom: '1px solid var(--border-s)', fontSize: 11 }}>{formatDate(project.fechaEntregaInterna || project.internal_due_date)}<div style={{ fontSize: 9, color: 'var(--text-d)' }}>{internalDays === null ? '' : String(internalDays) + ' días'}</div></td>{!isDesignerOnly && <td style={{ padding: 12, borderBottom: '1px solid var(--border-s)', fontSize: 11 }}>{formatDate(project.fechaEntregaCliente || project.client_due_date || project.fechaEntrega)}<div style={{ fontSize: 9, color: 'var(--text-d)' }}>{clientDays === null ? '' : String(clientDays) + ' días'}</div></td>}<td style={{ padding: 12, borderBottom: '1px solid var(--border-s)', fontSize: 11 }}>{apps.filter(a => !(a.is_extra && a.extra_status !== 'pagada')).length} activos</td><td style={{ padding: 12, borderBottom: '1px solid var(--border-s)' }}><Button variant="gold" size="sm" onClick={() => onOpen(project.id)}>Abrir</Button></td></tr>)}{!projects.length && <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: 'var(--text-d)', fontSize: 12 }}>{isDesignerOnly ? 'No tienes proyectos asignados todavía.' : 'No hay proyectos creados.'}</td></tr>}</tbody></table></div>}</Card></div>;
}

function NewProjectModal({ data, onClose, addProyecto, showToast }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ clienteId: data.clientes[0]?.id || '', nombre: '', servicio: 'Branding', paquete: 'Paquete 2', creativo: '', fechaEntregaInterna: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), fechaEntregaCliente: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10), fechaInicio: today, brand: 'feria' });
  const rule = getPackageRule(form.paquete);
  const [selectedApps, setSelectedApps] = useState(() => APPLICATION_CATALOG.slice(0, rule.includedApplications).map(a => a.id));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleApp = id => setSelectedApps(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  React.useEffect(() => { const nextRule = getPackageRule(form.paquete); setSelectedApps(list => list.length ? list : APPLICATION_CATALOG.slice(0, nextRule.includedApplications).map(a => a.id)); }, [form.paquete]);
  const create = async () => { if (!form.clienteId) { showToast('Selecciona un cliente', '⚠'); return; } const cliente = data.clientes.find(c => String(c.id) === String(form.clienteId)); const apps = selectedApps.map((id, index) => { const app = applicationById(id); const isExtra = index >= rule.includedApplications; return { application_id: id, name: app.name, category: app.category, status: 'pendiente', is_extra: isExtra, extra_price: isExtra ? app.basePrice : 0, extra_status: isExtra ? 'pendiente_pago' : 'incluida', sort_order: index + 1 }; }); await addProyecto({ clienteId: form.clienteId, nombre: form.nombre || `${cliente?.nombre || 'Cliente'} · ${form.servicio}`, servicio: form.servicio, service_type: form.servicio, paquete: form.paquete, aplicacionesIncluidas: rule.includedApplications, aplicaciones: apps, creativo: form.creativo, fechaInicio: form.fechaInicio, fechaEntregaInterna: form.fechaEntregaInterna, fechaEntregaCliente: form.fechaEntregaCliente, diasEntrega: 45, diasEjecucion: 30, brand: form.brand, production_status: form.creativo ? 'asignado' : 'pendiente_asignacion', status: 'activo' }); showToast('Proyecto creado con paquete, fechas y checklist', '✓'); onClose(); };
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={e => e.target === e.currentTarget && onClose()}><Card style={{ width: 760, maxWidth: '94vw', maxHeight: '92vh', overflow: 'auto', padding: 24 }}><div style={{ fontSize: 20, fontWeight: 750, color: 'var(--gold)', marginBottom: 4 }}>Nuevo proyecto operativo</div><div style={{ fontSize: 11, color: 'var(--text-d)', marginBottom: 18 }}>Define cliente, paquete, fechas separadas y aplicaciones desde el inicio.</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}><div style={{ gridColumn: '1/-1' }}><div style={labelStyle}>Cliente</div><select style={inputStyle} value={form.clienteId} onChange={e => set('clienteId', e.target.value)}>{data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div><div style={labelStyle}>Servicio</div><input style={inputStyle} value={form.servicio} onChange={e => set('servicio', e.target.value)} /></div><div><div style={labelStyle}>Paquete</div><select style={inputStyle} value={form.paquete} onChange={e => set('paquete', e.target.value)}>{Object.keys(PACKAGE_RULES).map(p => <option key={p}>{p}</option>)}</select></div><div><div style={labelStyle}>Fecha interna diseñador</div><input style={inputStyle} type="date" value={form.fechaEntregaInterna} onChange={e => set('fechaEntregaInterna', e.target.value)} /></div><div><div style={labelStyle}>Fecha cliente administración</div><input style={inputStyle} type="date" value={form.fechaEntregaCliente} onChange={e => set('fechaEntregaCliente', e.target.value)} /></div><div><div style={labelStyle}>Responsable creativo</div><select style={inputStyle} value={form.creativo} onChange={e => set('creativo', e.target.value)}><option value="">Sin asignar todavía</option>{data.team.filter(isDesignerMember).map(t => <option key={t.id} value={t.id}>{designerLabel(t)}</option>)}</select></div><div><div style={labelStyle}>Marca</div><select style={inputStyle} value={form.brand} onChange={e => set('brand', e.target.value)}><option value="feria">Feria Design</option><option value="bl">Brand & Legacy</option></select></div><div style={{ gridColumn: '1/-1' }}><div style={labelStyle}>Nombre del proyecto</div><input style={inputStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Nodus Wellness Club · Branding" /></div></div><div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><SectionLabel style={{ marginBottom: 0 }}>Aplicaciones del paquete</SectionLabel><Badge color={selectedApps.length > rule.includedApplications ? 'warning' : 'teal'}>{selectedApps.length}/{rule.includedApplications} incluidas</Badge></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 8, marginTop: 10 }}>{APPLICATION_CATALOG.map(app => { const checked = selectedApps.includes(app.id); const order = selectedApps.indexOf(app.id); const extra = checked && order >= rule.includedApplications; return <button key={app.id} onClick={() => toggleApp(app.id)} style={{ textAlign: 'left', background: checked ? 'var(--gold-faint)' : 'var(--s3)', border: `1px solid ${checked ? 'var(--gold)' : 'var(--border-s)'}`, borderRadius: 10, padding: 10, color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}><div style={{ fontSize: 11, fontWeight: 650 }}>{checked ? '✓ ' : ''}{app.name}</div><div style={{ fontSize: 9, color: extra ? 'var(--gold)' : 'var(--text-d)', marginTop: 4 }}>{extra ? `Extra · $${app.basePrice}` : app.category}</div></button>; })}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, flexWrap: 'wrap' }}><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="gold" onClick={create}>Crear proyecto</Button></div></Card></div>;
}

function SummaryTab({ project, cliente, assignedDesigner, isDesignerOnly, data, updateProyecto, showToast }) { const apps = (data.projectApplications || []).filter(a => String(a.proyecto_id) === String(project.id)); const status = projectStatus(project, apps); return <div style={{ display: 'grid', gridTemplateColumns: isDesignerOnly ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 12, minWidth: 0 }}><Card style={{ padding: 16, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 18, fontWeight: 750 }}>{cliente?.nombre || project.nombre}</div><div style={{ fontSize: 11, color: 'var(--text-d)', marginTop: 3 }}>{project.servicio || project.service_type || 'Servicio'} · {project.paquete || project.package_name || 'Paquete sin definir'}</div></div><Badge color={statusColor(status)}>{statusLabel(status)}</Badge></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}><InfoBox label="Fecha interna" value={formatDate(project.fechaEntregaInterna || project.internal_due_date)} sub="Visible para diseñador" />{!isDesignerOnly && <InfoBox label="Fecha cliente" value={formatDate(project.fechaEntregaCliente || project.client_due_date || project.fechaEntrega)} sub="Promesa comercial" />}<InfoBox label="Diseñador" value={assignedDesigner?.name || 'Sin asignar'} sub={assignedDesigner?.role || 'Pendiente'} /><InfoBox label="Entregables" value={apps.filter(a => !(a.is_extra && a.extra_status !== 'pagada')).length} sub="Activos" /></div></Card>{!isDesignerOnly && <Card style={{ padding: 16, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 750, marginBottom: 10 }}>Asignar diseñador</div><QuickAssign project={project} data={data} updateProyecto={updateProyecto} showToast={showToast} /><div style={{ fontSize: 10, color: 'var(--text-d)', lineHeight: 1.6, marginTop: 10 }}>Cuando asignes diseñador, el proyecto aparecerá automáticamente en su vista con su fecha interna.</div></Card>}</div>; }

function MaterialTab({ project, cliente, data, addProjectApplication, updateProjectApplication, addCobro, isDesignerOnly, showToast }) {
  const responses = project.brief_responses || project.briefResponses || project.sentir_data || [];
  const rawApps = (data.projectApplications || []).filter(a => String(a.proyecto_id) === String(project.id));
  const apps = rawApps
    .filter(a => !isDesignerOnly || !(a.is_extra && a.extra_status !== 'pagada'))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const [extraId, setExtraId] = useState('presentacion_comercial');
  const rule = getPackageRule(project.paquete || project.package_name);
  const included = Number(project.aplicacionesIncluidas || project.package_app_limit || rule.includedApplications || 0);
  const packagePrice = Number(project.package_price || project.precioPaquete || rule.price || 0);
  const activeApps = apps.filter(a => !(a.is_extra && a.extra_status !== 'pagada'));
  const extraApps = apps.filter(a => a.is_extra);
  const completedApps = activeApps.filter(a => ['aprobada', 'entregada'].includes(String(a.status))).length;

  const downloadBrief = () => {
    const fileName = 'brief-' + (cliente?.nombre || project.nombre || 'proyecto').toLowerCase().replace(/\s+/g, '-') + '.pdf';
    downloadSimplePdf({
      filename: fileName,
      title: 'Brief de proyecto — ' + (cliente?.nombre || project.nombre || ''),
      subtitle: 'Feria Design Studio',
      lines: [
        'Proyecto: ' + (project.nombre || ''),
        'Servicio: ' + (project.servicio || project.service_type || ''),
        'Paquete: ' + (project.paquete || project.package_name || ''),
        '',
        ...(Array.isArray(responses) && responses.length
          ? responses.map((r, i) => ['Pregunta ' + (i + 1) + ': ' + (r.pregunta || r.question || r.text || ''), 'Respuesta: ' + (r.respuesta || r.answer || ''), '']).flat()
          : ['Brief todavía no disponible en este proyecto.'])
      ]
    });
  };

  const generateExtraCharge = async app => {
    if (!cliente) { showToast('No hay cliente vinculado para generar cobro', '⚠'); return; }
    const cobro = await addCobro({
      clienteId: cliente.id,
      cliente_id: cliente.id,
      nombre: 'Extra · ' + app.name,
      tipo: 'Aplicación extra',
      payment_stage: 'application_extra',
      monto: Number(app.extra_price || 0),
      status: 'pending',
      via: 'Stripe',
      proyecto_id: project.id,
      application_id: app.application_id,
    });
    await updateProjectApplication(app.id, { cobro_id: cobro?.id, payment_cobro_id: cobro?.id, extra_status: 'pendiente_pago' });
    showToast('Cobro extra creado. Se activará al pagarse.', '💳');
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Material del proyecto</div>
            <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>Todo lo necesario para producir: paquete, brief y checklist de entregables.</div>
          </div>
          <Button variant="gold" onClick={downloadBrief}>Descargar brief PDF</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
          <InfoBox label="Paquete" value={project.paquete || project.package_name || rule.label} sub={String(included) + ' aplicaciones incluidas'} />
          {!isDesignerOnly && <InfoBox label="Precio paquete" value={'$' + packagePrice.toLocaleString('en-US')} sub="Visible solo para administración" />}
          <InfoBox label="Entregables activos" value={String(activeApps.length)} sub={completedApps + ' aprobadas o entregadas'} />
          <InfoBox label="Extras" value={String(extraApps.filter(a => a.extra_status === 'pagada').length) + ' aprobadas'} sub={isDesignerOnly ? 'Solo extras activas' : String(extraApps.filter(a => a.extra_status !== 'pagada').length) + ' pendientes'} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 12, alignItems: 'start' }}>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Checklist de aplicaciones</div>
              <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>Vista de producción. El diseñador no ve precios.</div>
            </div>
            <Badge color="teal">{activeApps.length} activas</Badge>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {apps.length ? apps.map((app, idx) => {
              const blocked = app.is_extra && app.extra_status !== 'pagada';
              const done = ['aprobada', 'entregada'].includes(String(app.status));
              return (
                <div key={app.id} style={{ background: blocked ? 'rgba(251,191,36,.06)' : done ? 'rgba(123,198,122,.07)' : 'var(--s3)', border: '1px solid ' + (blocked ? 'rgba(251,191,36,.2)' : done ? 'rgba(123,198,122,.2)' : 'var(--border-s)'), borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s' }}>
                  <button
                    onClick={() => !blocked && updateProjectApplication(app.id, { status: done ? 'en_proceso' : 'aprobada' })}
                    disabled={blocked}
                    title={blocked ? 'Pago pendiente' : done ? 'Desmarcar' : 'Marcar como completada'}
                    style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: blocked ? 'default' : 'pointer', border: `2px solid ${blocked ? 'var(--warning)' : done ? 'var(--green)' : 'var(--border-m)'}`, background: done ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                    {done && <span style={{ color: '#000', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    {blocked && <span style={{ color: 'var(--warning)', fontSize: 10 }}>$</span>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: done ? 'var(--text-d)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{app.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 1 }}>{app.category} · {app.is_extra ? (isDesignerOnly ? 'Extra' : `Extra · $${Number(app.extra_price||0).toLocaleString()}`) : 'Incluida'}</div>
                  </div>
                  <Badge color={blocked ? 'warning' : done ? 'green' : app.status === 'revision' ? 'purple' : app.status === 'en_proceso' ? 'blue' : 'gray'}>
                    {blocked ? '$ pendiente' : done ? 'Listo ✓' : app.status === 'revision' ? 'En revisión' : app.status === 'en_proceso' ? 'En proceso' : 'Pendiente'}
                  </Badge>
                  {!isDesignerOnly && app.is_extra && app.extra_status !== 'pagada' && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <Button size="sm" variant="ghost" onClick={() => generateExtraCharge(app)}>Cobrar</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateProjectApplication(app.id, { extra_status: 'pagada', paid_at: new Date().toISOString() })}>✓ Pagada</Button>
                    </div>
                  )}
                </div>
              );
            }) : <div style={{ fontSize: 11, color: 'var(--text-d)', background: 'var(--s3)', borderRadius: 12, padding: 18, textAlign: 'center' }}>Sin aplicaciones cargadas todavía.</div>}
          </div>
          {!isDesignerOnly && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={extraId} onChange={e => setExtraId(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }}>
                {APPLICATION_CATALOG.map(a => <option key={a.id} value={a.id}>{a.name + ' · $' + a.basePrice}</option>)}
              </select>
              <Button variant="ghost" onClick={() => addProjectApplication({ proyectoId: project.id, applicationId: extraId, isExtra: true, selectedBy: 'admin' })}>+ Agregar extra pendiente</Button>
            </div>
          )}
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Brief del proyecto</div>
              <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>Respuestas del cliente distribuidas para lectura rápida.</div>
            </div>
            <Badge color="gray">{Array.isArray(responses) ? responses.length : 0} respuestas</Badge>
          </div>
          {Array.isArray(responses) && responses.length ? (
            <div style={{ display: 'grid', gap: 10, maxHeight: 640, overflow: 'auto', paddingRight: 4 }}>
              {responses.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <div style={{ fontSize: 9, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Pregunta {idx + 1}</div>
                    <div style={{ height: 1, flex: 1, background: 'var(--border-s)' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 750, lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: 8 }}>{item.pregunta || item.question || item.text}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-m)', lineHeight: 1.7, whiteSpace: 'pre-line', background: 'var(--s2)', borderRadius: 10, padding: 10 }}>{item.respuesta || item.answer || 'Sin respuesta'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 26, background: 'var(--s3)', borderRadius: 12, color: 'var(--text-d)', fontSize: 12, textAlign: 'center' }}>El proyecto existe, pero aún no tiene respuestas de brief vinculadas.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AdvancesTab({ project, data, addProjectUpdate, reviewProjectUpdate, addProjectUpdateComment, isReviewer, showToast }) { const apps = (data.projectApplications || []).filter(a => String(a.proyecto_id) === String(project.id) && !(a.is_extra && a.extra_status !== 'pagada')); const updates = (data.projectUpdates || []).filter(u => String(u.proyecto_id || u.proyectoId) === String(project.id)); const comments = data.projectUpdateComments || []; const reviewers = data.team.filter(t => ['admin', 'crm'].includes(normText(t.perms || t.role_id || t.role))); const [form, setForm] = useState({ titulo: '', descripcion: '', archivo_url: '', reviewer_id: '', version_label: 'V1', file_type: 'pdf', application_id: '' }); const [feedback, setFeedback] = useState({}); const [comment, setComment] = useState({}); const submit = async () => { if (!form.descripcion.trim() && !form.archivo_url.trim()) { showToast('Sube un avance o escribe una descripción', '⚠'); return; } await addProjectUpdate({ proyectoId: project.id, ...form, titulo: form.titulo || 'Avance de diseño' }); setForm({ titulo: '', descripcion: '', archivo_url: '', reviewer_id: '', version_label: 'V1', file_type: 'pdf', application_id: '' }); showToast('Avance enviado a revisión', '↑'); }; return <Card style={{ padding: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}><div><div style={{ fontSize: 15, fontWeight: 750 }}>Avances y revisión</div><div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>Carga propuestas, PDF, links de Figma/Drive y feedback organizado.</div></div><Badge color="gray">{updates.length} registros</Badge></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 8, marginBottom: 14 }}><input style={inputStyle} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título del avance" /><input style={inputStyle} value={form.version_label} onChange={e => setForm(f => ({ ...f, version_label: e.target.value }))} placeholder="V1" /><select style={inputStyle} value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))}><option value="pdf">PDF</option><option value="figma">Figma</option><option value="drive">Drive</option><option value="image">Imagen</option><option value="zip">ZIP</option></select><select style={inputStyle} value={form.application_id} onChange={e => setForm(f => ({ ...f, application_id: e.target.value }))}><option value="">Aplicación relacionada</option>{apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select style={inputStyle} value={form.reviewer_id} onChange={e => setForm(f => ({ ...f, reviewer_id: e.target.value }))}><option value="">Revisor/a</option>{reviewers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select><input style={inputStyle} value={form.archivo_url} onChange={e => setForm(f => ({ ...f, archivo_url: e.target.value }))} placeholder="Link PDF / Figma / Drive" /><textarea style={{ ...inputStyle, gridColumn: '1/-1', resize: 'vertical' }} rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Qué subes, qué falta, qué necesitas que revisen." /><Button variant="gold" onClick={submit} style={{ gridColumn: '1/-1' }}>Enviar avance</Button></div><div style={{ display: 'grid', gap: 8 }}>{updates.map(u => { const uComments = comments.filter(c => String(c.update_id) === String(u.id)); return <div key={u.id} style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><div><div style={{ fontSize: 12, fontWeight: 750 }}>{u.titulo}</div><div style={{ fontSize: 9, color: 'var(--text-d)' }}>{u.version_label || 'V'} · {u.file_type || 'archivo'}</div></div><Badge color={String(u.status).includes('aprob') ? 'green' : String(u.status).includes('feedback') ? 'teal' : 'warning'}>{u.status || 'pendiente_revision'}</Badge></div><div style={{ fontSize: 11, color: 'var(--text-m)', lineHeight: 1.55, marginTop: 6 }}>{u.descripcion}</div>{u.archivo_url && <a href={u.archivo_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', color: 'var(--gold)', fontSize: 10, marginTop: 6 }}>Abrir archivo</a>}{u.organized_feedback && <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--s2)', borderRadius: 8, padding: 10, fontSize: 11, color: 'var(--text-m)' }}>{u.organized_feedback}</pre>}{uComments.map(c => <div key={c.id} style={{ background: 'var(--s2)', borderRadius: 8, padding: 9, fontSize: 11, marginTop: 6 }}><strong>{c.page_ref || 'General'}:</strong> {c.body}</div>)}{isReviewer && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 6, marginTop: 8 }}><input style={inputStyle} placeholder="Página 3" value={comment[u.id]?.pageRef || ''} onChange={e => setComment(o => ({ ...o, [u.id]: { ...(o[u.id] || {}), pageRef: e.target.value } }))} /><input style={inputStyle} placeholder="Comentario por página/sección" value={comment[u.id]?.body || ''} onChange={e => setComment(o => ({ ...o, [u.id]: { ...(o[u.id] || {}), body: e.target.value } }))} /><Button size="sm" variant="ghost" onClick={() => { const c = comment[u.id]; if (c?.body) addProjectUpdateComment({ updateId: u.id, proyectoId: project.id, pageRef: c.pageRef, body: c.body }); }}>Comentar</Button><Button size="sm" variant="ghost" onClick={() => reviewProjectUpdate(u.id, feedback[u.id] || '', 'aprobado')}>Aprobar</Button><textarea style={{ ...inputStyle, gridColumn: '1/-1' }} rows={2} placeholder="Feedback general. Puedes pegar una transcripción o nota de audio y quedará ordenada." value={feedback[u.id] || ''} onChange={e => setFeedback(f => ({ ...f, [u.id]: e.target.value }))} /><Button size="sm" variant="gold" style={{ gridColumn: '1/-1' }} onClick={() => reviewProjectUpdate(u.id, feedback[u.id] || '', 'feedback_enviado')}>Enviar feedback ordenado</Button></div>}</div>; })}{!updates.length && <div style={{ fontSize: 11, color: 'var(--text-d)', background: 'var(--s3)', borderRadius: 12, padding: 18, textAlign: 'center' }}>Todavía no hay avances para revisar.</div>}</div></Card>; }

// eslint-disable-next-line no-unused-vars
function ChatTab({ project, data, addProjectChatMessage, user, scope = 'project' }) { const isTeam = scope === 'team'; const messages = (data.projectChatMessages || []).filter(m => isTeam ? m.source === 'team' : String(m.proyecto_id) === String(project.id) && m.source !== 'team'); const [text, setText] = useState(''); const [attachment, setAttachment] = useState(''); const send = async () => { if (!text.trim() && !attachment.trim()) return; await addProjectChatMessage({ proyectoId: isTeam ? null : project.id, message: text, attachmentUrl: attachment, senderName: user?.name || user?.email || 'Equipo', senderId: user?.id, source: isTeam ? 'team' : 'project', etiqueta: isTeam ? 'equipo' : 'interno' }); setText(''); setAttachment(''); }; return <Card style={{ padding: 16 }}><div style={{ fontSize: 15, fontWeight: 750, marginBottom: 4 }}>{isTeam ? 'Chat de equipo' : 'Chat interno del proyecto'}</div><div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 12 }}>{isTeam ? 'Comunicación general del estudio.' : 'Conversación contextual de este proyecto. Usa @Nombre para menciones.'}</div><div style={{ maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>{messages.map(m => <div key={m.id} style={{ background: 'var(--s3)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 3 }}>{m.sender_name || 'Equipo'}</div><div style={{ fontSize: 12, color: 'var(--text-m)', lineHeight: 1.45 }}>{m.message}</div>{m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--teal)' }}>Abrir adjunto</a>}</div>)}{!messages.length && <div style={{ fontSize: 11, color: 'var(--text-d)', background: 'var(--s3)', borderRadius: 12, padding: 18, textAlign: 'center' }}>Sin mensajes todavía.</div>}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 8 }}><input style={inputStyle} value={text} onChange={e => setText(e.target.value)} placeholder={isTeam ? 'Mensaje al equipo' : 'Mensaje interno. Ej: @Ana revisa la página 4'} /><input style={inputStyle} value={attachment} onChange={e => setAttachment(e.target.value)} placeholder="Link opcional" /><Button variant="gold" onClick={send}>Enviar</Button></div></Card>; }

function parseActivityDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function messageMatchesMember(message = {}, member = {}) {
  if (!member) return false;
  const memberName = normText(member.name || member.nombre || '');
  const memberEmail = normText(member.email || '');
  return String(message.sender_id || '') === String(member.id || '')
    || (memberEmail && normText(message.sender_email || '') === memberEmail)
    || (memberName && normText(message.sender_name || '') === memberName);
}

function latestActivityForMember(member, messages = []) {
  const memberDates = messages
    .filter(message => messageMatchesMember(message, member))
    .map(message => parseActivityDate(message.created_at || message.updated_at))
    .filter(Boolean);
  const profileDate = parseActivityDate(member.last_seen_at || member.last_seen || member.online_at || member.updated_at);
  if (profileDate) memberDates.push(profileDate);
  return memberDates.sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function presenceForMember(member, user, messages = []) {
  const currentUser = memberMatchesUser(member, user);
  const rawPresence = normText(member?.presence || member?.status || member?.online_status || '');
  const explicitOnline = Boolean(member?.online || member?.is_online || member?.connected || ['online', 'connected', 'en linea', 'activo'].includes(rawPresence));
  const lastActivity = latestActivityForMember(member, messages);
  const minutes = lastActivity ? Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / 60000)) : null;
  if (currentUser || explicitOnline) return { state: 'online', label: 'En linea', color: 'var(--green)', bg: 'rgba(123,198,122,.12)', order: 0 };
  if (minutes !== null && minutes <= 15) return { state: 'recent', label: minutes <= 1 ? 'Activo ahora' : `Activo hace ${minutes} min`, color: 'var(--blue)', bg: 'rgba(91,155,213,.12)', order: 1 };
  if (minutes !== null && minutes <= 90) return { state: 'recent', label: `Activo hace ${minutes} min`, color: 'var(--gold)', bg: 'rgba(201,169,110,.12)', order: 2 };
  return { state: 'away', label: 'Sin senal reciente', color: 'var(--text-d)', bg: 'var(--s3)', order: 3 };
}

function findMemberForMessage(members = [], message = {}) {
  return members.find(member => messageMatchesMember(message, member)) || null;
}

function PresenceDot({ status, size = 8 }) {
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: status.color,
      boxShadow: status.state === 'online' ? `0 0 0 4px ${status.bg}` : 'none',
      display: 'inline-block',
      flexShrink: 0,
    }} />
  );
}

function TeamPresenceBar({ members = [], user, messages = [] }) {
  const rows = (members || [])
    .map(member => ({ member, status: presenceForMember(member, user, messages) }))
    .sort((a, b) => a.status.order - b.status.order || String(a.member.name || '').localeCompare(String(b.member.name || '')));
  if (!rows.length) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(123,198,122,.07), rgba(91,155,213,.06))', border: '1px solid rgba(123,198,122,.16)', borderRadius: 12, padding: 10, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <div style={{ fontSize: 10, color: 'var(--text-d)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 750 }}>Presencia del equipo</div>
        <Badge color="green">{rows.filter(row => row.status.state === 'online').length} en linea</Badge>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {rows.map(({ member, status }, index) => (
          <div key={`${member.id || member.email || member.name || 'member'}-${index}`} title={`${member.name || member.email}: ${status.label}`} style={{ minWidth: 150, background: 'rgba(255,255,255,.025)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: member.bg || 'var(--s3)', color: member.color || 'var(--text)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 850, flexShrink: 0 }}>{member.initials || String(member.name || member.email || 'E').slice(0, 2).toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 750, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name || member.nombre || member.email || 'Equipo'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, color: status.color, fontSize: 9.5, whiteSpace: 'nowrap' }}><PresenceDot status={status} size={7} />{status.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatTabWithPresence({ project, data, addProjectChatMessage, user, scope = 'project' }) {
  const isTeam = scope === 'team';
  const allMessages = data.projectChatMessages || [];
  const messages = allMessages.filter(m => isTeam ? m.source === 'team' : String(m.proyecto_id) === String(project.id) && m.source !== 'team');
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const fileInputRef = useRef(null);
  const onlineCount = (data.team || []).filter(member => presenceForMember(member, user, allMessages).state === 'online').length;

  const pickFile = (nextFile) => {
    const error = validateChatFile(nextFile);
    if (error) return false;
    setFile(nextFile);
    setLink('');
    return true;
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const nextFile = e.dataTransfer.files?.[0];
    if (nextFile) pickFile(nextFile);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  };

  const send = async () => {
    if (!text.trim() && !link.trim() && !file) return;
    let attachmentUrl = link.trim();
    let attachmentName = link.trim() ? link.trim().split('/').pop() || 'Link adjunto' : '';
    let attachmentSize = 0;
    if (file) {
      setUploading(true);
      try {
        attachmentUrl = await uploadProjectChatFile(file, isTeam ? 'equipo' : project.id);
        attachmentName = file.name;
        attachmentSize = file.size;
      } catch (e) {
        attachmentUrl = URL.createObjectURL(file);
        attachmentName = file.name;
        attachmentSize = file.size;
      }
      setUploading(false);
    }
    await addProjectChatMessage({
      proyectoId: isTeam ? null : project.id,
      message: text,
      attachmentUrl,
      senderName: user?.name || user?.email || 'Equipo',
      senderId: user?.id,
      source: isTeam ? 'team' : 'project',
      etiqueta: isTeam ? 'equipo' : 'interno',
      attachmentName,
      attachmentSize,
    });
    setText('');
    setLink('');
    setFile(null);
    setShowLink(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ padding: 16, position:'relative', overflow:'hidden' }}>
      {dragging && (
        <div style={{ position:'absolute', inset:8, zIndex:5, border:'1px dashed var(--gold)', borderRadius:14, background:'rgba(201,169,110,.10)', display:'grid', placeItems:'center', color:'var(--gold)', fontSize:12, fontWeight:900, pointerEvents:'none' }}>
          Suelta el archivo en el chat del proyecto
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 4 }}>{isTeam ? 'Chat de equipo' : 'Chat interno del proyecto'}</div>
          <div style={{ fontSize: 10, color: 'var(--text-d)' }}>{isTeam ? 'Comunicacion general del estudio con presencia en vivo.' : 'Conversacion contextual, archivos y decisiones del proyecto.'}</div>
        </div>
        <Badge color={onlineCount ? 'green' : 'gray'}>{onlineCount} conectados</Badge>
      </div>

      <TeamPresenceBar members={data.team || []} user={user} messages={allMessages} />

      <div style={{ minHeight: 260, maxHeight: 440, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 12, paddingRight: 2 }}>
        {messages.map(m => {
          const member = findMemberForMessage(data.team || [], m);
          const status = member ? presenceForMember(member, user, allMessages) : null;
          return (
            <div key={m.id} style={{ background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 11, maxWidth:'min(720px, 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, color: status?.color || 'var(--gold)', fontSize: 10, fontWeight: 750 }}>
                  {status && <PresenceDot status={status} size={7} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sender_name || 'Equipo'}</span>
                </div>
                {status && <span style={{ color: 'var(--text-d)', fontSize: 9 }}>{status.label}</span>}
              </div>
              {m.message && <div style={{ fontSize: 12, color: 'var(--text-m)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.message}</div>}
              {(m.attachment_url || m.attachment_name) && (
                <ChatMediaAttachment
                  url={m.attachment_url}
                  name={m.attachment_name || m.media_name}
                  mime={m.mime_type || m.attachment_mime || ''}
                  compact
                  colors={{ bg:'rgba(255,255,255,.03)' }}
                />
              )}
            </div>
          );
        })}
        {!messages.length && <div style={{ fontSize: 11, color: 'var(--text-d)', background: 'var(--s3)', borderRadius: 12, padding: 18, textAlign: 'center' }}>Sin mensajes todavia.</div>}
      </div>

      {file && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:8, background:'var(--s2)', border:'1px solid var(--border-s)', borderRadius:10, padding:'8px 10px', fontSize:11, color:'var(--text-m)' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:7, minWidth:0 }}>
            <FilePlus2 size={14} strokeWidth={1.8} color="var(--gold)" />
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</span>
          </span>
          <button onClick={clearFile} style={{ border:'none', background:'transparent', color:'var(--text-d)', cursor:'pointer', padding:3 }} aria-label="Quitar archivo"><X size={14} /></button>
        </div>
      )}

      {showLink && (
        <input style={{ ...inputStyle, marginBottom:8 }} value={link} onChange={e => { setLink(e.target.value); if (e.target.value.trim()) setFile(null); }} placeholder="Pega un link de Drive, Figma, PDF o video" />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto auto auto', gap: 8, alignItems:'center' }}>
        <input
          style={inputStyle}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={isTeam ? 'Mensaje al equipo...' : 'Mensaje del proyecto... usa @ para mencionar'}
        />
        <button onClick={() => setEmojiOpen(v => !v)} style={{ ...tabButtonStyle(false), width:38, height:38, padding:0, display:'grid', placeItems:'center', position:'relative' }} aria-label="Agregar emoji">
          <Smile size={16} />
          <EmojiPicker open={emojiOpen} onPick={(emoji) => { setText(v => `${v}${emoji}`); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />
        </button>
        <button onClick={() => setShowLink(v => !v)} style={{ ...tabButtonStyle(showLink), width:38, height:38, padding:0, display:'grid', placeItems:'center' }} aria-label="Agregar link"><Link2 size={16} /></button>
        <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*,.pdf" style={{ display:'none' }} onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ ...tabButtonStyle(false), width:38, height:38, padding:0, display:'grid', placeItems:'center' }} aria-label="Adjuntar archivo"><Paperclip size={16} /></button>
        <Button variant="gold" onClick={send} disabled={uploading || (!text.trim() && !link.trim() && !file)}>{uploading ? 'Subiendo...' : <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><Send size={14} />Enviar</span>}</Button>
      </div>
    </Card>
  );
}

function TeamChatDashboard({ data, addProjectChatMessage, user, onOpenProject }) {
  const projectThreads = (data.proyectos || []).map(project => {
    const cliente = data.clientes.find(c => String(c.id) === String(getClientId(project)));
    const messages = (data.projectChatMessages || []).filter(m => String(m.proyecto_id) === String(project.id) && m.source !== 'team');
    const last = messages[messages.length - 1];
    return { project, cliente, messages, last };
  }).filter(thread => thread.messages.length).sort((a, b) => new Date(b.last?.created_at || 0) - new Date(a.last?.created_at || 0));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 12, alignItems: 'start' }}>
      <ChatTabWithPresence project={{ id: 'team' }} data={data} addProjectChatMessage={addProjectChatMessage} user={user} scope="team" />
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 750 }}>Chats por proyecto</div>
            <div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 3 }}>Atajos a conversaciones internas vinculadas a cada entrega.</div>
          </div>
          <Badge color="gray">{projectThreads.length} activos</Badge>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {projectThreads.map(({ project, cliente, messages, last }) => (
            <button key={project.id} onClick={() => onOpenProject(project.id)} style={{ textAlign: 'left', background: 'var(--s3)', border: '1px solid var(--border-s)', borderRadius: 12, padding: 12, color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 750 }}>{cliente?.nombre || project.nombre}</div>
                <Badge color="blue">{messages.length}</Badge>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-d)', marginBottom: 6 }}>{project.servicio || project.service_type || 'Servicio'} · {project.paquete || project.package_name || 'Paquete'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-m)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{last?.message || 'Sin mensajes recientes'}</div>
            </button>
          ))}
          {!projectThreads.length && <div style={{ fontSize: 11, color: 'var(--text-d)', background: 'var(--s3)', borderRadius: 12, padding: 18, textAlign: 'center' }}>Todavía no hay conversaciones por proyecto.</div>}
        </div>
      </Card>
    </div>
  );
}

export default function Kanban() {
  const { data, addProyecto, updateProyecto, showToast, addProjectUpdate, reviewProjectUpdate, addProjectUpdateComment, addProjectApplication, updateProjectApplication, addProjectChatMessage, addCobro } = useApp();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [workspaceView, setWorkspaceView] = useState('projects');
  const role = normText(user?.perms || user?.role || '');
  const isDesignerOnly = ['creativo', 'designer', 'disenador', 'diseñador'].includes(role);
  const currentMember = useMemo(() => data.team.find(m => memberMatchesUser(m, user)), [data.team, user]);
  const visibleProjects = useMemo(() => { if (!isDesignerOnly) return data.proyectos || []; return currentMember ? (data.proyectos || []).filter(p => String(getDesignerId(p)) === String(currentMember.id)) : []; }, [data.proyectos, isDesignerOnly, currentMember]);
  const project = visibleProjects.find(p => String(p.id) === String(activeId)) || null;
  const cliente = project ? data.clientes.find(c => String(c.id) === String(getClientId(project))) : null;
  const assignedDesigner = project ? data.team.find(m => String(m.id) === String(getDesignerId(project))) : null;
  const isReviewer = ['admin', 'crm'].includes(role);
  const tabs = [{ id: 'resumen', label: 'Resumen' }, { id: 'material', label: 'Material del proyecto' }, { id: 'avances', label: 'Avances y revisión' }, { id: 'chat', label: 'Chat del proyecto' }];
  const openProject = id => { setActiveId(id); setActiveTab('resumen'); setWorkspaceView('projects'); };
  return <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--s1)', borderBottom: '1px solid var(--border-s)', gap: 12, flexWrap: 'wrap' }}><div style={{ minWidth: 0, flex: '1 1 280px' }}><div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>Producción <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>· Proyectos</span></div><div style={{ fontSize: 10, color: 'var(--text-d)', marginTop: 2 }}>{isDesignerOnly ? 'Vista diseñador: solo proyectos asignados, entregables y fecha interna.' : 'Dashboard, asignación, brief, entregables, avances y comunicación del estudio.'}</div></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{project && <Button variant="ghost" onClick={() => setActiveId(null)}>← Dashboard</Button>}{!project && <Button variant="ghost" onClick={() => setWorkspaceView(workspaceView === 'team_chat' ? 'projects' : 'team_chat')}>{workspaceView === 'team_chat' ? 'Ver proyectos' : 'Chat equipo'}</Button>}{!isDesignerOnly && <Button variant="gold" onClick={() => setShowModal(true)}>+ Nuevo proyecto</Button>}</div></div><div style={{ flex: 1, overflow: 'auto', padding: 'clamp(12px, 2vw, 20px)', minWidth: 0 }}>{!project ? (workspaceView === 'team_chat' ? <TeamChatDashboard data={data} addProjectChatMessage={addProjectChatMessage} user={user} onOpenProject={openProject} /> : <ProjectDashboard projects={visibleProjects} data={data} isDesignerOnly={isDesignerOnly} onOpen={openProject} updateProyecto={updateProyecto} showToast={showToast} />) : <><Card style={{ marginBottom: 12, padding: 14, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div style={{ minWidth: 0 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}><span style={{ fontSize: 18, fontWeight: 750 }}>{cliente?.nombre || project.nombre}</span><BrandPill brand={project.brand || cliente?.brand} /></div><div style={{ fontSize: 11, color: 'var(--text-d)' }}>{project.servicio || project.service_type || 'Servicio'} · {project.paquete || project.package_name || 'Paquete sin definir'} · Diseñador: {assignedDesigner?.name || 'sin asignar'}</div></div><Badge color={statusColor(projectStatus(project, data.projectApplications || []))}>{statusLabel(projectStatus(project, data.projectApplications || []))}</Badge></div></Card><div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabButtonStyle(activeTab === tab.id)}>{tab.label}</button>)}</div>{activeTab === 'resumen' && <SummaryTab project={project} cliente={cliente} assignedDesigner={assignedDesigner} isDesignerOnly={isDesignerOnly} data={data} updateProyecto={updateProyecto} showToast={showToast} />}{activeTab === 'material' && <MaterialTab project={project} cliente={cliente} data={data} addProjectApplication={addProjectApplication} updateProjectApplication={updateProjectApplication} addCobro={addCobro} isDesignerOnly={isDesignerOnly} showToast={showToast} />}{activeTab === 'avances' && <AdvancesTab project={project} data={data} addProjectUpdate={addProjectUpdate} reviewProjectUpdate={reviewProjectUpdate} addProjectUpdateComment={addProjectUpdateComment} isReviewer={isReviewer} showToast={showToast} />}{activeTab === 'chat' && <ChatTabWithPresence project={project} data={data} addProjectChatMessage={addProjectChatMessage} user={user} scope="project" />}</>}</div>{showModal && <NewProjectModal data={data} addProyecto={addProyecto} showToast={showToast} onClose={() => setShowModal(false)} />}</div>;
}
