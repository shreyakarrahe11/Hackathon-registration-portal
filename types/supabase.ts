export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    name: string
                    email: string
                    role: 'student' | 'admin' | 'evaluator'
                    created_at: string
                }
                Insert: {
                    id: string
                    name: string
                    email: string
                    role?: 'student' | 'admin' | 'evaluator'
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    role?: 'student' | 'admin' | 'evaluator'
                    created_at?: string
                }
            }
            teams: {
                Row: {
                    id: string
                    team_name: string
                    status: 'registered' | 'submitted' | 'under_review' | 'evaluated'
                    panel: string | null
                    admin_ppt_score: number
                    total_score: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_name: string
                    status?: 'registered' | 'submitted' | 'under_review' | 'evaluated'
                    panel?: string | null
                    admin_ppt_score?: number
                    total_score?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_name?: string
                    status?: 'registered' | 'submitted' | 'under_review' | 'evaluated'
                    panel?: string | null
                    admin_ppt_score?: number
                    total_score?: number
                    created_at?: string
                }
            }
            team_members: {
                Row: {
                    id: string
                    team_id: string
                    user_id: string | null
                    email: string
                    phone: string
                    name: string
                    role: 'leader' | 'member'
                }
                Insert: {
                    id?: string
                    team_id: string
                    user_id?: string | null
                    email: string
                    phone: string
                    name: string
                    role: 'leader' | 'member'
                }
                Update: {
                    id?: string
                    team_id?: string
                    user_id?: string | null
                    email?: string
                    phone?: string
                    name?: string
                    role?: 'leader' | 'member'
                }
            }
            submissions: {
                Row: {
                    id: string
                    team_id: string
                    ps_id: string | null
                    problem_statement: string | null
                    idea_description: string
                    ppt_url: string | null
                    ppt_file_url: string
                    submitted_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    ps_id?: string | null
                    problem_statement?: string | null
                    idea_description: string
                    ppt_url?: string | null
                    ppt_file_url: string
                    submitted_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    ps_id?: string | null
                    problem_statement?: string | null
                    idea_description?: string
                    ppt_url?: string | null
                    ppt_file_url?: string
                    submitted_at?: string
                }
            }
            evaluator_assignments: {
                Row: {
                    id: string
                    evaluator_id: string
                    submission_id: string
                    assigned_at: string
                }
                Insert: {
                    id?: string
                    evaluator_id: string
                    submission_id: string
                    assigned_at?: string
                }
                Update: {
                    id?: string
                    evaluator_id?: string
                    submission_id?: string
                    assigned_at?: string
                }
            }
            evaluations: {
                Row: {
                    id: string
                    assignment_id: string
                    score: number
                    feedback: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    assignment_id: string
                    score?: number
                    feedback?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    assignment_id?: string
                    score?: number
                    feedback?: string | null
                    created_at?: string
                }
            }
        }
    }
}
