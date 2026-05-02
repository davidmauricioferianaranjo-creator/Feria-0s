-- Feria OS v80 — material del proyecto, plantillas flujo cliente y vista lista/bloques
alter table proyectos add column if not exists package_price numeric default 0;
create index if not exists idx_proyectos_package_price on proyectos(package_price);

insert into automatic_message_templates (template_key, section, label, channel, subject, body, required_variables, active)
values
('project_brief_completed_email','Flujo del proyecto','Brief completado / inicio · correo','email','Hemos recibido tu brief, {{nombre_cliente}}','Hola, {{nombre_cliente}}.

Hemos recibido el brief de {{nombre_proyecto}} y el desarrollo de tu proyecto acaba de iniciar.

Desde tu portal podrás ver el avance del proceso y los próximos pasos.

Ingresa aquí:
{{portal_url}}

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}','{{nombre_estudio}}'], true),
('project_brief_completed_whatsapp','Flujo del proyecto','Brief completado / inicio · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. Hemos recibido el brief de {{nombre_proyecto}} y el desarrollo acaba de iniciar. Puedes revisar el avance aquí: {{portal_url}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}'], true),
('project_midpoint_email','Flujo del proyecto','Mitad del proceso · correo','email','Tu proyecto avanza con nuestros creativos','Hola, {{nombre_cliente}}.

Estamos en una etapa importante de {{nombre_proyecto}}. Nuestros creativos están preparando los ingredientes de tu proyecto para que cada decisión tenga intención, claridad y coherencia.

Días restantes estimados: {{dias_restantes}}.

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{dias_restantes}}','{{nombre_estudio}}'], true),
('project_midpoint_whatsapp','Flujo del proyecto','Mitad del proceso · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. Nuestros creativos están preparando los ingredientes de {{nombre_proyecto}}. Días restantes estimados: {{dias_restantes}}.', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{dias_restantes}}'], true),
('project_cooking_email','Flujo del proyecto','Etapa final / cocinando · correo','email','Tu proyecto se está cocinando','Hola, {{nombre_cliente}}.

Tu proyecto {{nombre_proyecto}} se está cocinando. Estamos afinando los detalles para que pronto pueda pasar a revisión.

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{nombre_estudio}}'], true),
('project_cooking_whatsapp','Flujo del proyecto','Etapa final / cocinando · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. Tu proyecto {{nombre_proyecto}} se está cocinando. Muy pronto estará listo para revisión.', array['{{nombre_cliente}}','{{nombre_proyecto}}'], true),
('project_meeting_enabled_email','Flujo del proyecto','Activación de reunión · correo','email','Ha llegado el momento de agendar tu reunión','Hola, {{nombre_cliente}}.

Ha llegado el momento de elegir la fecha y hora de tu reunión para revisar {{nombre_proyecto}}.

Ingresa a tu portal y selecciona el horario que mejor funcione para ti:
{{portal_url}}

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}','{{nombre_estudio}}'], true),
('project_meeting_enabled_whatsapp','Flujo del proyecto','Activación de reunión · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. Ya puedes elegir fecha y hora para la reunión de {{nombre_proyecto}}. Ingresa aquí: {{portal_url}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}'], true),
('project_approval_ready_email','Flujo del proyecto','Proyecto listo para aprobación · correo','email','Tu proyecto está listo para aprobación','Hola, {{nombre_cliente}}.

Tu proyecto {{nombre_proyecto}} está listo para aprobación. Ya puedes ingresar al portal, revisar los archivos y aprobar o solicitar ajustes.

Ingresa aquí:
{{portal_url}}

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}','{{nombre_estudio}}'], true),
('project_approval_ready_whatsapp','Flujo del proyecto','Proyecto listo para aprobación · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. Tu proyecto {{nombre_proyecto}} está listo para aprobación. Revísalo aquí: {{portal_url}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}'], true),
('project_final_payment_email','Flujo del proyecto','Pago final activado · correo','email','Pago final disponible para liberar tus archivos','Hola, {{nombre_cliente}}.

Tu proyecto {{nombre_proyecto}} ha sido aprobado. Ya puedes realizar el pago final para liberar tus archivos finales y Brand Kit.

Monto pendiente: {{monto_pendiente}}

Ingresa aquí:
{{portal_url}}

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{monto_pendiente}}','{{portal_url}}','{{nombre_estudio}}'], true),
('project_final_payment_whatsapp','Flujo del proyecto','Pago final activado · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. {{nombre_proyecto}} fue aprobado. Ya puedes realizar el pago final de {{monto_pendiente}} para liberar tus archivos: {{portal_url}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{monto_pendiente}}','{{portal_url}}'], true),
('project_brandkit_released_email','Flujo del proyecto','Brand Kit liberado · correo','email','Tu Brand Kit ya está disponible','Hola, {{nombre_cliente}}.

Tu Brand Kit de {{nombre_proyecto}} ya está disponible para ver y descargar desde tu portal.

Ingresa aquí:
{{portal_url}}

Con cariño,
{{nombre_estudio}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}','{{nombre_estudio}}'], true),
('project_brandkit_released_whatsapp','Flujo del proyecto','Brand Kit liberado · WhatsApp','whatsapp',null,'Hola, {{nombre_cliente}}. Tu Brand Kit de {{nombre_proyecto}} ya está disponible para descargar: {{portal_url}}', array['{{nombre_cliente}}','{{nombre_proyecto}}','{{portal_url}}'], true)
on conflict (template_key) do update set section = excluded.section, label = excluded.label, channel = excluded.channel, subject = excluded.subject, body = excluded.body, required_variables = excluded.required_variables, active = excluded.active, updated_at = now();
