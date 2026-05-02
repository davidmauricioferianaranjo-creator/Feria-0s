import { useState, useCallback, useEffect } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';
import { useApp } from '../../../context/AppContext';
import { DEMO_CONVERSATIONS } from '../../../lib/operationalData';

const USE_SEED = process.env.REACT_APP_USE_SEED === 'true';

const ETIQUETAS_DEFAULT = [
  { id: 'nuevo',      nombre: 'Nuevo',       color: '#5B9BD5', count: 0 },
  { id: 'caliente',   nombre: 'Caliente',    color: '#E8836A', count: 0 },
  { id: 'propuesta',  nombre: 'Propuesta',   color: '#C9A96E', count: 0 },
  { id: 'cliente',    nombre: 'Cliente',     color: '#7BC67A', count: 0 },
  { id: 'portal_cliente', nombre: 'Portal cliente', color: '#D4537E', count: 0 },
  { id: 'inactivo',   nombre: 'Inactivo',    color: '#888',    count: 0 },
  { id: 'spam',       nombre: 'Spam',        color: '#777',    count: 0 },
];
const ETIQUETAS_STORAGE_KEY = 'feria_mensajes_custom_tags_v1';

function slugTag(value = '') {
  return String(value || 'etiqueta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28) || `tag_${Date.now()}`;
}

function storedCustomTags() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ETIQUETAS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(t => t?.id && t?.nombre) : [];
  } catch (_) {
    return [];
  }
}

function initialTags() {
  const defaults = new Set(ETIQUETAS_DEFAULT.map(t => t.id));
  return [
    ...ETIQUETAS_DEFAULT,
    ...storedCustomTags().filter(t => !defaults.has(t.id)).map(t => ({ ...t, count: 0 })),
  ];
}

export function useMensajesConversations() {
  const { demoMode, data } = useApp();
  const [convs, setConvs]             = useState([]);
  const [etiquetas, setEtiquetas]     = useState(initialTags);
  const [activeConv, setActiveConv]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const portalConversations = useCallback(() => {
    const portalRows = (data.projectChatMessages || []).filter(m => m.source === 'portal_cliente' || m.etiqueta === 'cliente_portal' || m.cliente_id);
    const grouped = new Map();
    portalRows.forEach(m => {
      const key = m.cliente_id || m.proyecto_id || 'portal_cliente';
      const cliente = (data.clientes || []).find(c => String(c.id) === String(m.cliente_id));
      const nombre = cliente?.nombre || m.sender_name || 'Cliente portal';
      const prev = grouped.get(key);
      const date = new Date(m.created_at || Date.now());
      const row = {
        id: 'portal_' + key,
        conv_id: 'portal_' + key,
        portalKey: key,
        nombre,
        canal: 'portal',
        brand: cliente?.brand || 'feria',
        accountName: 'Portal cliente',
        etiqueta: 'portal_cliente',
        ultimoMsg: m.message || m.texto || '',
        hora: date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        noLeidos: (prev?.noLeidos || 0) + 1,
        telefono: cliente?.email || m.sender_email || '',
        avatar: nombre.slice(0, 2).toUpperCase(),
        color: '#D4537E',
      };
      grouped.set(key, row);
    });
    return Array.from(grouped.values());
  }, [data.projectChatMessages, data.clientes]);


  // ── Cargar conversaciones desde DB ───────────────────────────
  const loadConvs = useCallback(async () => {
    if (demoMode) {
      const withPortal = [...portalConversations(), ...DEMO_CONVERSATIONS];
      setConvs(withPortal);
      setEtiquetas(prev => prev.map(e => ({ ...e, count: withPortal.filter(c => c.etiqueta === e.id).length })));
      setLoading(false);
      return;
    }
    if (!isConfigured || USE_SEED) { const portal = portalConversations(); setConvs(portal); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .select('*')
        .order('ultimo_mensaje_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(c => ({
        id:         c.conv_id,
        conv_id:    c.conv_id,
        nombre:     c.nombre || c.telefono || c.conv_id,
        canal:      c.canal,
        brand:      c.brand || 'feria',
        accountName:c.account_name || (c.brand === 'bl' ? 'Brand & Legacy' : 'Feria Design'),
        etiqueta:   c.etiqueta || 'nuevo',
        ultimoMsg:  c.ultimo_mensaje || '',
        hora:       c.ultimo_mensaje_at
          ? new Date(c.ultimo_mensaje_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
          : '',
        noLeidos:   c.no_leidos || 0,
        telefono:   c.telefono || '',
        avatar:     (c.nombre || c.telefono || '??').slice(0, 2).toUpperCase(),
        color:      '#C9A96E',
      }));

      const withPortal = [...portalConversations(), ...mapped];
      setConvs(withPortal);

      // Actualizar conteos de etiquetas
      setEtiquetas(prev => prev.map(e => ({
        ...e,
        count: withPortal.filter(c => c.etiqueta === e.id).length,
      })));
    } catch (e) {
      console.warn('useMensajesConversations: error cargando', e.message);
    }
    setLoading(false);
  }, [demoMode, portalConversations]);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // ── Seleccionar conversación + marcar leída ───────────────────
  const selectConv = useCallback(async (conv) => {
    setActiveConv(conv);
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, noLeidos: 0 } : c));
    if (!isConfigured || USE_SEED || demoMode) return;
    await supabase
      .from('conversaciones')
      .update({ no_leidos: 0 })
      .eq('conv_id', conv.conv_id || conv.id);
  }, [demoMode]);

  // ── Cambiar etiqueta — UN SOLO CAMINO ────────────────────────
  const cambiarEtiqueta = useCallback(async (convId, etiquetaId) => {
    // Actualiza UI de inmediato
    setConvs(prev => {
      const updated = prev.map(c => c.id === convId ? { ...c, etiqueta: etiquetaId } : c);
      // Recalcular conteos en el mismo paso
      setEtiquetas(ets => ets.map(e => ({ ...e, count: updated.filter(c => c.etiqueta === e.id).length })));
      return updated;
    });
    setActiveConv(prev => prev?.id === convId ? { ...prev, etiqueta: etiquetaId } : prev);
    // Persiste en DB
    if (!isConfigured || USE_SEED || demoMode) return;
    const { error } = await supabase
      .from('conversaciones')
      .update({ etiqueta: etiquetaId })
      .eq('conv_id', convId);
    if (error) console.warn('cambiarEtiqueta DB error:', error.message);
  }, [demoMode]);

  const crearEtiqueta = useCallback(({ nombre, color = '#C9A96E' }) => {
    const cleanName = String(nombre || '').trim();
    if (!cleanName) return null;
    const defaultIds = new Set(ETIQUETAS_DEFAULT.map(t => t.id));
    let createdId = null;
    setEtiquetas(prev => {
      const existing = prev.find(t => t.nombre.toLowerCase() === cleanName.toLowerCase());
      if (existing) {
        createdId = existing.id;
        return prev;
      }
      const baseId = slugTag(cleanName);
      const id = prev.some(t => t.id === baseId) ? `${baseId}_${Date.now().toString(36).slice(-4)}` : baseId;
      createdId = id;
      const next = [...prev, { id, nombre: cleanName, color, count: 0, custom: true }];
      const custom = next.filter(t => !defaultIds.has(t.id)).map(({ id, nombre, color, custom }) => ({ id, nombre, color, custom }));
      localStorage.setItem(ETIQUETAS_STORAGE_KEY, JSON.stringify(custom));
      return next;
    });
    return createdId;
  }, []);

  // ── Actualizar conv con último mensaje ────────────────────────
  const updateConvLastMsg = useCallback((convId, texto) => {
    setConvs(prev => prev.map(c => c.id === convId
      ? { ...c, ultimoMsg: texto, hora: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }
      : c
    ));
  }, []);

  return { convs, setConvs, etiquetas, activeConv, loading, selectConv, cambiarEtiqueta, crearEtiqueta, updateConvLastMsg, reload: loadConvs };
}
