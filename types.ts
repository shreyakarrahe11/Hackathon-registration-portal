
export enum UserRole {
  STUDENT = 'STUDENT',
  EVALUATOR = 'EVALUATOR',
  ADMIN = 'ADMIN',
  GUEST = 'GUEST'
}

export enum TeamStatus {
  SUBMITTED = 'Submitted',
  REVIEW = 'Review',
  SHORTLISTED = 'Shortlisted',
  FINAL_PRESENTATION = 'Final Presentation',
  WINNER = 'Winner'
}

export interface TeamMember {
  name: string;
  email?: string;
  phone?: string;
}

export interface Evaluation {
  presentationScore: number; // Out of 50 (Judges only score this)
}

export interface Team {
  id: string; // Submission ID
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  teamSize: number;
  members: TeamMember[];
  psId: string;
  ideaDesc: string;
  pptUrl: string; // Mock URL

  // New Fields
  panel?: 'A' | 'B' | 'C' | 'D'; // Panel A (Pranay & Vibha), B (Ketan & Madhuri), C & D for backup
  adminPptScore?: number; // Out of 50 (Admin scores this)

  status: TeamStatus;
  evaluations: Record<string, Evaluation>; // judgeName -> Evaluation Object
  totalScore: number; // (AdminPPT) + (Avg Judge Presentation)
  submissionDate: string;
}

export interface Judge {
  name: string;
  code: string;
  panel: 'A' | 'B';
}

export interface ProblemStatement {
  id: string;
  title: string;
  domain: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Extreme';

  // Detailed Fields from PDF
  realWorldContext: string;
  coreProblem: string;
  constraints: string[];
  failureScenarios: string[];
  evaluationCriteria: string[];
  deliverables: string[];
}

// For Auth Context
export interface UserSession {
  role: UserRole;
  name: string;
  id?: string;
  email?: string;
  judgeId?: string; // If evaluator
  panel?: 'A' | 'B'; // If evaluator
  requiresRegistration?: boolean; // If new student from Google OAuth
}
