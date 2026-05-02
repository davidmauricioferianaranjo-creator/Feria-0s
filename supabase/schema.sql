-- ============================================================
-- FERIA OS — Supabase Schema
-- Corre este SQL en: supabase.com → tu proyecto → SQL Editor
-- ============================================================

-- ── EXTENSIONES ────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── STUDIO (configuración general) ─────────────────────────
create table if not exists studio (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Feria Design Studio',
  meta_objetivo numeric default 14000,
  meta_actual   numeric default 8400,
  dias_restantes int default 11,
  updated_at  timestamp with time zone default now()
);

-- ── EQUIPO ──────────────────────────────────────────────────
create table if not exists team (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  initials text not null,
  role     text,
  color    text default '#C9A96E',
  bg       text default 'rgba(201,169,110,0.15)',
  brands   text[] default array['feria'],
  perms    text default 'creativo',
  created_at timestamp with time zone default now()
);

-- ── CLIENTES ────────────────────────────────────────────────
create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  tipo        text,
  email       text,
  brand       text default 'feria',
  servicio    text default 'Brand Identity',
  monto       numeric default 0,
  stage       int default 0,
  creativo_id uuid references team(id),
  color       text default '#5B9BD5',
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

-- ── PROYECTOS ───────────────────────────────────────────────
create table if not exists proyectos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid references clientes(id) on delete cascade,
  nombre         text,
  fase           int default 0,
  pct_interno    int default 0,
  pct_cliente    int default 0,
  dias_entrega   int default 8,
  dias_ejecucion int default 2,
  creativo_id    uuid references team(id),
  created_at     timestamp with time zone default now(),
  updated_at     timestamp with time zone default now()
);

-- ── COBROS ──────────────────────────────────────────────────
create table if not exists cobros (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid references clientes(id) on delete cascade,
  tipo                text,
  monto               numeric,
  moneda              text default 'USD',
  via                 text default 'Stripe',
  status              text default 'pending',
  stripe_payment_link text,
  vence               text,
  created_at          timestamp with time zone default now(),
  updated_at          timestamp with time zone default now()
);

-- ── GASTOS ──────────────────────────────────────────────────
create table if not exists gastos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  cat        text,
  monto      numeric,
  status     text default 'pending',
  created_at timestamp with time zone default now()
);

-- ── LEADS ───────────────────────────────────────────────────
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  email      text,
  brand      text default 'feria',
  status     text default 'frío',
  dias       int default 0,
  created_at timestamp with time zone default now()
);

-- ── NOTIFICACIONES ──────────────────────────────────────────
create table if not exists notificaciones (
  id         uuid primary key default gen_random_uuid(),
  tipo       text,
  titulo     text,
  descripcion text,
  tiempo     text,
  leida      boolean default false,
  created_at timestamp with time zone default now()
);

-- ── CONTRATOS (tabla canónica — una sola definición) ────────────
create table if not exists contratos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid references clientes(id) on delete cascade unique, -- un contrato activo por cliente
  firmante     text,           -- nombre del firmante
  firmante_doc text,           -- documento de identidad
  fecha_firma  timestamp with time zone default now(),
  hash_firma   text,           -- SHA-256 del contenido firmado
  contenido    text,           -- texto completo del contrato
  status       text default 'firmado',
  created_at   timestamp with time zone default now()
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (activa pero permisiva por ahora)
-- Cuando agregues auth, restringe por user_id
-- ══════════════════════════════════════════════════════════════
-- ══════════════════════════════════════════════════════════════
-- PERFILES Y ROLES DE USUARIO
-- Fuente de verdad: esta tabla, no el frontend
-- ══════════════════════════════════════════════════════════════
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  name        text,
  role        text not null default 'creativo'
              check (role in ('admin','crm','creativo','cliente')),
  studio_id   text default 'feria',
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);
alter table profiles enable row level security;

-- El usuario puede leer su propio perfil
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

-- Solo admin puede actualizar roles
create policy "profiles_update_admin"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Se crea automáticamente al registrarse.
-- IMPORTANTE: el rol SIEMPRE es 'creativo' por defecto.
-- La promoción a 'admin' o 'crm' se hace manualmente desde el dashboard
-- de Supabase o con una función segura ejecutada por un admin existente.
-- Nunca confiar en raw_user_meta_data.role — puede ser manipulado por el cliente.
create or replace function handle_new_user()
returns trigger as $$
declare
  v_name text;
begin
  -- Nombre: solo desde metadata (no el rol)
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    v_name,
    'creativo'  -- rol siempre seguro por defecto; admin promueve manualmente
  )
  on conflict (id) do nothing; -- idempotente: no rompe si ya existe

  return new;
end;
$$ language plpgsql security definer;

-- Helper de promoción de rol — solo ejecutable por admin autenticado
-- Uso: select promote_user_role('email@ejemplo.com', 'admin');
create or replace function promote_user_role(target_email text, new_role text)
returns void as $$
begin
  -- Solo un admin puede promover roles
  if not has_role('admin') then
    raise exception 'Solo un administrador puede cambiar roles de usuario.';
  end if;

  -- Solo roles válidos
  if new_role not in ('admin', 'crm', 'creativo', 'cliente') then
    raise exception 'Rol inválido: %. Roles permitidos: admin, crm, creativo, cliente', new_role;
  end if;

  update profiles set role = new_role, updated_at = now()
  where email = target_email;

  if not found then
    raise exception 'No se encontró usuario con email: %', target_email;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ══════════════════════════════════════════════════════════════
-- AUDIT TRAIL — tabla de registro inmutable
-- ══════════════════════════════════════════════════════════════
create table if not exists audit_logs (
  id          bigserial primary key,
  cliente_id  uuid references clientes(id) on delete set null,
  accion      text not null,
  actor       text,
  hash        text,
  ip          text,
  ts          timestamp with time zone default now(),
  detalle     jsonb
);
alter table audit_logs enable row level security;

-- Solo admin puede leer audit logs
create policy "audit_logs_select_admin"
  on audit_logs for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Insert permitido para usuarios autenticados (la app registra, no el cliente)
create policy "audit_logs_insert_auth"
  on audit_logs for insert
  with check (auth.uid() is not null);

-- Sin update ni delete — audit trail es inmutable
-- (no se crean policies de update/delete → ningún usuario puede modificar)

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — políticas por rol
-- ══════════════════════════════════════════════════════════════
alter table studio         enable row level security;
alter table team           enable row level security;
alter table clientes       enable row level security;
alter table proyectos      enable row level security;
alter table cobros         enable row level security;
alter table gastos         enable row level security;
alter table leads          enable row level security;
alter table notificaciones enable row level security;
alter table contratos      enable row level security;

-- Helper: verifica que el usuario tiene al menos uno de los roles indicados
create or replace function has_role(variadic allowed_roles text[])
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = any(allowed_roles)
  );
$$ language sql security definer stable;

-- ── STUDIO: solo admin lectura/escritura ──────────────────────
create policy "studio_admin_all"
  on studio for all
  using (has_role('admin'))
  with check (has_role('admin'));

-- ── TEAM: staff lectura | admin escritura ────────────────────
create policy "team_select_staff"
  on team for select
  using (has_role('admin','crm','creativo'));

create policy "team_insert_admin"
  on team for insert
  with check (has_role('admin'));

create policy "team_update_admin"
  on team for update
  using (has_role('admin'))
  with check (has_role('admin'));

create policy "team_delete_admin"
  on team for delete
  using (has_role('admin'));

-- ── CLIENTES: staff lectura | admin/crm escritura ───────────
create policy "clientes_select_staff"
  on clientes for select
  using (has_role('admin','crm','creativo'));

create policy "clientes_insert_admin_crm"
  on clientes for insert
  with check (has_role('admin','crm'));

create policy "clientes_update_admin_crm"
  on clientes for update
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

create policy "clientes_delete_admin_crm"
  on clientes for delete
  using (has_role('admin','crm'));

-- ── PROYECTOS: staff lectura | admin/creativo escritura ─────
create policy "proyectos_select_staff"
  on proyectos for select
  using (has_role('admin','crm','creativo'));

create policy "proyectos_insert_staff"
  on proyectos for insert
  with check (has_role('admin','creativo'));

create policy "proyectos_update_staff"
  on proyectos for update
  using (has_role('admin','creativo'))
  with check (has_role('admin','creativo'));

create policy "proyectos_delete_admin"
  on proyectos for delete
  using (has_role('admin'));

-- ── COBROS: solo admin ────────────────────────────────────────
create policy "cobros_admin_all"
  on cobros for all
  using (has_role('admin'))
  with check (has_role('admin'));

-- ── GASTOS: solo admin ────────────────────────────────────────
create policy "gastos_admin_all"
  on gastos for all
  using (has_role('admin'))
  with check (has_role('admin'));

-- ── LEADS: admin/crm ─────────────────────────────────────────
create policy "leads_staff_all"
  on leads for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

-- ── NOTIFICACIONES: staff lectura | admin escritura ─────────
create policy "notificaciones_select_staff"
  on notificaciones for select
  using (has_role('admin','crm','creativo'));

create policy "notificaciones_insert_admin"
  on notificaciones for insert
  with check (has_role('admin'));

create policy "notificaciones_update_admin"
  on notificaciones for update
  using (has_role('admin'))
  with check (has_role('admin'));

create policy "notificaciones_delete_admin"
  on notificaciones for delete
  using (has_role('admin'));

-- ── CONTRATOS: admin all | cliente puede leer el suyo ─────────
create policy "contratos_admin_all"
  on contratos for all
  using (has_role('admin'))
  with check (has_role('admin'));

create policy "contratos_cliente_select_own"
  on contratos for select
  using (
    exists (
      select 1 from profiles p
      join clientes c on c.email = p.email
      where p.id = auth.uid()
        and c.id = contratos.cliente_id
        and p.role = 'cliente'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- FUNCIÓN: updated_at automático
-- ══════════════════════════════════════════════════════════════
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_clientes  before update on clientes  for each row execute function update_updated_at();
create trigger set_updated_at_proyectos before update on proyectos for each row execute function update_updated_at();
create trigger set_updated_at_cobros    before update on cobros    for each row execute function update_updated_at();

-- ══════════════════════════════════════════════════════════════
-- SEED DATA — datos iniciales de Feria Design Studio
-- ══════════════════════════════════════════════════════════════

-- Studio
insert into studio (name, meta_objetivo, meta_actual, dias_restantes) values
  ('Feria Design Studio', 14000, 8400, 11)
on conflict do nothing;

-- Equipo
insert into team (name, initials, role, color, bg, brands, perms) values
  ('David',  'DA', 'Director',           '#C9A96E', 'rgba(201,169,110,0.15)', array['feria','bl'], 'admin'),
  ('Selene', 'SE', 'Estrategia · leads', '#4ECDC4', 'rgba(78,205,196,0.15)',  array['feria','bl'], 'crm'),
  ('Anthea', 'AN', 'Diseñadora',          '#D4537E', 'rgba(212,83,126,0.15)', array['bl'],          'creativo')
on conflict do nothing;

-- Clientes (usamos los IDs del equipo insertado arriba)
with eq as (select id from team where name = 'David' limit 1),
     anthea as (select id from team where name = 'Anthea' limit 1)
insert into clientes (nombre, tipo, email, brand, servicio, monto, stage, creativo_id, color)
select nombre, tipo, email, brand, servicio, monto, stage, creativo_id, color from (values
  ('ARKES Arquitectura',  'Estudio de arquitectura', 'contact@arkes.com',    'feria', 'Brand Identity', 4500, 6, (select id from eq),     '#5B9BD5'),
  ('Juan Pablo Velasco',  'Fotógrafo documental',    'jp@velasco.com',       'bl',    'Brand Identity', 2800, 2, (select id from anthea), '#D4537E'),
  ('Tania Torres',        'Fotógrafa newborn',        'tania@torres.com',    'bl',    'Brand Identity', 2400, 1, (select id from anthea), '#E8836A'),
  ('Sultán de los Andes', 'Licor artesanal',          'sultan@andes.com',    'feria', 'Brand Identity', 3200, 7, (select id from anthea), '#7BC67A'),
  ('URBEC Riobamba',      'Inmobiliaria',             'info@urbec.com',      'feria', 'Brand Identity', 3600, 3, (select id from anthea), '#C9A96E'),
  ('Mónica Samaniego',    'Psicóloga',                'monica@samaniego.com','feria', 'Brand Starter',  1800, 8, (select id from eq),     '#A78BFA'),
  ('Arturo Jiménez',      'Fotógrafo de bodas',       'arturo@artizwed.com', 'bl',    'Brand & Legacy', 3200, 9, (select id from anthea), '#E8836A')
) as v(nombre, tipo, email, brand, servicio, monto, stage, creativo_id, color)
on conflict do nothing;

-- Gastos
insert into gastos (nombre, cat, monto, status) values
  ('Arriendo oficina',  'Fijo',     800,  'paid'),
  ('Sueldo Selene',     'Equipo',  1200,  'paid'),
  ('Sueldo Anthea',     'Equipo',   900,  'pending'),
  ('Adobe CC',          'Software',  60,  'paid'),
  ('Figma Business',    'Software',  45,  'pending'),
  ('Google Drive',      'Software',  21,  'paid'),
  ('Hosting + dominio', 'Web',       45,  'paid'),
  ('Impuestos Q2',      'Legal',    790,  'overdue'),
  ('Tydical',           'Software',  29,  'paid')
on conflict do nothing;

-- Leads
insert into leads (nombre, email, brand, status, dias) values
  ('Nuevo estudio — referido Selene', 'nuevo@estudio.com', 'feria', 'caliente', 1),
  ('Fotógrafo Instagram',             'foto@ig.com',       'bl',    'tibio',    3),
  ('Restaurante Quito',               'quito@rest.com',    'feria', 'frío',     7)
on conflict do nothing;

-- Notificaciones
insert into notificaciones (tipo, titulo, descripcion, tiempo, leida) values
  ('urgente', 'Impuestos Q2 vencidos · $790',      '3 días de retraso. Regularizar antes del fin de mes.',              'Hace 10 min', false),
  ('trigger', 'Trigger activo · ARKES',             'Barra del cliente T−1. Link de presentación enviado.',              'Hace 1 hora', false),
  ('cobro',   'Cobro recibido · Juan Pablo',        '60% inicial confirmado — $1,680 via Wise.',                         'Hace 3 h',    true),
  ('review',  'Review pendiente · Sultán',          'Proyecto completo hace 1 día. Sin solicitud de review enviada.',    'Hace 1 día',  false),
  ('lead',    'Lead sin respuesta · 3 días',        'Nuevo prospecto web sin seguimiento de Selene.',                    'Hace 1 día',  true)
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════
-- FIN DEL SCHEMA
-- ══════════════════════════════════════════════════════════════

-- ── TAREAS (Kanban interno) ───────────────────────────────────────
create table if not exists tareas (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  titulo      text not null,
  columna     text not null default 'origen'
              check (columna in ('origen','exploracion','refinamiento','entrega','completado')),
  tags        text[] default '{}',
  subtareas   int[] default '{0,0}', -- [completadas, total]
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);
alter table tareas enable row level security;

create policy "tareas_select_staff"
  on tareas for select
  using (has_role('admin','crm','creativo'));

create policy "tareas_insert_staff"
  on tareas for insert
  with check (has_role('admin','creativo'));

create policy "tareas_update_staff"
  on tareas for update
  using (has_role('admin','creativo'))
  with check (has_role('admin','creativo'));

create policy "tareas_delete_admin"
  on tareas for delete
  using (has_role('admin'));

create trigger set_updated_at_tareas
  before update on tareas
  for each row execute function update_updated_at();

-- ── COTIZACIONES (historial de propuestas enviadas) ────────────────
create table if not exists cotizaciones (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid references clientes(id) on delete set null,
  cliente_nombre text,
  paquete        text,
  precio         numeric(10,2),
  descuento      numeric(5,2) default 0,
  total          numeric(10,2),
  items          jsonb,
  nota           text,
  validez        text,
  duracion       text,
  estado         text default 'enviada',
  enviado_via    text, -- 'whatsapp' | 'interno'
  created_at     timestamp with time zone default now()
);
alter table cotizaciones enable row level security;

create policy "cotizaciones_select_staff"
  on cotizaciones for select
  using (has_role('admin','crm'));

create policy "cotizaciones_insert_staff"
  on cotizaciones for insert
  with check (has_role('admin','crm'));

create policy "cotizaciones_update_admin"
  on cotizaciones for update
  using (has_role('admin'))
  with check (has_role('admin'));

create policy "cotizaciones_delete_admin"
  on cotizaciones for delete
  using (has_role('admin'));
create table if not exists reuniones (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  tipo         text default 'virtual',
  cliente      text,
  cliente_id   uuid references clientes(id) on delete set null,
  fecha        timestamp with time zone not null,
  duracion     int default 60,
  link         text,
  notas        text,
  confirmada   boolean default true,
  solicitud_cliente boolean default false,
  zoom_id      text,
  created_at   timestamp with time zone default now()
);
alter table reuniones enable row level security;
-- reuniones: staff lectura/escritura
create policy "reuniones_staff_all"
  on reuniones for all
  using (has_role('admin','crm','creativo'))
  with check (has_role('admin','crm','creativo'));

-- ── CONVERSACIONES (Mensajes — etiquetas persistentes) ───────────
create table if not exists conversaciones (
  id         uuid primary key default gen_random_uuid(),
  conv_id    text unique not null,
  etiqueta   text,
  nombre     text,
  canal      text,
  updated_at timestamp with time zone default now()
);
alter table conversaciones enable row level security;
-- conversaciones: admin/crm
create policy "conversaciones_staff_all"
  on conversaciones for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

-- ── MENSAJES META (WhatsApp + Instagram + Messenger) ─────────────
create table if not exists mensajes_meta (
  id           uuid primary key default gen_random_uuid(),
  conv_id      text not null,
  canal        text not null,  -- 'whatsapp' | 'instagram' | 'facebook'
  nombre       text,
  texto        text not null,
  from_cliente boolean default true,
  timestamp    timestamp with time zone default now(),
  meta_msg_id  text,
  leido        boolean default false,
  created_at   timestamp with time zone default now()
);
create index if not exists idx_mensajes_conv_id on mensajes_meta(conv_id);
alter table mensajes_meta enable row level security;
-- mensajes_meta: admin/crm
create policy "mensajes_meta_staff_all"
  on mensajes_meta for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

-- Agregar columnas a conversaciones si no existen
alter table conversaciones add column if not exists telefono text;
alter table conversaciones add column if not exists no_leidos int default 0;
alter table conversaciones add column if not exists ultimo_mensaje text;
alter table conversaciones add column if not exists ultimo_mensaje_at timestamp with time zone;

-- ── FUNCIÓN para incrementar no_leidos ───────────────────────────
create or replace function increment_unread(p_conv_id text)
returns void language sql as $$
  update conversaciones set no_leidos = coalesce(no_leidos, 0) + 1 where conv_id = p_conv_id;
$$;

-- ── PORTAL PROGRESO (brief + aprobaciones del cliente) ───────────
create table if not exists portal_progreso (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references clientes(id) on delete cascade unique,
  sentir_data     jsonb,
  aprobaciones    jsonb,
  reunion_confirmada jsonb,
  updated_at      timestamp with time zone default now()
);
alter table portal_progreso enable row level security;
-- portal_progreso: admin all + cliente puede leer/actualizar el suyo
create policy "portal_progreso_admin"
  on portal_progreso for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

create policy "portal_progreso_cliente_select"
  on portal_progreso for select
  using (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = portal_progreso.cliente_id and p.role = 'cliente'
    )
  );

create policy "portal_progreso_cliente_update"
  on portal_progreso for update
  using (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = portal_progreso.cliente_id and p.role = 'cliente'
    )
  )
  with check (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = portal_progreso.cliente_id and p.role = 'cliente'
    )
  );

-- (contratos definida arriba — ver línea ~111)

-- ── BRIEFS ───────────────────────────────────────────────────────
create table if not exists briefs (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid unique references clientes(id) on delete cascade,
  respuestas  jsonb,
  completado  boolean default false,
  updated_at  timestamp with time zone default now()
);
alter table briefs enable row level security;
-- briefs: admin/crm all + cliente puede insertar/editar el suyo
create policy "briefs_staff_all"
  on briefs for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

create policy "briefs_cliente_insert"
  on briefs for insert
  with check (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = briefs.cliente_id and p.role = 'cliente'
    )
  );

create policy "briefs_cliente_update"
  on briefs for update
  using (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = briefs.cliente_id and p.role = 'cliente'
    )
  )
  with check (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = briefs.cliente_id and p.role = 'cliente'
    )
  );

-- ── APROBACIONES ─────────────────────────────────────────────────
create table if not exists aprobaciones (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid references clientes(id) on delete cascade,
  aprobacion_id  text,
  aprobado       boolean default false,
  fecha          timestamp with time zone default now(),
  unique(cliente_id, aprobacion_id)
);
alter table aprobaciones enable row level security;
-- aprobaciones: admin/crm all + cliente puede registrar la suya
create policy "aprobaciones_staff_all"
  on aprobaciones for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));
create policy "aprobaciones_cliente_insert"
  on aprobaciones for insert
  with check (
    exists (
      select 1 from profiles p join clientes c on c.email = p.email
      where p.id = auth.uid() and c.id = aprobaciones.cliente_id and p.role = 'cliente'
    )
  );
