import React from 'react';
import { Target, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export default function FundedStatsCards({ currentBalance, startingBalance }) {
    // Mock simulation logic for the demo
    // Assuming a standard $100k challenge logic scaled to whatever the user's balance is
    const initialBalance = startingBalance || 100000;
    const isPass = currentBalance >= initialBalance * 1.10;
    const isFail = currentBalance <= initialBalance * 0.90; // Max drawdown hit

    // 1. Account Balance
    const totalPnl = currentBalance - initialBalance;

    // 2. Daily Drawdown (Mock: Randomly generated or static for consistency)
    // In a real app, this would be calculated from the daily starting balance.
    // For demo: Assume we are "safe" but have some exposure.
    const maxDailyLoss = initialBalance * 0.05; // 5%
    const currentDailyLoss = Math.abs(Math.min(0, totalPnl * 0.2)); // Fake some daily fluctuation
    const dailyDrawdownPct = (currentDailyLoss / maxDailyLoss) * 100;

    // 3. Max Drawdown
    const maxLoss = initialBalance * 0.10; // 10%
    const currentDrawdown = Math.max(0, initialBalance - currentBalance);
    const maxDrawdownPct = (currentDrawdown / maxLoss) * 100;

    // 4. Profit Target
    const profitTarget = initialBalance * 0.10; // 10% (e.g. $10k)
    const currentProfit = Math.max(0, currentBalance - initialBalance);
    const profitTargetPct = Math.min(100, (currentProfit / profitTarget) * 100);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 pt-6 gap-6 px-6">

            {/* 1. EQUITY / BALANCE */}
            <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 flex flex-col hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Current Equity
                </p>
                <p className={`text-3xl font-bold tracking-tight mb-1 ${currentBalance >= initialBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                    ${currentBalance.toLocaleString()}
                </p>
                <div className="mt-auto">
                    <p className="text-xs text-gray-400">
                        Initial: ${initialBalance.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* 2. DAILY DRAWDOWN */}
            <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 flex flex-col hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Daily Loss Limit
                    </p>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ${currentDailyLoss.toLocaleString()} / ${maxDailyLoss.toLocaleString()}
                    </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${dailyDrawdownPct > 80 ? 'bg-red-500' : 'bg-orange-400'}`}
                        style={{ width: `${Math.min(100, dailyDrawdownPct)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-auto flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Max 5% Daily
                </p>
            </div>

            {/* 3. MAX DRAWDOWN */}
            <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 flex flex-col hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Max Drawdown
                    </p>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ${currentDrawdown.toLocaleString()} / ${maxLoss.toLocaleString()}
                    </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${maxDrawdownPct > 80 ? 'bg-red-600' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, maxDrawdownPct)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-auto flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Max 10% Total
                </p>
            </div>

            {/* 4. PROFIT TARGET */}
            <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 flex flex-col hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Profit Target
                    </p>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ${currentProfit.toLocaleString()} / ${profitTarget.toLocaleString()}
                    </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500 relative"
                        style={{ width: `${profitTargetPct}%` }}
                    >
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-white/20" />
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-auto flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Target: 10%
                </p>
            </div>
        </div>
    );
}
