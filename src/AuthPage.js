import React, { useState } from 'react';
import { Eye, EyeOff, TrendingUp, Mail, Lock, User } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

async function ensureCsrf(API_BASE) {
    await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
    });
}

async function apiRegister(API_BASE, payload) {
    await ensureCsrf(API_BASE);

    const raw = getCookie("XSRF-TOKEN");
    const xsrf = raw ? decodeURIComponent(raw) : "";

    const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-XSRF-TOKEN": xsrf,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data?.message || "Register failed");
    }

    return data;
}

export default function AuthPage({ initialMode = 'signin' }) {
    const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (mode === 'signup') {
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
            if (formData.password.length < 8) {
                setError('Password must be at least 8 characters');
                setLoading(false);
                return;
            }
            if (!formData.name.trim()) {
                setError('Name is required');
                setLoading(false);
                return;
            }
        }

        try {
            if (mode === 'signup') {
                // 1) Register using clean helper
                const data = await apiRegister(API_BASE, {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    password_confirmation: formData.confirmPassword,
                });

                // ✅ If backend says not verified, go verify page (do NOT reload)
                if (data?.needs_verification || data?.user?.email_verified_at == null) {
                    // setLoading(false) handled in finally, but if we return early with href redirect, 
                    // we might want to ensure UI doesn't look stuck before the page unloads? 
                    // Actually, href acts fast. But fine.
                    window.location.href = "/verify-email";
                    return;
                }

                // ✅ Verified users can reload into app
                window.location.reload();

            } else {
                // Ensure CSRF cookie (Login still needs this explicitly for now)
                await ensureCsrf(API_BASE);

                const raw = getCookie("XSRF-TOKEN");
                const xsrf = raw ? decodeURIComponent(raw) : "";

                // Login
                const res = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrf,
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Invalid credentials');
                }

                // ✅ If backend says not verified, go verify page (do NOT reload)
                if (data?.needs_verification || data?.user?.email_verified_at == null) {
                    window.location.href = "/verify-email";
                    return;
                }

                // ✅ Verified users can reload into app
                window.location.reload();
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };


    const handleOAuthLogin = (provider) => {
        // Redirect to backend OAuth endpoint
        window.location.href = `${API_BASE}/api/auth/${provider}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#FAFAFA] to-[#F1F5F9] flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-2xl mb-4 shadow-lg">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Easy Trade Log</h1>
                    <p className="text-[#64748B]">Track, analyze, and improve your trading</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-[#F8FAFC] rounded-xl p-1">
                        <button
                            onClick={() => setMode('signin')}
                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${mode === 'signin'
                                ? 'bg-white text-[#2563EB] shadow-sm'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setMode('signup')}
                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${mode === 'signup'
                                ? 'bg-white text-[#2563EB] shadow-sm'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-semibold text-[#171717] mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Trader"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-[#171717] mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#171717] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {mode === 'signup' && (
                                <p className="text-xs text-[#64748B] mt-1">
                                    Must be at least 8 characters
                                </p>
                            )}
                        </div>

                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-semibold text-[#171717] mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'signin' && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30" />
                                    <span className="text-[#64748B]">Remember me</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => (window.location.href = "/forgot-password")}
                                    className="text-[#2563EB] hover:text-[#1d4ed8] font-semibold"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#E2E8F0]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-[#64748B]">Or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                        type="button"
                        onClick={() => handleOAuthLogin('google')}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all text-sm font-semibold text-[#0F172A] shadow-sm"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z" fill="#4285F4" />
                            <path d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z" fill="#34A853" />
                            <path d="M3.96409 10.7098C3.78409 10.1698 3.68182 9.59301 3.68182 8.99983C3.68182 8.40665 3.78409 7.82983 3.96409 7.28983V4.95801H0.957273C0.347727 6.17301 0 7.54755 0 8.99983C0 10.4521 0.347727 11.8266 0.957273 13.0416L3.96409 10.7098Z" fill="#FBBC05" />
                            <path d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                    </button>

                    {/* Terms */}
                    {mode === 'signup' && (
                        <p className="text-xs text-center text-[#64748B] mt-6">
                            By creating an account, you agree to our{' '}
                            <button className="text-[#2563EB] hover:underline">Terms of Service</button>
                            {' '}and{' '}
                            <button className="text-[#2563EB] hover:underline">Privacy Policy</button>
                        </p>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-[#64748B] mt-6">
                    {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                        className="text-[#2563EB] hover:text-[#1d4ed8] font-semibold"
                    >
                        {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
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
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
        </div>
    );
}
