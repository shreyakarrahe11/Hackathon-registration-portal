-- FIX_REGISTRATION_HANG.sql

-- 1. Drop the problematic recursive policies immediately
drop policy if exists "Team members viewable by fellow members" on public.team_members;
drop policy if exists "Team members view set submission" on public.submissions;
drop function if exists public.is_team_member;

-- 2. Create a SAFELY isolated helper (Security Definer)
-- This function gets the Current User's Team ID without triggering RLS loops.
create or replace function public.get_my_team_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select team_id from public.team_members
  where user_id = auth.uid()
  limit 1;
$$;

-- 3. Re-enable "My Membership" (Safe, Direct Check)
drop policy if exists "Users can view own membership" on public.team_members;
create policy "Users can view own membership" 
on public.team_members for select 
using (user_id = auth.uid());

-- 4. Re-enable "My Teammates" (Using Safe Helper)
-- We check if the row's team_id matches the caller's team_id.
create policy "Users can view teammates" 
on public.team_members for select 
using (
  team_id = get_my_team_id()
);

-- 5. Re-enable "My Submissions" (Using Safe Helper)
create policy "Team members view submission" 
on public.submissions for select 
using (
  team_id = get_my_team_id()
);
