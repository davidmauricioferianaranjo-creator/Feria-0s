// Cuentas oficiales para revisar la versión demo de Feria OS.
// La contraseña es igual para todas para facilitar la demostración.
export const DEMO_PASSWORD = 'FeriaDemo2026!';

export const DEMO_ACCOUNTS = [
  {
    id: 'admin',
    name: 'David Demo',
    roleLabel: 'Administrador',
    role: 'admin',
    email: 'admin.demo@feria.design',
    password: DEMO_PASSWORD,
    color: '#C9A96E',
    note: 'Control total de la plataforma demo.',
  },
  {
    id: 'crm',
    name: 'Selena Demo',
    roleLabel: 'CRM / Ventas',
    role: 'crm',
    email: 'selena.demo@feria.design',
    password: DEMO_PASSWORD,
    color: '#4ECDC4',
    note: 'Cotizaciones, clientes, contratos y seguimiento comercial.',
  },
  {
    id: 'designer',
    name: 'Diseñadora Demo',
    roleLabel: 'Diseñadora',
    role: 'creativo',
    email: 'disenador.demo@feria.design',
    password: DEMO_PASSWORD,
    color: '#D4537E',
    note: 'Solo proyectos asignados, entregables, avances y chat.',
  },
  {
    id: 'finance',
    name: 'Finanzas Demo',
    roleLabel: 'Finanzas',
    role: 'finanzas',
    email: 'finanzas.demo@feria.design',
    password: DEMO_PASSWORD,
    color: '#7BC67A',
    note: 'Finanzas, cobros y reportes básicos.',
  },
  {
    id: 'client',
    name: 'Cliente Demo',
    roleLabel: 'Cliente',
    role: 'cliente',
    email: 'cliente.demo@feria.design',
    password: DEMO_PASSWORD,
    color: '#5B9BD5',
    note: 'Portal cliente, brief, contrato, reuniones y avances.',
  },
];

export function getDemoAccountByEmail(email = '') {
  return DEMO_ACCOUNTS.find(account => account.email.toLowerCase() === String(email).trim().toLowerCase());
}
