-- ══════════════════════════════════════════════
-- TABLA RECORDATORIOS — correr en Supabase SQL Editor
-- ══════════════════════════════════════════════

create table if not exists recordatorios (
  id               uuid primary key default gen_random_uuid(),
  cliente_email    text,
  cliente_whatsapp text,
  cliente_nombre   text,
  zoom_link        text,
  fecha_reunion    timestamp with time zone,
  tipo             text,        -- '24h' | '15min'
  enviar_at        timestamp with time zone,
  enviado          boolean default false,
  enviado_at       timestamp with time zone,
  mensaje_email    text,
  mensaje_wp       text,
  created_at       timestamp with time zone default now()
);

alter table recordatorios enable row level security;
create policy "allow_all_recordatorios" on recordatorios for all using (true) with check (true);

-- ══════════════════════════════════════════════
-- ACTIVAR CRON (correr después de crear la tabla)
-- ══════════════════════════════════════════════

-- 1. Activar extensión pg_cron en Supabase → Database → Extensions
-- 2. Activar extensión pg_net (para HTTP requests)
-- 3. Luego correr este SQL:

/*
select cron.schedule(
  'feria-reminders',
  '*/5 * * * *',
  $$
    select net.http_post(
      url:='https://dldykrsikwbibiegtyyb.supabase.co/functions/v1/process-reminders',
      headers:='{"Content-Type":"application/json","Authorization":"Bearer TU_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
*/
