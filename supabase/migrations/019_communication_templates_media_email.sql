-- Plantillas de comunicacion: imagenes WhatsApp + diseno de correo
alter table automatic_message_templates
  add column if not exists image_enabled boolean default true,
  add column if not exists image_template jsonb default '{}'::jsonb,
  add column if not exists email_design jsonb default '{}'::jsonb;

create index if not exists idx_automatic_message_templates_channel
  on automatic_message_templates(channel);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'communication-assets',
  'communication-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "communication_assets_staff_read" on storage.objects;
create policy "communication_assets_staff_read"
on storage.objects for select
using (bucket_id = 'communication-assets' and has_role('admin','crm'));

drop policy if exists "communication_assets_staff_write" on storage.objects;
create policy "communication_assets_staff_write"
on storage.objects for all
using (bucket_id = 'communication-assets' and has_role('admin','crm'))
with check (bucket_id = 'communication-assets' and has_role('admin','crm'));
