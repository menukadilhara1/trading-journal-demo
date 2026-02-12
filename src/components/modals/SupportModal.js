import React from 'react';
import { X, Mail, ExternalLink, MessageSquare } from 'lucide-react';

export default function SupportModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const supportEmail = "easytradelog.noreply@gmail.com";
    const subject = encodeURIComponent("Support Request - EasyTradeLog");
    const body = encodeURIComponent("Hi Support,\n\nI need help with:\n\nThanks!");

    const handleSystemMail = () => {
        window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
        onClose();
    };

    const handleGmail = () => {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=${subject}&body=${body}`;
        window.open(gmailUrl, "_blank", "noopener,noreferrer");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Contact Us</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred method</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                    <button
                        onClick={handleGmail}
                        className="flex items-center justify-between w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <span className="text-red-600 dark:text-red-400 font-bold text-lg">G</span>
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-slate-900 dark:text-white">Open Gmail</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Best for browser users</div>
                            </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                    </button>

                    <button
                        onClick={handleSystemMail}
                        className="flex items-center justify-between w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-slate-900 dark:text-white">Email App</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Outlook, Apple Mail, etc.</div>
                            </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                        Response time: ~24 hours
                    </p>
                </div>
            </div>
        </div>
    );
}
