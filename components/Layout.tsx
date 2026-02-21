import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Terminal, LogOut, User, Shield, BookOpen, Home, ArrowLeft } from 'lucide-react';
import { UserRole, UserSession } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserSession | null;
  logout: () => Promise<void>;
}

const Layout: React.FC<LayoutProps> = ({ children, user, logout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isGateway = location.pathname === '/' || location.pathname === '/student/login' || location.pathname === '/admin/login' || location.pathname === '/evaluator/login';

  const isRoleRoot = location.pathname === '/student/home' || location.pathname === '/evaluator' || location.pathname === '/admin';
  const showBackButton = !isGateway && !isRoleRoot && location.pathname !== '/';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const NavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon?: React.FC<any> }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsOpen(false)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${isActive
            ? 'bg-ai-accent/20 text-ai-accent border border-ai-accent/50 backdrop-blur-sm'
            : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
      >
        {Icon && <Icon size={18} />}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-ai-text relative selection:bg-ai-accent/30 selection:text-white">

      {/* GLOBAL BACKGROUND VIDEO */}
      {/* z-0 ensures it's at the base level, but we rely on fixed positioning. */}
      {/* Added fallback background color bg-black in case video doesn't load */}
      <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-ai-dark/30 to-black/80"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
      </div>

      {/* Navigation - Only show if NOT gateway/login pages */}
      {!isGateway && (
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">

                {showBackButton && (
                  <button
                    onClick={() => navigate(-1)}
                    className="mr-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Go Back"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}

                <Link to={user?.role === UserRole.STUDENT ? "/student/home" : "/"} className="flex items-center space-x-2 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-ai-accent/80 to-ai-purple/80 rounded-lg flex items-center justify-center shadow-lg shadow-ai-accent/20 group-hover:shadow-ai-accent/40 transition-all backdrop-blur-sm">
                    <Terminal className="text-white" size={24} />
                  </div>
                  <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    INNOVEX AI
                  </span>
                </Link>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-4">

                {user?.role === UserRole.STUDENT && (
                  <>
                    <NavLink to="/student/home" label="Home" icon={Home} />
                    <NavLink to="/student/problems" label="Problem Statements" icon={BookOpen} />
                    <NavLink to="/student/status" label="Status" />
                    <Link to="/student/register" className="px-4 py-2 bg-white/90 text-ai-dark font-bold rounded-full hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform hover:-translate-y-0.5">
                      Register Team
                    </Link>
                  </>
                )}

                {user?.role === UserRole.EVALUATOR && (
                  <NavLink to="/evaluator" label="Evaluator Portal" icon={User} />
                )}

                {user?.role === UserRole.ADMIN && (
                  <NavLink to="/admin" label="Admin Panel" icon={Shield} />
                )}

                {user ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-md hover:bg-red-500/10 hover:border-red-500/60 transition-colors backdrop-blur-sm"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                ) : null}
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-gray-400 hover:text-white focus:outline-none"
                >
                  {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden bg-black/60 backdrop-blur-xl border-b border-white/10">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col">
                {user?.role === UserRole.STUDENT && (
                  <>
                    <NavLink to="/student/home" label="Home" />
                    <NavLink to="/student/problems" label="Problem Statements" />
                    <NavLink to="/student/status" label="Check Status" />
                    <NavLink to="/student/register" label="Register Team" />
                  </>
                )}
                {user?.role === UserRole.EVALUATOR && <NavLink to="/evaluator" label="Evaluator Portal" icon={User} />}
                {user?.role === UserRole.ADMIN && <NavLink to="/admin" label="Admin Panel" icon={Shield} />}

                {user && (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center space-x-2 px-4 py-3 text-left text-red-400 hover:bg-white/5"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-grow relative z-10">
        {children}
      </main>

      {/* Footer (Only if not gateway) */}
      {!isGateway && (
        <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 py-8 relative z-10">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
            <p>© 2026 INNOVEX AI Hackathon. All rights reserved.</p>
            <p className="text-xs mt-2">Empowering Innovation through Artificial Intelligence.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;