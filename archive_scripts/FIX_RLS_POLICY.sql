-- Fix RLS Policy Error - Run this in Supabase SQL Editor
-- This script fixes the "violates row-level security policy" error

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Public Access Teams" ON public.teams;
DROP POLICY IF EXISTS "Public Access Teams - Select" ON public.teams;
DROP POLICY IF EXISTS "Public Access Teams - Insert" ON public.teams;
DROP POLICY IF EXISTS "Public Access Teams - Update" ON public.teams;
DROP POLICY IF EXISTS "Public Access Teams - Delete" ON public.teams;

DROP POLICY IF EXISTS "Public Access Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public Access Submissions - Select" ON public.submissions;
DROP POLICY IF EXISTS "Public Access Submissions - Insert" ON public.submissions;
DROP POLICY IF EXISTS "Public Access Submissions - Update" ON public.submissions;
DROP POLICY IF EXISTS "Public Access Submissions - Delete" ON public.submissions;

DROP POLICY IF EXISTS "Public Access Members" ON public.members;
DROP POLICY IF EXISTS "Public Access Members - Select" ON public.members;
DROP POLICY IF EXISTS "Public Access Members - Insert" ON public.members;
DROP POLICY IF EXISTS "Public Access Members - Update" ON public.members;
DROP POLICY IF EXISTS "Public Access Members - Delete" ON public.members;

DROP POLICY IF EXISTS "Public Access Evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Public Access Evaluations - Select" ON public.evaluations;
DROP POLICY IF EXISTS "Public Access Evaluations - Insert" ON public.evaluations;
DROP POLICY IF EXISTS "Public Access Evaluations - Update" ON public.evaluations;
DROP POLICY IF EXISTS "Public Access Evaluations - Delete" ON public.evaluations;

-- Disable RLS completely for demo purposes
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('teams', 'submissions', 'members', 'evaluations');
