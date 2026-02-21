-- FIX_ADMIN_ACCESS.sql (Updated)
-- Helper function to bootstrap Admin Access for the specific hardcoded email.
-- Ensures Profile Exists in public.users before setting role.

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
  -- 1. Find the Auth ID for the admin email
  select id into admin_uid
  from auth.users
  where email = admin_email;

  if admin_uid is null then
    raise exception 'Admin Auth User does not exist yet. Please Sign Up first.';
  end if;

  -- 2. Check if Profile exists. If not, Create it.
  insert into public.users (id, name, email, role)
  values (admin_uid, 'Admin User', admin_email, 'admin')
  on conflict (id) do update
  set role = 'admin'; -- Force role to admin if it already existed as student

end;
$$;

-- Grant execution
grant execute on function public.bootstrap_admin_access to authenticated;
grant execute on function public.bootstrap_admin_access to anon;
