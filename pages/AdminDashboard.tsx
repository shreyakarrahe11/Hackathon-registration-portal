import React, { useState, useEffect } from 'react';
import { Team, TeamStatus } from '../types';
import { Eye, Trophy, CheckCircle, Users, Trash2, FileSpreadsheet, RefreshCcw, TrendingUp, Sparkles, Crown, Calendar } from 'lucide-react';
import { submitAdminPptScore, deleteTeam } from '../services/supabaseService';

const AdminDashboard: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [pptScores, setPptScores] = useState<Record<string, number | ''>>({});

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

  // Calculate judge scoring statistics
  const getJudgeScoringStats = () => {
    if (teams.length === 0) return { totalTeams: 0, scoredTeams: 0, remainingTeams: 0 };
    
    const totalTeams = teams.length;
    const scoredTeams = teams.filter(t => Object.keys(t.evaluations).length > 0).length;
    const remainingTeams = totalTeams - scoredTeams;
    
    return { totalTeams, scoredTeams, remainingTeams };
  };

  // Get detailed judge scores per team
  const getJudgeScoresPerTeam = (team: Team) => {
    return Object.entries(team.evaluations).map(([judgeName, evaluation]) => ({
      judgeName,
      score: evaluation.presentationScore
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { getAllTeams } = await import('../services/supabaseService');
      const rawData = await getAllTeams();

      // Adapt Data
      const adapted: Team[] = rawData.map((d: any) => {
        // Flatten evaluations from deep structure
        // Adaptation: Use the pre-stitched evaluations from the service
        const flatEvaluations: Record<string, any> = {};

        if (d.evaluations && Array.isArray(d.evaluations)) {
          d.evaluations.forEach((ev: any) => {
            flatEvaluations[ev.evaluatorName] = { presentationScore: ev.score };
          });
        }

        const sub = d.submissions?.[0];

        return {
          id: d.id,
          teamName: d.team_name,
          leadName: d.team_members.find((m: any) => m.role === 'leader')?.name || "Unknown",
          email: d.team_members.find((m: any) => m.role === 'leader')?.email || "",
          phone: d.team_members.find((m: any) => m.role === 'leader')?.phone || "",
          teamSize: d.team_members.length,
          members: d.team_members,
          psId: sub?.ps_id || "",
          ideaDesc: sub?.idea_description || "",
          pptUrl: sub?.ppt_file_url || "#",
          panel: d.panel,
          adminPptScore: d.admin_ppt_score,
          status: d.status,
          evaluations: flatEvaluations,
          totalScore: d.total_score || 0,
          submissionDate: d.created_at
        };
      });

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

  const handleStatusChange = async (id: string, newStatus: TeamStatus) => {
    const { updateTeamStatus } = await import('../services/supabaseService');
    await updateTeamStatus(id, newStatus);
    fetchData();
  };

  const handlePanelChange = async (id: string, panel: 'A' | 'B') => {
    const { updateTeamPanel } = await import('../services/supabaseService');
    await updateTeamPanel(id, panel);
    fetchData();
  };

  const handlePptScoreChange = (id: string, val: string) => {
    const numVal = val === '' ? '' : Math.min(50, Math.max(0, parseInt(val)));
    setPptScores(prev => ({ ...prev, [id]: numVal }));
  };

  const savePptScore = async (id: string) => {
    const score = pptScores[id];
    if (score === '' || score === undefined) return;
    try {
      await submitAdminPptScore(id, Number(score));
      setPptScores(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      fetchData();
      alert('PPT Score Updated');
    } catch (err) {
      console.error('Error saving PPT score:', err);
      alert('Error saving PPT score: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteTeam = async (id: string, teamName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete team "${teamName}"? This action cannot be undone.`)) {
      await deleteTeam(id);
      fetchData();
    }
  };

  const handleExportCSV = () => {
    if (teams.length === 0) {
      alert("No data to export.");
      return;
    }

    // Define CSV Headers
    const headers = ["Submission ID", "Team Name", "Lead Name", "Email", "Phone", "Problem ID", "Idea Description", "Status", "Panel", "PPT Score", "Total Score", "PPT URL"];

    // Map Data
    const rows = teams.map(t => [
      t.id,
      `"${t.teamName.replace(/"/g, '""')}"`, // Escape quotes
      `"${t.leadName}"`,
      t.email,
      t.phone,
      t.psId,
      `"${t.ideaDesc.replace(/"/g, '""')}"`, // Escape quotes for description
      t.status,
      t.panel || "Unassigned",
      t.adminPptScore || 0,
      t.totalScore.toFixed(2),
      t.pptUrl
    ]);

    // Construct CSV String
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `innovex_teams_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: TeamStatus) => {
    switch (status) {
      case TeamStatus.SUBMITTED: return 'text-gray-400 bg-gray-900 border-gray-700';
      case TeamStatus.REVIEW: return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
      case TeamStatus.SHORTLISTED: return 'text-blue-400 bg-blue-900/20 border-blue-700/50';
      case TeamStatus.FINAL_PRESENTATION: return 'text-purple-400 bg-purple-900/20 border-purple-700/50';
      case TeamStatus.WINNER: return 'text-green-400 bg-green-900/20 border-green-700/50';
      default: return 'text-gray-400';
    }
  };

  // Logic to determine Leaderboard
  const scoredTeams = teams.filter(t => t.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore);
  const top3 = scoredTeams.slice(0, 3);

  // Statistics
  const totalTeams = teams.length;
  const totalStudents = teams.reduce((acc, team) => acc + (team.teamSize || 0), 0);

  // Modal State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // ... (keep statistics/export)

  return (
    <div className="py-8 px-4 max-w-[1400px] mx-auto relative">
      {/* Welcome Banner */}
      <div className="relative mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-rose-500/20 rounded-2xl blur-xl"></div>
        <div className="relative bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-rose-900/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Crown className="text-white" size={40} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="text-yellow-400" size={20} />
                  <span className="text-yellow-400 text-sm font-medium uppercase tracking-wider">Chairperson Panel</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {getGreeting()}, Chairperson!
                </h1>
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar size={16} />
                  <span className="text-sm">{currentDate}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400">Total Teams</p>
                <p className="text-2xl font-bold text-white">{teams.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400">Total Participants</p>
                <p className="text-2xl font-bold text-white">{teams.reduce((acc, team) => acc + (team.teamSize || 0), 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Judge Scoring Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Teams Scored</p>
              <p className="text-3xl font-bold text-green-400">{getJudgeScoringStats().scoredTeams}</p>
              <p className="text-xs text-gray-500 mt-1">of {getJudgeScoringStats().totalTeams} total</p>
            </div>
            <Trophy className="text-green-400" size={32} />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 backdrop-blur-xl border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Pending Scores</p>
              <p className="text-3xl font-bold text-yellow-400">{getJudgeScoringStats().remainingTeams}</p>
              <p className="text-xs text-gray-500 mt-1">awaiting judges</p>
            </div>
            <TrendingUp className="text-yellow-400" size={32} />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-blue-400">{getJudgeScoringStats().totalTeams > 0 ? Math.round((getJudgeScoringStats().scoredTeams / getJudgeScoringStats().totalTeams) * 100) : 0}%</p>
              <p className="text-xs text-gray-500 mt-1">judging progress</p>
            </div>
            <CheckCircle className="text-blue-400" size={32} />
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {/* ... (Keep Header) ... */}
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/5 w-full md:w-auto">
          <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
          <p className="text-gray-400">Manage submissions, assign panels, assign finals, and score PPTs.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchData} className="p-3 bg-black/50 border border-white/20 rounded-xl hover:text-white text-gray-400 hover:bg-white/10" title="Refresh Data"><RefreshCcw size={18} className={loading ? "animate-spin" : ""} /></button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-6 py-3 bg-black/50 backdrop-blur-md border border-white/20 text-gray-300 rounded-xl hover:text-white hover:border-ai-accent hover:bg-ai-accent/20 transition-all shadow-lg"><FileSpreadsheet size={18} /> Export Data (CSV)</button>
        </div>
      </div>

      {/* Statistics Cards (Preserved) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Registered Teams</p>
            <p className="text-4xl font-bold text-white mt-1">{loading ? '...' : totalTeams}</p>
          </div>
          <div className="w-12 h-12 bg-ai-accent/20 rounded-full flex items-center justify-center text-ai-accent border border-ai-accent/30"><TrendingUp size={24} /></div>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Students Participating</p>
            <p className="text-4xl font-bold text-white mt-1">{loading ? '...' : totalStudents}</p>
          </div>
          <div className="w-12 h-12 bg-ai-purple/20 rounded-full flex items-center justify-center text-ai-purple border border-ai-purple/30"><Users size={24} /></div>
        </div>
      </div>

      {/* Leaderboard Section (Preserved) */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-ai-accent mb-4 flex items-center bg-black/40 backdrop-blur-sm p-3 rounded-lg inline-block border border-ai-accent/20">
          <Trophy className="mr-2" /> Live Leaderboard (Top 3)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {top3.length > 0 ? top3.map((team, index) => (
            <div key={team.id} className={`p-6 rounded-xl border relative overflow-hidden backdrop-blur-xl transition-all ${index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-black/40 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'bg-black/40 border-white/10'}`}>
              {index === 0 && <div className="absolute top-0 right-0 p-2 bg-yellow-500 text-black font-bold text-xs">#1</div>}
              {index === 1 && <div className="absolute top-0 right-0 p-2 bg-gray-400 text-black font-bold text-xs">#2</div>}
              {index === 2 && <div className="absolute top-0 right-0 p-2 bg-orange-700 text-white font-bold text-xs">#3</div>}

              <h3 className="font-bold text-white text-lg truncate">{team.teamName}</h3>
              <p className="text-xs text-gray-400 mb-4">{team.id} | {team.panel ? `Panel ${team.panel}` : 'Unassigned'}</p>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-black text-white">{team.totalScore.toFixed(1)}</div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">PPT: {team.adminPptScore || 0} | Pres: {(team.totalScore - (team.adminPptScore || 0)).toFixed(1)}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-3 text-center p-8 bg-black/30 backdrop-blur-sm border border-dashed border-white/10 rounded-xl text-gray-500">Leaderboard will appear once scores are submitted.</div>
          )}
        </div>
      </div>

      {/* All Teams Table */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-white/5">
          <h3 className="font-bold text-white">All Submissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-200 uppercase font-mono text-xs">
              <tr>
                <th className="px-6 py-4">ID / PS ID</th>
                <th className="px-6 py-4">Team Info</th>
                <th className="px-6 py-4">PPT Link</th>
                <th className="px-6 py-4">Panel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">PPT Score</th>
                <th className="px-6 py-4 text-center">Total</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No teams registered yet.</td></tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} onClick={() => setSelectedTeam(team)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 align-top">
                      <div className="font-mono text-white text-xs bg-black/50 px-2 py-0.5 rounded border border-white/10 mb-1 inline-block">{team.id.substring(0, 8)}...</div>
                      <div className="text-ai-accent text-xs font-bold">{team.psId || "No PS ID"}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-white">{team.teamName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Lead: {team.leadName}</div>
                      <div className="text-[10px] text-gray-500 mt-1">{team.email}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {team.pptUrl && team.pptUrl !== '#' ? (
                        <a
                          href={team.pptUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()} // Prevent row click
                          className="text-xs text-ai-accent hover:underline flex items-center bg-ai-accent/10 px-2 py-1 rounded w-fit border border-ai-accent/30 hover:bg-ai-accent/20"
                        >
                          <Eye size={12} className="mr-1" /> View PPT
                        </a>
                      ) : <span className="text-gray-600 text-xs">No PPT</span>}
                      {Object.keys(team.evaluations).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <p className="text-[10px] text-gray-500 font-semibold mb-1">Judges ({Object.keys(team.evaluations).length})</p>
                          <div className="flex flex-wrap gap-1">
                            {getJudgeScoresPerTeam(team).map((j, idx) => (
                              <div key={idx} className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[9px] text-green-400 font-mono">
                                {j.judgeName}: <span className="font-bold">{j.score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`w-40 appearance-none bg-black/70 border border-white/20 rounded px-3 py-2 text-xs font-bold focus:outline-none focus:border-ai-accent focus:bg-black/80 transition-all ${team.panel === 'A' ? 'text-blue-400 border-blue-600/50 bg-black/75' : team.panel === 'B' ? 'text-purple-400 border-purple-600/50 bg-black/75' : 'text-gray-400 border-white/20'}`}
                          value={team.panel || ''}
                          onChange={(e) => handlePanelChange(team.id, e.target.value as 'A' | 'B')}
                        >
                          <option value="" disabled>Select Panel</option>
                          <option value="A">Panel A (Pranay & Vibha)</option>
                          <option value="B">Panel B (Ketan & Madhuri)</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(team.status)}`}>{team.status}</span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number" min="0" max="50" placeholder="0-50"
                          className="w-12 bg-black/50 border border-white/20 rounded px-1 py-1 text-center text-white focus:border-ai-accent focus:outline-none text-xs"
                          value={pptScores[team.id] !== undefined ? pptScores[team.id] : (team.adminPptScore || '')}
                          onChange={(e) => handlePptScoreChange(team.id, e.target.value)}
                        />
                        {pptScores[team.id] !== undefined && pptScores[team.id] !== '' && (
                          <button onClick={() => savePptScore(team.id)} className="p-1 bg-ai-accent text-white rounded hover:bg-blue-600 transition-colors"><CheckCircle size={12} /></button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center align-top">
                      <div className="font-bold text-white">{team.totalScore?.toFixed(1) || '0.0'}</div>
                    </td>
                    <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1 w-24">
                        {team.status === TeamStatus.SUBMITTED && <button onClick={() => handleStatusChange(team.id, TeamStatus.REVIEW)} className="px-2 py-1 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600 hover:text-white rounded text-[10px] border border-yellow-600/30">Review</button>}
                        {team.status === TeamStatus.REVIEW && <button onClick={() => handleStatusChange(team.id, TeamStatus.SHORTLISTED)} className="px-2 py-1 bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white rounded text-[10px] border border-blue-600/30">Shortlist</button>}
                        {team.status === TeamStatus.SHORTLISTED && <button onClick={() => handleStatusChange(team.id, TeamStatus.FINAL_PRESENTATION)} className="px-2 py-1 bg-purple-600/20 text-purple-500 hover:bg-purple-600 hover:text-white rounded text-[10px] border border-purple-600/30">Finals</button>}
                        {team.status === TeamStatus.FINAL_PRESENTATION && <button onClick={() => handleStatusChange(team.id, TeamStatus.WINNER)} className="px-2 py-1 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white rounded text-[10px] border border-green-600/30">Mark Winner</button>}
                        <button onClick={() => handleDeleteTeam(team.id, team.teamName)} className="text-red-400 hover:text-white hover:bg-red-500 text-[10px] px-2 py-1 rounded transition-colors flex items-center justify-center gap-1"><Trash2 size={10} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TEAM DETAILS MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedTeam(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 p-6 flex justify-between items-start z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedTeam.teamName}</h2>
                <div className="flex gap-2 mt-2">
                  <span className="bg-ai-accent/20 text-ai-accent px-2 py-0.5 rounded text-xs border border-ai-accent/30">{selectedTeam.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(selectedTeam.status)}`}>{selectedTeam.status}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all">✕</button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* 1. Problem Statement */}
              <section>
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 border-b border-white/10 pb-2">Problem Statement</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-ai-accent font-mono text-lg mb-1">{selectedTeam.psId || "Not Selected"}</div>
                </div>
              </section>

              {/* 2. Idea Description */}
              <section>
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 border-b border-white/10 pb-2">Idea Description</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {selectedTeam.ideaDesc || "No description provided."}
                </div>
              </section>

              {/* 3. Team Roster */}
              <section>
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 border-b border-white/10 pb-2">Team Roster ({selectedTeam.members.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTeam.members.map((m, idx) => (
                    <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{m.name} {m.role === 'leader' && <span className="text-xs text-ai-accent bg-ai-accent/10 px-1 rounded ml-2">LEAD</span>}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </div>
                      <div className="text-xs text-gray-600">{m.phone}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. Links & Actions */}
              <section className="flex gap-4 pt-4 border-t border-white/10">
                {selectedTeam.pptUrl && selectedTeam.pptUrl !== '#' && (
                  <a href={selectedTeam.pptUrl} target="_blank" rel="noreferrer" className="flex-1 bg-ai-accent hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                    <Eye size={18} /> View Presentation
                  </a>
                )}
                <button onClick={() => { handleDeleteTeam(selectedTeam.id, selectedTeam.teamName); setSelectedTeam(null); }} className="px-6 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl font-bold flex items-center gap-2 transition-colors">
                  <Trash2 size={18} /> Delete Team
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;