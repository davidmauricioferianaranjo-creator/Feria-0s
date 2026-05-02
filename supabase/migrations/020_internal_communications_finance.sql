-- Feria OS - internal communications and financial health foundations

alter table if exists project_chat_messages
  add column if not exists conversation_id text,
  add column if not exists conversation_type text default 'project',
  add column if not exists target_member_id text,
  add column if not exists reply_to_id uuid,
  add column if not exists reactions jsonb default '{}'::jsonb;

create index if not exists idx_project_chat_conversation_id on project_chat_messages(conversation_id);
create index if not exists idx_project_chat_conversation_type on project_chat_messages(conversation_type);
create index if not exists idx_project_chat_target_member_id on project_chat_messages(target_member_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'internal-chat-files',
  'internal-chat-files',
  false,
  20971520,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf','video/mp4','audio/mpeg','audio/ogg','audio/wav']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table if exists deudas
  add column if not exists nombre text,
  add column if not exists tipo text,
  add column if not exists deuda_original numeric default 0,
  add column if not exists saldo_actual numeric default 0,
  add column if not exists cuota_mensual numeric default 0,
  add column if not exists tasa_interes numeric default 0,
  add column if not exists liquidacion_estimada date,
  add column if not exists pagos jsonb default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now();

alter table if exists gastos
  add column if not exists tipo_egreso text default 'operativo',
  add column if not exists deuda_id uuid,
  add column if not exists capital_pago numeric default 0,
  add column if not exists interes_pago numeric default 0;
