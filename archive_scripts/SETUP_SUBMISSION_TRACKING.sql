-- Submission Tracking System Migration
-- Run this in Supabase SQL Editor to enable submission ID tracking
-- This adds the submissions table and related infrastructure

-- 1. Create Submissions Table with Submission ID tracking
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id text UNIQUE NOT NULL, -- e.g. SUB-XXXXX (displayed to users)
  team_id text REFERENCES public.teams(id) ON DELETE CASCADE,
  ps_id text NOT NULL,
  problem_statement text,
  idea_description text,
  ppt_file_url text,
  ppt_url text, -- Optional: original PPT URL before file upload
  status text DEFAULT 'pending', -- pending, under_review, evaluated
  evaluation_notes text,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  evaluated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Update Evaluations Table to reference Submissions
ALTER TABLE public.evaluations
ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE;

-- 3. Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Submissions
CREATE POLICY IF NOT EXISTS "Public can view submissions" 
ON public.submissions FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can insert submissions"
ON public.submissions FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authorized users can update submissions"
ON public.submissions FOR UPDATE USING (true);

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_submissions_submission_id ON public.submissions(submission_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON public.submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_id ON public.evaluations(submission_id);

-- 6. Migrate existing data (if any) from teams table
-- If you already have submissions data, you can map it here
-- UPDATE public.submissions SET status = 'pending' WHERE status IS NULL;

-- 7. Add constraints
ALTER TABLE public.submissions 
ADD CONSTRAINT valid_submission_status CHECK (status IN ('pending', 'under_review', 'evaluated'));

-- 8. Verify setup
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'submissions'
ORDER BY ordinal_position;
