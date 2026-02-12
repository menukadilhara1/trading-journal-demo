import React from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDotStyle = (value) => {
  if (value === 0) return "bg-amber-400"; // Changed to amber/yellow for better visibility
  if (value > 0) {
    if (value > 400) return "bg-emerald-500";
    if (value > 200) return "bg-emerald-400";
    return "bg-emerald-300";
  } else {
    if (value < -150) return "bg-rose-500";
    return "bg-rose-400";
  }
};

function WeeklySummaryCard({ weeklySummary = [] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 h-full transition-colors">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Weekly Summary
      </h3>

      <div className="space-y-4">
        {weeklySummary.map((w) => {
          const isLoss = w.pnl < 0;
          return (
            <div key={w.week} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{w.week}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{w.range}</div>
                </div>

                <div
                  className={`font-semibold ${isLoss ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                >
                  {isLoss ? "-" : "+"}${Math.abs(w.pnl).toFixed(2)}
                </div>
              </div>

              <div className="text-sm text-slate-500 dark:text-slate-400 mt-3">Days: {w.days}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WeeklyHeatmap({ weeks = [] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 w-full transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Weekly Heatmap</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Mon–Sun</p>
      </div>

      <div className="space-y-4">
        {/* Day headers */}
        <div className="flex gap-3">
          <div className="w-16" />
          {days.map((day) => (
            <div key={day} className="flex-1 text-xs text-slate-500 dark:text-slate-400 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {weeks.map((week) => {
          return (
            <div key={week.week} className="flex gap-3 items-center">
              <div className="w-16 text-xs text-slate-500 dark:text-slate-400">{week.week}</div>

              {days.map((_, dayIndex) => {
                const rawValue = week?.data?.[dayIndex];

                // Three states:
                // null = future day (disabled)
                // undefined = past day with no trade (show as empty/disabled)
                // number (including 0) = has trade data

                const isFutureDay = rawValue === null;
                const hasNoTrade = rawValue === undefined;
                const isDisabled = isFutureDay || hasNoTrade;
                const value = typeof rawValue === 'number' ? rawValue : 0;

                return (
                  <div key={dayIndex} className="flex-1 flex justify-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center group relative transition-all ${isDisabled
                          ? "bg-slate-100 dark:bg-slate-800 opacity-40 cursor-not-allowed"
                          : getDotStyle(value)
                        }`}
                    >
                      {/* Tooltip - only show for days with actual trade data */}
                      {!isDisabled && (
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-9 left-1/2 -translate-x-1/2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded-md whitespace-nowrap shadow-sm transition-opacity z-10">
                          {value > 0 ? "+" : ""}${value}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Breakeven</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Profit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { WeeklySummaryCard };