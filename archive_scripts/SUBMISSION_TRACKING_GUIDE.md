# Submission Tracking System

## Overview
The submission tracking system generates unique Submission IDs for each team submission, allowing participants to track the status of their project submission in real-time.

## How It Works

### 1. Submission ID Generation
When a team submits their project:
- A unique Submission ID is automatically generated in the format: **SUB-XXXXX** (e.g., SUB-8X29B1)
- This ID is stored in the `submissions` table with the status
- The Submission ID is displayed to the participant after successful submission

### 2. Submission Status Tracking
Each submission has one of the following statuses:

| Status | Description |
|--------|-------------|
| **pending** | Submission received, awaiting review |
| **under_review** | Judges are evaluating the submission |
| **evaluated** | All evaluations complete, decision made |

### 3. Database Schema

#### Submissions Table
```sql
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text UNIQUE NOT NULL,  -- User-facing ID (SUB-XXXXX)
  team_id text REFERENCES public.teams(id),
  ps_id text NOT NULL,
  problem_statement text,
  idea_description text,
  ppt_file_url text,
  status text DEFAULT 'pending',
  evaluation_notes text,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Functions

### submitProject
Handles project submission and generates Submission ID:
```typescript
const submission = await submitProject(teamId, {
  psId: "PS-001",
  problemTitle: "Problem Title",
  description: "Project Description",
  pptUrl: "optional_ppt_url",
  file: pptFile
});

// Returns:
// {
//   id: "uuid",
//   submission_id: "SUB-XXXXX",  // Unique submission tracking ID
//   team_id: "team-uuid",
//   status: "pending",
//   submitted_at: "2026-02-04T...",
//   ...
// }
```

### getSubmissionBySubmissionId
Retrieves submission and team details by Submission ID:
```typescript
const result = await getSubmissionBySubmissionId("SUB-8X29B1");

// Returns:
// {
//   submission: { ... },
//   team: { ... },
//   members: [ ... ],
//   evaluations: [ ... ]
// }
```

## Frontend Integration

### Status Check Page
Located at `/status-check` - allows anyone to check submission status:
1. User enters their Submission ID (e.g., SUB-8X29B1)
2. System fetches submission and displays:
   - Team name and lead information
   - Submission date
   - Current status with timeline
   - Evaluation details (if available)

### Post-Submission Flow
After successful project submission:
1. Display confirmation with Submission ID
2. Show status tracker
3. Provide link to status check page
4. Email Submission ID to team lead

## Example Submission ID Generation
```typescript
const generateSubmissionId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SUB-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Possible outputs:
// SUB-8X29B1
// SUB-K2J9P4
// SUB-R7Q0M8
```

## Implementation Checklist

- [x] Add `submissions` table with `submission_id` column
- [x] Update `submitProject` function to generate Submission ID
- [x] Add `getSubmissionBySubmissionId` function
- [x] Update StatusCheck page to use Submission ID lookup
- [x] Update schema to include evaluations relationship
- [ ] Create confirmation email template with Submission ID
- [ ] Add Submission ID display in registration success page
- [ ] Create admin dashboard to view all submissions by ID
- [ ] Add submission search functionality to admin panel

## Security Notes

- Submission IDs are public and can be shared
- Anyone can view submission status using the Submission ID
- To restrict access, implement authenticated status checks
- Consider adding verification tokens for sensitive operations

## Migration SQL

Run this in your Supabase SQL Editor to set up the tracking system:

```sql
-- Already included in schema.sql
-- Creates submissions table with submission_id tracking
-- Adds indexes for performance optimization
```
