-- Feria OS v72 — plantillas por sección, conversión de pauta y permisos de producción
-- Ejecutar después de 009_v71_designer_assignment.sql

-- ── PLANTILLAS DE MENSAJES POR SECCIÓN ───────────────────────────
alter table automatic_message_templates add column if not exists section text default 'General';
create index if not exists idx_automatic_message_templates_section on automatic_message_templates(section);

update automatic_message_templates set section = 'Portal cliente' where template_key in ('portal_access_email','portal_access_whatsapp') and (section is null or section = 'General');

insert into automatic_message_templates (template_key, section, label, channel, subject, body, required_variables)
values
('contracts_signed_email', 'Contratos', 'Contrato firmado · correo', 'email', 'Tu contrato firmado con Feria Design Studio',
'Hola, {{nombre_cliente}}.

Adjuntamos el contrato firmado de tu proyecto con {{nombre_estudio}}.

Este documento confirma el inicio formal del proceso y queda disponible también en tu portal.

Con cariño,
{{nombre_estudio}}',
array['{{nombre_cliente}}','{{nombre_estudio}}']),

('quotes_email', 'Cotizaciones', 'Cotización enviada · correo', 'email', 'Tu cotización de Feria Design Studio',
'Hola, {{nombre_cliente}}.

Te compartimos la cotización preparada para tu proyecto.

Servicio: {{servicio}}
Paquete: {{paquete}}
Valor: {{valor_cotizacion}}

Puedes revisarla aquí:
{{cotizacion_url}}

Quedamos atentos a tus comentarios.

Con cariño,
{{nombre_estudio}}',
array['{{nombre_cliente}}','{{servicio}}','{{cotizacion_url}}']),

('quotes_whatsapp', 'Cotizaciones', 'Cotización enviada · WhatsApp', 'whatsapp', null,
'Hola, {{nombre_cliente}}. Ya está lista tu cotización de {{nombre_estudio}}.

Servicio: {{servicio}}
Paquete: {{paquete}}

Puedes revisarla aquí:
{{cotizacion_url}}',
array['{{nombre_cliente}}','{{servicio}}','{{cotizacion_url}}']),

('postventa_email', 'Postventa', 'Seguimiento postventa · correo', 'email', 'Seguimiento de tu proyecto con Feria Design Studio',
'Hola, {{nombre_cliente}}.

Queremos saber cómo te has sentido con la entrega de tu proyecto y si existe algo que podamos acompañar en esta nueva etapa.

Puedes responder a este correo o escribirnos por WhatsApp.

Con cariño,
{{nombre_estudio}}',
array['{{nombre_cliente}}','{{nombre_estudio}}']),

('postventa_whatsapp', 'Postventa', 'Seguimiento postventa · WhatsApp', 'whatsapp', null,
'Hola, {{nombre_cliente}}. Queríamos saber cómo te has sentido con la entrega de tu proyecto y si hay algo en lo que podamos acompañarte.',
array['{{nombre_cliente}}'])
on conflict (template_key) do update set
  section = excluded.section,
  label = excluded.label,
  channel = excluded.channel,
  subject = excluded.subject,
  body = excluded.body,
  required_variables = excluded.required_variables,
  updated_at = now();

-- ── CONTROL DE CONVERSIÓN DE PAUTA ────────────────────────────────
create table if not exists marketing_performance (
  id uuid primary key default gen_random_uuid(),
  period_start date not null default date_trunc('month', now())::date,
  owner_name text default 'Selena',
  channel text default 'Meta Ads',
  brand text default 'feria',
  invested_amount numeric default 0,
  converted_amount numeric default 0,
  leads_count integer default 0,
  clients_count integer default 0,
  notes text,
  is_demo boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table marketing_performance enable row level security;
drop policy if exists "marketing_performance_read_admin_crm" on marketing_performance;
drop policy if exists "marketing_performance_write_admin_crm" on marketing_performance;
create policy "marketing_performance_read_admin_crm" on marketing_performance for select using (has_role('admin','crm'));
create policy "marketing_performance_write_admin_crm" on marketing_performance for all using (has_role('admin','crm')) with check (has_role('admin','crm'));

create index if not exists idx_marketing_performance_period on marketing_performance(period_start desc);
create index if not exists idx_marketing_performance_brand on marketing_performance(brand);
create index if not exists idx_marketing_performance_is_demo on marketing_performance(is_demo);

-- Regla operativa: los diseñadores no tienen política de lectura sobre montos de pauta ni finanzas.
-- En UI, los valores de aplicaciones extra se ocultan para rol creativo.
