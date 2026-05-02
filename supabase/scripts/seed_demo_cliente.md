# Seed manual de cliente demo

El portal cliente necesita dos cosas distintas:

1. Un usuario creado en **Supabase Auth**.
2. Un registro en `profiles` con rol `cliente` y un registro en `clientes` con el mismo email.

## Usuario demo recomendado

- Email: `info@davidferia.com`
- Password sugerido: `FeriaDemo2026!`

## Pasos

1. En Supabase → Authentication → Users → Add user.
2. Crea el usuario con el email y password anteriores.
3. Copia el UUID del usuario.
4. Ejecuta este SQL reemplazando `UUID_DEL_USUARIO_AUTH`:

```sql
insert into profiles (id, email, role, name)
values ('UUID_DEL_USUARIO_AUTH', 'info@davidferia.com', 'cliente', 'David Feria Demo')
on conflict (id) do update set role='cliente', email='info@davidferia.com', name='David Feria Demo';

insert into clientes (id, nombre, tipo, email, servicio, service_type, monto, brand, stage, color, is_demo, created_at)
values ('00000000-0000-4000-8000-000000000101', 'David Feria Demo', 'Cliente de prueba', 'info@davidferia.com', 'Branding para Fotógrafos', 'branding_fotografos', 2800, 'feria', 4, '#5B9BD5', true, now())
on conflict (id) do update set email='info@davidferia.com', nombre='David Feria Demo', is_demo=true;

insert into proyectos (id, cliente_id, nombre, estado, fase, pct_interno, pct_cliente, dias_entrega, dias_ejecucion, brand, is_demo, created_at)
values ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101', 'David Feria Demo — Branding', 'EL ORIGEN', 4, 25, 20, 45, 8, 'feria', true, now())
on conflict (id) do update set cliente_id='00000000-0000-4000-8000-000000000101';
```
