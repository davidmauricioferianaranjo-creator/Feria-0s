import { useState, useCallback } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';

export function useAdminData({ data, showToast }) {
  const [saving, setSaving] = useState(false);

  const updateStudioMeta = useCallback(async (objetivo) => {
    if (!isConfigured) return;
    setSaving(true);
    try {
      await supabase.from('studio').update({ meta_objetivo: objetivo }).neq('id', '00000000-0000-0000-0000-000000000000');
      showToast('Meta actualizada', '✦');
    } catch (e) {
      showToast('Error al guardar', '⚠');
    }
    setSaving(false);
  }, [showToast]);

  const updateMemberPerms = useCallback(async (memberId, perms) => {
    if (!isConfigured) return;
    await supabase.from('team').update({ perms }).eq('id', memberId);
    showToast('Permisos actualizados', '✦');
  }, [showToast]);

  return { saving, updateStudioMeta, updateMemberPerms };
}
