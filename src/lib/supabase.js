import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Si no hay credenciales, el cliente existe pero todas las llamadas fallarán
// silenciosamente y el app usará los datos seed del contexto
export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON || 'placeholder',
);

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);
