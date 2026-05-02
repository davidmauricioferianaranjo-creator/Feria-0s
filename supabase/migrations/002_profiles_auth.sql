-- ── PROFILES Y AUTENTICACIÓN ─────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  role       text not null default 'creativo'
             check (role in ('admin','crm','creativo','cliente')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own"   on profiles for select  using (auth.uid() = id);
create policy "profiles_update_own"   on profiles for update  using (auth.uid() = id);
create policy "profiles_select_admin" on profiles for select  using (has_role('admin','crm'));
create policy "profiles_update_admin" on profiles for update  using (has_role('admin'));
create policy "profiles_insert_auth"  on profiles for insert  with check (auth.uid() = id);

-- Helper: verificar rol
create or replace function has_role(variadic roles text[])
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = any(roles)
  );
$$;

-- Trigger: crear perfil al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'creativo'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Función: promover rol (solo admin puede ejecutar)
create or replace function promote_user_role(user_id uuid, new_role text)
returns void language plpgsql security definer as $$
begin
  if not has_role('admin') then
    raise exception 'Solo admin puede cambiar roles';
  end if;
  update profiles set role = new_role, updated_at = now() where id = user_id;
end;
$$;
