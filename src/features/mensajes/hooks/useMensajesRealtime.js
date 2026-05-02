import { useEffect } from 'react';
import { supabase, isConfigured } from '../../../lib/supabase';

const USE_SEED = process.env.REACT_APP_USE_SEED === 'true';

export function useMensajesRealtime({ activeConv, appendMsg, setConvs, reload }) {
  useEffect(() => {
    if (!isConfigured || USE_SEED) return;

    const ch = supabase
      .channel('mensajes_meta_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes_meta',
      }, (payload) => {
        const row = payload.new;

        // Si el mensaje es de la conversación activa, agréguelo al hilo
        if (activeConv && row.conv_id === (activeConv.conv_id || activeConv.id)) {
          appendMsg(row.conv_id, row);
        }

        // Actualizar la lista de conversaciones
        setConvs(prev => prev.map(c =>
          c.conv_id === row.conv_id || c.id === row.conv_id
            ? {
                ...c,
                ultimoMsg: row.texto || '',
                hora: new Date(row.timestamp || Date.now()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
                noLeidos: row.from_cliente && c.id !== activeConv?.id ? (c.noLeidos || 0) + 1 : c.noLeidos,
              }
            : c
        ));
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [activeConv, appendMsg, setConvs, reload]);
}
