-- Feria OS v79 — Proyectos UX y producción interna
-- Refuerza la información necesaria para dashboard, asignación, brief y producción.

alter table if exists proyectos add column if not exists brief_responses jsonb default '[]'::jsonb;
alter table if exists proyectos add column if not exists brief_completed_at timestamptz;
alter table if exists proyectos add column if not exists production_started_at timestamptz;
alter table if exists proyectos add column if not exists production_status text default 'pendiente_asignacion';
alter table if exists proyectos add column if not exists designer_assigned_at timestamptz;
alter table if exists proyectos add column if not exists internal_due_date date;
alter table if exists proyectos add column if not exists client_due_date date;
alter table if exists proyectos add column if not exists package_name text;
alter table if exists proyectos add column if not exists package_app_limit integer default 0;
alter table if exists proyectos add column if not exists service_type text;

alter table if exists project_chat_messages add column if not exists source text default 'project';
alter table if exists project_chat_messages add column if not exists etiqueta text default 'interno';

create index if not exists idx_proyectos_production_status on proyectos(production_status);
create index if not exists idx_proyectos_internal_due_date on proyectos(internal_due_date);
create index if not exists idx_proyectos_client_due_date on proyectos(client_due_date);
create index if not exists idx_proyectos_creativo_id on proyectos(creativo_id);
create index if not exists idx_project_chat_messages_source on project_chat_messages(source);
