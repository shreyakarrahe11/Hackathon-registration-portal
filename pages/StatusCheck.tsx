import React, { useState } from 'react';
import { getSubmissionBySubmissionId } from '../services/supabaseService';
import { TeamStatus, Team } from '../types';
import { Search, Check, Clock, Trophy, FileText, MonitorPlay, Loader2 } from 'lucide-react';

const StatusCheck: React.FC = () => {
  const [searchId, setSearchId] = useState('');
  const [team, setTeam] = useState<Team | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getSubmissionBySubmissionId(searchId.trim());
      
      if (result) {
        setSubmissionData(result);
        // Create Team object from submission data
        const adaptedTeam: Team = {
          id: result.submission.submission_id,
          teamName: result.team?.team_name || 'N/A',
          leadName: result.members?.find((m: any) => m.role === 'leader')?.name || 'N/A',
          email: result.members?.find((m: any) => m.role === 'leader')?.email || 'N/A',
          phone: result.members?.find((m: any) => m.role === 'leader')?.phone || 'N/A',
          teamSize: result.members?.length || 0,
          members: result.members?.map((m: any) => ({
            name: m.name,
            email: m.email,
            phone: m.phone
          })) || [],
          psId: result.submission?.ps_id || 'N/A',
          ideaDesc: result.submission?.idea_description || '',
          pptUrl: result.submission?.ppt_file_url || '#',
          status: mapSubmissionStatus(result.submission?.status),
          evaluations: {},
          totalScore: result.team?.total_score || 0,
          submissionDate: result.submission?.submitted_at || new Date().toISOString()
        };
        
        setTeam(adaptedTeam);
      } else {
        setTeam(null);
        setError('No submission found with this ID');
      }
      setHasSearched(true);
    } catch (err: any) {
      console.error('Error searching submission:', err);
      setError(err.message || 'Error searching submission');
      setTeam(null);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const mapSubmissionStatus = (status: string): TeamStatus => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return TeamStatus.SUBMITTED;
      case 'under_review':
        return TeamStatus.REVIEW;
      case 'evaluated':
        return TeamStatus.FINAL_PRESENTATION;
      default:
        return TeamStatus.SUBMITTED;
    }
  };

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto min-h-[80vh]">
      <div className="text-center mb-10 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5">
        <h1 className="text-3xl font-bold text-white mb-2">Track Application</h1>
        <p className="text-gray-400">Enter your Submission ID to check current status.</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="e.g. SUB-8X29B1"
            className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-full py-4 pl-6 pr-14 text-white focus:border-ai-accent focus:outline-none shadow-lg placeholder:text-gray-500"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-ai-accent rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {hasSearched && !team && !loading && (
        <div className="text-center p-8 bg-black/40 backdrop-blur-xl rounded-xl border border-red-500/30">
          <p className="text-red-400">
            {error || `No submission found with ID: `}
            <span className="text-white font-mono">{searchId}</span>
          </p>
          <p className="text-gray-400 text-sm mt-3">Please verify the Submission ID and try again.</p>
        </div>
      )}

      {team && (
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden animate-float-in shadow-2xl">
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/2">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{team.teamName}</h2>
                <p className="text-gray-300 text-sm mt-1">Lead: {team.leadName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Submission ID</p>
                <div className="bg-ai-accent/20 px-4 py-2 rounded-lg text-lg font-mono text-ai-accent font-bold border border-ai-accent/50">
                  {team.id}
                </div>
              </div>
            </div>
            
            {/* Submission Date and Status */}
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-gray-400">Submitted</p>
                <p className="text-white">{new Date(team.submissionDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Problem Statement</p>
                <p className="text-white">{team.psId}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <h3 className="text-lg font-semibold text-white mb-6">Status Tracker</h3>
            <div className="space-y-8 relative">
              {/* Vertical line connecting steps */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-white/10 z-0"></div>

              <StatusStep 
                currentStatus={team.status} 
                stepStatus={TeamStatus.SUBMITTED} 
                icon={FileText} 
                label="Application Submitted" 
                date={new Date(team.submissionDate).toLocaleDateString()}
              />
              <StatusStep 
                currentStatus={team.status} 
                stepStatus={TeamStatus.REVIEW} 
                icon={Clock} 
                label="Under Review" 
                desc="Judges are evaluating your proposal."
              />
              <StatusStep 
                currentStatus={team.status} 
                stepStatus={TeamStatus.SHORTLISTED} 
                icon={Check} 
                label="Shortlisted" 
                desc="Selected for Final Presentation."
              />
              <StatusStep 
                currentStatus={team.status} 
                stepStatus={TeamStatus.FINAL_PRESENTATION} 
                icon={MonitorPlay} 
                label="Final Presentation" 
                desc="Online pitch session."
              />
              <StatusStep 
                currentStatus={team.status} 
                stepStatus={TeamStatus.WINNER} 
                icon={Trophy} 
                label="Winner Announcement" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusStep = ({ currentStatus, stepStatus, icon: Icon, label, date, desc }: any) => {
  // Helper to determine step state
  const statusOrder = [
    TeamStatus.SUBMITTED,
    TeamStatus.REVIEW,
    TeamStatus.SHORTLISTED,
    TeamStatus.FINAL_PRESENTATION,
    TeamStatus.WINNER
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const stepIndex = statusOrder.indexOf(stepStatus);
  
  const isCompleted = currentIndex >= stepIndex;
  const isCurrent = currentIndex === stepIndex;

  let circleClass = "bg-black/60 border-gray-600 text-gray-500";
  let textClass = "text-gray-500";

  if (isCompleted) {
    circleClass = "bg-ai-success border-ai-success text-ai-dark";
    textClass = "text-white";
  }
  if (isCurrent && !isCompleted) {
     // shouldn't happen logic-wise if index logic holds, but for clarity:
     circleClass = "bg-ai-accent border-ai-accent text-white";
     textClass = "text-white";
  } else if (isCurrent) {
     // Active latest step
     circleClass = "bg-ai-accent border-ai-accent text-white ring-4 ring-ai-accent/20";
  }

  return (
    <div className="relative z-10 flex items-start">
      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${circleClass}`}>
        <Icon size={20} />
      </div>
      <div className="ml-4 pt-2">
        <h4 className={`font-bold text-lg ${textClass}`}>{label}</h4>
        {date && <p className="text-xs text-ai-accent mt-1">{date}</p>}
        {desc && <p className="text-sm text-gray-400 mt-1">{desc}</p>}
      </div>
    </div>
  );
};

export default StatusCheck;