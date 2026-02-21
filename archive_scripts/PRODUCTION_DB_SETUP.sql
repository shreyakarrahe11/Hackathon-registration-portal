-- ==============================================================================
-- INNOVEX AI - FINAL PRODUCTION DATABASE SETUP
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This is the COMPLETE, PRODUCTION-READY schema with strict RLS
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: CORE TABLES
-- ==============================================================================

-- 1A. PROFILES (Single Source of Truth for Roles)
-- Extends auth.users with role management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'evaluator', 'admin')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  panel TEXT CHECK (panel IN ('panel_1', 'panel_2')),
  access_code_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- ACCESS CODE SYSTEM (One-time role activation keys)
-- ==============================================================================

-- 1A-2. ACCESS CODES TABLE (Server-only, no direct access)
CREATE TABLE IF NOT EXISTS public.access_codes (
  code TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'evaluator')),
  panel TEXT CHECK (panel IN ('panel_1', 'panel_2')),
  evaluator_name TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- CRITICAL: No one can read/write access_codes directly
DROP POLICY IF EXISTS "No direct access to codes" ON public.access_codes;
CREATE POLICY "No direct access to codes" ON public.access_codes
  FOR ALL USING (FALSE);

-- Insert predefined access codes (run ONCE)
INSERT INTO public.access_codes (code, role, panel, evaluator_name) VALUES
  ('PRANAY#JUDGE@2026', 'evaluator', 'panel_1', 'Pranay'),
  ('KETAN#JUDGE@2026', 'evaluator', 'panel_1', 'Ketan'),
  ('VIBHA#JUDGE@2026', 'evaluator', 'panel_2', 'Vibha'),
  ('MADHURI#JUDGE@2026', 'evaluator', 'panel_2', 'Madhuri'),
  ('INNOVEXA2@chairperson#', 'admin', NULL, 'Admin')
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- SECURE ACCESS CODE ACTIVATION (Database Function)
-- ==============================================================================

-- This function is called via supabase.rpc('activate_access_code', { code: '...' })
-- It validates the code, assigns the role, and burns the code atomically
CREATE OR REPLACE FUNCTION public.activate_access_code(input_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user already has elevated role
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = current_user_id 
    AND role IN ('admin', 'evaluator')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role already assigned');
  END IF;

  -- Fetch and lock the access code
  SELECT * INTO code_record
  FROM access_codes
  WHERE code = input_code
  AND is_used = FALSE
  FOR UPDATE;

  IF code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used code');
  END IF;

  -- Update user profile with role and panel
  UPDATE profiles
  SET 
    role = code_record.role,
    panel = code_record.panel,
    access_code_used = TRUE,
    full_name = COALESCE(full_name, code_record.evaluator_name)
  WHERE id = current_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (id, role, panel, access_code_used, full_name)
    VALUES (current_user_id, code_record.role, code_record.panel, TRUE, code_record.evaluator_name);
  END IF;

  -- Burn the access code
  UPDATE access_codes
  SET 
    is_used = TRUE,
    used_by = current_user_id,
    used_at = NOW()
  WHERE code = input_code;

  RETURN jsonb_build_object(
    'success', true, 
    'role', code_record.role, 
    'panel', code_record.panel,
    'name', code_record.evaluator_name
  );
END;
$$;

-- 1B. TEAMS (One-to-Many: Team → Students)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  github_url TEXT,
  ppt_url TEXT,
  submission_status TEXT DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'under_review', 'evaluated')),
  panel TEXT,
  panel_judge_id UUID REFERENCES auth.users(id),
  admin_ppt_score NUMERIC,
  final_score NUMERIC,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- CRITICAL: One team per user (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS one_team_per_user ON public.teams(created_by);

-- 1C. TEAM MEMBERS (Students inside a Team)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, student_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 1D. SUBMISSIONS (PPT/Project Details)
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ps_id TEXT,
  problem_statement TEXT,
  idea_description TEXT,
  ppt_file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 1E. TEAM EVALUATORS (Many-to-Many: Admin assigns 4 evaluators per team)
CREATE TABLE IF NOT EXISTS public.team_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, evaluator_id)
);

ALTER TABLE public.team_evaluators ENABLE ROW LEVEL SECURITY;

-- 1F. SCORES (Each evaluator's isolated score per team)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ppt_score INT CHECK (ppt_score BETWEEN 0 AND 100),
  presentation_score INT CHECK (presentation_score BETWEEN 0 AND 100),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, evaluator_id)
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- SECTION 2: STUDENT POLICIES (Limited Access)
-- ==============================================================================

-- 2A. PROFILES: Students can manage own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2B. TEAMS: Students can read their own team (as creator OR member)
DROP POLICY IF EXISTS "Student read own team" ON public.teams;
CREATE POLICY "Student read own team" ON public.teams
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.student_id = auth.uid()
    )
  );

-- Students can create team (only one per user - enforced by unique index)
DROP POLICY IF EXISTS "Student can create team" ON public.teams;
CREATE POLICY "Student can create team" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Students can update team ONLY if still in draft
DROP POLICY IF EXISTS "Lock team after submission" ON public.teams;
CREATE POLICY "Lock team after submission" ON public.teams
  FOR UPDATE USING (
    created_by = auth.uid()
    AND submission_status = 'draft'
  );

-- 2C. TEAM MEMBERS: Leader can manage members
DROP POLICY IF EXISTS "Leader can insert members" ON public.team_members;
CREATE POLICY "Leader can insert members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "View own team members" ON public.team_members;
CREATE POLICY "View own team members" ON public.team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
    OR student_id = auth.uid()
  );

-- 2D. SUBMISSIONS: Students can create/view own submissions
DROP POLICY IF EXISTS "Student can create submission" ON public.submissions;
CREATE POLICY "Student can create submission" ON public.submissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Student can view own submission" ON public.submissions;
CREATE POLICY "Student can view own submission" ON public.submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

-- ==============================================================================
-- SECTION 3: EVALUATOR POLICIES (Strict Filtered View)
-- ==============================================================================

-- 3A. TEAMS: Evaluators can ONLY see assigned teams
DROP POLICY IF EXISTS "Evaluator view assigned teams" ON public.teams;
CREATE POLICY "Evaluator view assigned teams" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators
      WHERE team_evaluators.team_id = teams.id
      AND team_evaluators.evaluator_id = auth.uid()
    )
  );

-- 3B. TEAM MEMBERS: Evaluators can view members of assigned teams
DROP POLICY IF EXISTS "Evaluator view assigned team members" ON public.team_members;
CREATE POLICY "Evaluator view assigned team members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators
      WHERE team_evaluators.team_id = team_members.team_id
      AND team_evaluators.evaluator_id = auth.uid()
    )
  );

-- 3C. SUBMISSIONS: Evaluators can view submissions of assigned teams
DROP POLICY IF EXISTS "Evaluator view assigned submissions" ON public.submissions;
CREATE POLICY "Evaluator view assigned submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators
      WHERE team_evaluators.team_id = submissions.team_id
      AND team_evaluators.evaluator_id = auth.uid()
    )
  );

-- 3D. TEAM_EVALUATORS: Evaluators can view their own assignments
DROP POLICY IF EXISTS "Evaluator view own assignments" ON public.team_evaluators;
CREATE POLICY "Evaluator view own assignments" ON public.team_evaluators
  FOR SELECT USING (evaluator_id = auth.uid());

-- 3E. SCORES: Evaluators can ONLY manage their own scores (strict isolation)
DROP POLICY IF EXISTS "Evaluator manage own scores" ON public.scores;
CREATE POLICY "Evaluator manage own scores" ON public.scores
  FOR ALL USING (evaluator_id = auth.uid()) WITH CHECK (evaluator_id = auth.uid());

-- ==============================================================================
-- SECTION 4: PANEL JUDGE POLICIES (Read-Only Authority)
-- ==============================================================================

-- Panel judge can read assigned team only
DROP POLICY IF EXISTS "Panel judge read team" ON public.teams;
CREATE POLICY "Panel judge read team" ON public.teams
  FOR SELECT USING (panel_judge_id = auth.uid());

-- ==============================================================================
-- SECTION 5: ADMIN POLICIES (Full Access to Everything)
-- ==============================================================================

-- Helper function check: Is current user an admin?
-- Used in all admin policies below

-- 5A. PROFILES: Admin can view all profiles
DROP POLICY IF EXISTS "Admin view all profiles" ON public.profiles;
CREATE POLICY "Admin view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5B. TEAMS: Admin full access
DROP POLICY IF EXISTS "Admin full access teams" ON public.teams;
CREATE POLICY "Admin full access teams" ON public.teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5C. TEAM MEMBERS: Admin can view all
DROP POLICY IF EXISTS "Admin view all team members" ON public.team_members;
CREATE POLICY "Admin view all team members" ON public.team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5D. SUBMISSIONS: Admin can view all
DROP POLICY IF EXISTS "Admin view all submissions" ON public.submissions;
CREATE POLICY "Admin view all submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5E. TEAM_EVALUATORS: Admin full access (assign/remove evaluators)
DROP POLICY IF EXISTS "Admin full access team_evaluators" ON public.team_evaluators;
CREATE POLICY "Admin full access team_evaluators" ON public.team_evaluators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5F. SCORES: Admin can view all scores
DROP POLICY IF EXISTS "Admin view all scores" ON public.scores;
CREATE POLICY "Admin view all scores" ON public.scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==============================================================================
-- SECTION 6: STORAGE POLICIES
-- ==============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Public can read documents" ON storage.objects;
CREATE POLICY "Public can read documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- ==============================================================================
-- SECTION 7: PERFORMANCE INDEXES (Critical for 500+ Users)
-- ==============================================================================

-- Teams
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_panel ON public.teams(panel);
CREATE INDEX IF NOT EXISTS idx_teams_panel_judge ON public.teams(panel_judge_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_winner ON public.teams(is_winner);

-- Team members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_student_id ON public.team_members(student_id);

-- Submissions
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON public.submissions(team_id);

-- Team evaluators (CRITICAL for evaluator dashboard performance)
CREATE INDEX IF NOT EXISTS idx_team_evaluators_team_id ON public.team_evaluators(team_id);
CREATE INDEX IF NOT EXISTS idx_team_evaluators_evaluator_id ON public.team_evaluators(evaluator_id);

-- Scores
CREATE INDEX IF NOT EXISTS idx_scores_team_id ON public.scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_evaluator_id ON public.scores(evaluator_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- SECTION 8: VERIFICATION
-- ==============================================================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'teams', 'team_members', 'submissions', 
                    'team_evaluators', 'scores')
ORDER BY tablename, policyname;

-- ==============================================================================
-- FINAL ACCESS MATRIX (Enforced by Database)
-- ==============================================================================
-- 
-- Role         | Access Level | Capabilities
-- -------------|--------------|--------------------------------------------
-- Student      | Limited      | Create team, submit PPT, view own result
-- Evaluator    | Restricted   | View assigned teams, submit own score
-- Panel Judge  | Read-only    | View assigned team only
-- Admin        | Full         | View all, assign evaluators, mark winner
-- 
-- ==============================================================================
-- 
-- PIPELINE FLOW:
-- 1. Student registers team → INSERT into 'teams' + 'team_members'
-- 2. Student submits PPT → INSERT into 'submissions', UPDATE status
-- 3. Admin views all teams → getAllTeams() via admin policies
-- 4. Admin assigns 4 evaluators → INSERT into 'team_evaluators'
-- 5. Admin assigns panel judge → UPDATE teams.panel_judge_id
-- 6. Evaluator sees ONLY assigned teams → getEvaluatorTeams()
-- 7. Evaluator submits score → INSERT into 'scores'
-- 8. Admin calculates final score → UPDATE teams.final_score
-- 9. Admin declares winner → UPDATE teams.is_winner = true
-- 10. Student sees result → reads own team with final_score/is_winner
-- 
-- ==============================================================================
