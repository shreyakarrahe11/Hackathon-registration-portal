import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Users, FileText, Upload, Plus, Trash2, Cpu, Globe, Zap, AlertCircle, CheckCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { getProblemStatements } from '../services/mockSupabase';
import { registerTeam, createUserProfile, submitProject, getCurrentUserProfile, getMyTeam } from '../services/supabaseService';
import { ProblemStatement, UserRole } from '../types';

const Registration: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Add navigate
  const initialPsId = location.state?.psId || '';

  // 🛡️ GUARDRAIL: Check if Team already exists.
  // If User has a Team -> Redirect to Dashboard (Prevent duplicate registration).
  // If User has Profile but NO Team -> Allow staying here.
  useEffect(() => {
    const checkGuard = async () => {
      const profile = await getCurrentUserProfile();
      if (profile) {
        // Check if they manage a team or are in one
        const team = await getMyTeam();
        if (team) {
          console.warn("GUARDRAIL: Team exists. Redirecting to Dashboard.");
          navigate('/student/home', { replace: true });
        }
      }
    };
    checkGuard();
  }, [navigate]);

  const [formData, setFormData] = useState({
    teamName: '',
    leadName: '',
    email: '',
    phone: '',
    psId: initialPsId,
    ideaDesc: '',
    pptLink: '',
  });

  const [teamSize, setTeamSize] = useState<number>(2);
  const [teamMembers, setTeamMembers] = useState([{ name: '', email: '', phone: '' }]);
  const [file, setFile] = useState<File | null>(null);

  // State restored
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [error, setError] = useState('');

  // Add state for tracking steps
  const [stepStatus, setStepStatus] = useState("Initializing...");

  const problemStatements = getProblemStatements();

  useEffect(() => {
    const requiredMembers = teamSize - 1;
    setTeamMembers(prevMembers => {
      const newMembers = [...prevMembers];
      if (newMembers.length < requiredMembers) {
        const toAdd = requiredMembers - newMembers.length;
        for (let i = 0; i < toAdd; i++) {
          newMembers.push({ name: '', email: '', phone: '' });
        }
      } else if (newMembers.length > requiredMembers) {
        return newMembers.slice(0, requiredMembers);
      }
      return newMembers;
    });
  }, [teamSize]);

  const handleMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...teamMembers];
    (updatedMembers[index] as any)[field] = value;
    setTeamMembers(updatedMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError('');

    // Helper to update button
    const updateStep = (msg: string) => {
      setStepStatus(msg);
      console.log("UI: " + msg);
    };

    try {
      updateStep("Starting...");
      if (!file) throw new Error("Please upload your PPT file.");
      if (file.size > 10485760) throw new Error("PPT file size must not exceed 10 MB. Current size: " + (file.size / 1024 / 1024).toFixed(2) + " MB");

      const validMembers = teamMembers.filter(m => m.name.trim() !== '');

      // Dynamic import removed - using static import
      // const { registerTeam, createUserProfile, submitProject } = await import('../services/supabaseService');

      // 1. Ensure Profile Exists (Skip if already exists)
      updateStep("Step 1/4: Checking Profile");
      const existingProfile = await getCurrentUserProfile();

      if (!existingProfile) {
        updateStep("Step 1/4: Creating Profile");
        await createUserProfile(formData.leadName, UserRole.STUDENT);
      } else {
        console.log("Profile already exists, skipping creation.");
      }

      // 2. Register Team
      updateStep("Step 2/4: Registering Team");
      const newTeam = await registerTeam(
        formData.teamName,
        { name: formData.leadName, phone: formData.phone },
        validMembers
      );

      if (newTeam) {
        // 3. Submit Project (Upload + Entry)
        updateStep("Step 3/4: Uploading File (This may take 20s)");

        // We catch strict timeouts now.
        await submitProject(newTeam.id, {
          psId: formData.psId,
          problemTitle: "Problem " + formData.psId,
          description: formData.ideaDesc,
          pptUrl: formData.pptLink,
          file: file
        });

        updateStep("Step 4/4: Finalizing...");
      }

      setSubmissionId(newTeam?.id || 'DONE');
      setIsSubmitted(true);
      window.scrollTo(0, 0);

    } catch (err: any) {
      console.error("REGISTRATION ERROR:", err);
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-ai-success/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-ai-success/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-ai-success w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-white">Registration Successful!</h2>
          <p className="text-gray-400">Your team has been registered for INNOVEX AI.</p>
          <div className="bg-white/5 p-4 rounded-lg border border-dashed border-gray-600">
            <p className="text-sm text-gray-500 mb-1">Your Submission ID</p>
            <p className="text-2xl font-mono font-bold text-ai-accent tracking-widest">{submissionId}</p>
          </div>
          <button onClick={() => window.location.href = '/'} className="mt-4 px-6 py-2 bg-ai-success text-white rounded-full font-bold">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      {/* ... (Previous JSX unchanged until button) ... */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Team Registration</h1>
        <p className="text-gray-300">Join the revolution. Fill in the details below.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-ai-accent border-b border-white/10 pb-2">Team Details</h3>
          {/* ... (Existing Form Fields Same as Before) ... */}
          {/* Omitted for brevity: Assume existing inputs for teamName, psId, Team Size, Lead details, Members ... */}
          {/* Only showing Button change below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Team Name</label>
              <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-colors"
                value={formData.teamName} onChange={e => setFormData({ ...formData, teamName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Problem Statement ID</label>
              <select required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ai-accent focus:bg-black focus:outline-none transition-colors"
                value={formData.psId} onChange={e => setFormData({ ...formData, psId: e.target.value })}>
                <option value="" className="bg-gray-900">Select PS ID</option>
                {problemStatements.map(ps => (
                  <option key={ps.id} value={ps.id} className="bg-gray-900">
                    {ps.id}: {ps.title} ({ps.difficulty})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Team Size (Including Lead)</label>
              <div className="grid grid-cols-3 gap-4">
                {[2, 3, 4].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTeamSize(size)}
                    className={`py-3 px-4 rounded-lg border font-semibold flex items-center justify-center transition-all ${teamSize === size
                      ? 'bg-ai-accent/20 border-ai-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    <Users size={18} className="mr-2" />
                    {size} Members
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-ai-accent border-b border-white/10 pb-2">Team Lead (Member 1)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
              <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-colors"
                value={formData.leadName} onChange={e => setFormData({ ...formData, leadName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
              <input required type="tel" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-colors"
                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
              <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-colors"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <h3 className="text-xl font-semibold text-ai-accent">Additional Members</h3>
            <span className="text-sm text-gray-500">
              {teamMembers.length} additional member{teamMembers.length !== 1 && 's'} required
            </span>
          </div>

          {teamMembers.map((member, index) => (
            <div key={index} className="bg-white/5 p-6 rounded-lg border border-white/10 animate-float-in">
              <h4 className="text-white font-bold mb-4 flex items-center">
                <span className="w-6 h-6 rounded-full bg-ai-purple/20 text-ai-purple flex items-center justify-center text-xs mr-2">
                  {index + 2}
                </span>
                Member {index + 2} Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none"
                    value={member.name} onChange={e => handleMemberChange(index, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Phone Number</label>
                  <input required type="tel" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none"
                    value={member.phone} onChange={e => handleMemberChange(index, 'phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
                  <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none"
                    value={member.email} onChange={e => handleMemberChange(index, 'email', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-ai-accent border-b border-white/10 pb-2">Project Submission</h3>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Idea Description</label>
            <textarea required rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none"
              value={formData.ideaDesc} onChange={e => setFormData({ ...formData, ideaDesc: e.target.value })} placeholder="Describe your solution in brief..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">PPT URL (Optional)</label>
              <div className="relative">
                <input
                  type="url"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-colors"
                  placeholder="https://..."
                  value={formData.pptLink}
                  onChange={e => setFormData({ ...formData, pptLink: e.target.value })}
                />
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Google Drive / Canva link (Publicly accessible)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Upload PPT (PDF/PPTX) <span className="text-red-500">*</span></label>
              <div className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer relative bg-black/20 hover:bg-black/30 flex items-center justify-center flex-col h-[82px] ${!file ? 'border-gray-600 hover:border-ai-accent' : file.size > 10485760 ? 'border-red-500/50 bg-red-500/10' : 'border-ai-success/50 bg-ai-success/10'}`}>
                <input
                  type="file"
                  required
                  accept=".pdf,.pptx,.ppt"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                />
                <div className="flex items-center gap-2">
                  {!file ? (
                    <Upload className="text-gray-500" size={20} />
                  ) : file.size > 10485760 ? (
                    <AlertCircle className="text-red-400" size={20} />
                  ) : (
                    <CheckCircle className="text-ai-success" size={20} />
                  )}
                  <span className={`text-sm font-medium truncate max-w-[150px] ${!file ? 'text-gray-300' : file.size > 10485760 ? 'text-red-400' : 'text-ai-success'}`}>
                    {file ? file.name : "Choose File"}
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 text-center">Max size: <span className="font-semibold text-white">10 MB</span> | Required for submission</p>
                {file && (
                  <p className={`text-xs text-center font-semibold ${file.size > 10485760 ? 'text-red-400' : 'text-green-400'}`}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB {file.size > 10485760 && '❌ File too large'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (file && file.size > 10485760)}
          className="w-full py-4 bg-gradient-to-r from-ai-accent to-ai-purple text-white font-bold rounded-lg text-lg shadow-lg hover:shadow-ai-accent/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          title={file && file.size > 10485760 ? "PPT file exceeds 10 MB limit" : ""}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              {stepStatus}
            </>
          ) : 'Submit Application'}
        </button>

      </form>
    </div>
  );
};


export default Registration;