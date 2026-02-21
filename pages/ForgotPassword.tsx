import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-ai-success/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] max-w-md w-full text-center space-y-6 animate-float-in">
          <div className="w-20 h-20 bg-ai-success/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-ai-success w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
          <p className="text-gray-400">
            We've sent a password reset link to <span className="text-white font-medium">{email}</span>
          </p>
          <p className="text-sm text-gray-500">
            Didn't receive it? Check your spam folder or try again in a few minutes.
          </p>
          <div className="pt-4 space-y-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
            >
              Try Another Email
            </button>
            <Link
              to="/student/login"
              className="block w-full py-3 bg-gradient-to-r from-ai-accent to-ai-purple text-white font-bold rounded-lg hover:shadow-lg transition-all text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/student/login')}
        className="fixed top-6 left-6 z-50 flex items-center text-gray-400 hover:text-white transition-colors group bg-transparent border-0 cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 border border-white/5 transition-all">
          <ArrowLeft size={20} />
        </div>
        <span className="ml-3 font-mono text-sm tracking-wide hidden sm:block">Back to Login</span>
      </button>

      <div className="bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl relative z-10 animate-float-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-ai-accent to-ai-purple rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-ai-accent/20">
            <Mail className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-gray-400 text-sm">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 ml-1">Email Address</label>
            <div className="relative group">
              <input
                type="email"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-all group-hover:border-white/20"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-gray-400 transition-colors" size={18} />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-ai-accent to-ai-purple hover:to-blue-600 text-white font-bold rounded-lg transition-all transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin mr-2" size={20} />
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Remember your password?{' '}
            <Link
              to="/student/login"
              className="text-ai-accent hover:text-white font-bold transition-colors underline decoration-ai-accent/30 hover:decoration-ai-accent"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
