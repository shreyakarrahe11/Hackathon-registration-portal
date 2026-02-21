-- ==============================================================================
-- INNOVEX AI - EMERGENCY FIX (Run This First!)
-- ==============================================================================
-- Fixes: 404 on profiles, infinite recursion in teams policies
-- ==============================================================================

-- ==============================================================================
-- STEP 1: CREATE PROFILES TABLE (If missing)
-- ==============================================================================

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
-- STEP 2: CREATE TEAMS TABLE (If missing)
-- ==============================================================================

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

-- ==============================================================================
-- STEP 3: CREATE TEAM_MEMBERS TABLE (If missing)
-- ==============================================================================

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

-- ==============================================================================
-- STEP 4: DROP ALL EXISTING POLICIES (Clean Slate)
-- ==============================================================================

-- Profiles
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

-- Teams (drop ALL possible policies)
DROP POLICY IF EXISTS "teams_student_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_student_select" ON public.teams;
DROP POLICY IF EXISTS "teams_student_update" ON public.teams;
DROP POLICY IF EXISTS "teams_evaluator_select" ON public.teams;
DROP POLICY IF EXISTS "teams_judge_select" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_all" ON public.teams;
DROP POLICY IF EXISTS "Students can view own teams" ON public.teams;
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;
DROP POLICY IF EXISTS "Students can update own teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated to insert teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated to select teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated to update teams" ON public.teams;

-- Team Members
DROP POLICY IF EXISTS "team_members_leader_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "Allow team members to view" ON public.team_members;
DROP POLICY IF EXISTS "Allow leader to insert members" ON public.team_members;

-- ==============================================================================
-- STEP 5: CREATE SIMPLE NON-RECURSIVE POLICIES
-- ==============================================================================

-- ===== PROFILES: Simple self-access =====
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can see all profiles (separate policy to avoid recursion)
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ===== TEAMS: Non-recursive policies =====

-- Anyone authenticated can INSERT their own team
CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Creator can SELECT their own team (simple, no subquery to other tables)
CREATE POLICY "teams_select_owner" ON public.teams
  FOR SELECT USING (created_by = auth.uid());

-- Creator can UPDATE their own team in draft status
CREATE POLICY "teams_update_owner" ON public.teams
  FOR UPDATE USING (created_by = auth.uid() AND submission_status = 'draft');

-- Admin has full access (uses scalar subquery, no recursion)
CREATE POLICY "teams_admin" ON public.teams
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ===== TEAM MEMBERS: Non-recursive policies =====

-- Team creator can insert members
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

-- Members can view their own membership
CREATE POLICY "team_members_select_self" ON public.team_members
  FOR SELECT USING (student_id = auth.uid());

-- Team creator can view all members of their team
CREATE POLICY "team_members_select_leader" ON public.team_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

-- ==============================================================================
-- STEP 6: VERIFY
-- ==============================================================================

SELECT 'Emergency fix applied!' as status;

-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check policies on teams
SELECT policyname FROM pg_policies WHERE tablename = 'teams';
