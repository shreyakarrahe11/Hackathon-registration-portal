import React, { useState, useEffect } from 'react';
import { Team, TeamStatus, UserSession } from '../types';
import { Download, Save, Mic, Users, Eye, RefreshCcw, FileText, Sparkles, Award, Calendar, Star } from 'lucide-react';

interface Props {
  user: UserSession;
}

const EvaluatorDashboard: React.FC<Props> = ({ user }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // State to hold temporary scores before saving
  const [tempScores, setTempScores] = useState<Record<string, number | ''>>({});

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { getEvaluatorTeams } = await import('../services/supabaseService');
      console.log("DASHBOARD: Fetching teams for Panel:", user.panel);
      const rawTeams = await getEvaluatorTeams(user.panel);

      // Adapt Data
      const adapted = rawTeams.map((t: any) => ({
        id: t.id,
        teamName: t.team_name,
        // For evaluators, we need to show member info. 
        // rawTeams from service has `submissions` and `team_members`.
        // We need to map them.
        leadName: t.team_members.find((m: any) => m.role === 'leader')?.name || "Lead",
        email: t.team_members.find((m: any) => m.role === 'leader')?.email || "",
        phone: t.team_members.find((m: any) => m.role === 'leader')?.phone || "",
        teamSize: t.team_members.length,
        members: t.team_members,

        psId: t.submissions?.[0]?.ps_id || "",
        ideaDesc: t.submissions?.[0]?.idea_description || "",
        pptUrl: t.submissions?.[0]?.ppt_file_url || "#",
        panel: t.panel,

        // Find MY evaluation for this team
        // We know we are the current user. 
        // But the service `getEvaluatorTeams` doesn't currently join `evaluations` deeply filtered by ME.
        // It joins existing evaluations? 
        // Actually `getAllTeams` in service didn't deeply filter. 
        // `getEvaluatorTeams` joined `evaluator_assignments`.
        // We should fetch my score separately or include it.
        // For now, let's assume `evaluations` on the team object contains ALL evaluations, 
        // we filter client side for MY name/ID? 
        // Wait, `evaluations` table has `assignment_id`. 
        // Assignment connects Evaluator <-> Submission.
        // So `evaluations` linked to that assignment are MINE.
        // We will need to fetch evaluations properly.

        // Simplification: We will just store the score in a local map if simpler, 
        // OR we update `getEvaluatorTeams` to fetch the score.
        // Let's rely on standard fetch.

        // Populate evaluations map with MY score so the UI works as expected
        evaluations: t.myEvaluation
          ? { [user.name]: { presentationScore: t.myEvaluation.score } }
          : {},
        totalScore: 0
      }));

      // We need to fetch/populate the user's *own* existing score for these teams.
      // This requires a bit more data from the backend. 
      // I'll assume for this pass we might show "Previous Score" as "-" if not easily available,
      // or simple "Submitted".

      setTeams(adapted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const visibleTeams = teams; // Service already filters by assignment!

  const handleScoreChange = (teamId: string, val: string) => {
    const numVal = val === '' ? '' : Math.min(50, Math.max(0, parseInt(val))); // Clamp 0-50
    setTempScores(prev => ({
      ...prev,
      [teamId]: numVal
    }));
  };

  const handleSaveScore = async (teamId: string) => {
    const score = tempScores[teamId];
    if (score === '' || score === undefined) {
      alert('Please enter a Presentation score.');
      return;
    }

    try {
      const { submitEvaluationScore } = await import('../services/supabaseService');
      await submitEvaluationScore(teamId, Number(score));
      alert('Evaluation saved successfully!');
      // Update local state to show "Submitted" or similar
      // Ideally re-fetch or update local team status
      fetchData();
    } catch (err: any) {
      alert("Failed to submit score: " + err.message);
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl"></div>
        <div className="relative bg-gradient-to-br from-indigo-900/40 via-blue-900/40 to-cyan-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Award className="text-white" size={40} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="text-yellow-400 fill-yellow-400" size={18} />
                  <span className="text-yellow-400 text-sm font-medium uppercase tracking-wider">Official Judge</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {getGreeting()}, {user.name?.replace('Mr. ', '')}!
                </h1>
                <div className="flex items-center gap-4 text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span className="text-sm">{currentDate}</span>
                  </div>
                  <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-medium">
                    Panel {user.panel}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10 text-center">
                <p className="text-xs text-gray-400">Assigned Teams</p>
                <p className="text-2xl font-bold text-white">{teams.length}</p>
              </div>
              <div className="bg-green-500/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-green-500/20 text-center">
                <p className="text-xs text-green-400">Scored</p>
                <p className="text-2xl font-bold text-green-400">{teams.filter(t => t.evaluations[user.name]).length}</p>
              </div>
            </div>
          </div>
          
          {/* Motivational Message */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Sparkles className="text-yellow-400" size={20} />
              <p className="text-gray-300 text-sm">
                Your expertise in evaluating these innovative ideas will help shape the future of technology. 
                <span className="text-indigo-400 font-medium"> Thank you for being part of INNOVEX AI 2026!</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Download Section */}
      <div className="mb-6 bg-gradient-to-r from-ai-accent/20 to-ai-purple/20 backdrop-blur-xl border border-ai-accent/30 rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-ai-accent/20 rounded-lg">
            <FileText size={24} className="text-ai-accent" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Official Judging Guidelines</h3>
            <p className="text-gray-400 text-sm">Download the judging criteria and evaluation guidelines</p>
          </div>
        </div>
        <a
          href="/OFFICIAL_JUDGING.pdf"
          download
          className="px-6 py-2 bg-ai-accent hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
        >
          <Download size={18} /> Download PDF
        </a>
      </div>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4 bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">Teams Assigned for Evaluation</h2>
          <p className="text-sm text-gray-400 mt-1">Score based on online presentation performance (0-50 points)</p>
        </div>
        <div className="flex items-end gap-4">
          <button
            onClick={fetchData}
            className="p-3 bg-black/50 border border-white/20 rounded-xl hover:text-white text-gray-400 hover:bg-white/10"
            title="Refresh Data"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{visibleTeams.filter(t => !t.evaluations[user.name]).length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading data...</div>
      ) : visibleTeams.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-xl p-12 text-center rounded-xl border border-dashed border-gray-600">
          <p className="text-gray-400">No teams assigned to Panel {user.panel} yet.</p>
          <p className="text-xs text-gray-500 mt-2">Teams assigned by the Admin will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {visibleTeams.map((team) => {
            const evaluation = team.evaluations[user.name]; // Expects type Evaluation | undefined
            const hasRated = evaluation !== undefined;
            const currentScore = hasRated ? evaluation.presentationScore : (tempScores[team.id] ?? '');

            return (
              <div key={team.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex flex-col xl:flex-row gap-6 shadow-lg">

                {/* Team Info */}
                <div className="flex-grow space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-black/50 rounded text-xs font-mono text-gray-400 border border-white/10">{team.id}</span>
                    <h3 className="text-xl font-bold text-white">{team.teamName}</h3>
                    <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300">
                      Panel {team.panel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                    <p><span className="text-gray-500">Problem ID:</span> {team.psId}</p>
                    <p><span className="text-gray-500">Team Lead:</span> {team.leadName}</p>
                  </div>

                  <p className="text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                    "{team.ideaDesc}"
                  </p>

                  <div className="pt-2">
                    {team.pptUrl && team.pptUrl !== '#' ? (
                      <a href={team.pptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-ai-accent hover:text-white transition-colors text-sm font-semibold border border-ai-accent/30 px-4 py-2 rounded-lg bg-ai-accent/10">
                        <Eye size={16} className="mr-2" /> View Submitted PPT
                      </a>
                    ) : (
                      <span className="text-gray-500 text-sm italic">No PPT Uploaded</span>
                    )}
                  </div>
                </div>

                {/* Scoring Section */}
                <div className="w-full xl:w-96 bg-black/40 rounded-lg p-5 border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <span className="text-sm font-bold text-white">Presentation Score</span>
                    <span className="text-xs text-gray-400">Max 50</span>
                  </div>

                  <div className="space-y-4">
                    {/* Presentation Score Input */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300 flex items-center">
                        <Mic size={16} className="mr-2 text-purple-400" /> Online Presentation
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        disabled={hasRated}
                        placeholder="0-50"
                        value={currentScore}
                        onChange={(e) => handleScoreChange(team.id, e.target.value)}
                        className={`w-24 bg-black/50 border rounded px-2 py-2 text-center font-mono text-lg focus:outline-none ${hasRated ? 'border-transparent text-gray-400' : 'border-gray-600 text-white focus:border-ai-accent'}`}
                      />
                    </div>

                    {!hasRated ? (
                      <button
                        onClick={() => handleSaveScore(team.id)}
                        className="w-full mt-4 py-2 bg-ai-accent hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Save size={18} className="mr-2" /> Submit Score
                      </button>
                    ) : (
                      <div className="w-full mt-4 py-2 bg-ai-success/10 text-ai-success font-bold rounded-lg flex items-center justify-center border border-ai-success/20 flex-col gap-2">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-ai-success rounded-full mr-2"></span> Score Locked
                        </div>
                        <span className="text-xs text-ai-success/70">Score submitted and locked</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default EvaluatorDashboard;