import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { ROLE_PRESETS, normalizePermissions, canAccessModule } from '../lib/permissions';
import { getDemoAccountByEmail } from '../lib/demoAccounts';

const AuthContext = createContext(null);
const LOCAL_DEMO_AUTH_KEY = 'feria_demo_user_email';
const USE_LOCAL_DEMO_AUTH = process.env.NODE_ENV !== 'production' && (process.env.NODE_ENV === 'test' || process.env.REACT_APP_USE_SEED === 'true' || !isConfigured);

// ── COLORES POR USUARIO (solo presentación — no define permisos) ──
const USER_COLORS = {
  'david@feriadesign.com':  { color: '#C9A96E', initials: 'DA', name: 'David',  roleLabel: 'Director'          },
  'selene@feriadesign.com': { color: '#4ECDC4', initials: 'SE', name: 'Selene', roleLabel: 'Estrategia · leads' },
  'anthea@feriadesign.com': { color: '#D4537E', initials: 'AN', name: 'Anthea', roleLabel: 'Diseñadora'         },
};

function createDemoUser(account) {
  const role = account.role || 'cliente';
  return {
    id: `demo-${account.id}`,
    aud: 'authenticated',
    email: account.email,
    user_metadata: { name: account.name },
    name: account.name,
    role,
    perms: role,
    permissions: normalizePermissions(role),
    roleLabel: ROLE_PRESETS[role]?.label || account.roleLabel,
    color: account.color,
    initials: account.name.slice(0, 2).toUpperCase(),
    isClient: role === 'cliente',
    clientEmail: role === 'cliente' ? account.email : null,
    _source: 'local-demo',
  };
}

// ── CONSTRUIR PERFIL DE USUARIO ───────────────────────────────────
// Fuente de verdad de permisos: tabla `profiles` en Supabase.
// USER_COLORS solo se usa para presentación visual.
async function fetchProfile(supabaseUser) {
  const email    = supabaseUser.email;
  const demoAccount = getDemoAccountByEmail(email);
  const cosmetic = demoAccount ? {
    color: demoAccount.color,
    initials: demoAccount.name.slice(0, 2).toUpperCase(),
    name: demoAccount.name,
    roleLabel: demoAccount.roleLabel,
  } : USER_COLORS[email] || {
    color:     '#5B9BD5',
    initials:  email.slice(0, 2).toUpperCase(),
    name:      supabaseUser.user_metadata?.name || email.split('@')[0],
    roleLabel: 'Colaborador',
  };

  // Intentar leer el rol real desde la tabla profiles — con timeout de 5s
  if (isConfigured) {
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('role, name, email, permissions')
        .eq('id', supabaseUser.id)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('profiles timeout')), 5000)
      );

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (!error && profile) {
        const isClient = profile.role === 'cliente';
        return {
          ...supabaseUser,
          name:      profile.name || cosmetic.name,
          role:      profile.role,
          perms:     profile.role,
          permissions: normalizePermissions(profile.role, profile.permissions),
          roleLabel: ROLE_PRESETS[profile.role]?.label || cosmetic.roleLabel,
          color:     cosmetic.color,
          initials:  cosmetic.initials,
          isClient,
          clientEmail: isClient ? email : null,
          _source:   'db',
        };
      }
    } catch (e) {
      console.warn('[fetchProfile] Error o timeout:', e.message);
    }
  }

  // Si profiles falla o el usuario no tiene perfil en DB:
  // en producción NO se conceden permisos elevados por correo conocido.
  // El usuario queda como 'cliente' hasta que el admin asigne el rol correcto en Supabase.
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Producción: sin perfil = sin permisos. Solo cosmético.
    return {
      ...supabaseUser,
      name:     cosmetic.name,
      role:     'cliente',
      perms:    'cliente',
      roleLabel: 'Sin perfil asignado',
      permissions: normalizePermissions('cliente'),
      color:    cosmetic.color,
      initials: cosmetic.initials,
      isClient: true,
      clientEmail: email,
      _source: 'no-profile',
    };
  }

  // Desarrollo: fallback por correo para facilitar trabajo local.
  // ESTE BLOQUE NO LLEGA A PRODUCCIÓN.
  const demoRole = getDemoAccountByEmail(email)?.role;
  const devPerms = demoRole
                 || (email === 'david@feriadesign.com'  ? 'admin'
                 : email === 'admin@feria.design'    ? 'admin'
                 : email === 'info@feria.design'     ? 'admin'
                 : email === 'selene@feriadesign.com' ? 'crm'
                 : email === 'selena@feriadesign.com' ? 'crm'
                 : email === 'anthea@feriadesign.com' ? 'creativo'
                 : email === 'info@davidferia.com'    ? 'cliente'
                 : 'cliente');

  return {
    ...supabaseUser,
    name:      cosmetic.name,
    role:      devPerms,
    perms:     devPerms,
    roleLabel: ROLE_PRESETS[devPerms]?.label || cosmetic.roleLabel,
    permissions: normalizePermissions(devPerms),
    color:     cosmetic.color,
    initials:  cosmetic.initials,
    isClient:  devPerms === 'cliente',
    clientEmail: devPerms === 'cliente' ? email : null,
    _source:   'dev-fallback',
  };
}

// ── PROVIDER ─────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (USE_LOCAL_DEMO_AUTH) {
      const savedDemoEmail = localStorage.getItem(LOCAL_DEMO_AUTH_KEY);
      const savedAccount = getDemoAccountByEmail(savedDemoEmail);
      if (savedAccount) setUser(createDemoUser(savedAccount));
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      console.warn('[AuthContext] Supabase no configurado.');
      setLoading(false);
      return;
    }

    // Timeout de seguridad — si en 8s no resuelve, liberar loading
    const safetyTimer = setTimeout(() => {
      console.warn('[AuthContext] Timeout de arranque — liberando loading');
      setLoading(false);
    }, 8000);

    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user) {
          try {
            const profile = await fetchProfile(session.user);
            setUser(profile);
          } catch (profileErr) {
            // profiles falló — no inventar permisos internos.
            // El usuario queda como 'cliente' hasta que profiles responda.
            console.warn('[AuthContext] fetchProfile falló — sin permisos internos', profileErr.message);
            setUser({
              ...session.user,
              name:     session.user.email?.split('@')[0] || 'Usuario',
              role:     'cliente',
              perms:    'cliente',
              isClient: true,
              permissions: normalizePermissions('cliente'),
              _source:  'profile-error',
            });
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error en getSession:', err.message);
        setError(err.message);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const profile = await fetchProfile(session.user);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        // profiles falló en evento de auth — mismo criterio: sin permisos internos.
        console.warn('[AuthContext] onAuthStateChange fetchProfile error:', err.message);
        setUser(session?.user ? {
          ...session.user,
          name:     session.user.email?.split('@')[0] || 'Usuario',
          role:     'cliente',
          perms:    'cliente',
          isClient: true,
          permissions: normalizePermissions('cliente'),
          _source:  'auth-change-error',
        } : null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setError(null);
    const demoAccount = getDemoAccountByEmail(email);

    if (USE_LOCAL_DEMO_AUTH && demoAccount?.password === password) {
      localStorage.setItem('feria_demo_mode', 'true');
      localStorage.setItem(LOCAL_DEMO_AUTH_KEY, demoAccount.email);
      setUser(createDemoUser(demoAccount));
      return true;
    }

    if (!isConfigured) {
      setError('Supabase no está configurado. Usa una cuenta demo local o configura las variables REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY.');
      return false;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    return !err;
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
    if (isConfigured && !USE_LOCAL_DEMO_AUTH) await supabase.auth.signOut();
    setUser(null);
  };

  // Reglas de acceso por módulo — usa presets y permisos personalizados
  const canAccess = (module) => canAccessModule(user, module);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
