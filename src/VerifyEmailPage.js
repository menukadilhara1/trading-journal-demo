import React, { useState } from "react";
import { Mail, CheckCircle, LogOut, RefreshCw } from "lucide-react";

// IMPORTANT:
// In production set REACT_APP_API_BASE=https://api.easytradelog.app/api
const API_BASE_RAW = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const API_BASE = API_BASE_RAW.replace(/\/$/, "").endsWith("/api")
    ? API_BASE_RAW.replace(/\/$/, "")
    : `${API_BASE_RAW.replace(/\/$/, "")}/api`;

// --- helpers ---
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
}

// If API_BASE ends with /api, csrf endpoint is on the same host WITHOUT /api
function apiHostOnly() {
    return API_BASE.replace(/\/api\/?$/, "");
}

async function ensureCsrfCookie() {
    await fetch(`${apiHostOnly()}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
    });
}

export default function VerifyEmailPage({ user, onLogout }) {
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");

    // Check if user just verified (redirected from backend with ?verified=1)
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('verified') === '1') {
            // User just verified - force page reload to get fresh user session
            // Remove the query param to prevent reload loop
            window.history.replaceState({}, '', '/');
            window.location.reload();
        }
    }, []);

    const handleResend = async () => {
        setStatus("loading");
        setMessage("");

        try {
            // 1) Must get fresh CSRF cookies
            await ensureCsrfCookie();

            // 2) Must send X-XSRF-TOKEN header (DECODED)
            const xsrf = decodeURIComponent(getCookie("XSRF-TOKEN") || "");

            const res = await fetch(`${API_BASE}/email/verification-notification`, {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-XSRF-TOKEN": xsrf,
                },
                body: JSON.stringify({}), // keeps some setups happier with POST
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 409) {
                setStatus("verified");
                return;
            }

            if (!res.ok) {
                throw new Error(data?.message || `Failed (${res.status})`);
            }

            setStatus("sent");
            setMessage("Verification link sent! Check your inbox.");
        } catch (err) {
            setStatus("error");
            setMessage(err?.message || "Failed to send verification email");
        }
    };

    if (status === "verified" || user?.email_verified_at) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50">
                <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Email Verified!</h2>
                    <p className="text-gray-600 mt-2">Thank you for verifying your email.</p>
                    <a
                        href="/"
                        className="inline-block mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#FAFAFA] to-[#F1F5F9] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-[#2563EB]" />
                </div>

                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Verify your email</h2>
                <p className="text-[#64748B] mb-6">
                    We sent a verification link to{" "}
                    <span className="font-semibold text-[#171717]">{user?.email}</span>.
                    <br />
                    Please click the link to confirm your account.
                </p>

                {status === "sent" && (
                    <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
                        {message}
                    </div>
                )}
                {status === "error" && (
                    <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
                        {message}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleResend}
                        disabled={status === "loading" || status === "sent"}
                        className="w-full py-3 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-[#1E293B] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {status === "loading" && <RefreshCw className="w-4 h-4 animate-spin" />}
                        {status === "sent" ? "Link Sent" : "Resend Verification Email"}
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full py-3 text-[#64748B] hover:text-[#0F172A] font-semibold text-sm flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}
