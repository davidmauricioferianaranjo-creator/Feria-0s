-- Feria OS v68 — datos reales, pagos Stripe y flujo de diseñadores
-- Ejecutar después de 005_v67_operational_closure.sql

-- ── STRIPE / COBROS ─────────────────────────────────────────────
alter table cobros add column if not exists stripe_session_id text;
alter table cobros add column if not exists stripe_payment_link_id text;
alter table cobros add column if not exists stripe_payment_link text;
alter table cobros add column if not exists fecha_pago timestamp with time zone;
alter table cobros add column if not exists updated_at timestamp with time zone default now();
create index if not exists idx_cobros_stripe_session_id on cobros(stripe_session_id);
create index if not exists idx_cobros_status on cobros(status);

-- ── TAREAS / AVANCES DE DISEÑO ──────────────────────────────────
alter table tareas add column if not exists is_demo boolean default false;
create index if not exists idx_tareas_is_demo on tareas(is_demo);
create index if not exists idx_tareas_proyecto_id on tareas(proyecto_id);

create table if not exists project_updates (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  tipo text default 'avance',
  titulo text not null,
  descripcion text,
  archivo_url text,
  reviewer_id text,
  status text default 'pendiente_revision',
  feedback text,
  created_by uuid references profiles(id) on delete set null,
  reviewed_by uuid references profiles(id) on delete set null,
  is_demo boolean default false,
  created_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

alter table project_updates enable row level security;
drop policy if exists "project_updates_read_staff" on project_updates;
drop policy if exists "project_updates_write_staff" on project_updates;
create policy "project_updates_read_staff" on project_updates for select
  using (has_role('admin','crm','creativo'));
create policy "project_updates_write_staff" on project_updates for all
  using (has_role('admin','crm','creativo'))
  with check (has_role('admin','crm','creativo'));

create index if not exists idx_project_updates_proyecto_id on project_updates(proyecto_id);
create index if not exists idx_project_updates_status on project_updates(status);
create index if not exists idx_project_updates_is_demo on project_updates(is_demo);

-- ── MARCAR SEEDS LEGACY COMO DEMO ────────────────────────────────
-- No borra datos automáticamente: solo marca como demo los ejemplos antiguos para que modo real quede limpio.

update clientes set is_demo = true
where lower(coalesce(nombre,'')) like any (array[
  '%arkes%','%arquez%','%juan pablo%','%tania%','%tanya%','%ulbeck%','%urbe%',
  '%sultán%','%sultan%','%mónica%','%monica%','%arturo%','%artizwed%',
  '%lácteos san salvador%','%lacteos san salvador%','%san salvador%','%hifa%','%enciéndete%','%enciendete%'
]);

update proyectos set is_demo = true
where lower(coalesce(nombre,'')) like any (array[
  '%arkes%','%arquez%','%juan pablo%','%tania%','%tanya%','%ulbeck%','%urbe%',
  '%sultán%','%sultan%','%mónica%','%monica%','%arturo%','%artizwed%',
  '%lácteos san salvador%','%lacteos san salvador%','%san salvador%','%hifa%','%enciéndete%','%enciendete%'
]);

update leads set is_demo = true
where lower(coalesce(nombre,'')) like any (array[
  '%arkes%','%arquez%','%juan pablo%','%tania%','%tanya%','%ulbeck%','%urbe%',
  '%sultán%','%sultan%','%mónica%','%monica%','%arturo%','%artizwed%',
  '%lácteos san salvador%','%lacteos san salvador%','%san salvador%','%hifa%','%enciéndete%','%enciendete%'
]);

update cobros set is_demo = true
where lower(coalesce(nombre,'')) like any (array[
  '%arkes%','%arquez%','%juan pablo%','%tania%','%tanya%','%ulbeck%','%urbe%',
  '%sultán%','%sultan%','%mónica%','%monica%','%arturo%','%artizwed%',
  '%lácteos san salvador%','%lacteos san salvador%','%san salvador%','%hifa%','%enciéndete%','%enciendete%'
]);

update contratos set is_demo = true
where lower(coalesce(firmante,'') || ' ' || coalesce(contenido,'')) like any (array[
  '%arkes%','%arquez%','%juan pablo%','%tania%','%tanya%','%ulbeck%','%urbe%',
  '%sultán%','%sultan%','%mónica%','%monica%','%arturo%','%artizwed%',
  '%lácteos san salvador%','%lacteos san salvador%','%san salvador%','%hifa%','%enciéndete%','%enciendete%'
]);

update notificaciones set is_demo = true
where lower(coalesce(titulo,'') || ' ' || coalesce(descripcion,'')) like any (array[
  '%arkes%','%arquez%','%juan pablo%','%tania%','%tanya%','%ulbeck%','%urbe%',
  '%sultán%','%sultan%','%mónica%','%monica%','%arturo%','%artizwed%',
  '%lácteos san salvador%','%lacteos san salvador%','%san salvador%','%hifa%','%enciéndete%','%enciendete%'
]);
