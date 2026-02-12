import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    Calendar,
    Filter,
} from 'lucide-react';
import CalendarPopover from './CalendarPopover';

export default function TopBar({
    sidebarOpen,
    setSidebarOpen,
    backendSyncing,
    dateFilter,
    setDateFilter,
    onOpenFilter,
    onCreateAccount,
    accounts,
    activeAccountId,
    onSwitchAccount,
    displayMode,
    onToggleDisplayMode,
    activePage = 'trades', // default
}) {

    const topBarBtn =
        "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 " +
        "text-[#64748B] dark:text-slate-400 hover:text-[#64748B] dark:hover:text-slate-200 transition-all";

    const [calOpen, setCalOpen] = useState(false);

    // Dynamic title map
    const getTitle = () => {
        switch (activePage) {
            case 'trades': return 'Dashboard';
            case 'journal': return 'Journal';
            case 'calendar': return 'Calendar';
            case 'analytics': return 'Analytics';
            case 'setting': return 'Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="min-w-screen bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-3 py-3 flex items-center justify-between transition-colors duration-300"
        >
            {/* LEFT */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setSidebarOpen(v => !v)}
                    className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/70 dark:border-slate-700/50 shadow-sm
               flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition"
                    aria-label="Toggle sidebar"
                    type="button"
                >
                    {sidebarOpen ? (
                        <ChevronLeft className="w-5 h-5" />
                    ) : (
                        <ChevronRight className="w-5 h-5" />
                    )}
                </button>

                <h1 className="text-lg font-bold text-[#171717] dark:text-slate-100">{getTitle()}</h1>
            </div>

            {/* RIGHT (everything grouped together) */}
            <div className="flex items-center gap-2">
                {backendSyncing && (
                    <div className="px-3 py-1 rounded-full text-xs font-semibold border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#64748B] dark:text-slate-400">
                        Syncing…
                    </div>
                )}

                {/* Account group */}
                <div className="flex items-center gap-1 mr-2">
                    <button
                        onClick={onCreateAccount}
                        className={topBarBtn}
                        type="button"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Account
                    </button>

                    <select
                        value={activeAccountId || ''}
                        onChange={(e) => onSwitchAccount(e.target.value)}
                        className="px-4 py-2 min-w-[100px] max-w-[160px] rounded-xl text-sm font-medium
              bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700
              text-[#64748B] dark:text-slate-400 hover:text-[#64748B]
              shadow-sm focus:outline-none truncate "
                    >
                        {(accounts || []).map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div className="relative">
                    <button
                        onClick={() => setCalOpen(v => !v)}
                        className={`
            px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2
            transition-all
            ${calOpen ? 'bg-white dark:bg-slate-800 text-[#171717] dark:text-slate-100 shadow-sm' : 'text-[#64748B] dark:text-slate-400 hover:text-[#64748B]'}
          `}
                        type="button"
                    >
                        <Calendar className="w-4 h-4" />
                        Date
                    </button>

                    {calOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setCalOpen(false)} />
                            <div className="relative z-50">
                                <CalendarPopover
                                    value={dateFilter}
                                    onChange={setDateFilter}
                                    onClose={() => setCalOpen(false)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Filter */}
                <button
                    onClick={onOpenFilter}
                    className={topBarBtn}
                    type="button"
                >
                    <Filter className="w-4 h-4" />
                    Filter
                </button>

                {/* P&L / R */}
                <button
                    onClick={onToggleDisplayMode}
                    className="px-4 py-2 rounded-xl text-sm font-semibold
               bg-white dark:bg-slate-800 text-[#64748B] dark:text-slate-300 shadow-sm flex items-center gap-2"
                    type="button"
                >
                    {displayMode === 'pnl' ? '💵 P&L' : '📊 R'}
                </button>
            </div>
        </div>
    );
}
