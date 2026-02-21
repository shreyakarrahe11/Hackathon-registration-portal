-- 1. Create Teams Table
create table public.teams (
  id text primary key, -- mapped to 'id' (e.g. SUB-XXXXXX)
  team_name text not null, -- mapped to 'teamName'
  lead_name text not null, -- mapped to 'leadName'
  lead_email text not null, -- mapped to 'email'
  lead_phone text not null, -- mapped to 'phone'
  team_size int not null, -- mapped to 'teamSize'
  ps_id text not null, -- mapped to 'psId'
  idea_desc text not null, -- mapped to 'ideaDesc'
  ppt_url text, -- mapped to 'pptUrl'
  status text default 'Submitted', -- mapped to 'status'
  total_score float default 0, -- mapped to 'totalScore'
  submission_date timestamp with time zone default timezone('utc'::text, now()), -- mapped to 'submissionDate'
  panel text, -- mapped to 'panel' ('A' or 'B')
  admin_ppt_score int -- mapped to 'adminPptScore'
);

-- 2. Create Submissions Table (tracks submission history and status)
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  submission_id text unique not null, -- e.g. SUB-XXXXX (displayed to users)
  team_id text references public.teams(id) on delete cascade,
  ps_id text not null,
  problem_statement text,
  idea_description text,
  ppt_file_url text,
  status text default 'pending', -- pending, under_review, evaluated
  evaluation_notes text,
  submitted_at timestamp with time zone default timezone('utc'::text, now()),
  evaluated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Members Table (for additional team members)
create table public.members (
  id uuid default gen_random_uuid() primary key,
  team_id text references public.teams(id) on delete cascade,
  name text not null,
  email text,
  phone text
);

-- 4. Create Evaluations Table (for judge scores)
create table public.evaluations (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  team_id text references public.teams(id) on delete cascade,
  judge_name text not null,
  score int, -- Presentation Score
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Add Check Constraints
alter table public.teams
add constraint teams_submission_status_check check (status in ('Submitted', 'Review', 'Shortlisted', 'Final Presentation', 'Winner'));

alter table public.submissions
add constraint valid_submission_status check (status in ('pending', 'under_review', 'evaluated'));

-- 6. Disable Row Level Security (RLS) for Demo/Development
-- This allows all users to perform all operations without RLS restrictions
alter table public.teams disable row level security;
alter table public.submissions disable row level security;
alter table public.members disable row level security;
alter table public.evaluations disable row level security;
create index idx_submissions_submission_id on public.submissions(submission_id);
create index idx_submissions_team_id on public.submissions(team_id);
create index idx_submissions_status on public.submissions(status);
create index idx_evaluations_submission_id on public.evaluations(submission_id);

-- NOTE: STORAGE BUCKET SETUP
-- 1. Create 'documents' bucket in Supabase Storage.
-- 2. Make it PUBLIC.
