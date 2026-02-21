import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ArrowLeft } from 'lucide-react';
import { SignInButton, SignUpButton, useUser } from '@clerk/clerk-react';
import { UserSession, UserRole } from '../types';

interface Props {
  setUser: (user: UserSession) => void;
  logout?: () => Promise<void>;
}

const StudentLogin: React.FC<Props> = ({ setUser, logout }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const navigate = useNavigate();

  // Redirect if user is already signed in with Clerk
  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      console.log("STUDENT LOGIN: User signed in with Clerk:", clerkUser.primaryEmailAddress?.emailAddress);
      
      // Set user session and redirect
      setUser({
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || 'Student',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        role: UserRole.STUDENT,
        requiresRegistration: false
      });
      navigate('/student/home', { replace: true });
    }
  }, [isLoaded, isSignedIn, clerkUser, navigate, setUser]);

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
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-ai-accent to-ai-purple rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-ai-accent/20">
            <Terminal className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">INNOVEX AI</h1>
          <p className="text-[10px] font-mono tracking-[0.2em] text-ai-accent uppercase mb-4">Where Intelligence Meets Execution</p>
          <h2 className="text-lg text-gray-300 font-medium mb-1">Student Portal</h2>
          <p className="text-gray-400 text-sm">Welcome back, innovator</p>
        </div>

        {/* Clerk Sign In Button */}
        <div className="space-y-4">
          <SignInButton mode="modal">
            <button
              type="button"
              className="w-full py-3 bg-gradient-to-r from-ai-accent to-ai-purple hover:to-blue-600 text-white font-bold rounded-lg transition-all transform hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-3"
            >
              Sign In
            </button>
          </SignInButton>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-mono uppercase tracking-wider">Or</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <SignUpButton mode="modal">
            <button
              type="button"
              className="w-full py-3 bg-white/10 border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-3"
            >
              Create Account
            </button>
          </SignUpButton>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            Powered by Clerk Authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
