-- FIX INFINITE RECURSION IN RLS POLICIES
-- Run this in Supabase SQL Editor to fix the 500 Internal Server Errors.

-- 1. Create a helper function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- <--- CRITICAL: Runs as owner, bypassing RLS
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Fix USERS Table Policy (The Source of the Crash)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
USING (is_admin());

-- 3. Update other Admin policies for consistency & performance
-- TEAMS
DROP POLICY IF EXISTS "Admin has full access to teams" ON public.teams;
CREATE POLICY "Admin has full access to teams" ON public.teams FOR ALL USING (is_admin());

-- TEAM MEMBERS
DROP POLICY IF EXISTS "Team members viewable by Admin" ON public.team_members;
CREATE POLICY "Team members viewable by Admin" ON public.team_members FOR SELECT USING (is_admin());

-- SUBMISSIONS
DROP POLICY IF EXISTS "Admin view all submissions" ON public.submissions;
CREATE POLICY "Admin view all submissions" ON public.submissions FOR SELECT USING (is_admin());

-- ASSIGNMENTS
DROP POLICY IF EXISTS "Admin manage assignments" ON public.evaluator_assignments;
CREATE POLICY "Admin manage assignments" ON public.evaluator_assignments FOR ALL USING (is_admin());

-- EVALUATIONS
DROP POLICY IF EXISTS "Admin view evaluations" ON public.evaluations;
CREATE POLICY "Admin view evaluations" ON public.evaluations FOR SELECT USING (is_admin());
