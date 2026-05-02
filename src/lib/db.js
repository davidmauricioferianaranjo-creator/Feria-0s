import { supabase } from './supabase';

// ── STUDIO ────────────────────────────────────────────────────
export const db = {

  studio: {
    get: async () => {
      const { data } = await supabase.from('studio').select('*').single();
      return data;
    },
    updateMeta: async (objetivo) => {
      const { error } = await supabase
        .from('studio')
        .update({ meta_objetivo: objetivo })
        .not('id', 'is', null);
      return !error;
    },
  },

  // ── TEAM ────────────────────────────────────────────────────
  team: {
    getAll: async () => {
      const { data } = await supabase.from('team').select('*').order('created_at');
      return data || [];
    },
  },

  // ── CLIENTES ────────────────────────────────────────────────
  clientes: {
    getAll: async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*, team:creativo_id(name, initials, color, bg)')
        .order('created_at', { ascending: false });
      return data || [];
    },

    create: async (cliente) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();
      return { data, error };
    },

    update: async (id, changes) => {
      const { error } = await supabase
        .from('clientes')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    },

    delete: async (id) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      return !error;
    },
  },

  // ── PROYECTOS ───────────────────────────────────────────────
  proyectos: {
    getAll: async () => {
      const { data } = await supabase
        .from('proyectos')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },

    create: async (proyecto) => {
      const { data, error } = await supabase
        .from('proyectos')
        .insert([proyecto])
        .select()
        .single();
      return { data, error };
    },

    update: async (id, changes) => {
      const { error } = await supabase
        .from('proyectos')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    },
  },

  // ── COBROS ──────────────────────────────────────────────────
  cobros: {
    getAll: async () => {
      const { data } = await supabase
        .from('cobros')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },

    create: async (cobro) => {
      const { data, error } = await supabase
        .from('cobros')
        .insert([cobro])
        .select()
        .single();
      return { data, error };
    },

    update: async (id, changes) => {
      const { error } = await supabase
        .from('cobros')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    },
  },

  // ── GASTOS ──────────────────────────────────────────────────
  gastos: {
    getAll: async () => {
      const { data } = await supabase
        .from('gastos')
        .select('*')
        .order('created_at');
      return data || [];
    },

    create: async (gasto) => {
      const { data, error } = await supabase
        .from('gastos')
        .insert([gasto])
        .select()
        .single();
      return { data, error };
    },
  },

  // ── LEADS ────────────────────────────────────────────────────
  leads: {
    getAll: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },

    create: async (lead) => {
      const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select()
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      return !error;
    },
  },

  // ── NOTIFICACIONES ───────────────────────────────────────────
  notificaciones: {
    getAll: async () => {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },

    marcarLeida: async (id) => {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id);
      return !error;
    },

    create: async (notif) => {
      const { error } = await supabase
        .from('notificaciones')
        .insert([notif]);
      return !error;
    },
  },

  // ── CONTRATOS ────────────────────────────────────────────────
  contratos: {
    getByCliente: async (clienteId) => {
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', clienteId)
        .single();
      return data;
    },

    // Estructura canónica — alineada con schema.sql y AppContext.firmarContrato()
    firmar: async (clienteId, { firmante, firmante_doc = '', fecha_firma, hash_firma, contenido, status = 'firmado' }) => {
      const { data, error } = await supabase
        .from('contratos')
        .upsert([{
          cliente_id:   clienteId,
          firmante,
          firmante_doc,
          fecha_firma:  fecha_firma || new Date().toISOString(),
          hash_firma,
          contenido,
          status,
        }], { onConflict: 'cliente_id' })
        .select()
        .single();
      return { data, error };
    },
  },
};
