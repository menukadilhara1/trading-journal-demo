import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

export default function WaitingListModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if we've already shown it this session to avoid annoyance
        const hasShown = sessionStorage.getItem('waitingListShown');
        if (!hasShown) {
            // Small delay for better UX
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('waitingListShown', 'true');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">

                {/* Decorative background gradient */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-blue-600 to-violet-600 opacity-10" />

                {/* Close button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors z-10"
                >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>

                <div className="p-8 pt-10 text-center relative z-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/40 dark:to-violet-900/40 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-50 dark:border-blue-800/30">
                        <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                        Join the Revolution
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                        Get early access to advanced AI analytics, automated journaling, and pro features. Join our exclusive waiting list today.
                    </p>

                    <a
                        href="https://easytradelog.app/join"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex w-full items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 group"
                    >
                        <span>Join Waiting List</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}
