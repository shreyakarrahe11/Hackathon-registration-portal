import React from 'react';
import { Link } from 'react-router-dom';
import { User, ClipboardCheck, Shield } from 'lucide-react';

const Gateway: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-6xl animate-float-in px-4">
        
        {/* Title Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_35px_rgba(139,92,246,0.4)]">
            INNOVEX <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai-accent to-ai-purple">AI</span>
          </h1>
          <p className="text-sm md:text-xl text-gray-300 font-mono font-bold tracking-[0.8em] uppercase animate-pulse-slow">
            HACKATHON
          </p>
        </div>

        {/* 3 Column Grid - Glassmorphism */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Student Card */}
          <Link to="/student/login" className="group relative bg-black/30 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:bg-black/50 hover:border-blue-500/60 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:-translate-y-3 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/30 group-hover:scale-110 group-hover:border-blue-500/60 transition-all duration-500 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <User size={40} className="text-blue-400 group-hover:text-blue-200 transition-colors" />
            </div>
            
            <div className="text-center relative z-10">
              <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors tracking-wide">STUDENT</h2>
              <div className="h-0.5 w-12 bg-blue-500/30 rounded-full mx-auto mt-4 group-hover:w-24 group-hover:bg-blue-400 transition-all duration-500"></div>
              <p className="text-xs text-gray-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">Register & Track Status</p>
            </div>
          </Link>

          {/* Evaluator Card */}
          <Link to="/evaluator/login" className="group relative bg-black/30 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:bg-black/50 hover:border-purple-500/60 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:-translate-y-3 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-full flex items-center justify-center border border-purple-500/30 group-hover:scale-110 group-hover:border-purple-500/60 transition-all duration-500 shadow-[0_0_20px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <ClipboardCheck size={40} className="text-purple-400 group-hover:text-purple-200 transition-colors" />
            </div>
            
            <div className="text-center relative z-10">
              <h2 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors tracking-wide">EVALUATOR</h2>
              <div className="h-0.5 w-12 bg-purple-500/30 rounded-full mx-auto mt-4 group-hover:w-24 group-hover:bg-purple-400 transition-all duration-500"></div>
               <p className="text-xs text-gray-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">Review & Score Teams</p>
            </div>
          </Link>

          {/* Admin Card */}
          <Link to="/admin/login" className="group relative bg-black/30 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:bg-black/50 hover:border-rose-500/60 hover:shadow-[0_0_40px_rgba(244,63,94,0.3)] hover:-translate-y-3 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative w-24 h-24 bg-gradient-to-br from-rose-500/10 to-rose-600/10 rounded-full flex items-center justify-center border border-rose-500/30 group-hover:scale-110 group-hover:border-rose-500/60 transition-all duration-500 shadow-[0_0_20px_rgba(244,63,94,0.1)] group-hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <Shield size={40} className="text-rose-400 group-hover:text-rose-200 transition-colors" />
            </div>
            
            <div className="text-center relative z-10">
              <h2 className="text-2xl font-bold text-white group-hover:text-rose-300 transition-colors tracking-wide">ADMIN</h2>
              <div className="h-0.5 w-12 bg-rose-500/30 rounded-full mx-auto mt-4 group-hover:w-24 group-hover:bg-rose-400 transition-all duration-500"></div>
               <p className="text-xs text-gray-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">Manage Event Flow</p>
            </div>
          </Link>

        </div>
        
        <div className="text-center mt-20">
          <p className="text-[10px] text-gray-400 tracking-widest uppercase font-mono">Powered by Artificial Intelligence</p>
        </div>
      </div>
    </div>
  );
};

export default Gateway;