-- ==============================================================================
-- SCHEMA V2: STRICT RELATIONAL PIPELINE (ORDERED & FIXED)
-- ==============================================================================

-- ⚠️ WARNING: THIS WILL DELETE EXISTING DATA IN THESE TABLES.
-- Run this to fix "Relation already exists" or "Relation does not exist" errors.

-- 1. DROP EVERYTHING (Clean Slate)
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.evaluator_assignments CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==============================================================================
-- 2. CREATE TABLES (Structure First)
-- ==============================================================================

-- USERS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text check (role in ('student','admin','evaluator')) not null default 'student',
  created_at timestamp with time zone default now()
);

-- TEAMS
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  leader_id uuid references public.users(id) on delete cascade,
  status text check (
    status in ('registered','submitted','under_review','evaluated')
  ) default 'registered',
  panel text,
  admin_ppt_score numeric default 0,
  total_score numeric default 0,
  created_at timestamp with time zone default now()
);

-- TEAM MEMBERS
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  email text not null,
  phone text not null,
  name text not null,
  role text check (role in ('leader','member')) not null
);

-- SUBMISSIONS
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade unique,
  ps_id text,
  problem_statement text,
  idea_description text not null,
  ppt_url text,
  ppt_file_url text not null,
  submitted_at timestamp with time zone default now()
);

-- EVALUATOR ASSIGNMENTS
create table public.evaluator_assignments (
  id uuid primary key default gen_random_uuid(),
  evaluator_id uuid references public.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  assigned_at timestamp with time zone default now(),
  unique(evaluator_id, submission_id)
);

-- EVALUATIONS
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.evaluator_assignments(id) on delete cascade,
  score numeric not null default 0,
  feedback text,
  created_at timestamp with time zone default now()
);

-- ==============================================================================
-- 3. ENABLE RLS & POLICIES (Logic Second)
-- ==============================================================================

-- HELPER FUNCTION: is_admin()
-- Bypasses RLS to avoid infinite recursion when querying users table for admin role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- USERS POLICIES
alter table public.users enable row level security;

create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.users for select using (is_admin());
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- TEAMS POLICIES
alter table public.teams enable row level security;

create policy "Student lead can view own team" on public.teams for select using (leader_id = auth.uid());
create policy "Student lead can update own team" on public.teams for update using (leader_id = auth.uid());
create policy "Student lead can insert own team" on public.teams for insert with check (leader_id = auth.uid());
create policy "Admin has full access to teams" on public.teams for all using (is_admin());

-- Evaluator Policy (Now works because submissions table exists)
create policy "Evaluators view assigned teams" on public.teams for select using (
  exists (
    select 1 from public.submissions s
    join public.evaluator_assignments ea on ea.submission_id = s.id
    where s.team_id = public.teams.id and ea.evaluator_id = auth.uid()
  )
);

-- TEAM MEMBERS POLICIES
alter table public.team_members enable row level security;

create policy "Team members viewable by team leader" on public.team_members for select using (exists (select 1 from public.teams where id = team_id and leader_id = auth.uid()));
create policy "Team members viewable by Admin" on public.team_members for select using (is_admin());
create policy "Team leader can insert members" on public.team_members for insert with check (exists (select 1 from public.teams where id = team_id and leader_id = auth.uid()));

-- SUBMISSIONS POLICIES
alter table public.submissions enable row level security;

create policy "Team leader view own submission" on public.submissions for select using (exists (select 1 from public.teams where id = team_id and leader_id = auth.uid()));
create policy "Team leader insert own submission" on public.submissions for insert with check (exists (select 1 from public.teams where id = team_id and leader_id = auth.uid()));
create policy "Admin view all submissions" on public.submissions for select using (is_admin());
create policy "Evaluator view assigned submissions" on public.submissions for select using (exists (select 1 from public.evaluator_assignments where submission_id = public.submissions.id and evaluator_id = auth.uid()));

-- ASSIGNMENTS POLICIES
alter table public.evaluator_assignments enable row level security;

create policy "Admin manage assignments" on public.evaluator_assignments for all using (is_admin());
create policy "Evaluator view own assignments" on public.evaluator_assignments for select using (evaluator_id = auth.uid());

-- EVALUATIONS POLICIES
alter table public.evaluations enable row level security;

create policy "Evaluator manage own evaluations" on public.evaluations for all using (exists (select 1 from public.evaluator_assignments where id = assignment_id and evaluator_id = auth.uid()));
create policy "Admin view evaluations" on public.evaluations for select using (is_admin());


-- ==============================================================================
-- 4. STORAGE BUCKETS (Files Third)
-- ==============================================================================

-- Create 'documents' bucket if not exists
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Enable RLS on Objects (Important for future, though Public bucket is loose)
alter table storage.objects enable row level security;

-- Allow Students to Upload (Insert) own submission files
create policy "Team leaders can upload submission files"
on storage.objects for insert
with check (
    bucket_id = 'documents'
);

-- Note: We might want stricter RLS like `(auth.uid() = owner)` but Supabase Storage RLS 
-- can be complex with "folders". For now, insert permission is key.
-- Select is Public.
