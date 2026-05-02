export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'crm', label: 'CRM', path: '/crm' },
  { id: 'mensajes', label: 'Mensajes', path: '/mensajes' },
  { id: 'calendario', label: 'Calendario', path: '/calendario' },
  { id: 'kanban', label: 'Proyectos', path: '/kanban' },
  { id: 'contratos', label: 'Contratos', path: '/contratos' },
  { id: 'cotizaciones', label: 'Cotizaciones', path: '/cotizaciones' },
  { id: 'finanzas', label: 'Finanzas', path: '/finanzas' },
  { id: 'marketing', label: 'Marketing', path: '/marketing' },
  { id: 'postventa', label: 'Post-venta', path: '/postventa' },
  { id: 'inteligencia', label: 'Inteligencia', path: '/inteligencia' },
  { id: 'admin', label: 'Administración', path: '/admin' },
  { id: 'portal', label: 'Portal cliente', path: '/portal' },
];

export const ROLE_PRESETS = {
  admin: {
    label: 'Administrador',
    desc: 'Control total: operación, configuración, equipo y finanzas.',
    modules: MODULES.map(m => m.id),
  },
  crm: {
    label: 'CRM / Dirección comercial',
    desc: 'Control operativo completo, incluyendo CRM, proyectos, cotizaciones, marketing y finanzas de lectura/gestión según flujo.',
    modules: ['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','portal'],
  },
  creativo: {
    label: 'Creativo / Diseñador',
    desc: 'Acceso exclusivo a proyectos asignados. Sin dashboard, calendario ni valores financieros.',
    modules: ['kanban'],
  },
  finanzas: {
    label: 'Finanzas',
    desc: 'Solo dashboard financiero, finanzas y reportes básicos.',
    modules: ['dashboard','finanzas'],
  },
  cliente: {
    label: 'Cliente',
    desc: 'Solo portal del cliente vinculado a su email.',
    modules: ['client_portal'],
  },
  custom: {
    label: 'Personalizado',
    desc: 'El administrador decide exactamente qué módulos puede ver.',
    modules: [],
  },
};

export const ROUTE_MODULE = MODULES.reduce((acc, module) => ({ ...acc, [module.path]: module.id }), {});

export function normalizePermissions(role = 'creativo', permissions = null) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.creativo;
  const modules = role === 'creativo'
    ? preset.modules
    : (Array.isArray(permissions?.modules)
      ? permissions.modules
      : preset.modules);
  return {
    modules: Array.from(new Set(modules)),
    brands: Array.isArray(permissions?.brands) ? permissions.brands : ['feria', 'bl'],
  };
}

export function canAccessModule(user, moduleId) {
  if (!user || !moduleId) return false;
  if (user.role === 'admin' || user.perms === 'admin') return true;
  if (user.role === 'cliente' || user.perms === 'cliente') return moduleId === 'client_portal';
  const normalized = normalizePermissions(user.role || user.perms, user.permissions);
  return normalized.modules.includes(moduleId);
}

export function canAccessRoute(user, path) {
  const moduleId = ROUTE_MODULE[path] || 'dashboard';
  return canAccessModule(user, moduleId);
}

export function getDefaultRouteForUser(user) {
  if (!user) return '/login';
  if (user.role === 'cliente' || user.perms === 'cliente' || user.isClient) return '/';
  if (user.role === 'admin' || user.perms === 'admin') return '/';
  const normalized = normalizePermissions(user.role || user.perms, user.permissions);
  const routeOrder = ['dashboard','crm','mensajes','calendario','kanban','contratos','cotizaciones','finanzas','marketing','postventa','inteligencia','admin','portal'];
  const firstModule = routeOrder.find(moduleId => normalized.modules.includes(moduleId)) || 'kanban';
  const found = MODULES.find(m => m.id === firstModule);
  return found?.path || '/kanban';
}


export function initialsFromName(name = '', email = '') {
  const cleaned = String(name || '').trim();
  if (cleaned) return cleaned.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return String(email || 'US').slice(0, 2).toUpperCase();
}
