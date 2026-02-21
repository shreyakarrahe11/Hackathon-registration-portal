-- FIX_ADMIN_NUCLEAR.sql
-- 1. Redefine is_admin() to trust the Email directly from the JWT.
-- This bypasses the need for a row in 'public.users', solving the Bootstrapping Loop.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select (
    -- Option A: Email matches hardcoded admin email (The Nuclear Fix)
    (auth.jwt() ->> 'email') = 'admin@innovex.ai'
    OR
    -- Option B: Role is 'admin' in users table (The Standard Way)
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
$$;

-- 2. Redefine bootstrap_admin_access just to be safe (Idempotent Upsert)
create or replace function public.bootstrap_admin_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_uid uuid;
  admin_email text := 'admin@innovex.ai';
begin
  select id into admin_uid from auth.users where email = admin_email;
  
  if admin_uid is not null then
    insert into public.users (id, name, email, role)
    values (admin_uid, 'Admin User', admin_email, 'admin')
    on conflict (id) do update set role = 'admin';
  end if;
end;
$$;
