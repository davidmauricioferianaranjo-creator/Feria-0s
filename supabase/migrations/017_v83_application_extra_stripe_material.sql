-- Feria OS v83 — extras de aplicaciones por Stripe y material de proyecto

alter table cobros add column if not exists nombre text;
alter table cobros alter column nombre drop not null;
alter table cobros add column if not exists payment_stage text;
alter table cobros add column if not exists application_id text;
alter table cobros add column if not exists proyecto_id uuid references proyectos(id) on delete set null;
alter table cobros add column if not exists stripe_payment_link text;
alter table cobros add column if not exists stripe_session_id text;
alter table cobros add column if not exists fecha_pago timestamptz;
alter table cobros add column if not exists updated_at timestamptz default now();

alter table project_applications add column if not exists paid_at timestamptz;
alter table project_applications add column if not exists payment_cobro_id uuid references cobros(id) on delete set null;

create index if not exists idx_cobros_payment_stage on cobros(payment_stage);
create index if not exists idx_cobros_application_id on cobros(application_id);
create index if not exists idx_cobros_proyecto_id on cobros(proyecto_id);
create index if not exists idx_project_applications_payment_cobro_id on project_applications(payment_cobro_id);
