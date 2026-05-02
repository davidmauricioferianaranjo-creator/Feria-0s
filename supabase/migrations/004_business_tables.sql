-- ── CONTRATOS ────────────────────────────────────────────────────
create table if not exists contratos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid unique references clientes(id) on delete cascade,
  firmante     text,
  firmante_doc text,
  fecha_firma  timestamp with time zone default now(),
  hash_firma   text,
  contenido    text,
  status       text default 'firmado',
  created_at   timestamp with time zone default now()
);
alter table contratos enable row level security;
create policy "contratos_read_staff" on contratos for select using (has_role('admin','crm'));
create policy "contratos_write_staff" on contratos for all   using (has_role('admin','crm'));

-- ── BRIEFS ───────────────────────────────────────────────────────
create table if not exists briefs (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid unique references clientes(id) on delete cascade,
  respuestas  jsonb,
  completado  boolean default false,
  updated_at  timestamp with time zone default now()
);
alter table briefs enable row level security;
create policy "briefs_read_staff"   on briefs for select using (has_role('admin','crm','creativo'));
create policy "briefs_write_staff"  on briefs for all    using (has_role('admin','crm','creativo'));

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
create policy "aprob_read_staff"  on aprobaciones for select using (has_role('admin','crm','creativo'));
create policy "aprob_write_staff" on aprobaciones for all    using (has_role('admin','crm','creativo'));

-- ── REUNIONES ────────────────────────────────────────────────────
create table if not exists reuniones (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid references clientes(id) on delete set null,
  titulo       text not null,
  fecha        date not null,
  hora         text not null,
  tipo         text default 'virtual',
  zoom_link    text,
  zoom_id      text,
  notas        text,
  estado       text default 'confirmada',
  created_at   timestamp with time zone default now()
);
alter table reuniones enable row level security;
create policy "reuniones_read_staff"  on reuniones for select using (has_role('admin','crm','creativo'));
create policy "reuniones_write_staff" on reuniones for all    using (has_role('admin','crm','creativo'));

-- ── CONVERSACIONES (Mensajes Meta) ───────────────────────────────
create table if not exists conversaciones (
  id                 uuid primary key default gen_random_uuid(),
  conv_id            text unique not null,
  canal              text not null,
  nombre             text,
  telefono           text,
  etiqueta           text default 'nuevo',
  ultimo_mensaje     text,
  ultimo_mensaje_at  timestamp with time zone,
  no_leidos          int default 0,
  updated_at         timestamp with time zone default now()
);
alter table conversaciones enable row level security;
create policy "convs_read_crm"  on conversaciones for select using (has_role('admin','crm'));
create policy "convs_write_crm" on conversaciones for all    using (has_role('admin','crm'));

-- ── MENSAJES META ────────────────────────────────────────────────
create table if not exists mensajes_meta (
  id           uuid primary key default gen_random_uuid(),
  conv_id      text not null,
  canal        text not null,
  nombre       text,
  texto        text not null,
  tipo         text default 'text',
  media_id     text,
  media_url    text,
  mime_type    text,
  from_cliente boolean default true,
  timestamp    timestamp with time zone default now(),
  meta_msg_id  text,
  leido        boolean default false,
  created_at   timestamp with time zone default now()
);
create index if not exists idx_mensajes_conv_id on mensajes_meta(conv_id);
alter table mensajes_meta enable row level security;
create policy "msgs_read_crm"  on mensajes_meta for select using (has_role('admin','crm'));
create policy "msgs_write_crm" on mensajes_meta for all    using (has_role('admin','crm'));

-- ── RECORDATORIOS ────────────────────────────────────────────────
create table if not exists recordatorios (
  id                uuid primary key default gen_random_uuid(),
  cliente_email     text,
  cliente_whatsapp  text,
  cliente_nombre    text,
  tipo              text,
  mensaje_email     text,
  mensaje_wp        text,
  enviar_at         timestamp with time zone,
  enviado           boolean default false,
  created_at        timestamp with time zone default now()
);
alter table recordatorios enable row level security;
create policy "recordatorios_read_admin"  on recordatorios for select using (has_role('admin'));
create policy "recordatorios_insert_crm"  on recordatorios for insert with check (has_role('admin','crm'));
create policy "recordatorios_update_admin" on recordatorios for update using (has_role('admin'));

-- ── COTIZACIONES ─────────────────────────────────────────────────
create table if not exists cotizaciones (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete set null,
  paquete     text,
  monto       numeric(10,2),
  total       numeric(10,2),
  descuento   int default 0,
  status      text default 'enviada',
  enviada_at  timestamp with time zone,
  created_at  timestamp with time zone default now()
);
alter table cotizaciones enable row level security;
create policy "cots_read_crm"  on cotizaciones for select using (has_role('admin','crm'));
create policy "cots_write_crm" on cotizaciones for all    using (has_role('admin','crm'));

-- ── AUDIT LOGS ───────────────────────────────────────────────────
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  accion     text not null,
  tabla      text,
  registro_id text,
  detalle    jsonb,
  created_at timestamp with time zone default now()
);
alter table audit_logs enable row level security;
create policy "audit_read_admin"   on audit_logs for select using (has_role('admin'));
create policy "audit_insert_staff" on audit_logs for insert with check (has_role('admin','crm','creativo'));

-- ── TAREAS (Kanban) ───────────────────────────────────────────────
create table if not exists tareas (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  titulo      text not null,
  columna     text not null default 'origen',
  tags        text[] default '{}',
  subtareas   int[] default '{0,0}',
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);
alter table tareas enable row level security;
create policy "tareas_read_staff"  on tareas for select using (has_role('admin','crm','creativo'));
create policy "tareas_write_staff" on tareas for all    using (has_role('admin','crm','creativo'));

-- ── INCREMENT UNREAD (función para mensajes) ──────────────────────
create or replace function increment_unread(p_conv_id text)
returns void language sql as $$
  update conversaciones set no_leidos = coalesce(no_leidos, 0) + 1 where conv_id = p_conv_id;
$$;

-- ── PORTAL PROGRESO ──────────────────────────────────────────────
create table if not exists portal_progreso (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid unique references clientes(id) on delete cascade,
  data       jsonb default '{}',
  updated_at timestamp with time zone default now()
);
alter table portal_progreso enable row level security;
create policy "portal_read_staff"  on portal_progreso for select using (has_role('admin','crm','creativo'));
create policy "portal_write_staff" on portal_progreso for all    using (has_role('admin','crm','creativo'));
