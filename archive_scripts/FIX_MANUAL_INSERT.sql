-- FIX_MANUAL_INSERT.sql
-- Run this in Supabase SQL Editor.
-- REPLACE 'YOUR_EMAIL_HERE' with your actual login email (e.g., 'student@example.com')

DO $$
DECLARE
    target_email text := 'YOUR_EMAIL_HERE'; -- <--- UPDATE THIS LINE
    my_team_id uuid;
BEGIN
    -- 1. Find Team ID by Email
    select team_id into my_team_id
    from public.team_members
    where email = target_email
    limit 1;

    IF my_team_id IS NULL THEN
        RAISE EXCEPTION 'Could not find a team for email: %. Check spelling!', target_email;
    END IF;

    -- 2. Check/Insert Submission
    IF EXISTS (select 1 from public.submissions where team_id = my_team_id) THEN
        RAISE NOTICE 'Submission already exists for Team %', my_team_id;
    ELSE
        INSERT INTO public.submissions (
            team_id,
            ps_id,
            problem_statement,
            idea_description,
            ppt_url,
            ppt_file_url,
            submitted_at
        ) VALUES (
            my_team_id,
            'PS01',
            'Manual Fix Submission',
            'Restored manually via Email Lookup.',
            'https://example.com/manual-fix',
            '#',
            now()
        );
        RAISE NOTICE 'SUCCESS: Created submission for Team %', my_team_id;
        
        -- Update Team Status
        UPDATE public.teams SET status = 'submitted' WHERE id = my_team_id;
    END IF;

END $$;
