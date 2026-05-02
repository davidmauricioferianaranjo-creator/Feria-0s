-- Feria OS v73 — cuentas demo por rol
-- Permite que la versión demo tenga accesos reales para admin, CRM, diseñador, finanzas y cliente.

alter table team add column if not exists is_demo boolean default false;
alter table team add column if not exists brands text[] default array['feria','bl'];
create index if not exists idx_team_is_demo on team(is_demo);
create index if not exists idx_team_email_lower on team(lower(email));

alter table clientes add column if not exists whatsapp text;
alter table clientes add column if not exists portal_user_id uuid;
alter table clientes add column if not exists portal_access_status text;
alter table clientes add column if not exists portal_access_created_at timestamp with time zone;

-- El diseñador demo solo ve proyectos donde proyectos.creativo_id coincida con su fila en team.
-- Las cuentas Auth se crean desde la Edge Function seed-demo-accounts porque Auth Admin requiere service_role.
