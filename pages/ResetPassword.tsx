import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    // Check if user came from a valid reset link
    useEffect(() => {
        const checkSession = async () => {
            try {
                // The reset link sets a session automatically
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    setIsValidSession(true);
                } else {
                    // Check URL for recovery token (Supabase v2 format)
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const type = hashParams.get('type');

                    if (accessToken && type === 'recovery') {
                        // Set the session from the recovery token
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: hashParams.get('refresh_token') || '',
                        });

                        if (!error) {
                            setIsValidSession(true);
                        }
                    }
                }
            } catch (err) {
                console.error('Session check error:', err);
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, []);

    const validatePassword = () => {
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validatePassword()) return;

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/student/login', { replace: true });
            }, 3000);
        } catch (err: any) {
            console.error('Password update error:', err);
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Loading state while checking session
    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="animate-spin text-ai-accent w-12 h-12 mx-auto mb-4" />
                    <p className="text-gray-400">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    // Invalid or expired link
    if (!isValidSession) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-red-500/30 max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="text-red-400 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Invalid or Expired Link</h2>
                    <p className="text-gray-400">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="w-full py-3 bg-gradient-to-r from-ai-accent to-ai-purple text-white font-bold rounded-lg hover:shadow-lg transition-all"
                    >
                        Request New Link
                    </button>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-ai-success/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] max-w-md w-full text-center space-y-6 animate-float-in">
                    <div className="w-20 h-20 bg-ai-success/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="text-ai-success w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Password Updated!</h2>
                    <p className="text-gray-400">
                        Your password has been successfully changed. Redirecting to login...
                    </p>
                    <div className="flex items-center justify-center">
                        <Loader2 className="animate-spin text-ai-accent w-6 h-6" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl relative z-10 animate-float-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-ai-accent to-ai-purple rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-ai-accent/20">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
                    <p className="text-gray-400 text-sm">
                        Create a strong password for your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1">New Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 pr-10 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-all group-hover:border-white/20"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                minLength={6}
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-gray-400 transition-colors" size={18} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 ml-1">Minimum 6 characters</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400 ml-1">Confirm Password</label>
                        <div className="relative group">
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-ai-accent focus:bg-white/10 focus:outline-none transition-all group-hover:border-white/20"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-gray-400 transition-colors" size={18} />
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
                        className="w-full py-3 bg-gradient-to-r from-ai-accent to-ai-purple hover:to-blue-600 text-white font-bold rounded-lg transition-all transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 flex items-center justify-center mt-6"
                    >
                        {loading ? (
                            <span className="flex items-center">
                                <Loader2 className="animate-spin mr-2" size={20} />
                                Updating...
                            </span>
                        ) : (
                            'Update Password'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
