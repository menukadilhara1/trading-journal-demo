import React, { useMemo } from "react";

export default function TradingDayPerformance({ data }) {
  // data: [{ day:"Mon", pnl:-34.3 }, ...]
  const bestDay = useMemo(() => {
    if (!data?.length) return null;
    return [...data].sort((a, b) => b.pnl - a.pnl)[0];
  }, [data]);

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-600 dark:text-slate-400">Trading Day Performance</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Best Day: <span className="font-semibold text-slate-900 dark:text-slate-100">{bestDay?.day ?? "-"}</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-6">
        {data.map((d) => {
          const h = Math.round((Math.abs(d.pnl) / maxAbs) * 120) + 40; // 40..160px
          const isProfit = d.pnl >= 0;

          return (
            <div key={d.day} className="flex-1 flex flex-col items-center">
              <div
                className={`w-8 rounded-2xl ${isProfit ? "bg-emerald-500" : "bg-rose-500"}`}
                style={{ height: `${h}px` }}
              />
              <div className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-200">
                {d.pnl < 0 ? "-" : ""}${Math.abs(d.pnl).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{d.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
