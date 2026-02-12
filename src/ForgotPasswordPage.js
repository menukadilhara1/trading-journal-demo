import React, { useState } from 'react';
import { Mail, ArrowLeft, TrendingUp } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            // Ensure CSRF cookie
            await fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: 'include' });

            // Get CSRF
            const getCookie = (name) => {
                const parts = document.cookie.split("; ").map(v => v.split("="));
                const found = parts.find(([k]) => k === name);
                return found ? decodeURIComponent(found[1] || "") : "";
            };
            const xsrf = getCookie("XSRF-TOKEN");

            const res = await fetch(`${API_BASE}/api/forgot-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf || '',
                },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                // validation errors
                throw new Error(data.message || data.errors?.email?.[0] || 'Something went wrong');
            }

            setStatus('success');
            setMessage(data.message || data.status || 'Password reset link sent!');
        } catch (err) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#FAFAFA] to-[#F1F5F9] flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4 text-[#2563EB]">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">Reset Password</h2>
                        <p className="text-[#64748B] mt-1 text-sm">Enter your email and we'll send you a link.</p>
                    </div>

                    {status === 'success' ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm border border-green-200">
                                {message}
                            </div>
                            <p className="text-sm text-[#64748B]">
                                Check your inbox (and spam folder).
                            </p>
                            <a href="/" className="inline-block text-[#2563EB] font-semibold text-sm hover:underline">
                                Back to Login
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
                                <label className="block text-sm font-semibold text-[#171717] mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-3 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-[#1E293B] transition-all disabled:opacity-50"
                            >
                                {status === 'loading' ? 'Sending Link...' : 'Send Reset Link'}
                            </button>

                            <div className="text-center mt-4">
                                <a href="/" className="inline-flex items-center text-sm text-[#64748B] hover:text-[#0F172A] transition">
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
                                </a>
                            </div>
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
                .animation-delay-2000 {
                animation-delay: 2s;
                }
            `}</style>
        </div>
    );
}
