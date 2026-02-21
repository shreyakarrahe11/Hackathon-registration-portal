import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { UserRole, TeamStatus } from '../types';

// --- Configuration ---
// --- Configuration ---
// Fallback Demo Config (Matches original mockSupabase.ts)
const DEMO_URL = 'https://lemfvausrbpdplgpkopf.supabase.co';
const DEMO_KEY = 'sb_publishable_38w2JZRuP0RNAaz5fsYhSA_Ls7McrT9';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("YOUR_SUPABASE_URL")) {
    console.warn("SUPABASE: Missing or invalid .env variables. Falling back to DEMO INSTANCE.");
    supabaseUrl = DEMO_URL;
    supabaseKey = DEMO_KEY;
} else {
    console.log("SUPABASE: Initialized with verified .env config.");
}

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
        persistSession: true,        // CRITICAL: Persist session to localStorage
        autoRefreshToken: true,      // Auto-refresh before expiry
        detectSessionInUrl: true,    // Detect OAuth callback tokens in URL
        storageKey: 'innovex-auth',  // Unique key to avoid conflicts
        flowType: 'pkce'             // More secure OAuth flow
    }
});

// --- Production Utilities ---

/**
 * Retry wrapper with exponential backoff for database operations
 * Handles transient failures gracefully for 500+ concurrent users
 */
export const withRetry = async <T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        retryOn?: (error: any) => boolean;
    } = {}
): Promise<T> => {
    const {
        maxRetries = 3,
        baseDelayMs = 500,
        maxDelayMs = 5000,
        retryOn = (err) => {
            // Retry on network errors, rate limits, and 5xx errors
            const msg = err?.message?.toLowerCase() || '';
            return (
                msg.includes('network') ||
                msg.includes('fetch') ||
                msg.includes('timeout') ||
                msg.includes('rate limit') ||
                msg.includes('too many requests') ||
                err?.status >= 500
            );
        }
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            if (attempt === maxRetries || !retryOn(error)) {
                throw error;
            }

            // Exponential backoff with jitter
            const delay = Math.min(
                baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
                maxDelayMs
            );

            console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};

/**
 * Check Supabase connection health
 * Returns true if connected, false otherwise
 */
export const checkConnection = async (): Promise<boolean> => {
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
};

/**
 * Get human-readable error message from Supabase errors
 */
export const getErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred';

    const msg = error.message || error.error_description || String(error);

    // Map common errors to user-friendly messages
    if (msg.includes('duplicate key')) return 'This record already exists';
    if (msg.includes('violates foreign key')) return 'Related record not found';
    if (msg.includes('permission denied') || msg.includes('RLS')) return 'You do not have permission to perform this action';
    if (msg.includes('JWT expired')) return 'Your session has expired. Please log in again.';
    if (msg.includes('rate limit')) return 'Too many requests. Please wait a moment.';

    return msg;
};

// --- Types (Based on new Schema) ---

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'admin' | 'evaluator';
    panel?: 'panel_1' | 'panel_2' | null;
    access_code_used?: boolean;
}

export interface Team {
    id: string;
    team_name: string;
    status: 'registered' | 'submitted' | 'under_review' | 'evaluated';
    panel?: string;
    admin_ppt_score?: number;
    total_score?: number;
}

export interface TeamMember {
    id?: string;
    team_id?: string;
    name: string;
    email: string;
    phone: string;
    role: 'leader' | 'member';
}

export interface Submission {
    id: string;
    submission_id: string; // User-facing submission ID (e.g. SUB-XXXXX)
    team_id: string;
    ps_id?: string;
    problem_statement?: string;
    idea_description: string;
    ppt_url?: string;
    ppt_file_url: string;
    status: string;
    submitted_at: string;
}

// --- Layer 2: Auth & Profile ---

/**
 * Checks if the currently authenticated user has a profile.
 * Uses only 'profiles' table (production schema).
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Query profiles table only (production schema)
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }

    if (profile) {
        return {
            id: profile.id,
            name: profile.full_name || user.user_metadata?.full_name || 'User',
            email: profile.email || user.email || '',
            role: profile.role,
            panel: profile.panel,
            access_code_used: profile.access_code_used
        } as UserProfile;
    }

    return null;
};

/**
 * Creates the initial user profile.
 * Creates in profiles table (production schema).
 */
export const createUserProfile = async (name: string, role: UserRole = UserRole.STUDENT): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error("No authenticated user found");

    const roleValue = role.toString().toLowerCase();

    // Create profile using upsert (handles both insert and update)
    const profilePayload = {
        id: user.id,
        full_name: name,
        email: user.email,
        role: roleValue
    };

    const { data, error } = await supabase
        .from('profiles')
        .upsert(profilePayload)
        .select()
        .single();

    if (error) {
        console.error("Profile creation error:", error);
        throw error;
    }

    return {
        id: data.id,
        name: data.full_name || name,
        email: data.email,
        role: data.role
    } as UserProfile;
};


// --- Layer 2.5: Student Registration Transaction ---

export const registerTeam = async (
    teamName: string,
    leaderProfile: { name: string, phone: string },
    members: { name: string; email: string; phone: string }[]
): Promise<Team | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    // 1. Create Team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
            team_name: teamName,
            status: 'registered'
        })
        .select()
        .single();

    if (teamError) throw teamError;
    if (!team) throw new Error("Failed to create team");

    // 2. Add Leader as Member
    const leaderMember = {
        team_id: team.id,
        user_id: user.id,
        name: leaderProfile.name,
        email: user.email!, // Safe bang, checked above
        phone: leaderProfile.phone,
        role: 'leader'
    };

    // 3. Add Other Members
    const otherMembers = members.map(m => ({
        team_id: team.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        role: 'member'
    }));

    const allMembers = [leaderMember, ...otherMembers];

    const { error: memberError } = await supabase
        .from('team_members')
        .insert(allMembers);

    if (memberError) {
        // Ideally we would rollback team creation here, but Supabase JS doesn't support transactions easily without RPC.
        // For now, we throw. Strict SQL consistency > Client side rollback.
        console.error("Error adding members", memberError);
        throw memberError;
    }

    return team as Team;
};

// --- Layer 3: Submissions ---

export const submitProject = async (
    teamId: string,
    submissionData: {
        psId: string,
        problemTitle: string,
        description: string,
        pptUrl?: string,
        file: File
    }
): Promise<Submission | null> => {

    console.log(`SERVICE: submitProject called for team ${teamId}`);

    // 1. Generate Unique Submission ID (SUB-XXXXX format)
    const generateSubmissionId = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'SUB-';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const submissionId = generateSubmissionId();
    console.log(`SERVICE: Generated submission ID: ${submissionId}`);

    // 2. Upload File (With Timeout)
    const fileExt = submissionData.file.name.split('.').pop();
    const filePath = `${teamId}/submission.${fileExt}`;

    console.log(`SERVICE: Uploading file to ${filePath}...`);

    // Create a timeout promise
    const TIMEOUT_MS = 20000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out (20s). Check network permissions.")), TIMEOUT_MS)
    );

    const uploadPromise = supabase.storage
        .from('documents')
        .upload(filePath, submissionData.file, { upsert: true });

    // Race against timeout
    const res: any = await Promise.race([uploadPromise, timeoutPromise]);

    // Handle Supabase Error manually since we raced
    if (res.error) {
        console.error("SERVICE: Upload Error:", res.error);
        throw res.error;
    }

    console.log("SERVICE: File Uploaded successfully.");

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    // 3. Insert Submission Record with Submission ID
    console.log("SERVICE: Inserting Submission Record...");
    const payload = {
        submission_id: submissionId,
        team_id: teamId,
        ps_id: submissionData.psId,
        problem_statement: submissionData.problemTitle,
        idea_description: submissionData.description,
        ppt_url: submissionData.pptUrl,
        ppt_file_url: fileUrl,
        status: 'pending',
        submitted_at: new Date().toISOString()
    };

    const { data: submission, error: subError } = await supabase
        .from('submissions')
        .insert(payload)
        .select()
        .single();

    if (subError) {
        console.error("SERVICE: Submission Insert Error:", subError);
        throw subError;
    }

    // 4. Update Team Status
    console.log("SERVICE: Updating Team Status...");
    await supabase
        .from('teams')
        .update({ status: 'Submitted' })
        .eq('id', teamId);

    console.log("SERVICE: submitProject complete. Submission ID:", submissionId);
    return submission as Submission;
};

// --- Layer 3: Dashboard Data Fetching ---

export const getMyTeam = async (): Promise<any> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Try finding team via Secure RPC (Bypasses RLS issues)
    // This is the preferred method as it handles cases where user_id is null in team_members
    const { data: teamId, error: rpcError } = await supabase.rpc('get_user_team_id');

    if (teamId) {
        // Fetch Success!
        const { data: team } = await supabase
            .from('teams')
            .select('*, team_members(*), submissions(*)')
            .eq('id', teamId)
            .single();
        return team;
    }

    if (rpcError) {
        console.warn("RPC get_user_team_id failed (Migration likely missing). Falling back to manual lookup.", rpcError);
    } else {
        // RPC returned null, meaning absolutely no team found.
        return null;
    }

    // --- FALLBACK (For systems without the Migration) ---
    // 2. Try finding team where user is a member (via email lookup)
    const { data: memberRecord } = await supabase
        .from('members')
        .select('team_id')
        .eq('email', user.email)
        .maybeSingle();

    if (memberRecord) {
        let { data: memberTeam } = await supabase
            .from('teams')
            .select('*, members(*)')
            .eq('id', memberRecord.team_id)
            .single();
        return memberTeam;
    }

    // 3. Try finding team where lead_email matches
    let { data: team } = await supabase
        .from('teams')
        .select('*, members(*)')
        .eq('lead_email', user.email)
        .maybeSingle();

    if (team) return team;

    if (memberRecord) {
        const { data: memberTeam } = await supabase
            .from('teams')
            .select('*, team_members(*), submissions(*)')
            .eq('id', memberRecord.team_id)
            .single();
        return memberTeam;
    }

    return null;
};

/**
 * Fetch submission and team data by Submission ID
 * Used for status tracking pages
 */
export const getSubmissionBySubmissionId = async (submissionId: string): Promise<any> => {
    console.log(`SERVICE: Fetching submission by ID: ${submissionId}`);

    // Fetch Submission
    const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle();

    if (submissionError) {
        console.error("Error fetching submission:", submissionError);
        throw submissionError;
    }

    if (!submission) {
        console.log(`Submission ${submissionId} not found`);
        return null;
    }

    // Fetch associated team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', submission.team_id)
        .single();

    if (teamError) {
        console.error("Error fetching team:", teamError);
        throw teamError;
    }

    // Fetch team members
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', submission.team_id);

    if (membersError) {
        console.warn("Error fetching members:", membersError);
    }

    // Fetch evaluations for this submission
    const { data: evaluations, error: evalsError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('submission_id', submission.id);

    if (evalsError) {
        console.warn("Error fetching evaluations:", evalsError);
    }

    return {
        submission,
        team,
        members: members || [],
        evaluations: evaluations || []
    };
};

// --- Layer 4: Admin & Evaluator Services ---

export const getAllTeams = async (): Promise<any[]> => {
    // Admin View: Manual Join Strategy to bypass RLS/Relation issues
    console.log("SERVICE: Fetching All Teams (Manual Join Strategy)...");

    // 1. Fetch Teams
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('submission_date', { ascending: false });
    if (teamsError) {
        console.error("Fetch teams failed", teamsError);
        return [];
    }

    // 2. Fetch Members
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*');
    if (membersError) console.warn("Fetch members failed", membersError);

    // 3. Fetch Submissions
    const { data: submissions, error: subsError } = await supabase
        .from('submissions')
        .select('*');
    if (subsError) console.warn("Fetch submissions failed", subsError);

    // 4. Fetch Evaluations
    const { data: evaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*');
    if (evalError) console.warn("Fetch evaluations failed", evalError);

    // 5. Stitching Data
    const fullData = teams?.map(team => {
        // A. Attach Members
        const teamMembers = members?.filter(m => m.team_id === team.id) || [];

        // B. Attach Submissions
        const teamSubmissions = submissions?.filter(s => s.team_id === team.id) || [];
        const submission = teamSubmissions[0];

        // C. Attach Evaluations
        const teamEvaluations = evaluations?.filter(e => e.team_id === team.id) || [];
        
        let presentationScore = 0;
        const evaluationList: any[] = [];

        if (teamEvaluations && Array.isArray(teamEvaluations)) {
            teamEvaluations.forEach((ev: any) => {
                presentationScore += ev.score || 0;
                evaluationList.push({
                    evaluatorName: ev.judge_name,
                    score: ev.score,
                    comments: ev.evaluation_notes || ""
                });
            });
        }

        // Calculate Total Score (Presentation + Admin PPT)
        const totalScore = presentationScore + (team.admin_ppt_score || 0);

        return {
            ...team,
            team_members: teamMembers,
            submissions: teamSubmissions,
            evaluations: evaluationList,
            presentation_score: presentationScore,
            total_score: totalScore
        };
    });

    console.log("SERVICE: Stitched Admin Data:", fullData);
    return fullData || [];
};

export const updateTeamStatus = async (teamId: string, status: TeamStatus): Promise<void> => {
    const { error } = await supabase
        .from('teams')
        .update({ status })
        .eq('id', teamId);

    if (error) throw error;
};

export const updateTeamPanel = async (teamId: string, panel: string): Promise<void> => {
    const { error } = await supabase
        .from('teams')
        .update({ panel })
        .eq('id', teamId);

    if (error) throw error;
};

// Evaluator: Get ASSIGNED teams (via team_evaluators table)
// Falls back to panel-based filtering if no assignments exist
export const getEvaluatorTeams = async (panel?: string): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn("getEvaluatorTeams: Not logged in");
        return [];
    }

    console.log(`SERVICE: Fetching assigned teams for evaluator ${user.id}...`);

    // 1. First try to get teams via team_evaluators assignment table
    const { data: assignments, error: assignError } = await supabase
        .from('team_evaluators')
        .select('team_id')
        .eq('evaluator_id', user.id);

    let teamIds: string[] = [];

    if (assignError) {
        console.warn("team_evaluators table may not exist, falling back to panel:", assignError);
    } else if (assignments && assignments.length > 0) {
        teamIds = assignments.map(a => a.team_id);
        console.log(`SERVICE: Found ${teamIds.length} assigned teams for evaluator`);
    }

    // 2. If no assignments, fall back to panel-based filtering (backwards compatible)
    let teams: any[] = [];

    if (teamIds.length > 0) {
        // Fetch only assigned teams
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds)
            .order('created_at', { ascending: false });

        if (error) throw error;
        teams = data || [];
    } else if (panel) {
        // Fallback: Panel-based filtering
        console.log(`SERVICE: No assignments found, falling back to panel ${panel}`);
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('panel', panel)
            .order('created_at', { ascending: false });

        if (error) throw error;
        teams = data || [];
    }

    if (teams.length === 0) return [];

    // 3. Fetch Submissions for these teams
    const fetchedTeamIds = teams.map(t => t.id);
    const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .in('team_id', fetchedTeamIds);

    if (subError) console.warn("Fetch Submissions Error", subError);

    // 4. Fetch Members for these teams
    const { data: members, error: memError } = await supabase
        .from('team_members')
        .select('*')
        .in('team_id', fetchedTeamIds);

    if (memError) console.warn("Fetch Members Error", memError);

    // 5. Fetch evaluator's own scores for these teams
    const { data: scores, error: scoreError } = await supabase
        .from('scores')
        .select('*')
        .eq('evaluator_id', user.id)
        .in('team_id', fetchedTeamIds);

    if (scoreError) console.warn("Fetch Scores Error (table may not exist):", scoreError);

    // 6. Stitch Data
    const formatted = teams.map((team: any) => {
        const teamSubs = submissions?.filter((s: any) => s.team_id === team.id) || [];
        const teamMembers = members?.filter((m: any) => m.team_id === team.id) || [];
        const myScore = scores?.find((s: any) => s.team_id === team.id);

        return {
            ...team,
            submissions: teamSubs,
            team_members: teamMembers,
            myEvaluation: myScore ? { score: myScore.ppt_score || myScore.presentation_score } : null
        };
    });

    console.log("SERVICE: Stitched Evaluator Data:", formatted);
    return formatted;
};

export const submitEvaluationScore = async (teamId: string, score: number): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in");

    // 1. Get Submission ID
    const { data: sub } = await supabase
        .from('submissions')
        .select('id')
        .eq('team_id', teamId)
        .single();

    if (!sub) throw new Error("No submission found for this team");

    // 2. Find OR Create Assignment
    let assignmentId;

    // Check Config
    const { data: assignment } = await supabase
        .from('evaluator_assignments')
        .select('id')
        .eq('submission_id', sub.id)
        .eq('evaluator_id', user.id)
        .maybeSingle();

    if (assignment) {
        assignmentId = assignment.id;
    } else {
        // Auto-Create Assignment (Implicit link because they are viewing it via Panel)
        console.log("SERVICE: Auto-Assigning Evaluator to Submission...");
        const { data: newAssign, error: assignError } = await supabase
            .from('evaluator_assignments')
            .insert({
                submission_id: sub.id,
                evaluator_id: user.id
            })
            .select()
            .single();

        if (assignError) throw assignError;
        assignmentId = newAssign.id;
    }

    // 3. Insert/Update Evaluation
    const { data: existing } = await supabase
        .from('evaluations')
        .select('id')
        .eq('assignment_id', assignmentId)
        .maybeSingle();

    if (existing) {
        await supabase
            .from('evaluations')
            .update({ score })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('evaluations')
            .insert({
                assignment_id: assignmentId,
                score
            });
    }
};

export const submitAdminPptScore = async (teamId: string, score: number): Promise<void> => {
    // Admin Only
    const { error } = await supabase
        .from('teams')
        .update({ admin_ppt_score: score })
        .eq('id', teamId);

    if (error) throw error;
};

export const deleteTeam = async (teamId: string): Promise<void> => {
    // Cascade delete handles submissions/members/assignments
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

    if (error) throw error;
};

// ==============================================================================
// ADMIN FUNCTIONS: Evaluator Assignment & Winner Declaration
// ==============================================================================

// Admin: Assign an evaluator to a team
export const assignEvaluatorToTeam = async (teamId: string, evaluatorId: string): Promise<void> => {
    console.log(`ADMIN: Assigning evaluator ${evaluatorId} to team ${teamId}`);

    const { error } = await supabase
        .from('team_evaluators')
        .insert({
            team_id: teamId,
            evaluator_id: evaluatorId
        });

    if (error) {
        if (error.code === '23505') {
            console.warn("Evaluator already assigned to this team");
        } else {
            throw error;
        }
    }
};

// Admin: Remove an evaluator from a team
export const removeEvaluatorFromTeam = async (teamId: string, evaluatorId: string): Promise<void> => {
    console.log(`ADMIN: Removing evaluator ${evaluatorId} from team ${teamId}`);

    const { error } = await supabase
        .from('team_evaluators')
        .delete()
        .eq('team_id', teamId)
        .eq('evaluator_id', evaluatorId);

    if (error) throw error;
};

// Admin: Get all evaluators assigned to a team
export const getTeamEvaluators = async (teamId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('team_evaluators')
        .select('*, users(*)')
        .eq('team_id', teamId);

    if (error) {
        console.warn("Get team evaluators error:", error);
        return [];
    }

    return data || [];
};

// Admin: Get all users with evaluator role (for assignment dropdown)
export const getAllEvaluators = async (): Promise<any[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'evaluator');

    if (error) {
        console.warn("Get evaluators error:", error);
        return [];
    }

    return data || [];
};

// Admin: Calculate and set final score for a team
export const calculateFinalScore = async (teamId: string): Promise<number> => {
    // 1. Get all scores for this team
    const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select('ppt_score, presentation_score')
        .eq('team_id', teamId);

    if (scoresError) {
        console.warn("Error fetching scores:", scoresError);
        // Fallback to legacy evaluations table
        const { data: evals, error: evalsError } = await supabase
            .from('evaluations')
            .select('score')
            .eq('team_id', teamId);

        if (evalsError || !evals) return 0;

        const total = evals.reduce((sum, e) => sum + (e.score || 0), 0);
        return evals.length > 0 ? total / evals.length : 0;
    }

    if (!scores || scores.length === 0) return 0;

    // 2. Calculate average score
    const total = scores.reduce((sum, s) => {
        const score = s.ppt_score || s.presentation_score || 0;
        return sum + score;
    }, 0);

    const avgScore = total / scores.length;

    // 3. Update team with final score
    const { error: updateError } = await supabase
        .from('teams')
        .update({ final_score: avgScore })
        .eq('id', teamId);

    if (updateError) throw updateError;

    console.log(`ADMIN: Set final score for team ${teamId} to ${avgScore}`);
    return avgScore;
};

// Admin: Declare a team as winner
export const declareWinner = async (teamId: string): Promise<void> => {
    console.log(`ADMIN: Declaring team ${teamId} as winner`);

    // 1. First, ensure final score is calculated
    await calculateFinalScore(teamId);

    // 2. Mark as winner
    const { error } = await supabase
        .from('teams')
        .update({ is_winner: true })
        .eq('id', teamId);

    if (error) throw error;
};

// Admin: Reset winner status for all teams (before declaring new winner)
export const resetWinners = async (): Promise<void> => {
    const { error } = await supabase
        .from('teams')
        .update({ is_winner: false })
        .eq('is_winner', true);

    if (error) throw error;
};

// ==============================================================================
// ACCESS CODE SYSTEM: Role Activation
// ==============================================================================

interface AccessCodeResult {
    success: boolean;
    error?: string;
    role?: string;
    panel?: string;
    name?: string;
}

/**
 * Activates an access code to assign evaluator/admin role.
 * This calls the secure database RPC function.
 * 
 * @param code - The access code (e.g., 'PRANAY#JUDGE@2026')
 * @returns Result with success status and assigned role/panel
 */
export const activateAccessCode = async (code: string): Promise<AccessCodeResult> => {
    console.log("SERVICE: Activating access code...");

    const { data, error } = await supabase.rpc('activate_access_code', {
        input_code: code.trim()
    });

    if (error) {
        console.error("Access code activation error:", error);
        return { success: false, error: error.message };
    }

    console.log("SERVICE: Access code result:", data);
    return data as AccessCodeResult;
};

/**
 * Check if current user needs to enter an access code.
 * Returns true if user has no elevated role (student default).
 */
export const needsAccessCode = async (): Promise<boolean> => {
    const profile = await getCurrentUserProfile();

    // If no profile or role is student, they may need an access code
    if (!profile) return true;

    // If already evaluator or admin, no code needed
    if (profile.role === 'evaluator' || profile.role === 'admin') {
        return false;
    }

    return true;
};

/**
 * Get current user's panel assignment (for evaluators)
 */
export const getUserPanel = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try profiles table first
    const { data: profile } = await supabase
        .from('profiles')
        .select('panel')
        .eq('id', user.id)
        .maybeSingle();

    return profile?.panel || null;
};
