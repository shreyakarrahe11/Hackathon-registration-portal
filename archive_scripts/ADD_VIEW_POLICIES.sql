-- ==============================================================================
-- INNOVEX AI - ADD EVALUATOR & ADMIN VIEW POLICIES
-- ==============================================================================
-- Run AFTER NUCLEAR_RESET.sql to add viewing permissions
-- ==============================================================================

-- ==============================================================================
-- PROFILES: Admin can see all profiles
-- ==============================================================================

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- TEAMS: Evaluator & Admin access
-- ==============================================================================

-- Evaluator can view teams assigned to them
DROP POLICY IF EXISTS "teams_evaluator_select" ON public.teams;
CREATE POLICY "teams_evaluator_select" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators 
      WHERE team_id = teams.id AND evaluator_id = auth.uid()
    )
  );

-- Evaluator can also view teams in their panel
DROP POLICY IF EXISTS "teams_panel_select" ON public.teams;
CREATE POLICY "teams_panel_select" ON public.teams
  FOR SELECT USING (
    teams.panel = (SELECT panel FROM public.profiles WHERE id = auth.uid())
  );

-- ==============================================================================
-- TEAM MEMBERS: Evaluator & Admin access
-- ==============================================================================

-- Evaluator can view team members of assigned teams
DROP POLICY IF EXISTS "team_members_evaluator_select" ON public.team_members;
CREATE POLICY "team_members_evaluator_select" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators 
      WHERE team_id = team_members.team_id AND evaluator_id = auth.uid()
    )
  );

-- Admin can view all team members
DROP POLICY IF EXISTS "team_members_admin_select" ON public.team_members;
CREATE POLICY "team_members_admin_select" ON public.team_members
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- SUBMISSIONS: Evaluator & Admin access
-- ==============================================================================

-- Evaluator can view submissions of assigned teams
DROP POLICY IF EXISTS "submissions_evaluator_select" ON public.submissions;
CREATE POLICY "submissions_evaluator_select" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_evaluators 
      WHERE team_id = submissions.team_id AND evaluator_id = auth.uid()
    )
  );

-- Admin can view all submissions
DROP POLICY IF EXISTS "submissions_admin_select" ON public.submissions;
CREATE POLICY "submissions_admin_select" ON public.submissions
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin can update submissions (for scoring)
DROP POLICY IF EXISTS "submissions_admin_update" ON public.submissions;
CREATE POLICY "submissions_admin_update" ON public.submissions
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- SCORES: Admin can view all, evaluator only their own
-- ==============================================================================

DROP POLICY IF EXISTS "scores_admin_all" ON public.scores;
CREATE POLICY "scores_admin_all" ON public.scores
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- TEAM EVALUATORS: Evaluator can view their assignments
-- ==============================================================================

DROP POLICY IF EXISTS "team_evaluators_evaluator_select" ON public.team_evaluators;
CREATE POLICY "team_evaluators_evaluator_select" ON public.team_evaluators
  FOR SELECT USING (evaluator_id = auth.uid());

-- ==============================================================================
-- TEAMS: Admin can update (for panel assignment, scoring, winner marking)
-- ==============================================================================

DROP POLICY IF EXISTS "teams_admin_update" ON public.teams;
CREATE POLICY "teams_admin_update" ON public.teams
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- VERIFY
-- ==============================================================================

SELECT 'Evaluator & Admin policies added!' as status;

-- Show all policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
