-- Feria OS v67 — cierre operativo real
-- Objetivo: separar producción/demo, habilitar roles configurables y permitir portal de cliente real.

-- ── PROFILES / ROLES ───────────────────────────────────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin','crm','creativo','finanzas','cliente','custom'));

alter table profiles add column if not exists email text;
alter table profiles add column if not exists permissions jsonb default '{"modules":[],"brands":["feria","bl"]}'::jsonb;
create index if not exists idx_profiles_email_lower on profiles (lower(email));

update profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, email, role, permissions)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'creativo'),
    coalesce((new.raw_user_meta_data->'permissions')::jsonb, '{"modules":[],"brands":["feria","bl"]}'::jsonb)
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(profiles.name, excluded.name),
    updated_at = now();
  return new;
end;
$$;

create or replace function promote_user_role(user_id uuid, new_role text, new_permissions jsonb default null)
returns void language plpgsql security definer as $$
begin
  if not has_role('admin') then
    raise exception 'Solo admin puede cambiar roles';
  end if;
  update profiles
  set role = new_role,
      permissions = coalesce(new_permissions, permissions),
      updated_at = now()
  where id = user_id;
end;
$$;

-- ── TEAM / PERMISOS MODULARES ──────────────────────────────────
alter table team add column if not exists bg text;
alter table team add column if not exists permissions jsonb default '{"modules":[],"brands":["feria","bl"]}'::jsonb;
alter table team add column if not exists is_active boolean default true;
alter table team drop constraint if exists team_perms_check;
alter table team add constraint team_perms_check
  check (perms in ('admin','crm','creativo','finanzas','cliente','custom'));

-- ── CAMPOS DEMO / SERVICIO / TIMESTAMPS ─────────────────────────
alter table clientes add column if not exists service_type text;
alter table clientes add column if not exists is_demo boolean default false;
update clientes set service_type = case
  when lower(coalesce(servicio,'')) like '%fot%' then 'branding_fotografos'
  when lower(coalesce(servicio,'')) like '%web%' then 'web'
  when lower(coalesce(servicio,'')) like '%naming%' then 'naming'
  when lower(coalesce(servicio,'')) like '%consult%' then 'consultoria'
  else 'branding'
end where service_type is null;

alter table proyectos add column if not exists is_demo boolean default false;
alter table cobros add column if not exists is_demo boolean default false;
alter table cobros add column if not exists updated_at timestamp with time zone default now();
alter table gastos add column if not exists is_demo boolean default false;
alter table leads add column if not exists is_demo boolean default false;
alter table notificaciones add column if not exists is_demo boolean default false;
alter table notificaciones add column if not exists tiempo text;
alter table contratos add column if not exists is_demo boolean default false;
alter table contratos add column if not exists service_type text;
alter table contratos add column if not exists estudio_firmado boolean default true;
alter table contratos add column if not exists pdf_url text;
alter table briefs add column if not exists is_demo boolean default false;
alter table briefs add column if not exists service_type text;
alter table briefs add column if not exists template_key text;
alter table briefs add column if not exists activo boolean default true;
alter table cotizaciones add column if not exists is_demo boolean default false;
alter table cotizaciones add column if not exists service_type text;
alter table cotizaciones add column if not exists items jsonb default '[]'::jsonb;
alter table cotizaciones add column if not exists mensaje_wa text;
alter table cotizaciones add column if not exists asunto_email text;
alter table cotizaciones add column if not exists mensaje_email text;
alter table cotizaciones add column if not exists codigo_pais text;
alter table cotizaciones add column if not exists whatsapp text;
alter table cotizaciones add column if not exists email_destino text;
alter table cotizaciones add column if not exists updated_at timestamp with time zone default now();
alter table portal_progreso add column if not exists sentir_data jsonb default '[]'::jsonb;
alter table portal_progreso add column if not exists aprobaciones jsonb default '[]'::jsonb;
alter table portal_progreso add column if not exists reunion_confirmada jsonb default '{}'::jsonb;
alter table portal_progreso add column if not exists is_demo boolean default false;
alter table aprobaciones add column if not exists is_demo boolean default false;
alter table reuniones add column if not exists is_demo boolean default false;
alter table conversaciones add column if not exists brand text default 'feria';
alter table conversaciones add column if not exists account_name text;
alter table conversaciones add column if not exists is_demo boolean default false;
alter table mensajes_meta add column if not exists brand text default 'feria';
alter table mensajes_meta add column if not exists account_name text;
alter table mensajes_meta add column if not exists is_demo boolean default false;

create table if not exists deudas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monto numeric(10,2) not null default 0,
  fecha date default current_date,
  status text default 'pendiente',
  responsable text,
  cliente_id uuid references clientes(id) on delete set null,
  notas text,
  is_demo boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table deudas enable row level security;
drop policy if exists "deudas_read_admin" on deudas;
drop policy if exists "deudas_write_admin" on deudas;
create policy "deudas_read_admin" on deudas for select using (has_role('admin','crm','finanzas'));
create policy "deudas_write_admin" on deudas for all using (has_role('admin','crm','finanzas')) with check (has_role('admin','crm','finanzas'));

-- ── HELPERS DE PORTAL CLIENTE ──────────────────────────────────
create or replace function current_user_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt()->>'email',''));
$$;

create or replace function owns_cliente(p_cliente_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from clientes c
    where c.id = p_cliente_id
      and lower(coalesce(c.email,'')) = current_user_email()
  );
$$;

-- ── POLÍTICAS CLIENTE: lectura/escritura solo de su propio portal ─────────
drop policy if exists "clientes_read_own_client" on clientes;
create policy "clientes_read_own_client" on clientes for select
  using (has_role('cliente') and lower(coalesce(email,'')) = current_user_email());

drop policy if exists "proyectos_read_own_client" on proyectos;
create policy "proyectos_read_own_client" on proyectos for select
  using (has_role('cliente') and owns_cliente(cliente_id));

drop policy if exists "cobros_read_own_client" on cobros;
create policy "cobros_read_own_client" on cobros for select
  using (has_role('cliente') and owns_cliente(cliente_id));

drop policy if exists "contratos_read_own_client" on contratos;
drop policy if exists "contratos_sign_own_client" on contratos;
drop policy if exists "contratos_insert_own_client" on contratos;
create policy "contratos_read_own_client" on contratos for select
  using (has_role('cliente') and owns_cliente(cliente_id));
create policy "contratos_sign_own_client" on contratos for update
  using (has_role('cliente') and owns_cliente(cliente_id))
  with check (has_role('cliente') and owns_cliente(cliente_id));
create policy "contratos_insert_own_client" on contratos for insert
  with check (has_role('cliente') and owns_cliente(cliente_id));

drop policy if exists "briefs_read_own_client" on briefs;
drop policy if exists "briefs_write_own_client" on briefs;
drop policy if exists "briefs_insert_own_client" on briefs;
create policy "briefs_read_own_client" on briefs for select
  using (has_role('cliente') and owns_cliente(cliente_id));
create policy "briefs_write_own_client" on briefs for update
  using (has_role('cliente') and owns_cliente(cliente_id))
  with check (has_role('cliente') and owns_cliente(cliente_id));
create policy "briefs_insert_own_client" on briefs for insert
  with check (has_role('cliente') and owns_cliente(cliente_id));

drop policy if exists "portal_read_own_client" on portal_progreso;
drop policy if exists "portal_write_own_client" on portal_progreso;
drop policy if exists "portal_insert_own_client" on portal_progreso;
create policy "portal_read_own_client" on portal_progreso for select
  using (has_role('cliente') and owns_cliente(cliente_id));
create policy "portal_write_own_client" on portal_progreso for update
  using (has_role('cliente') and owns_cliente(cliente_id))
  with check (has_role('cliente') and owns_cliente(cliente_id));
create policy "portal_insert_own_client" on portal_progreso for insert
  with check (has_role('cliente') and owns_cliente(cliente_id));

drop policy if exists "aprob_read_own_client" on aprobaciones;
drop policy if exists "aprob_write_own_client" on aprobaciones;
drop policy if exists "aprob_insert_own_client" on aprobaciones;
create policy "aprob_read_own_client" on aprobaciones for select
  using (has_role('cliente') and owns_cliente(cliente_id));
create policy "aprob_write_own_client" on aprobaciones for update
  using (has_role('cliente') and owns_cliente(cliente_id))
  with check (has_role('cliente') and owns_cliente(cliente_id));
create policy "aprob_insert_own_client" on aprobaciones for insert
  with check (has_role('cliente') and owns_cliente(cliente_id));

drop policy if exists "reuniones_read_own_client" on reuniones;
create policy "reuniones_read_own_client" on reuniones for select
  using (has_role('cliente') and owns_cliente(cliente_id));

-- ── ÍNDICES OPERATIVOS ─────────────────────────────────────────
create index if not exists idx_clientes_is_demo on clientes(is_demo);
create index if not exists idx_clientes_email_lower on clientes(lower(email));
create index if not exists idx_clientes_service_type on clientes(service_type);
create index if not exists idx_proyectos_is_demo on proyectos(is_demo);
create index if not exists idx_cobros_is_demo on cobros(is_demo);
create index if not exists idx_cobros_cliente_id on cobros(cliente_id);
create index if not exists idx_gastos_is_demo on gastos(is_demo);
create index if not exists idx_leads_is_demo on leads(is_demo);
create index if not exists idx_notificaciones_is_demo on notificaciones(is_demo);
create index if not exists idx_contratos_cliente_id on contratos(cliente_id);
create index if not exists idx_briefs_cliente_id on briefs(cliente_id);
create index if not exists idx_portal_progreso_cliente_id on portal_progreso(cliente_id);
