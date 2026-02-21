-- ==============================================================================
-- INNOVEX AI - FINAL CANONICAL DATABASE SETUP
-- ==============================================================================
-- Run this ONCE in Supabase SQL Editor
-- Each table, policy, and index is defined EXACTLY ONCE
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: CORE TABLES (Define Once)
-- ==============================================================================

-- 1. PROFILES (extends auth.users - Single Source of Truth for Roles)
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

-- 2. ACCESS CODES (Server-only, one-time activation keys)
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

-- HARDENING: Explicit revoke (belt + suspenders)
REVOKE ALL ON public.access_codes FROM authenticated;
REVOKE ALL ON public.access_codes FROM anon;

-- 3. TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
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

-- Constraint: One team per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_team_per_user ON public.teams(created_by);

-- 4. TEAM MEMBERS
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

-- 5. SUBMISSIONS
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

-- 6. TEAM EVALUATORS (Admin assigns evaluators to teams)
CREATE TABLE IF NOT EXISTS public.team_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, evaluator_id)
);

ALTER TABLE public.team_evaluators ENABLE ROW LEVEL SECURITY;

-- 7. SCORES (Each evaluator's isolated score per team)
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
-- SECTION 2: ACCESS CODES - Insert & RPC
-- ==============================================================================

-- Insert predefined access codes (idempotent)
INSERT INTO public.access_codes (code, role, panel, evaluator_name) VALUES
  ('PRANAY#JUDGE@2026', 'evaluator', 'panel_1', 'Pranay'),
  ('KETAN#JUDGE@2026', 'evaluator', 'panel_1', 'Ketan'),
  ('VIBHA#JUDGE@2026', 'evaluator', 'panel_2', 'Vibha'),
  ('MADHURI#JUDGE@2026', 'evaluator', 'panel_2', 'Madhuri'),
  ('INNOVEXA2@chairperson#', 'admin', NULL, 'Admin')
ON CONFLICT (code) DO NOTHING;

-- Secure RPC: activate_access_code
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

  -- Update or insert profile
  INSERT INTO profiles (id, role, panel, access_code_used, full_name)
  VALUES (current_user_id, code_record.role, code_record.panel, TRUE, code_record.evaluator_name)
  ON CONFLICT (id) DO UPDATE SET
    role = code_record.role,
    panel = code_record.panel,
    access_code_used = TRUE,
    full_name = COALESCE(profiles.full_name, code_record.evaluator_name);

  -- Burn the access code
  UPDATE access_codes
  SET is_used = TRUE, used_by = current_user_id, used_at = NOW()
  WHERE code = input_code;

  RETURN jsonb_build_object(
    'success', true, 
    'role', code_record.role, 
    'panel', code_record.panel,
    'name', code_record.evaluator_name
  );
END;
$$;

-- ==============================================================================
-- SECTION 3: RLS POLICIES (Each defined exactly ONCE)
-- ==============================================================================

-- ============ ACCESS CODES: No direct access ============
CREATE POLICY "access_codes_no_access" ON public.access_codes
  FOR ALL USING (FALSE);

-- ============ PROFILES ============
CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ TEAMS ============
-- Student: Create own team
CREATE POLICY "teams_student_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Student: View own team
CREATE POLICY "teams_student_select" ON public.teams
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND student_id = auth.uid())
  );

-- Student: Update only if draft (CANNOT modify panel)
CREATE POLICY "teams_student_update" ON public.teams
  FOR UPDATE USING (
    created_by = auth.uid()
    AND submission_status = 'draft'
  )
  WITH CHECK (
    created_by = auth.uid()
    AND submission_status = 'draft'
    AND panel IS NULL
    AND panel_judge_id IS NULL
  );

-- Evaluator: View assigned teams only
CREATE POLICY "teams_evaluator_select" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators
      WHERE team_evaluators.team_id = teams.id
      AND team_evaluators.evaluator_id = auth.uid()
    )
  );

-- Panel Judge: View assigned team
CREATE POLICY "teams_judge_select" ON public.teams
  FOR SELECT USING (panel_judge_id = auth.uid());

-- Admin: Full access
CREATE POLICY "teams_admin_all" ON public.teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ TEAM MEMBERS ============
CREATE POLICY "team_members_leader_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_evaluators WHERE team_id = team_members.team_id AND evaluator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ SUBMISSIONS ============
CREATE POLICY "submissions_leader_insert" ON public.submissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_evaluators WHERE team_id = submissions.team_id AND evaluator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ TEAM EVALUATORS ============
CREATE POLICY "team_evaluators_evaluator_select" ON public.team_evaluators
  FOR SELECT USING (evaluator_id = auth.uid());

CREATE POLICY "team_evaluators_admin_all" ON public.team_evaluators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ SCORES ============
CREATE POLICY "scores_evaluator_all" ON public.scores
  FOR ALL USING (evaluator_id = auth.uid()) WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "scores_admin_select" ON public.scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==============================================================================
-- SECTION 4: HARDENING CONSTRAINTS
-- ==============================================================================

-- Auto-update updated_at on scores
CREATE OR REPLACE FUNCTION update_scores_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scores_updated ON public.scores;
CREATE TRIGGER trg_scores_updated
BEFORE UPDATE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION update_scores_timestamp();

-- HARDENING: Validate evaluator is assigned before score insert/update
CREATE OR REPLACE FUNCTION validate_score_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.team_evaluators
    WHERE team_id = NEW.team_id
    AND evaluator_id = NEW.evaluator_id
  ) THEN
    RAISE EXCEPTION 'Evaluator is not assigned to this team';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_score_assignment ON public.scores;
CREATE TRIGGER trg_validate_score_assignment
BEFORE INSERT OR UPDATE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION validate_score_assignment();

-- ==============================================================================
-- SECTION 5: PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_panel ON public.teams(panel);
CREATE INDEX IF NOT EXISTS idx_teams_panel_judge ON public.teams(panel_judge_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_winner ON public.teams(is_winner);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_student ON public.team_members(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON public.submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_evaluators_team ON public.team_evaluators(team_id);
CREATE INDEX IF NOT EXISTS idx_team_evaluators_evaluator ON public.team_evaluators(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_scores_team ON public.scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_evaluator ON public.scores(evaluator_id);

-- ==============================================================================
-- SECTION 6: STORAGE POLICIES (for file uploads)
-- ==============================================================================

-- Note: Run only if 'documents' bucket exists
-- CREATE POLICY "storage_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
-- CREATE POLICY "storage_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents');

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

SELECT 'Tables created successfully' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ==============================================================================
-- DONE
-- ==============================================================================
-- 
-- FINAL AUTHORITY MODEL:
-- ┌─────────────────┬───────────────┬───────────────────┐
-- │ Entity          │ Who Can Write │ Who Can Read      │
-- ├─────────────────┼───────────────┼───────────────────┤
-- │ profiles        │ self / RPC    │ self / admin      │
-- │ access_codes    │ RPC only      │ nobody            │
-- │ teams           │ student/admin │ student/eval/admin│
-- │ team_members    │ leader        │ team/eval/admin   │
-- │ submissions     │ leader        │ eval/admin        │
-- │ team_evaluators │ admin only    │ eval(self)/admin  │
-- │ scores          │ eval(self)    │ eval(self)/admin  │
-- └─────────────────┴───────────────┴───────────────────┘
-- 
-- ==============================================================================
