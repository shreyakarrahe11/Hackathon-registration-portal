-- CHECK_DATA.sql
-- Run this in Supabase SQL Editor to see what is ACTUALLY in the database.

-- 1. Check Teams
select id, team_name, leader_id, created_at from public.teams order by created_at desc;

-- 2. Check Submissions (Is there data?)
select team_id, ps_id, idea_description, ppt_url from public.submissions;

-- 3. Check Members
select team_id, name, email, role from public.team_members;
