-- Feria OS v71 — asignación explícita de diseñador por proyecto
-- Ejecutar después de 008_v70_production_contracts_packages.sql

alter table proyectos add column if not exists designer_assigned_at timestamp with time zone;
alter table proyectos add column if not exists designer_assignment_notes text;
alter table proyectos add column if not exists designer_assignment_status text default 'pendiente_asignacion';

-- Reutilizamos creativo_id como fuente de verdad para el diseñador asignado.
-- production_status queda para lectura operativa del tablero.
update proyectos
set production_status = case
  when creativo_id is not null and coalesce(production_status, '') in ('', 'pendiente', 'pendiente_asignacion') then 'asignado'
  when creativo_id is null and coalesce(production_status, '') in ('', 'pendiente') then 'pendiente_asignacion'
  else production_status
end;

create index if not exists idx_proyectos_creativo_id on proyectos(creativo_id);
create index if not exists idx_proyectos_designer_assigned_at on proyectos(designer_assigned_at);
create index if not exists idx_proyectos_production_status on proyectos(production_status);
