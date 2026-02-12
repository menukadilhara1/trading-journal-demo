import React from "react";

export default function SessionWinRates({ sessions }) {
  // sessions: [{ name:"New York", winRate:36 }, ...]
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-6">Session Win Rates</div>

      <div className="space-y-6">
        {sessions.map((s) => (
          <div key={s.name} className="flex items-center gap-6">
            <div className="w-24 font-semibold text-slate-900 dark:text-slate-200">{s.name}</div>

            <div className="flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, s.winRate))}%` }}
                />
                {/* knob */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black dark:bg-white"
                  style={{ left: `calc(${Math.max(0, Math.min(100, s.winRate))}% - 6px)` }}
                />
              </div>
            </div>

            <div className="w-16 text-right font-semibold text-slate-900 dark:text-slate-200">
              {Number(s.winRate).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
