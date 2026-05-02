-- ── STUDIO ───────────────────────────────────────────────────────
create table if not exists studio (
  id             uuid primary key default gen_random_uuid(),
  name           text default 'Feria Design Studio',
  meta_objetivo  int  default 14000,
  meta_actual    int  default 0,
  color_principal text default '#C9A96E',
  logo_url       text,
  created_at     timestamp with time zone default now()
);
insert into studio (name) values ('Feria Design Studio') on conflict do nothing;
alter table studio enable row level security;
create policy "studio_read_staff"   on studio for select  using (has_role('admin','crm','creativo'));
create policy "studio_update_admin" on studio for update  using (has_role('admin'));

-- ── TEAM ─────────────────────────────────────────────────────────
create table if not exists team (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  initials text,
  role     text,
  email    text unique,
  color    text default '#C9A96E',
  perms    text default 'creativo',
  brand    text default 'feria',
  created_at timestamp with time zone default now()
);
alter table team enable row level security;
create policy "team_read_staff"   on team for select  using (has_role('admin','crm','creativo'));
create policy "team_write_admin"  on team for all     using (has_role('admin'));

-- ── CLIENTES ─────────────────────────────────────────────────────
create table if not exists clientes (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  email     text,
  telefono  text,
  empresa   text,
  tipo      text,
  servicio  text default 'Brand Identity',
  monto     numeric(10,2) default 0,
  stage     int  default 0,
  brand     text default 'feria',
  color     text default '#5B9BD5',
  creativo_id uuid,
  notas     text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table clientes enable row level security;
create policy "clientes_read_staff"  on clientes for select  using (has_role('admin','crm','creativo'));
create policy "clientes_write_staff" on clientes for insert with check (has_role('admin','crm'));
create policy "clientes_update_crm"  on clientes for update  using (has_role('admin','crm'));
create policy "clientes_delete_admin" on clientes for delete using (has_role('admin'));

-- ── PROYECTOS ────────────────────────────────────────────────────
create table if not exists proyectos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid references clientes(id) on delete cascade,
  nombre         text not null,
  estado         text default 'EL ORIGEN',
  fase           int  default 0,
  pct_interno    int  default 0 check (pct_interno between 0 and 100),
  pct_cliente    int  default 0 check (pct_cliente between 0 and 100),
  dias_entrega   int  default 45,
  dias_ejecucion int  default 0,
  brand          text default 'feria',
  creativo_id    uuid references team(id),
  fecha_inicio   date,
  fecha_entrega  date,
  prioridad      text default 'normal',
  created_at     timestamp with time zone default now(),
  updated_at     timestamp with time zone default now()
);
alter table proyectos enable row level security;
create policy "proyectos_read_staff"   on proyectos for select  using (has_role('admin','crm','creativo'));
create policy "proyectos_write_staff"  on proyectos for all     using (has_role('admin','crm','creativo'));

-- ── COBROS ───────────────────────────────────────────────────────
create table if not exists cobros (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete set null,
  nombre      text not null,
  monto       numeric(10,2) not null,
  tipo        text default 'Anticipo 60%',
  status      text default 'pending' check (status in ('paid','pending','overdue','cancelled')),
  vence       date,
  via         text default 'Transferencia',
  stripe_id   text,
  created_at  timestamp with time zone default now()
);
alter table cobros enable row level security;
create policy "cobros_read_staff"   on cobros for select  using (has_role('admin','crm'));
create policy "cobros_write_admin"  on cobros for all     using (has_role('admin','crm'));

-- ── GASTOS ───────────────────────────────────────────────────────
create table if not exists gastos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  cat         text default 'Otros',
  monto       numeric(10,2) not null,
  fecha       date default current_date,
  status      text default 'pendiente' check (status in ('pagado','pendiente','recurrente')),
  via         text default 'Tarjeta de crédito',
  responsable text,
  cliente_id  uuid references clientes(id) on delete set null,
  created_at  timestamp with time zone default now()
);
alter table gastos enable row level security;
create policy "gastos_read_admin" on gastos for select  using (has_role('admin','crm'));
create policy "gastos_write_admin" on gastos for all    using (has_role('admin'));

-- ── LEADS ────────────────────────────────────────────────────────
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  email      text,
  telefono   text,
  brand      text default 'feria',
  status     text default 'nuevo',
  fuente     text,
  notas      text,
  dias       int  default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table leads enable row level security;
create policy "leads_read_crm"  on leads for select using (has_role('admin','crm'));
create policy "leads_write_crm" on leads for all    using (has_role('admin','crm'));

-- ── NOTIFICACIONES ───────────────────────────────────────────────
create table if not exists notificaciones (
  id          uuid primary key default gen_random_uuid(),
  tipo        text,
  titulo      text not null,
  descripcion text,
  leida       boolean default false,
  created_at  timestamp with time zone default now()
);
alter table notificaciones enable row level security;
create policy "notifs_read_staff"  on notificaciones for select  using (has_role('admin','crm','creativo'));
create policy "notifs_write_staff" on notificaciones for all     using (has_role('admin','crm','creativo'));
