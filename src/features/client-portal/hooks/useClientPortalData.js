import { useState, useCallback, useEffect } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';

export function useClientPortalData(clienteId) {
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading]  = useState(true);

  const loadProgreso = useCallback(async () => {
    if (!isConfigured || !clienteId) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('portal_progreso')
        .select('data')
        .eq('cliente_id', clienteId)
        .single();
      if (data?.data) setProgreso(data.data);
    } catch {}
    setLoading(false);
  }, [clienteId]);

  const saveProgreso = useCallback(async (updates) => {
    if (!isConfigured || !clienteId) return;
    const newData = { ...(progreso || {}), ...updates };
    setProgreso(newData);
    await supabase.from('portal_progreso').upsert(
      { cliente_id: clienteId, data: newData, updated_at: new Date().toISOString() },
      { onConflict: 'cliente_id' }
    );
  }, [clienteId, progreso]);

  useEffect(() => { loadProgreso(); }, [loadProgreso]);

  return { progreso, loading, saveProgreso };
}
