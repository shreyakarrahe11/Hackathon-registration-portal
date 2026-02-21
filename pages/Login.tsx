import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, UserSession } from '../types';
import { Shield, ArrowLeft, Lock, User, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';

interface LoginProps {
  setUser: (user: UserSession) => void;
  requiredRole: UserRole;
  logout?: () => Promise<void>;
}

// Judge credentials
const EVALUATOR_CREDENTIALS = [
  { name: 'Mr. Amit Vaidya', password: 'amit@eval2026', panel: 'A' as const },
  { name: 'Mr. Jatin Viswakarma', password: 'jatin@eval2026', panel: 'B' as const },
  { name: 'Mr. Aditya Kanodiya', password: 'aditya@eval2026', panel: 'C' as const },
];

// Admin credentials
const ADMIN_PASSWORD = 'chairperson@2026hack#';

const Login: React.FC<LoginProps> = ({ setUser, requiredRole, logout }) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [selectedJudge, setSelectedJudge] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = requiredRole === UserRole.ADMIN;
  const title = isAdmin ? 'Chairperson Access' : 'Evaluator Panel';
  const subtitle = isAdmin 
    ? 'Enter the chairperson access code to continue' 
    : 'Select your profile and enter your access code';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isAdmin) {
        // Admin login
        if (password === ADMIN_PASSWORD) {
          setUser({
            id: 'admin-001',
            name: 'Chairperson',
            email: 'chairperson@innovex.ai',
            role: UserRole.ADMIN,
            requiresRegistration: false
          });
          navigate('/admin', { replace: true });
        } else {
          throw new Error('Invalid access code. Please try again.');
        }
      } else {
        // Evaluator login
        if (!selectedJudge) {
          throw new Error('Please select your profile');
        }

        const judge = EVALUATOR_CREDENTIALS.find(j => j.name === selectedJudge);
        if (!judge) {
          throw new Error('Invalid judge selection');
        }

        if (password === judge.password) {
          setUser({
            id: `evaluator-${judge.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: judge.name,
            email: `${judge.name.toLowerCase().replace(/\s+/g, '.')}@innovex.ai`,
            role: UserRole.EVALUATOR,
            panel: judge.panel,
            requiresRegistration: false
          });
          navigate('/evaluator', { replace: true });
        } else {
          throw new Error('Invalid access code for selected judge.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={async () => {
          if (logout) await logout();
          navigate('/');
        }}
        className="fixed top-6 left-6 z-50 flex items-center text-gray-400 hover:text-white transition-colors group bg-transparent border-0 cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 border border-white/5 transition-all">
          <ArrowLeft size={20} />
        </div>
        <span className="ml-3 font-mono text-sm tracking-wide hidden sm:block">Back to Role Selection</span>
      </button>

      <div className="bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl relative z-10 animate-float-in">
        
        {/* Decorative Elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${isAdmin ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30' : 'bg-gradient-to-br from-indigo-500/30 to-blue-500/30'} border border-white/10 shadow-lg`}>
            <Shield className={`w-10 h-10 ${isAdmin ? 'text-purple-400' : 'text-indigo-400'}`} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            {title}
            <Sparkles className={`w-5 h-5 ${isAdmin ? 'text-purple-400' : 'text-indigo-400'}`} />
          </h1>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Judge Selection (only for evaluators) */}
          {!isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <User size={16} className="text-indigo-400" />
                Select Your Profile
              </label>
              <div className="grid gap-3">
                {EVALUATOR_CREDENTIALS.map((judge) => (
                  <button
                    key={judge.name}
                    type="button"
                    onClick={() => setSelectedJudge(judge.name)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-300 ${
                      selectedJudge === judge.name
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        selectedJudge === judge.name
                          ? 'bg-indigo-500/30 text-indigo-300'
                          : 'bg-white/10 text-gray-400'
                      }`}>
                        {judge.name.charAt(4)}
                      </div>
                      <div>
                        <p className="font-semibold">{judge.name}</p>
                        <p className="text-xs text-gray-500">Panel {judge.panel}</p>
                      </div>
                      {selectedJudge === judge.name && (
                        <div className="ml-auto">
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Lock size={16} className={isAdmin ? 'text-purple-400' : 'text-indigo-400'} />
              Access Code
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 pr-12 text-white placeholder-gray-500 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none transition-all"
                placeholder="Enter your access code"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-pulse">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (!isAdmin && !selectedJudge)}
            className={`w-full py-4 px-6 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 hover:shadow-lg ${
              isAdmin
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/20'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : (
              <>
                <Shield size={20} />
                Access {isAdmin ? 'Admin Panel' : 'Evaluator Dashboard'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-500 text-xs">
            🔒 Secure Access • INNOVEX AI Hackathon 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
