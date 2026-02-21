-- CHECK_RLS_BY_EMAIL.sql
-- Diagnostics: Check what the database THINKS is happening.

DO $$
DECLARE
    target_email text := 'YOUR_EMAIL_HERE'; -- <--- UPDATE THIS
    test_user_id uuid;
    test_team_id uuid;
    can_see_submission boolean;
    submission_count int;
BEGIN
    -- 1. Get User ID from real users table
    select id into test_user_id from public.users where email = target_email;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ User not found! Check email spelling.';
        RETURN;
    END IF;

    RAISE NOTICE '✅ User Found: % (ID: %)', target_email, test_user_id;

    -- 2. Test get_my_team_id function logic manually
    select team_id into test_team_id from public.team_members where user_id = test_user_id limit 1;
    
    IF test_team_id IS NULL THEN
        RAISE NOTICE '❌ get_my_team_id() would return NULL. User has no team.';
    ELSE
        RAISE NOTICE '✅ User is in Team: %', test_team_id;
    END IF;

    -- 3. Check Physical Submission Existence
    select count(*) into submission_count from public.submissions where team_id = test_team_id;
    RAISE NOTICE '📊 Physical Submissions in DB for this Team: %', submission_count;

    -- 4. Check Visibility (RLS Simulation is hard in DO block, but we can verify the logic)
    -- The policy is: team_id = get_my_team_id()
    -- We just confirmed above that test_team_id IS the result of that logic.
    -- So if submission_count > 0, RLS *should* work.
    
    IF submission_count > 0 THEN
        RAISE NOTICE '🎉 DIAGNOSIS: Data exists. If Dashboard is "N/A", the frontend fetch is wrong.';
    ELSE
        RAISE NOTICE '💀 DIAGNOSIS: Data is MISSING from database. Insert failed.';
    END IF;

END $$;
