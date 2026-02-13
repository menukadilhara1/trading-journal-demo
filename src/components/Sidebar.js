import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    TrendingUp,
    BarChart3,
    Calendar,
    Settings,
    CreditCard,
    X,
    ChevronDown,
    Mail,
    User,
} from 'lucide-react';


export default function Sidebar({ sidebarOpen, setSidebarOpen, trades, stats, onLogout, isLoggingOut, username, displayName, showToast, openConfirm, activePage, onNavigate, exportBackup, restoreBackup, STORAGE_KEY, isPro, onOpenSupport }) {
    const [backupExpanded, setBackupExpanded] = useState(false);

    // Auto-close when sidebar collapses
    useEffect(() => {
        if (!sidebarOpen) setBackupExpanded(false);
    }, [sidebarOpen]);

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden glass-backdrop"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-[#E2E8F0] dark:border-slate-800 flex flex-col transition-all duration-300
                ${sidebarOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'}
                md:sticky md:top-0 md:h-screen w-[260px] ${sidebarOpen ? 'md:w-[260px]' : 'md:w-[84px]'}
            `}>
                <div className="">
                    <div className={`p-6 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
                        <div className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {sidebarOpen && (
                            <div className="flex items-center justify-between flex-1">
                                <h1 className="text-lg font-bold text-[#171717] dark:text-slate-100 tracking-tight whitespace-nowrap">EasyTrade Log</h1>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => { onNavigate("trades"); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
            ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
            ${activePage === 'trades'
                                    ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                    : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <TrendingUp className="w-5 h-5 shrink-0" />
                            {sidebarOpen && <span className="tracking-tight whitespace-nowrap">Trades</span>}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onNavigate("analytics"); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
                ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
                ${activePage === 'analytics'
                                    ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                    : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <BarChart3 className="w-5 h-5 opacity-80 shrink-0" />
                            {sidebarOpen && <span className="font-medium tracking-tight whitespace-nowrap">Analytics</span>}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onNavigate("calendar"); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
            ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
            ${activePage === 'calendar'
                                    ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                    : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Calendar className="w-5 h-5 opacity-80 shrink-0" />
                            {sidebarOpen && <span className="font-medium tracking-tight whitespace-nowrap">Calendar</span>}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onNavigate("journal"); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
            ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
            ${activePage === 'journal'
                                    ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                    : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <BookOpen className="w-5 h-5 opacity-80 shrink-0" />
                            {sidebarOpen && <span className="font-medium tracking-tight whitespace-nowrap">Journal</span>}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                // DEMO RESTRICTION
                                showToast("This feature is disabled in the demo version.");
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
            ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
            ${activePage === 'setting'
                                    ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                    : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Settings className="w-5 h-5 opacity-80 shrink-0" />
                            {sidebarOpen && <span className="font-medium tracking-tight whitespace-nowrap">Settings</span>}
                        </button>
                        {/* <button
                            type="button"
                            onClick={() => { onNavigate("billing"); window.history.pushState({}, '', '/billing'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
            ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
            ${activePage === 'billing'
                                    ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                    : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <CreditCard className="w-5 h-5 opacity-80 shrink-0" />
                            {sidebarOpen && <span className="font-medium tracking-tight whitespace-nowrap">Billing</span>}
                        </button> */}

                        <a
                            href="https://easytradelog.app/join"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all group
            ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
            bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:shadow-blue-500/20`}
                        >
                            <div className="relative">
                                <TrendingUp className="w-5 h-5 shrink-0" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                            </div>
                            {sidebarOpen && <span className="font-bold tracking-tight whitespace-nowrap">Join Waiting List</span>}
                        </a>

                        {/* Backup (expand down) */}
                        <div className="w-full">
                            <button
                                type="button"
                                onClick={() => sidebarOpen && setBackupExpanded((v) => !v)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors
     ${sidebarOpen ? 'justify-start' : 'justify-center'}
      ${backupExpanded
                                        ? 'bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                                        : 'text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <BookOpen className="w-5 h-5 shrink-0" />

                                {sidebarOpen && (
                                    <>
                                        <span className="tracking-tight whitespace-nowrap">Backup</span>

                                        {/* Right-side caret */}
                                        <ChevronDown
                                            className={`ml-auto w-4 h-4 transition-transform ${backupExpanded ? "rotate-180" : ""
                                                }`}
                                        />
                                    </>
                                )}
                            </button>

                            {/* Children */}
                            {sidebarOpen && backupExpanded && (
                                <div className="mt-2 space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => exportBackup(STORAGE_KEY)}
                                        className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-[#64748B] dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                                    >
                                        Export
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => restoreBackup(STORAGE_KEY, { toast: showToast, confirm: openConfirm })}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-between
                                            ${isPro ? 'text-[#64748B] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800' : 'text-gray-400 cursor-not-allowed'}
                                        `}
                                    >
                                        <span>Restore</span>
                                        {!isPro && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pro</span>}
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </nav>

                <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">


                    <button
                        type="button"
                        onClick={onOpenSupport}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm
                            ${sidebarOpen ? 'justify-start' : 'justify-center'}
                            text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                    >
                        <Mail className="w-5 h-5 shrink-0" />
                        {sidebarOpen && <span className="whitespace-nowrap">Support</span>}
                    </button>

                    <button className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
    ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
    bg-white/60 dark:bg-slate-800/40 shadow-sm border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300`}
                    >
                        <User className={`w-5 h-5 shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`} />
                        {sidebarOpen && <span className="font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{displayName || username || 'Account'}</span>}
                    </button>

                    <button
                        onClick={onLogout}
                        disabled={isLoggingOut}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isLoggingOut ? 'text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-slate-800' : 'text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-red-900/20'}`}
                    >
                        {isLoggingOut ? (
                            <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin shrink-0" />
                        ) : (
                            <X className="w-5 h-5 opacity-80 shrink-0" />
                        )}
                        {sidebarOpen && <span className="font-medium tracking-tight whitespace-nowrap">{isLoggingOut ? "Logging out..." : "Logout"}</span>}
                    </button>

                </div>
            </aside>
        </>
    );
}
