-- Feria OS v70 — contratos profesionales, paquetes, aplicaciones y producción interna
-- Ejecutar después de 007_v69_client_portal_auto_access.sql

-- ── CONTRATOS: firma visual + PDF final ─────────────────────────────
alter table contratos add column if not exists studio_signature_label text default 'David Mauricio Feria Naranjo — CEO Fundador · Feria Design Studio';
alter table contratos add column if not exists client_signature_name text;
alter table contratos add column if not exists client_signature_image_url text;
alter table contratos add column if not exists client_signed_email text;
alter table contratos add column if not exists client_signed_ip text;
alter table contratos add column if not exists final_pdf_url text;
alter table contratos add column if not exists locked_at timestamp with time zone;
alter table contratos add column if not exists sent_copy_at timestamp with time zone;

-- ── CLIENTES: WhatsApp y estado de acceso ───────────────────────────
alter table clientes add column if not exists portal_access_whatsapp_sent_at timestamp with time zone;
alter table clientes add column if not exists portal_password_must_change boolean default true;
alter table clientes add column if not exists whatsapp text;

-- ── PROYECTOS: fechas separadas y paquete ───────────────────────────
alter table proyectos add column if not exists client_due_date date;
alter table proyectos add column if not exists internal_due_date date;
alter table proyectos add column if not exists package_name text;
alter table proyectos add column if not exists package_app_limit integer default 0;
alter table proyectos add column if not exists service_type text;
alter table proyectos add column if not exists assigned_reviewer_id text;
alter table proyectos add column if not exists production_status text default 'pendiente';
create index if not exists idx_proyectos_internal_due_date on proyectos(internal_due_date);
create index if not exists idx_proyectos_package_name on proyectos(package_name);

-- ── PLANTILLAS EDITABLES DEL SISTEMA ────────────────────────────────
create table if not exists automatic_message_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text unique not null,
  label text not null,
  channel text not null default 'email',
  subject text,
  body text not null,
  required_variables text[] default array[]::text[],
  active boolean default true,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table automatic_message_templates enable row level security;
drop policy if exists "templates_read_staff" on automatic_message_templates;
drop policy if exists "templates_write_admin_crm" on automatic_message_templates;
create policy "templates_read_staff" on automatic_message_templates for select
  using (has_role('admin','crm'));
create policy "templates_write_admin_crm" on automatic_message_templates for all
  using (has_role('admin','crm'))
  with check (has_role('admin','crm'));

insert into automatic_message_templates (template_key, label, channel, subject, body, required_variables)
values
('portal_access_email', 'Acceso del cliente al portal · correo', 'email', 'Tu acceso al portal de Feria Design Studio',
'Hola, {{nombre_cliente}}.

Tu proyecto con {{nombre_estudio}} ya está activo.

Hemos creado tu acceso al portal, donde podrás completar tu brief, revisar información importante de tu proyecto y avanzar con las siguientes etapas.

Puedes ingresar aquí:
{{portal_url}}

Usuario:
{{email_cliente}}

Contraseña temporal:
{{password_temporal}}

Por seguridad, te recomendamos cambiar tu contraseña después de ingresar por primera vez.

Con cariño,
{{nombre_estudio}}',
array['{{nombre_cliente}}','{{email_cliente}}','{{password_temporal}}','{{portal_url}}']),
('portal_access_whatsapp', 'Acceso del cliente al portal · WhatsApp', 'whatsapp', null,
'Hola, {{nombre_cliente}}. Tu acceso al portal de {{nombre_estudio}} ya está listo.

Ingresa aquí:
{{portal_url}}

Usuario: {{email_cliente}}
Contraseña temporal: {{password_temporal}}

Te recomendamos cambiar tu contraseña después de ingresar por primera vez.',
array['{{nombre_cliente}}','{{email_cliente}}','{{password_temporal}}','{{portal_url}}'])
on conflict (template_key) do nothing;

-- ── CATÁLOGO DE APLICACIONES ───────────────────────────────────────
create table if not exists application_catalog (
  id text primary key,
  name text not null,
  category text,
  base_price numeric default 0,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

insert into application_catalog (id, name, category, base_price, sort_order) values
('logo_principal','Logotipo principal','Identidad',0,1),
('variaciones_marca','Variaciones de marca','Identidad',0,2),
('manual_marca','Manual de marca','Identidad',0,3),
('tarjeta_presentacion','Tarjeta de presentación','Papelería',80,4),
('firma_correo','Firma de correo','Papelería',60,5),
('hoja_membretada','Hoja membretada','Papelería',75,6),
('carpeta_corporativa','Carpeta corporativa','Papelería',120,7),
('plantilla_post','Plantilla de post Instagram','Social media',95,8),
('plantilla_story','Plantilla de historia Instagram','Social media',75,9),
('portada_destacados','Portadas de destacados','Social media',70,10),
('presentacion_comercial','Presentación comercial','Comercial',220,11),
('brochure','Brochure / dossier','Comercial',240,12),
('landing_visual','Landing page visual','Digital',280,13),
('empaque','Diseño de empaque','Producto',320,14),
('etiqueta','Etiqueta de producto','Producto',180,15),
('menu','Menú / carta','Gastronomía',180,16),
('uniforme','Aplicación en uniforme','Experiencia',150,17),
('senaletica','Señalética básica','Experiencia',220,18),
('sticker','Sticker / sello','Experiencia',65,19)
on conflict (id) do update set name=excluded.name, category=excluded.category, base_price=excluded.base_price, sort_order=excluded.sort_order, updated_at=now();

alter table application_catalog enable row level security;
drop policy if exists "application_catalog_read_staff" on application_catalog;
create policy "application_catalog_read_staff" on application_catalog for select using (has_role('admin','crm','creativo'));

-- ── REGLAS DE PAQUETE ──────────────────────────────────────────────
create table if not exists package_rules (
  id uuid primary key default gen_random_uuid(),
  package_name text unique not null,
  included_applications integer not null default 0,
  default_service text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

insert into package_rules (package_name, included_applications, default_service) values
('Paquete 1',3,'Branding'),
('Paquete 2',5,'Branding'),
('Paquete 3',8,'Branding'),
('Paquete 4',12,'Branding'),
('Brand Starter',3,'Branding'),
('Brand Identity',5,'Branding'),
('Brand & Legacy',5,'Branding para Fotógrafos'),
('Dirección de Arte',3,'Dirección de Arte'),
('Naming',0,'Naming'),
('Web',3,'Web')
on conflict (package_name) do update set included_applications=excluded.included_applications, default_service=excluded.default_service, updated_at=now();

alter table package_rules enable row level security;
drop policy if exists "package_rules_read_staff" on package_rules;
create policy "package_rules_read_staff" on package_rules for select using (has_role('admin','crm','creativo'));

-- ── APLICACIONES POR PROYECTO ─────────────────────────────────────
create table if not exists project_applications (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  application_id text references application_catalog(id),
  name text not null,
  category text,
  status text default 'pendiente',
  is_extra boolean default false,
  extra_price numeric default 0,
  extra_status text default 'incluida', -- incluida | pendiente_pago | pagada | descartada
  cobro_id uuid references cobros(id) on delete set null,
  selected_by text default 'admin',
  sort_order integer default 0,
  is_demo boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table project_applications enable row level security;
drop policy if exists "project_applications_read_staff" on project_applications;
drop policy if exists "project_applications_write_staff" on project_applications;
create policy "project_applications_read_staff" on project_applications for select using (has_role('admin','crm','creativo'));
create policy "project_applications_write_staff" on project_applications for all using (has_role('admin','crm')) with check (has_role('admin','crm'));
create index if not exists idx_project_applications_proyecto_id on project_applications(proyecto_id);
create index if not exists idx_project_applications_extra_status on project_applications(extra_status);

-- ── COMENTARIOS DE REVISIÓN POR AVANCE/PÁGINA ─────────────────────
create table if not exists project_update_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid references project_updates(id) on delete cascade,
  proyecto_id uuid references proyectos(id) on delete cascade,
  page_ref text,
  body text not null,
  created_by uuid references profiles(id) on delete set null,
  is_demo boolean default false,
  created_at timestamp with time zone default now()
);

alter table project_update_comments enable row level security;
drop policy if exists "project_update_comments_staff" on project_update_comments;
create policy "project_update_comments_staff" on project_update_comments for all
  using (has_role('admin','crm','creativo')) with check (has_role('admin','crm','creativo'));

-- ── CHAT INTERNO POR PROYECTO ─────────────────────────────────────
create table if not exists project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  sender_name text,
  message text not null,
  mentions text[] default array[]::text[],
  attachment_url text,
  pinned boolean default false,
  is_demo boolean default false,
  created_at timestamp with time zone default now(),
  read_by uuid[] default array[]::uuid[]
);

alter table project_chat_messages enable row level security;
drop policy if exists "project_chat_staff" on project_chat_messages;
create policy "project_chat_staff" on project_chat_messages for all
  using (has_role('admin','crm','creativo')) with check (has_role('admin','crm','creativo'));
create index if not exists idx_project_chat_proyecto_id on project_chat_messages(proyecto_id);

-- ── AVANCES: soporte de archivo, tipo y feedback ordenado ─────────
alter table project_updates add column if not exists file_type text;
alter table project_updates add column if not exists version_label text;
alter table project_updates add column if not exists organized_feedback text;
alter table project_updates add column if not exists application_id uuid references project_applications(id) on delete set null;

-- ── LIMPIEZA DEMO EXTENDIDA ───────────────────────────────────────
create index if not exists idx_project_applications_is_demo on project_applications(is_demo);
create index if not exists idx_project_chat_is_demo on project_chat_messages(is_demo);
create index if not exists idx_project_update_comments_is_demo on project_update_comments(is_demo);
