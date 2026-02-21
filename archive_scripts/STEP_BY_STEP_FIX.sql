-- ==============================================================================
-- INNOVEX AI - STEP BY STEP FIX
-- ==============================================================================
-- Run each section ONE AT A TIME to find where it breaks
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Create profiles table (fresh)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'evaluator', 'admin')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  panel TEXT,
  access_code_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 2: Add created_by column to teams (if missing)
-- ==============================================================================

-- First check what columns exist
SELECT column_name FROM information_schema.columns WHERE table_name = 'teams';

-- Add created_by if it doesn't exist
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add other missing columns
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS panel TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS panel_judge_id UUID;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'draft';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS admin_ppt_score NUMERIC;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS final_score NUMERIC;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE;

-- ==============================================================================
-- STEP 3: Create other tables
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ps_id TEXT,
  problem_statement TEXT,
  idea_description TEXT,
  ppt_file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.access_codes (
  code TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  panel TEXT,
  evaluator_name TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID,
  used_at TIMESTAMPTZ
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_evaluators ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ppt_score INT,
  presentation_score INT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 4: Insert access codes
-- ==============================================================================

INSERT INTO public.access_codes (code, role, panel, evaluator_name) VALUES
  ('PRANAY#JUDGE@2026', 'evaluator', 'panel_1', 'Pranay'),
  ('KETAN#JUDGE@2026', 'evaluator', 'panel_1', 'Ketan'),
  ('VIBHA#JUDGE@2026', 'evaluator', 'panel_2', 'Vibha'),
  ('MADHURI#JUDGE@2026', 'evaluator', 'panel_2', 'Madhuri'),
  ('INNOVEXA2@chairperson#', 'admin', NULL, 'Admin')
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- STEP 5: Drop ALL existing policies
-- ==============================================================================

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

-- ==============================================================================
-- STEP 6: Create SIMPLE policies (no cross-table references for now)
-- ==============================================================================

-- Profiles: anyone can insert/select/update their own
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams: owner can do everything
CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "teams_update" ON public.teams FOR UPDATE USING (created_by = auth.uid());

-- Team members: simple self-access
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (student_id = auth.uid());

-- Submissions: simple
CREATE POLICY "submissions_insert" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT USING (true);

-- Access codes: no access
CREATE POLICY "access_codes_block" ON public.access_codes FOR ALL USING (false);

-- Team evaluators
CREATE POLICY "team_evaluators_select" ON public.team_evaluators FOR SELECT USING (evaluator_id = auth.uid());

-- Scores
CREATE POLICY "scores_all" ON public.scores FOR ALL USING (evaluator_id = auth.uid());

-- ==============================================================================
-- STEP 7: Create the RPC function
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
-- VERIFY
-- ==============================================================================

SELECT 'All done!' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT column_name FROM information_schema.columns WHERE table_name = 'teams';
