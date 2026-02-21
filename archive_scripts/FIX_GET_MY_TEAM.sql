-- FIX_GET_MY_TEAM.sql
-- Forcefully get the correct Team ID for the current user.
-- This bypasses RLS issues where 'team_members' rows might not be visible to the user
-- (e.g. if user_id is null and they are only linked by email).

create or replace function public.get_user_team_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_team_id uuid;
  current_user_email text;
begin
  -- Get current user email from JWT
  current_user_email := auth.jwt() ->> 'email';

  -- 1. Check if I am a LEADER (using leader_id on teams table)
  select id into target_team_id
  from public.teams
  where leader_id = auth.uid()
  limit 1;

  if target_team_id is not null then
    return target_team_id;
  end if;

  -- 2. Check if I am a MEMBER (using email lookup in team_members)
  -- This is vital because 'user_id' might be NULL in team_members for invitees.
  select team_id into target_team_id
  from public.team_members
  where email = current_user_email
  limit 1;

  if target_team_id is not null then
    return target_team_id;
  end if;
  
  -- 3. Check if I am a MEMBER (using user_id lookup in team_members)
  -- Fallback in case email didn't match but ID does.
  select team_id into target_team_id
  from public.team_members
  where user_id = auth.uid()
  limit 1;

  return target_team_id;
end;
$$;

-- Grant execution to everyone
grant execute on function public.get_user_team_id to authenticated;
grant execute on function public.get_user_team_id to anon;
