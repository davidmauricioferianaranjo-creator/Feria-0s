-- ── 018_cotizaciones_categorias.sql ────────────────────────────────────────
-- Tablas para gestionar categorías y paquetes de cotización desde Feria OS.
-- Esto permite que Admin edite paquetes sin tocar código.
-- Por ahora los paquetes viven en src/lib/packages.js.
-- Esta migración prepara la infraestructura para cuando se migre a DB.

-- ── CATEGORÍAS DE SERVICIO ───────────────────────────────────────────────
create table if not exists categorias_servicio (
  id          text primary key,
  nombre      text not null,
  subtitulo   text,
  brand       text default 'feria',
  color       text,
  icono       text,
  orden       int  default 99,
  activa      boolean default true,
  created_at  timestamp with time zone default now()
);

alter table categorias_servicio enable row level security;
create policy "categorias_select_all"   on categorias_servicio for select using (true);
create policy "categorias_modify_admin" on categorias_servicio for all    using (has_role('admin'));

-- ── PAQUETES DE COTIZACIÓN ───────────────────────────────────────────────
create table if not exists paquetes_cotizacion (
  id           text primary key,
  categoria_id text references categorias_servicio(id) on delete cascade,
  nombre       text not null,
  subtitulo    text,
  precio       numeric(10,2) not null,
  duracion     text,
  items        jsonb default '[]'::jsonb,  -- array de strings
  visible      boolean default true,
  featured     boolean default false,
  orden        int   default 99,
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now()
);

alter table paquetes_cotizacion enable row level security;
create policy "paquetes_select_all"   on paquetes_cotizacion for select using (true);
create policy "paquetes_modify_admin" on paquetes_cotizacion for all    using (has_role('admin', 'crm'));

-- ── COTIZACIONES ENVIADAS ─────────────────────────────────────────────────
-- Historial persistente de cotizaciones enviadas a clientes.
create table if not exists cotizaciones_enviadas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references clientes(id) on delete set null,
  cliente_nombre  text,
  paquete_id      text,
  paquete_nombre  text,
  categoria_id    text,
  precio_total    numeric(10,2),
  descuento       int default 0,
  duracion        text,
  items           jsonb default '[]'::jsonb,
  nota            text,
  validez         text default '10 días',
  enviado_por     text[],         -- ['whatsapp', 'email']
  public_slug     text unique,    -- para la URL pública /c/[slug]
  visto_en        timestamp with time zone,  -- cuando el cliente abrió el link
  created_at      timestamp with time zone default now(),
  created_by      uuid references auth.users(id) on delete set null
);

alter table cotizaciones_enviadas enable row level security;
create policy "cotizaciones_select_staff" on cotizaciones_enviadas for select using (has_role('admin','crm'));
create policy "cotizaciones_insert_staff" on cotizaciones_enviadas for insert with check (has_role('admin','crm'));
create policy "cotizaciones_update_staff" on cotizaciones_enviadas for update using (has_role('admin','crm'));
create policy "cotizaciones_select_public" on cotizaciones_enviadas for select using (public_slug is not null);

-- ── SEED INICIAL (categorías) ─────────────────────────────────────────────
insert into categorias_servicio (id, nombre, subtitulo, brand, icono, orden) values
  ('branding', 'Branding Corporativo', 'Identidad visual para empresas y marcas', 'feria', '◈', 1),
  ('bl',       'Brand & Legacy',       'Branding para fotógrafos y videógrafos',  'bl',    '◉', 2),
  ('arte',     'Dirección de Arte',    'Concepto creativo para campañas',          'feria', '◇', 3)
on conflict (id) do nothing;
