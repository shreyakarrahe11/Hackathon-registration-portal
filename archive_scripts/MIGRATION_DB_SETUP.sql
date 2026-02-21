-- ==============================================================================
-- INNOVEX AI - MIGRATION SCRIPT (Run on Existing Database)
-- ==============================================================================
-- This script SAFELY updates an existing database
-- It adds missing columns, tables, and policies without breaking existing data
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ==============================================================================

-- PROFILES: Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'panel') THEN
    ALTER TABLE public.profiles ADD COLUMN panel TEXT CHECK (panel IN ('panel_1', 'panel_2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'access_code_used') THEN
    ALTER TABLE public.profiles ADD COLUMN access_code_used BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- TEAMS: Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'created_by') THEN
    ALTER TABLE public.teams ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'panel') THEN
    ALTER TABLE public.teams ADD COLUMN panel TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'panel_judge_id') THEN
    ALTER TABLE public.teams ADD COLUMN panel_judge_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'submission_status') THEN
    ALTER TABLE public.teams ADD COLUMN submission_status TEXT DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'under_review', 'evaluated'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'admin_ppt_score') THEN
    ALTER TABLE public.teams ADD COLUMN admin_ppt_score NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'final_score') THEN
    ALTER TABLE public.teams ADD COLUMN final_score NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'is_winner') THEN
    ALTER TABLE public.teams ADD COLUMN is_winner BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- SCORES: Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'presentation_score') THEN
    ALTER TABLE public.scores ADD COLUMN presentation_score INT CHECK (presentation_score BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'updated_at') THEN
    ALTER TABLE public.scores ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ==============================================================================
-- SECTION 2: CREATE MISSING TABLES
-- ==============================================================================

-- ACCESS CODES (if not exists)
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

-- TEAM EVALUATORS (if not exists)
CREATE TABLE IF NOT EXISTS public.team_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, evaluator_id)
);

ALTER TABLE public.team_evaluators ENABLE ROW LEVEL SECURITY;

-- SCORES (if not exists)
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
-- SECTION 3: INSERT ACCESS CODES (idempotent)
-- ==============================================================================

INSERT INTO public.access_codes (code, role, panel, evaluator_name) VALUES
  ('PRANAY#JUDGE@2026', 'evaluator', 'panel_1', 'Pranay'),
  ('KETAN#JUDGE@2026', 'evaluator', 'panel_1', 'Ketan'),
  ('VIBHA#JUDGE@2026', 'evaluator', 'panel_2', 'Vibha'),
  ('MADHURI#JUDGE@2026', 'evaluator', 'panel_2', 'Madhuri'),
  ('INNOVEXA2@chairperson#', 'admin', NULL, 'Admin')
ON CONFLICT (code) DO NOTHING;

-- HARDENING: Revoke direct access
REVOKE ALL ON public.access_codes FROM authenticated;
REVOKE ALL ON public.access_codes FROM anon;

-- ==============================================================================
-- SECTION 4: SECURE RPC FUNCTION
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
-- SECTION 5: DROP & RECREATE POLICIES (safe idempotent approach)
-- ==============================================================================

-- ACCESS CODES
DROP POLICY IF EXISTS "access_codes_no_access" ON public.access_codes;
CREATE POLICY "access_codes_no_access" ON public.access_codes FOR ALL USING (FALSE);

-- PROFILES
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TEAMS
DROP POLICY IF EXISTS "teams_student_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_student_select" ON public.teams;
DROP POLICY IF EXISTS "teams_student_update" ON public.teams;
DROP POLICY IF EXISTS "teams_evaluator_select" ON public.teams;
DROP POLICY IF EXISTS "teams_judge_select" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_all" ON public.teams;

CREATE POLICY "teams_student_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "teams_student_select" ON public.teams
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND student_id = auth.uid())
  );

CREATE POLICY "teams_student_update" ON public.teams
  FOR UPDATE USING (created_by = auth.uid() AND submission_status = 'draft')
  WITH CHECK (created_by = auth.uid() AND submission_status = 'draft' AND panel IS NULL AND panel_judge_id IS NULL);

CREATE POLICY "teams_evaluator_select" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_evaluators WHERE team_id = teams.id AND evaluator_id = auth.uid())
  );

CREATE POLICY "teams_judge_select" ON public.teams
  FOR SELECT USING (panel_judge_id = auth.uid());

CREATE POLICY "teams_admin_all" ON public.teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TEAM MEMBERS
DROP POLICY IF EXISTS "team_members_leader_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;

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

-- SUBMISSIONS
DROP POLICY IF EXISTS "submissions_leader_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_select" ON public.submissions;

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

-- TEAM EVALUATORS
DROP POLICY IF EXISTS "team_evaluators_evaluator_select" ON public.team_evaluators;
DROP POLICY IF EXISTS "team_evaluators_admin_all" ON public.team_evaluators;

CREATE POLICY "team_evaluators_evaluator_select" ON public.team_evaluators
  FOR SELECT USING (evaluator_id = auth.uid());

CREATE POLICY "team_evaluators_admin_all" ON public.team_evaluators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SCORES
DROP POLICY IF EXISTS "scores_evaluator_all" ON public.scores;
DROP POLICY IF EXISTS "scores_admin_select" ON public.scores;

CREATE POLICY "scores_evaluator_all" ON public.scores
  FOR ALL USING (evaluator_id = auth.uid()) WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "scores_admin_select" ON public.scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==============================================================================
-- SECTION 6: TRIGGERS
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

-- Validate evaluator assignment before score
CREATE OR REPLACE FUNCTION validate_score_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.team_evaluators
    WHERE team_id = NEW.team_id AND evaluator_id = NEW.evaluator_id
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
-- SECTION 7: INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_panel ON public.teams(panel);
CREATE INDEX IF NOT EXISTS idx_team_evaluators_team ON public.team_evaluators(team_id);
CREATE INDEX IF NOT EXISTS idx_team_evaluators_evaluator ON public.team_evaluators(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_scores_team ON public.scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_evaluator ON public.scores(evaluator_id);

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

SELECT 'Migration completed successfully!' as status;

-- Show tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Show columns in teams table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'teams' ORDER BY ordinal_position;
