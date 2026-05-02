-- Limpia únicamente datos demo/legacy conocidos. No toca datos reales no marcados como demo.
-- Ejecuta después de revisar que 006 ya marcó los seeds antiguos como is_demo=true.

delete from project_updates where is_demo = true;
delete from mensajes_meta where is_demo = true;
delete from conversaciones where is_demo = true;
delete from tareas where is_demo = true;
delete from reuniones where is_demo = true;
delete from aprobaciones where is_demo = true;
delete from portal_progreso where is_demo = true;
delete from briefs where is_demo = true;
delete from contratos where is_demo = true;
delete from notificaciones where is_demo = true;
delete from cobros where is_demo = true;
delete from gastos where is_demo = true;
delete from leads where is_demo = true;
delete from proyectos where is_demo = true;
delete from clientes where is_demo = true;
