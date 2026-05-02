import { useState, useCallback } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';
import { useApp } from '../../../context/AppContext';
import { DEMO_MESSAGES } from '../../../lib/operationalData';

const USE_SEED = process.env.REACT_APP_USE_SEED === 'true';

export function useMensajesMessages() {
  const { demoMode, data } = useApp();
  const [msgs, setMsgs]       = useState({});   // { [conv_id]: Message[] }
  const [loading, setLoading] = useState(false);

  const loadMsgs = useCallback(async (convId) => {
    if (!convId) return;
    if (String(convId).startsWith('portal_')) {
      const key = String(convId).replace('portal_', '');
      const portalRows = (data.projectChatMessages || []).filter(m => String(m.cliente_id || m.proyecto_id || 'portal_cliente') === key);
      const mapped = portalRows.map(m => ({
        id: m.id,
        conv_id: convId,
        canal: 'portal',
        texto: m.message || m.texto || '',
        from_cliente: true,
        timestamp: m.created_at,
        attachment_name: m.attachment_name,
        media_name: m.attachment_name || m.media_name,
        media_url: m.attachment_url || m.media_url,
        media_tipo: m.media_tipo || m.media_type,
        mime_type: m.mime_type,
      }));
      setMsgs(prev => ({ ...prev, [convId]: mapped }));
      return;
    }
    if (demoMode) {
      setMsgs(prev => ({ ...prev, [convId]: DEMO_MESSAGES[convId] || [] }));
      return;
    }
    if (!isConfigured || USE_SEED) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensajes_meta')
        .select('*')
        .eq('conv_id', convId)
        .order('timestamp', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMsgs(prev => ({ ...prev, [convId]: data || [] }));
    } catch (e) {
      console.warn('useMensajesMessages: error cargando msgs', e.message);
    }
    setLoading(false);
  }, [demoMode, data.projectChatMessages]);

  const appendMsg = useCallback((convId, msg) => {
    setMsgs(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), msg],
    }));
  }, []);

  const updateMsgStatus = useCallback((convId, tempId, status) => {
    setMsgs(prev => ({
      ...prev,
      [convId]: (prev[convId] || []).map(m =>
        m.id === tempId ? { ...m, _status: status } : m
      ),
    }));
  }, []);

  return { msgs, loading, loadMsgs, appendMsg, updateMsgStatus };
}
