import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { activateAccessCode } from '../services/supabaseService';
import { UserRole } from '../types';

interface Props {
    onSuccess: (role: string, panel?: string) => void;
}

const AccessCodeEntry: React.FC<Props> = ({ onSuccess }) => {
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [activatedRole, setActivatedRole] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accessCode.trim()) {
            setError('Please enter an access code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await activateAccessCode(accessCode);

            if (result.success) {
                setSuccess(true);
                setActivatedRole(result.role || null);

                // Notify parent component
                setTimeout(() => {
                    onSuccess(result.role || 'student', result.panel || undefined);

                    // Redirect based on role
                    if (result.role === 'admin') {
                        navigate('/admin/dashboard', { replace: true });
                    } else if (result.role === 'evaluator') {
                        navigate('/evaluator/dashboard', { replace: true });
                    }
                }, 1500);
            } else {
                setError(result.error || 'Invalid or already used access code');
            }
        } catch (err: any) {
            console.error('Access code error:', err);
            setError(err.message || 'Failed to activate access code');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // Continue as student
        navigate('/student/home', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Access Code Verification</h1>
                    <p className="text-gray-400">
                        Enter your evaluator or admin access code to unlock elevated privileges
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
                    {success ? (
                        // Success State
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Access Granted!</h2>
                            <p className="text-gray-400">
                                You are now a <span className="text-green-400 font-semibold capitalize">{activatedRole}</span>
                            </p>
                            <p className="text-gray-500 text-sm mt-2">Redirecting to dashboard...</p>
                        </div>
                    ) : (
                        // Form State
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Access Code Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Access Code
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        placeholder="Enter your access code"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        disabled={loading}
                                    />
                                </div>
                                <p className="text-gray-500 text-xs mt-2">
                                    Access codes are provided to authorized evaluators and admins only
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !accessCode.trim()}
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5" />
                                        Activate Access
                                    </>
                                )}
                            </button>

                            {/* Skip Option */}
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    I'm a student → Continue without code
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                    <h3 className="text-indigo-400 font-medium mb-2">Who needs an access code?</h3>
                    <ul className="text-gray-400 text-sm space-y-1">
                        <li>• <span className="text-indigo-300">Evaluators</span> - Panel judges assigned to review submissions</li>
                        <li>• <span className="text-purple-300">Admin</span> - Chairperson with full system access</li>
                    </ul>
                    <p className="text-gray-500 text-xs mt-3">
                        Students do not need an access code.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessCodeEntry;
