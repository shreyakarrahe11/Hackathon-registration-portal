import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Cpu, Zap, Globe, ChevronRight, Download, Terminal, Award, Lightbulb, Clock, Search, MonitorPlay, Trophy, User, Users, FileText } from 'lucide-react';
import { UserSession, Team } from '../types';
import { getTeams, getTeamByUserEmail } from '../services/mockSupabase';

interface Props {
  user?: UserSession | null;
}

import { getMyTeam } from '../services/supabaseService';

interface Props {
  user?: UserSession | null;
}

const LandingPage: React.FC<Props> = ({ user }) => {
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchTeam = async () => {
      // Only set loading if not already loading, or force it strictly
      if (mounted) setLoading(true);

      try {
        const teamData = await getMyTeam();

        if (mounted) {
          if (teamData) {
            // Adapt DB Structure to UI Type (Temporary Adapter)
            console.log("DASHBOARD: Raw Team Data:", teamData);

            const sub = Array.isArray(teamData.submissions)
              ? teamData.submissions[0]
              : teamData.submissions;

            console.log("DASHBOARD: Extracted Submission:", sub);

            const adaptedTeam: Team = {
              id: teamData.id,
              teamName: teamData.team_name,
              leadName: "",
              email: "N/A",
              phone: "N/A",
              teamSize: teamData.team_members.length,
              members: teamData.team_members.map((m: any) => ({
                name: m.name,
                email: m.email,
                phone: m.phone
              })),
              psId: sub?.ps_id || "N/A",
              ideaDesc: sub?.idea_description || "",
              pptUrl: sub?.ppt_file_url || "#",
              status: teamData.status,
              panel: teamData.panel,
              // ... other fields
              submissionDate: teamData.created_at,
              evaluations: {},
              totalScore: teamData.total_score || 0
            };

            // Refine Leader Name
            const leader = teamData.team_members.find((m: any) => m.role === 'leader');
            if (leader) {
              adaptedTeam.leadName = leader.name;
              adaptedTeam.email = leader.email;
              adaptedTeam.phone = leader.phone;
            }

            setMyTeam(adaptedTeam);
          } else {
            setMyTeam(null);
          }
        }
      } catch (e) {
        console.error("Failed to fetch team", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (user) {
      fetchTeam();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading Dashboard...</div>;
  }

  // DASHBOARD VIEW
  if (myTeam) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 to-black border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ai-accent/10 rounded-full blur-[80px] -mr-16 -mt-16"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ai-accent/20 border border-ai-accent/50 text-ai-accent text-xs font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-ai-accent animate-pulse"></span>
                LIVE STATUS
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">Welcome Back, {user?.name}</h1>
              <p className="text-gray-400">Team Lead of <span className="text-white font-semibold">{myTeam.teamName}</span></p>
            </div>

            <div className="text-right bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Stage</p>
              <p className={`text-2xl font-black ${myTeam.status === 'Submitted' ? 'text-gray-300' :
                myTeam.status === 'Shortlisted' ? 'text-blue-400' :
                  myTeam.status === 'Winner' ? 'text-green-400 animate-pulse' : 'text-yellow-400'
                }`}>
                {myTeam.status.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Team Card */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center border-b border-white/10 pb-4">
                <Users className="mr-2 text-ai-purple" size={20} /> Team Composition
              </h3>

              <div className="space-y-4">
                <div className="flex items-center p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-ai-accent/20 flex items-center justify-center text-ai-accent font-bold mr-4">L</div>
                  <div>
                    <p className="text-white font-medium">{myTeam.leadName} (You)</p>
                    <p className="text-xs text-gray-400">Team Lead</p>
                  </div>
                </div>
                {myTeam.members?.map((m, i) => (
                  <div key={i} className="flex items-center p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold mr-4">{i + 1}</div>
                    <div>
                      <p className="text-white font-medium">{m.name}</p>
                      <p className="text-xs text-gray-400">Member</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center border-b border-white/10 pb-4">
                <FileText className="mr-2 text-green-400" size={20} /> Submission Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Problem Statement ID</p>
                  <p className="text-white font-mono bg-black/50 px-3 py-1 rounded inline-block border border-white/10">{myTeam.psId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Submission ID</p>
                  <p className="text-white font-mono bg-black/50 px-3 py-1 rounded inline-block border border-white/10">{myTeam.id}</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <p className="text-sm text-gray-500 mb-2">Project Description</p>
                  <div className="bg-white/5 p-4 rounded-lg text-gray-300 text-sm leading-relaxed border border-white/5">
                    {myTeam.ideaDesc}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <p className="text-sm text-gray-500 mb-2">Presentation Folder</p>
                  {myTeam.pptUrl && myTeam.pptUrl !== '#' ? (
                    <div className="flex items-center gap-3">
                      <a href={myTeam.pptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-ai-accent hover:text-white transition-colors border border-ai-accent/30 bg-ai-accent/10 px-4 py-2 rounded-lg">
                        <Download size={16} className="mr-2" /> View Submitted PPT
                      </a>
                      <span className="text-xs text-ai-success flex items-center"><CheckCircle size={14} className="mr-1" /> Uploaded Successfully</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">No PPT linked</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Need Help?</h3>
              <p className="text-sm text-gray-400 mb-4">Contact your assigned panel evaluator for queries regarding your status.</p>
              <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-center">
                <p className="text-xs text-gray-500 uppercase">Assigned Panel</p>
                <p className="text-xl font-bold text-white">{myTeam.panel ? `Panel ${myTeam.panel}` : 'Pending Assignment'}</p>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Timeline</h3>
              <div className="space-y-4">
                <TimelineItem status="Submitted" date="Feb 4" active={true} />
                <TimelineItem status="Under Review" date="Feb 5" active={myTeam.status !== 'Submitted'} />
                <TimelineItem status="Shortlisted" date="Feb 6" active={['Shortlisted', 'Final Presentation', 'Winner'].includes(myTeam.status)} />
                <TimelineItem status="Finals" date="Feb 7" active={['Final Presentation', 'Winner'].includes(myTeam.status)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT REGISTER VIEW (If no team found)
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[80vh] w-full flex items-center justify-center">

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto space-y-8 animate-float">
          <div className="inline-block px-4 py-1.5 rounded-full border border-ai-accent/30 bg-black/40 text-ai-accent font-mono text-sm mb-4 backdrop-blur-md">
            REGISTRATIONS OPEN NOW
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">
            INNOVEX <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai-accent to-ai-purple">AI</span>
          </h1>

          <p className="text-xs md:text-sm font-mono tracking-[0.3em] text-ai-accent uppercase -mt-4 mb-6">
            WHERE INTELLIGENCE MEETS EXECUTION
          </p>

          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto font-light drop-shadow-lg">
            Build the future. Solve real-world problems. <br /> Join the ultimate AI hackathon experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link to="/student/register" className="px-8 py-4 bg-ai-accent hover:bg-blue-600 text-white font-bold text-lg rounded-full transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] flex items-center backdrop-blur-sm">
              Register Now <ChevronRight className="ml-2" />
            </Link>
            <Link to="/student/problems" className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-lg rounded-full transition-all flex items-center">
              <Download className="mr-2" size={20} />
              View Problems
            </Link>
          </div>
        </div>
      </section>

      {/* About & Themes */}
      <section className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-white/5">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white border-l-4 border-ai-purple pl-4">About The Event</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              <span className="text-white font-semibold">Innovex AI – Where Intelligence Meets Execution</span> is an AI-first, online innovation hackathon organized by
              <span className="text-ai-accent font-semibold"> IEEE CIS SBC GHRCE</span>, in association with the Department of DIC and AI.
              The hackathon focuses on how well participants understand, design, and build meaningful AI systems that solve real problems, rather than just creating applications quickly.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              It is thoughtfully designed for students who enjoy exploring ideas through hands-on building; where creativity, experimentation, and structured thinking come together to shape impactful AI solutions.
            </p>
            <p className="text-ai-purple text-lg font-medium italic border-t border-white/10 pt-4 mt-2">
              InnovexAI is where ideas evolve into intelligent execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ThemeCard icon={Zap} title="Generative & Agentic AI" desc="LLMs, Image Gen, Text-to-Speech" color="text-yellow-400" />
            <ThemeCard icon={Globe} title="AI for Good" desc="Sustainability, Healthcare, Education" color="text-green-400" />
            <ThemeCard icon={Cpu} title="Data Analytics" desc="Smart Hardware, Automation" color="text-blue-400" />
            <ThemeCard icon={Terminal} title="Web Development" desc="Fraud Detection, Predictive Analytics" color="text-purple-400" />
          </div>
        </div>
      </section>

      {/* Roadmap / Timeline - Redesigned */}
      <section className="py-32 px-4 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-ai-purple/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-ai-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-ai-accent text-xs font-mono mb-4 animate-pulse-slow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ai-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ai-accent"></span>
              </span>
              EXECUTION TIMELINE
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight">
              Event <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai-accent to-ai-purple">Roadmap</span>
            </h2>
          </div>

          <div className="relative">
            {/* Timeline Items */}
            <div className="space-y-0">
              <TimelineRow
                date="Feb 3"
                title="Idea Submission Starts"
                desc="Portal opens for PPT uploads. Start shaping your concepts."
                icon={Lightbulb}
                align="left"
              />
              <TimelineRow
                date="Feb 4"
                title="Submission Deadline"
                desc="Hard stop for all entries. No extensions."
                icon={Clock}
                align="right"
              />
              <TimelineRow
                date="Feb 5"
                title="Evaluation Phase"
                desc="Expert panel reviews all submissions for viability and innovation."
                icon={Search}
                align="left"
              />
              <TimelineRow
                date="Feb 6"
                title="Final Presentation"
                desc="Shortlisted teams pitch live to the jury panel."
                icon={MonitorPlay}
                align="right"
              />
              <TimelineRow
                date="Feb 8"
                title="Result Announcement"
                desc="Winners announced. Prize distribution ceremony."
                icon={Trophy}
                align="center"
                isLast
              />
            </div>
          </div>
        </div>
      </section>

      {/* Organizers Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto text-center bg-black/40 backdrop-blur-xl p-12 rounded-3xl border border-white/5">
          <div className="mb-16">
            <span className="text-ai-accent font-mono text-sm tracking-wider uppercase mb-2 block">The Minds Behind</span>
            <h2 className="text-4xl font-bold text-white">Organizing Committee</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-16">
            {/* Hosts */}
            <OrganizerCard name="Mr. Kashif Ansari" role="Host" image="/kashif.jpeg" isHost />
            <OrganizerCard name="Miss Shreya Karrahe" role="Co-Host" image="/shreya.png" isHost />

            {/* Coordinators */}
            <OrganizerCard key="coord-uday" name="Mr. Uday Deshpande" role="Co-ordinator" image="/uday.jpeg" />
            <OrganizerCard key="coord-raj-v3" name="Mr. Rajkumar Bajiyan" role="Event Manager" image="/rajkumar.jpeg" />
            <OrganizerCard key="coord-sarthak-v3" name="Mr. Sarthak Shende" role="Tech Lead" image="/sarthak.jpeg" />
          </div>

          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm">
            <Award size={16} className="text-ai-purple" />
            <span>Special Credits: <span className="text-white font-semibold">IEEE CIS SBC GHRCE, NAGPUR</span></span>
          </div>
        </div>
      </section>
    </div>
  );
};

const TimelineItem = ({ status, date, active }: any) => (
  <div className={`flex items-center ${active ? 'opacity-100' : 'opacity-40 grayscale'} transition-all`}>
    <div className={`w-3 h-3 rounded-full mr-4 ${active ? 'bg-ai-success shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-700'}`}></div>
    <div className="flex-grow">
      <p className={`font-bold ${active ? 'text-white' : 'text-gray-500'}`}>{status}</p>
      <p className="text-xs text-gray-500">{date}</p>
    </div>
    {active && <CheckCircle size={16} className="text-ai-success" />}
  </div>
);

import { CheckCircle } from 'lucide-react';

const ThemeCard = ({ icon: Icon, title, desc, color }: any) => (
  <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-ai-accent/50 transition-all hover:-translate-y-1 group backdrop-blur-sm">
    <Icon size={32} className={`mb-4 ${color} group-hover:scale-110 transition-transform`} />
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400">{desc}</p>
  </div>
);

const OrganizerCard = ({ name, role, image, isHost }: any) => (
  <div className="flex flex-col items-center group">
    <div className={`w-32 h-32 rounded-full overflow-hidden mb-4 border-2 ${isHost ? 'border-ai-accent shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-gray-600'} group-hover:border-white transition-colors`}>
      <img src={image} alt={name} className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500" />
    </div>
    <h3 className="text-lg font-bold text-white">{name}</h3>
    <p className="text-sm text-gray-400">{role}</p>
  </div>
);

const TimelineRow = ({ date, title, desc, icon: Icon, align, isLast }: any) => {
  const isLeft = align === 'left';
  const isCenter = align === 'center';

  if (isCenter) {
    return (
      <div className="relative flex flex-col items-center mt-12 md:mt-24">
        {/* Connecting Line from top */}
        <div className="w-px bg-gradient-to-b from-ai-accent/50 to-transparent h-24 absolute -top-24 hidden md:block"></div>

        {/* Grand Finale Node */}
        <div className="w-24 h-24 rounded-full bg-black border-2 border-ai-accent flex items-center justify-center z-10 shadow-[0_0_60px_rgba(59,130,246,0.5)] group hover:scale-110 transition-transform duration-500 relative">
          <div className="absolute inset-0 rounded-full bg-ai-accent/20 animate-ping opacity-50"></div>
          <Icon size={36} className="text-white relative z-10" />
        </div>

        {/* Card */}
        <div className="mt-10 bg-black/60 backdrop-blur-xl border border-ai-accent/30 p-10 rounded-3xl text-center max-w-3xl w-full shadow-2xl relative overflow-hidden group hover:border-ai-accent/60 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-ai-accent/5 via-ai-purple/10 to-ai-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <span className="inline-block px-5 py-2 rounded-full bg-ai-success/20 text-ai-success border border-ai-success/30 text-sm font-bold mb-5 tracking-wide relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.3)]">{date}</span>
          <h3 className="text-4xl font-black text-white mb-4 relative z-10">{title}</h3>
          <p className="text-gray-300 text-xl relative z-10">{desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col md:flex-row items-center group ${isLast ? '' : 'mb-12 md:mb-0'}`}>

      {/* Left Column */}
      <div className={`w-full md:w-1/2 flex ${isLeft ? 'justify-end md:pr-16' : 'justify-end md:pr-16'} mb-6 md:mb-24 order-2 md:order-1`}>
        {isLeft ? (
          <div className="w-full max-w-lg bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-ai-accent/50 hover:bg-black/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] group-hover:border-white/20 relative overflow-hidden text-left md:text-right">
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-ai-accent to-ai-purple opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="inline-block mb-3 px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-ai-accent font-mono text-sm font-bold tracking-wider">{date}</div>
            <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-base">{desc}</p>
          </div>
        ) : <div className="hidden md:block" />}
      </div>

      {/* Center Line & Node */}
      <div className="relative flex flex-col items-center md:w-0 order-1 md:order-2 mb-6 md:mb-24">
        <div className="w-px h-[calc(100%+6rem)] absolute top-0 bg-gradient-to-b from-white/5 via-ai-accent/30 to-white/5 hidden md:block"></div>
        <div className="w-14 h-14 rounded-full bg-black border border-white/20 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover:border-ai-accent group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-all duration-500 relative">
          <div className="absolute inset-0 bg-ai-accent/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
          <Icon size={24} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
        </div>
      </div>

      {/* Right Column */}
      <div className={`w-full md:w-1/2 flex ${!isLeft ? 'justify-start md:pl-16' : 'justify-start md:pl-16'} md:mb-24 order-3 md:order-3`}>
        {!isLeft ? (
          <div className="w-full max-w-lg bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-ai-accent/50 hover:bg-black/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] group-hover:border-white/20 relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-ai-accent to-ai-purple opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="inline-block mb-3 px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-ai-accent font-mono text-sm font-bold tracking-wider">{date}</div>
            <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-base">{desc}</p>
          </div>
        ) : <div className="hidden md:block" />}
      </div>

    </div>
  );
};

export default LandingPage;