-- ==============================================================================
-- FIX_AUTH_RLS.sql - Authentication & Registration RLS Fixes
-- ==============================================================================
-- Run this in Supabase SQL Editor to fix login/registration issues
-- ==============================================================================

-- 1. FIX: Allow authenticated users to create their OWN profile
-- (Critical for signup flow - user needs to insert their profile after auth)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 1b. FIX: Allow users to SELECT (read) their own profile
-- (CRITICAL: Without this, getCurrentUserProfile() returns null even if profile exists!)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 2. FIX: Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2b. FIX: Allow authenticated users to create teams
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

-- 2c. FIX: Allow users to view their own teams
DROP POLICY IF EXISTS "Users can view own teams" ON public.teams;
CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT
  USING (leader_id = auth.uid());

-- 2d. FIX: Allow team leaders to update their teams
DROP POLICY IF EXISTS "Team leader can update team" ON public.teams;
CREATE POLICY "Team leader can update team" ON public.teams
  FOR UPDATE
  USING (leader_id = auth.uid());

-- 3. FIX: Allow team members insertion by team leader
DROP POLICY IF EXISTS "Team leader can insert members" ON public.team_members;
CREATE POLICY "Team leader can insert members" ON public.team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND leader_id = auth.uid()
    )
  );

-- 3b. FIX: Allow viewing team members for own team
DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND leader_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- 3c. FIX: Allow team leader to create submissions
DROP POLICY IF EXISTS "Team leader can create submission" ON public.submissions;
CREATE POLICY "Team leader can create submission" ON public.submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND leader_id = auth.uid()
    )
  );

-- 3d. FIX: Allow viewing own team's submissions
DROP POLICY IF EXISTS "View own submissions" ON public.submissions;
CREATE POLICY "View own submissions" ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND leader_id = auth.uid()
    )
  );

-- 4. FIX: Evaluators can insert/update their own evaluations
DROP POLICY IF EXISTS "Evaluator can insert evaluations" ON public.evaluations;
CREATE POLICY "Evaluator can insert evaluations" ON public.evaluations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluator_assignments 
      WHERE id = assignment_id AND evaluator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Evaluator can update own evaluations" ON public.evaluations;
CREATE POLICY "Evaluator can update own evaluations" ON public.evaluations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluator_assignments 
      WHERE id = assignment_id AND evaluator_id = auth.uid()
    )
  );

-- 5. FIX: Storage - Allow authenticated users to upload to documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

-- 6. FIX: Storage - Allow public read access to documents
DROP POLICY IF EXISTS "Public can read documents" ON storage.objects;
CREATE POLICY "Public can read documents" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents');

-- 7. FIX: Allow authenticated users to update their uploads
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ==============================================================================
-- ADMIN POLICIES (Admin can view/update ALL data)
-- ==============================================================================

-- Admin: View ALL users
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: View ALL teams
DROP POLICY IF EXISTS "Admin can view all teams" ON public.teams;
CREATE POLICY "Admin can view all teams" ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: Update ANY team (panel, status, score)
DROP POLICY IF EXISTS "Admin can update any team" ON public.teams;
CREATE POLICY "Admin can update any team" ON public.teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: View ALL team members
DROP POLICY IF EXISTS "Admin can view all team members" ON public.team_members;
CREATE POLICY "Admin can view all team members" ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: View ALL submissions
DROP POLICY IF EXISTS "Admin can view all submissions" ON public.submissions;
CREATE POLICY "Admin can view all submissions" ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: View ALL evaluator assignments
DROP POLICY IF EXISTS "Admin can view all assignments" ON public.evaluator_assignments;
CREATE POLICY "Admin can view all assignments" ON public.evaluator_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: Create evaluator assignments
DROP POLICY IF EXISTS "Admin can create assignments" ON public.evaluator_assignments;
CREATE POLICY "Admin can create assignments" ON public.evaluator_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: View ALL evaluations
DROP POLICY IF EXISTS "Admin can view all evaluations" ON public.evaluations;
CREATE POLICY "Admin can view all evaluations" ON public.evaluations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==============================================================================
-- EVALUATOR POLICIES (Evaluators can view their assigned teams by panel)
-- ==============================================================================

-- Evaluator: View teams in their panel
DROP POLICY IF EXISTS "Evaluator can view panel teams" ON public.teams;
CREATE POLICY "Evaluator can view panel teams" ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'evaluator'
    )
  );

-- Evaluator: View team members of panel teams
DROP POLICY IF EXISTS "Evaluator can view panel team members" ON public.team_members;
CREATE POLICY "Evaluator can view panel team members" ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'evaluator'
    )
  );

-- Evaluator: View submissions of panel teams
DROP POLICY IF EXISTS "Evaluator can view panel submissions" ON public.submissions;
CREATE POLICY "Evaluator can view panel submissions" ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'evaluator'
    )
  );

-- Evaluator: View their own assignments
DROP POLICY IF EXISTS "Evaluator can view own assignments" ON public.evaluator_assignments;
CREATE POLICY "Evaluator can view own assignments" ON public.evaluator_assignments
  FOR SELECT
  USING (evaluator_id = auth.uid());

-- Evaluator: View their own evaluations
DROP POLICY IF EXISTS "Evaluator can view own evaluations" ON public.evaluations;
CREATE POLICY "Evaluator can view own evaluations" ON public.evaluations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluator_assignments 
      WHERE id = assignment_id AND evaluator_id = auth.uid()
    )
  );

-- ==============================================================================
-- VERIFICATION: Check policies are applied
-- ==============================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('users', 'teams', 'team_members', 'submissions', 'evaluations', 'evaluator_assignments')
ORDER BY tablename, policyname;

-- ==============================================================================
-- PERFORMANCE INDEXES (CRITICAL for 500+ concurrent users)
-- ==============================================================================

-- 1. Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON public.teams(created_at);

-- 3. Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- 4. Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON public.submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at);

-- 5. Evaluations indexes (for evaluator dashboard performance)
CREATE INDEX IF NOT EXISTS idx_evaluations_assignment_id ON public.evaluations(assignment_id);

-- ==============================================================================
-- ENABLE RLS ON ALL TABLES (SECURITY)
-- ==============================================================================
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evaluator_assignments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- SUPABASE CONFIGURATION NOTES (for Dashboard settings)
-- ==============================================================================
-- 
-- 1. Authentication → URL Configuration:
--    Site URL: https://innovexai.netlify.app (or http://localhost:3000 for dev)
--    Redirect URLs: 
--      - https://innovexai.netlify.app
--      - https://innovexai.netlify.app/**
--      - http://localhost:3000
--      - http://localhost:3000/**
--
-- 2. Authentication → Providers → Google:
--    - Client ID: (from Google Cloud Console)
--    - Client Secret: (from Google Cloud Console)
--    - Authorized redirect URI in Google Console: 
--      https://YOUR_PROJECT.supabase.co/auth/v1/callback
--
-- 3. Database → Settings → Connection Pooling:
--    - Mode: Transaction (for serverless/edge functions)
--    - Pool size: Auto (or 15 for free tier)
--
-- ==============================================================================
