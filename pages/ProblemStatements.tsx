
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProblemStatements } from '../services/mockSupabase';
import { ChevronDown, ChevronUp, Zap, Target, BookOpen, AlertTriangle, ShieldAlert, CheckCircle, ListChecks } from 'lucide-react';

const ProblemStatements: React.FC = () => {
  const navigate = useNavigate();
  const problems = getProblemStatements();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Beginner': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Intermediate': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Advanced': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Extreme': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="py-12 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-16 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5">
        <h1 className="text-4xl font-bold text-white mb-4">Problem Statements</h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Choose your challenge. Innovate for the future. Review the problem statements below before registering your team.
        </p>
      </div>

      <div className="grid gap-6">
        {problems.map((problem) => (
          <div 
            key={problem.id} 
            className={`bg-black/40 backdrop-blur-xl border transition-all duration-300 rounded-xl overflow-hidden ${expandedId === problem.id ? 'border-ai-accent shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-white/10 hover:border-white/30'}`}
          >
            <div 
              onClick={() => toggleExpand(problem.id)}
              className="p-6 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-lg bg-white/5 flex flex-col items-center justify-center border border-white/10 shrink-0 group-hover:bg-white/10 transition-colors">
                  <span className="text-xs text-gray-500 uppercase font-mono">ID</span>
                  <span className="text-lg font-bold text-white">{problem.id}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{problem.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-white/5 text-ai-accent border border-ai-accent/20">
                      {problem.domain}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs border ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
                {expandedId === problem.id ? <ChevronUp className="text-white" /> : <ChevronDown className="text-gray-400" />}
              </button>
            </div>

            {expandedId === problem.id && (
              <div className="px-6 pb-6 pt-0 animate-float-in">
                <div className="h-px w-full bg-white/10 mb-6"></div>
                
                <div className="space-y-8">
                   {/* Context & Core Problem */}
                   <div className="grid md:grid-cols-2 gap-8">
                     <div>
                       <h4 className="flex items-center text-sm font-semibold text-ai-purple mb-2">
                         <BookOpen size={16} className="mr-2" /> Real-World Context
                       </h4>
                       <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">
                         {problem.realWorldContext}
                       </p>
                     </div>
                     <div>
                       <h4 className="flex items-center text-sm font-semibold text-ai-accent mb-2">
                         <Target size={16} className="mr-2" /> Core Problem Statement
                       </h4>
                       <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">
                         {problem.coreProblem}
                       </p>
                     </div>
                   </div>

                   {/* Constraints & Failure Scenarios */}
                   <div className="grid md:grid-cols-2 gap-8">
                     <div>
                       <h4 className="flex items-center text-sm font-semibold text-red-400 mb-2">
                         <AlertTriangle size={16} className="mr-2" /> Hard Constraints
                       </h4>
                       <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
                         {problem.constraints.map((item, idx) => (
                           <li key={idx}>{item}</li>
                         ))}
                       </ul>
                     </div>
                     <div>
                       <h4 className="flex items-center text-sm font-semibold text-orange-400 mb-2">
                         <ShieldAlert size={16} className="mr-2" /> Failure Scenarios
                       </h4>
                       <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
                         {problem.failureScenarios.map((item, idx) => (
                           <li key={idx}>{item}</li>
                         ))}
                       </ul>
                     </div>
                   </div>

                   {/* Deliverables & Evaluation */}
                   <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                      <div className="grid md:grid-cols-2 gap-8">
                         <div>
                            <h4 className="flex items-center text-sm font-semibold text-ai-success mb-3">
                              <CheckCircle size={16} className="mr-2" /> Deliverables Expected
                            </h4>
                            <ul className="text-sm text-gray-300 space-y-2">
                              {problem.deliverables.map((item, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2 mt-1 text-ai-success/50">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                         </div>
                         <div>
                            <h4 className="flex items-center text-sm font-semibold text-blue-400 mb-3">
                              <ListChecks size={16} className="mr-2" /> Evaluation Criteria
                            </h4>
                            <ul className="text-sm text-gray-300 space-y-2">
                              {problem.evaluationCriteria.map((item, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2 mt-1 text-blue-400/50">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-end pt-4">
                      <button 
                        onClick={() => navigate('/student/register', { state: { psId: problem.id } })}
                        className="px-8 py-3 bg-gradient-to-r from-ai-accent to-ai-purple text-white font-bold rounded-lg hover:shadow-lg hover:shadow-ai-accent/20 transition-all transform hover:-translate-y-0.5"
                      >
                        Register Team for {problem.id}
                      </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProblemStatements;
