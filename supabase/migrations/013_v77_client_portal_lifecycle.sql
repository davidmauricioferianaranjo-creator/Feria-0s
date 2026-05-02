-- Feria OS v77 — ciclo operativo del portal cliente

-- Estado extendido del flujo del portal
alter table if exists portal_progreso add column if not exists meeting_unlocked_at timestamptz;
alter table if exists portal_progreso add column if not exists meeting_confirmed_at timestamptz;
alter table if exists portal_progreso add column if not exists approvals_ready_at timestamptz;
alter table if exists portal_progreso add column if not exists final_payment_paid_at timestamptz;
alter table if exists portal_progreso add column if not exists brandkit_unlocked_at timestamptz;
alter table if exists portal_progreso add column if not exists portal_messages_sent jsonb default '{}'::jsonb;

-- Estado espejo en proyectos para que administración pueda activar el flujo
alter table if exists proyectos add column if not exists meeting_unlocked_at timestamptz;
alter table if exists proyectos add column if not exists approvals_ready_at timestamptz;
alter table if exists proyectos add column if not exists final_payment_paid_at timestamptz;
alter table if exists proyectos add column if not exists brandkit_unlocked_at timestamptz;

-- Cobros: soporte de link de pago final / checkout
alter table if exists cobros add column if not exists stripe_payment_link text;
alter table if exists cobros add column if not exists checkout_session_id text;
alter table if exists cobros add column if not exists paid_at timestamptz;
create index if not exists idx_cobros_checkout_session_id on cobros(checkout_session_id);

-- Notificaciones: canal y programación para email + WhatsApp
alter table if exists notificaciones add column if not exists channel text default 'interno';
alter table if exists notificaciones add column if not exists scheduled_for timestamptz;
alter table if exists notificaciones add column if not exists sent_at timestamptz;
alter table if exists notificaciones add column if not exists payload jsonb default '{}'::jsonb;
create index if not exists idx_notificaciones_channel on notificaciones(channel);
