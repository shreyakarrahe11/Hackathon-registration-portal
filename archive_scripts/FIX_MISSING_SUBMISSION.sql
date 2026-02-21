-- FIX_MISSING_SUBMISSION.sql (Updated)
-- Purpose: Backfill AND Repair submission records.

-- 1. Insert missing rows
INSERT INTO public.submissions (team_id, ps_id, problem_statement, idea_description, ppt_url, ppt_file_url, submitted_at)
SELECT 
    t.id, 
    'PS-RECOVERED', 
    'Recovered Submission (Legacy Data)', 
    'This submission was backfilled because the original data was missing.', 
    '#', 
    '#', 
    NOW()
FROM public.teams t
WHERE t.status = 'submitted'
AND NOT EXISTS (
    SELECT 1 FROM public.submissions s WHERE s.team_id = t.id
);

-- 2. Repair existing rows with missing file URLs
UPDATE public.submissions
SET ppt_file_url = '#'
WHERE ppt_file_url IS NULL OR ppt_file_url = '';

-- 3. Verify
SELECT count(*) as fixed_submissions FROM public.submissions WHERE ppt_file_url = '#';
