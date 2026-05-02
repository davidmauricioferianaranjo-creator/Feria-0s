-- Limpieza de datos operativos Feria OS
-- Mantiene: auth.users, profiles, studio, team.
-- Ejecutar solo si ya hiciste respaldo o si estás preparando la base para operación real.

truncate table if exists audit_logs restart identity cascade;
truncate table if exists recordatorios restart identity cascade;
truncate table if exists mensajes_meta restart identity cascade;
truncate table if exists conversaciones restart identity cascade;
truncate table if exists portal_progreso restart identity cascade;
truncate table if exists aprobaciones restart identity cascade;
truncate table if exists briefs restart identity cascade;
truncate table if exists contratos restart identity cascade;
truncate table if exists cotizaciones restart identity cascade;
truncate table if exists reuniones restart identity cascade;
truncate table if exists tareas restart identity cascade;
truncate table if exists deudas restart identity cascade;
truncate table if exists notificaciones restart identity cascade;
truncate table if exists cobros restart identity cascade;
truncate table if exists gastos restart identity cascade;
truncate table if exists leads restart identity cascade;
truncate table if exists proyectos restart identity cascade;
truncate table if exists clientes restart identity cascade;
