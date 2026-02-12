import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, TrendingUp } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function ResetPasswordPage() {
    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Parse Query Params (assuming URL is /password-reset?token=...&email=...)
        // Or if using React Router params, we might need to adjust. 
        // For now, assuming standard window.location search params (Laravel default)
        const params = new URLSearchParams(window.location.search);
        setToken(params.get('token') || '');
        setEmail(params.get('email') || '');
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        try {
            await fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: 'include' });

            const getCookie = (name) => {
                const parts = document.cookie.split("; ").map(v => v.split("="));
                const found = parts.find(([k]) => k === name);
                return found ? decodeURIComponent(found[1] || "") : "";
            };
            const xsrf = getCookie("XSRF-TOKEN");

            const res = await fetch(`${API_BASE}/api/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': xsrf || '',
                },
                body: JSON.stringify({
                    token,
                    email,
                    password,
                    password_confirmation: passwordConfirmation
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Reset failed');
            }

            setStatus('success');
            setMessage(data.status || 'Password has been reset!');

        } catch (err) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#FAFAFA] to-[#F1F5F9] flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-50 rounded-xl mb-4 text-[#7C3AED]">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">Set New Password</h2>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm border border-green-200">
                                {message}
                            </div>
                            <a href="/" className="inline-block px-6 py-2 bg-[#0F172A] text-white rounded-lg text-sm hover:bg-[#1E293B]">
                                Login Now
                            </a>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === 'error' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                                    {message}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-[#171717] mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB]"
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#171717] mb-2">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB]"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-3 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-[#1E293B] transition-all disabled:opacity-50"
                            >
                                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes blob {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                .animate-blob {
                animation: blob 7s infinite;
                }
            `}</style>
        </div>
    );
}
