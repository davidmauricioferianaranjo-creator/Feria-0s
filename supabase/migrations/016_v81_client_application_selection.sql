-- Feria OS v81.1 — selección de aplicaciones al final del brief
-- Guarda las aplicaciones elegidas por el cliente y los extras pagados antes de crear el proyecto.
-- Esta migración es defensiva: crea portal_progreso si en la base remota quedó faltante.

create table if not exists portal_progreso (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid unique references clientes(id) on delete cascade,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table portal_progreso enable row level security;

drop policy if exists "portal_read_staff" on portal_progreso;
drop policy if exists "portal_write_staff" on portal_progreso;

create policy "portal_read_staff" on portal_progreso
  for select using (has_role('admin','crm','creativo'));

create policy "portal_write_staff" on portal_progreso
  for all using (has_role('admin','crm','creativo'))
  with check (has_role('admin','crm','creativo'));

alter table portal_progreso add column if not exists selected_applications jsonb default '[]'::jsonb;
alter table portal_progreso add column if not exists application_selection_completed_at timestamptz;
alter table portal_progreso add column if not exists application_selection_pending boolean default false;

alter table if exists project_applications add column if not exists selected_by text default 'admin';
alter table if exists project_applications add column if not exists paid_at timestamptz;
alter table if exists project_applications add column if not exists payment_cobro_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'portal_progreso'
  ) then
    create index if not exists idx_portal_progreso_application_selection_completed_at
      on portal_progreso(application_selection_completed_at);
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'project_applications'
  ) then
    create index if not exists idx_project_applications_selected_by
      on project_applications(selected_by);
  end if;
end $$;
