-- Feria OS v74 — portal cliente: documentos, mensajes y ciclo de desarrollo

-- Progreso del portal: fechas de inicio y aprobaciones
alter table if exists portal_progreso add column if not exists brief_completed_at timestamptz;
alter table if exists portal_progreso add column if not exists project_started_at timestamptz;
alter table if exists portal_progreso add column if not exists approvals_completed_at timestamptz;
alter table if exists portal_progreso add column if not exists final_payment_requested_at timestamptz;

-- Proyectos: fecha de inicio de producción y estado del portal
alter table if exists proyectos add column if not exists production_started_at timestamptz;
alter table if exists proyectos add column if not exists brief_completed_at timestamptz;
alter table if exists proyectos add column if not exists client_portal_status text default 'activo';

-- Contratos: documento final descargable
alter table if exists contratos add column if not exists final_pdf_url text;
alter table if exists contratos add column if not exists studio_signature_url text;
alter table if exists contratos add column if not exists client_signature_url text;
alter table if exists contratos add column if not exists locked_at timestamptz;

-- Mensajes de proyecto/portal: soporte de adjuntos y etiqueta de origen
alter table if exists project_chat_messages add column if not exists cliente_id uuid;
alter table if exists project_chat_messages add column if not exists sender_email text;
alter table if exists project_chat_messages add column if not exists source text default 'project';
alter table if exists project_chat_messages add column if not exists etiqueta text default 'interno';
alter table if exists project_chat_messages add column if not exists attachment_name text;
alter table if exists project_chat_messages add column if not exists attachment_size numeric default 0;
alter table if exists project_chat_messages add column if not exists read_by_staff boolean default false;
create index if not exists idx_project_chat_source on project_chat_messages(source);
create index if not exists idx_project_chat_cliente_id on project_chat_messages(cliente_id);

-- Notificaciones programables para inicio / mitad / cierre
alter table if exists notificaciones add column if not exists cliente_id uuid;
alter table if exists notificaciones add column if not exists proyecto_id uuid;
alter table if exists notificaciones add column if not exists scheduled_for timestamptz;
alter table if exists notificaciones add column if not exists channel text default 'interno';
create index if not exists idx_notificaciones_scheduled_for on notificaciones(scheduled_for);

-- Cobros: estandarizar pedido de pago final
alter table if exists cobros add column if not exists payment_stage text;
alter table if exists cobros add column if not exists payment_link text;
create index if not exists idx_cobros_payment_stage on cobros(payment_stage);
