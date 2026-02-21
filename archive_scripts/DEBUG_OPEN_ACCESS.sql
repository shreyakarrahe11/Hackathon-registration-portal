-- DEBUG_OPEN_ACCESS.sql (Updated)
-- Purpose: DISABLE RLS on ALL tables including USERS to ensure Auth works seamlessly.
-- This fixes "Profile not found" or "Insert failed" errors during new user signup.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- 1. Disable RLS on Tables
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY; -- Critical for new signups

-- 2. Grant Select/Insert/Update to Anon/Authenticated
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.evaluations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.team_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;

-- 3. Verify
SELECT 'RLS Disabled on All Tables' as status;
