-- ==============================================================================
-- INNOVEX AI - NUCLEAR RESET (Clean Slate)
-- ==============================================================================
-- ⚠️ WARNING: This DROPS all existing tables and data!
-- Only run this if you want to start fresh
-- ==============================================================================

-- ==============================================================================
-- STEP 1: DROP EVERYTHING
-- ==============================================================================

-- Drop all policies first
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Drop tables in correct order (children first)
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.team_evaluators CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.access_codes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.activate_access_code CASCADE;
DROP FUNCTION IF EXISTS public.update_scores_timestamp CASCADE;
DROP FUNCTION IF EXISTS public.validate_score_assignment CASCADE;

-- ==============================================================================
-- STEP 2: CREATE ALL TABLES (Fresh)
-- ==============================================================================

-- 1. PROFILES
CREATE TABLE public.profiles (
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

-- 2. ACCESS CODES
CREATE TABLE public.access_codes (
  code TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'evaluator')),
  panel TEXT CHECK (panel IN ('panel_1', 'panel_2')),
  evaluator_name TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ
);
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- 3. TEAMS
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  github_url TEXT,
  ppt_url TEXT,
  panel TEXT,
  panel_judge_id UUID REFERENCES auth.users(id),
  submission_status TEXT DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'under_review', 'evaluated')),
  admin_ppt_score NUMERIC,
  final_score NUMERIC,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 4. TEAM MEMBERS  
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 5. SUBMISSIONS
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ps_id TEXT,
  problem_statement TEXT,
  idea_description TEXT,
  ppt_file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 6. TEAM EVALUATORS
CREATE TABLE public.team_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, evaluator_id)
);
ALTER TABLE public.team_evaluators ENABLE ROW LEVEL SECURITY;

-- 7. SCORES
CREATE TABLE public.scores (
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
-- STEP 3: INSERT ACCESS CODES
-- ==============================================================================

INSERT INTO public.access_codes (code, role, panel, evaluator_name) VALUES
  ('PRANAY#JUDGE@2026', 'evaluator', 'panel_1', 'Pranay'),
  ('KETAN#JUDGE@2026', 'evaluator', 'panel_1', 'Ketan'),
  ('VIBHA#JUDGE@2026', 'evaluator', 'panel_2', 'Vibha'),
  ('MADHURI#JUDGE@2026', 'evaluator', 'panel_2', 'Madhuri'),
  ('INNOVEXA2@chairperson#', 'admin', NULL, 'Admin');

-- ==============================================================================
-- STEP 4: CREATE SIMPLE RLS POLICIES
-- ==============================================================================

-- PROFILES
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ACCESS CODES - No direct access
CREATE POLICY "access_codes_block" ON public.access_codes FOR ALL USING (false);

-- TEAMS
CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "teams_update" ON public.teams FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "teams_admin" ON public.teams FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- TEAM MEMBERS
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "team_members_select_leader" ON public.team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);

-- SUBMISSIONS
CREATE POLICY "submissions_insert" ON public.submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);

-- TEAM EVALUATORS
CREATE POLICY "team_evaluators_select" ON public.team_evaluators FOR SELECT USING (evaluator_id = auth.uid());
CREATE POLICY "team_evaluators_admin" ON public.team_evaluators FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- SCORES
CREATE POLICY "scores_evaluator" ON public.scores FOR ALL USING (evaluator_id = auth.uid());
CREATE POLICY "scores_admin" ON public.scores FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ==============================================================================
-- STEP 5: CREATE RPC FUNCTION
-- ==============================================================================

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
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO code_record FROM access_codes WHERE code = input_code AND is_used = FALSE FOR UPDATE;

  IF code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used code');
  END IF;

  INSERT INTO profiles (id, role, panel, access_code_used, full_name)
  VALUES (current_user_id, code_record.role, code_record.panel, TRUE, code_record.evaluator_name)
  ON CONFLICT (id) DO UPDATE SET
    role = code_record.role,
    panel = code_record.panel,
    access_code_used = TRUE;

  UPDATE access_codes SET is_used = TRUE, used_by = current_user_id, used_at = NOW() WHERE code = input_code;

  RETURN jsonb_build_object('success', true, 'role', code_record.role, 'panel', code_record.panel);
END;
$$;

-- ==============================================================================
-- STEP 6: CREATE INDEXES
-- ==============================================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_teams_created_by ON public.teams(created_by);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_student ON public.team_members(student_id);
CREATE INDEX idx_team_evaluators_team ON public.team_evaluators(team_id);
CREATE INDEX idx_team_evaluators_evaluator ON public.team_evaluators(evaluator_id);
CREATE INDEX idx_scores_team ON public.scores(team_id);
CREATE INDEX idx_scores_evaluator ON public.scores(evaluator_id);

-- ==============================================================================
-- VERIFY
-- ==============================================================================

SELECT '✅ Nuclear reset complete!' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
