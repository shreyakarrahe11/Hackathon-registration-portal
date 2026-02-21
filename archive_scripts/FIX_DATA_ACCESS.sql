-- FIX_DATA_ACCESS.sql
-- Purpose: Ensure Admin has full access to ALL tables (submissions, teams, evaluations)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- 1. Ensure is_admin() function exists and is permissive
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Direct Email Check for Nuclear Bypass
  IF (auth.jwt() ->> 'email') = 'admin@innovex.ai' THEN
    RETURN true;
  END IF;

  -- Standard Role Check
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Fix Submissions Policy
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
CREATE POLICY "Admins can view all submissions"
  ON public.submissions
  FOR SELECT
  USING ( is_admin() );

DROP POLICY IF EXISTS "Admins can update all submissions" ON public.submissions;
CREATE POLICY "Admins can update all submissions"
  ON public.submissions
  FOR UPDATE
  USING ( is_admin() );

-- 3. Fix Evaluations Policy (Just in case)
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all evaluations" ON public.evaluations;
CREATE POLICY "Admins can view all evaluations"
  ON public.evaluations
  FOR SELECT
  USING ( is_admin() );

-- 4. Fix Teams Policy (Just in case)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins can view all teams"
  ON public.teams
  FOR SELECT
  USING ( is_admin() );
