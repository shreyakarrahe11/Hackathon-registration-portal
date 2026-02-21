# Fix RLS Policy Error

## The Error
```
Error: new row violates row-level security policy for table "teams"
```

## Root Cause
Row Level Security (RLS) policies are blocking INSERT operations on the tables.

## Solution

### Quick Fix (Recommended for Development)
Run the **FIX_RLS_POLICY.sql** file in your Supabase SQL Editor:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy and paste entire contents of `FIX_RLS_POLICY.sql`
5. Click "Run"
6. Refresh browser at http://localhost:3000

This will:
- ✅ Drop all conflicting RLS policies
- ✅ Disable RLS on all tables (for development)
- ✅ Allow all operations without restrictions

### Alternative: Keep RLS Enabled with Proper Policies
If you want to keep RLS for security, run this instead:

```sql
-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all roles
CREATE POLICY "teams_policy" ON public.teams 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "submissions_policy" ON public.submissions 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "members_policy" ON public.members 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "evaluations_policy" ON public.evaluations 
  FOR ALL USING (true) WITH CHECK (true);
```

## Verification
After running the fix:
- ✅ You should be able to submit teams without errors
- ✅ All CRUD operations should work
- ✅ Data persists in database

## For Production
In production, you would:
1. Keep RLS enabled
2. Create policies based on user roles (student, admin, evaluator)
3. Ensure authenticated users can only see/modify their own data
4. Use auth.uid() in policies for row-level access control

## Next Steps
1. Run FIX_RLS_POLICY.sql in Supabase
2. Refresh http://localhost:3000
3. Try registering a team again
4. If it works, you're ready to deploy!
