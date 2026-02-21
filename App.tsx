import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Gateway from './pages/Gateway';
import StudentLogin from './pages/StudentLogin';
import LandingPage from './pages/LandingPage';
import Registration from './pages/Registration';
import Login from './pages/Login';
import StatusCheck from './pages/StatusCheck';
import ProblemStatements from './pages/ProblemStatements';
import EvaluatorDashboard from './pages/EvaluatorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AccessCodeEntry from './pages/AccessCodeEntry';
import { UserSession, UserRole } from './types';

const App: React.FC = () => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync Clerk auth state with app user state
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      console.log("APP: Clerk user signed in:", clerkUser.primaryEmailAddress?.emailAddress);
      
      // Create user session from Clerk user
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const isAdmin = email === 'admin@innovex.ai';
      const isEvaluator = email.includes('evaluator') || email.includes('pranay') || email.includes('ketan');
      
      let role = UserRole.STUDENT;
      if (isAdmin) role = UserRole.ADMIN;
      else if (isEvaluator) role = UserRole.EVALUATOR;

      setUser({
        id: clerkUser.id,
        email: email,
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        role: role,
        requiresRegistration: false
      });
    } else {
      console.log("APP: No Clerk session found.");
      setUser(null);
    }
    setAuthLoading(false);
  }, [isLoaded, isSignedIn, clerkUser]);

  const handleSetUser = (u: UserSession) => {
    // This is mainly called by Login pages after they verify credentials.
    // They should ideally also ensure the profile is fetched.
    setUser(u);
  };

  const handleLogout = async () => {
    console.log("LOGOUT: Initiated with Clerk");

    try {
      await signOut();
    } catch (err) {
      console.error("LOGOUT: Error", err);
    }

    // Force Cleanup
    setUser(null);
    localStorage.clear();

    // Redirect to home
    window.location.href = '/';
  };

  // Protected Route Wrappers - WAIT for auth hydration before redirecting
  const EvaluatorRoute = ({ children }: { children: React.ReactElement }) => {
    // CRITICAL: Don't redirect while auth is still loading
    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-4xl">⟳</div></div>;
    const userRole = user?.role?.toString().toUpperCase();
    if (!user || userRole !== 'EVALUATOR') return <Navigate to="/evaluator/login" replace />;
    return children;
  };

  const AdminRoute = ({ children }: { children: React.ReactElement }) => {
    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-4xl">⟳</div></div>;
    const userRole = user?.role?.toString().toUpperCase();
    if (!user || userRole !== 'ADMIN') return <Navigate to="/admin/login" replace />;
    return children;
  };

  const StudentRoute = ({ children }: { children: React.ReactElement }) => {
    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-4xl">⟳</div></div>;
    const userRole = user?.role?.toString().toUpperCase();
    if (!user || userRole !== 'STUDENT') return <Navigate to="/student/login" replace />;
    return children;
  };

  return (
    <Router>
      <Layout user={user} logout={handleLogout}>
        <Routes>
          {/* Public Gateway */}
          <Route path="/" element={user ? (
            user.requiresRegistration ? (
              <Navigate to="/student/register" replace />
            ) : (
              <Navigate to={user.role === UserRole.STUDENT ? "/student/home" : (user.role === UserRole.ADMIN ? "/admin" : "/evaluator")} replace />
            )
          ) : <Gateway />} />

          {/* Auth Routes */}
          {/* Removed auto-redirect here to let StudentLogin handle 'Home' vs 'Register' logic */}
          <Route path="/student/login" element={<StudentLogin setUser={handleSetUser} logout={handleLogout} />} />

          {/* Distinct Login Routes */}
          <Route
            path="/admin/login"
            element={user?.role === UserRole.ADMIN ? <Navigate to="/admin" /> : <Login setUser={handleSetUser} requiredRole={UserRole.ADMIN} logout={handleLogout} />}
          />
          <Route
            path="/evaluator/login"
            element={user?.role === UserRole.EVALUATOR ? <Navigate to="/evaluator" /> : <Login setUser={handleSetUser} requiredRole={UserRole.EVALUATOR} logout={handleLogout} />}
          />

          {/* Password Reset Routes (Public) */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Secure Access Code Verification */}
          <Route path="/verify-access" element={<AccessCodeEntry onSuccess={(role) => {
            // Access code success - reload to get new role
            window.location.href = role === 'admin' ? '/#/admin/dashboard' : '/#/evaluator/dashboard';
            window.location.reload();
          }} />} />

          {/* Student Portal Routes */}
          <Route
            path="/student/home"
            element={
              <StudentRoute>
                <LandingPage user={user} />
              </StudentRoute>
            }
          />
          <Route
            path="/student/register"
            element={
              <StudentRoute>
                <Registration />
              </StudentRoute>
            }
          />
          <Route
            path="/student/status"
            element={
              <StudentRoute>
                <StatusCheck />
              </StudentRoute>
            }
          />
          <Route
            path="/student/problems"
            element={
              <StudentRoute>
                <ProblemStatements />
              </StudentRoute>
            }
          />

          {/* Staff Routes */}
          <Route
            path="/evaluator"
            element={
              <EvaluatorRoute>
                <EvaluatorDashboard user={user!} />
              </EvaluatorRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;