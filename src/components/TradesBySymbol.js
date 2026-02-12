import React from "react";

export default function TradesBySymbol({ data = [] }) {
  const sortedData = [...data].sort((a, b) => b.pnl - a.pnl);
  const maxPnl = Math.max(1, ...sortedData.map((d) => Math.abs(d.pnl)));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 w-full transition-colors">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Trades by Symbol
      </h3>

      <div className="space-y-3">
        {sortedData.map((item) => {
          const isProfit = item.pnl >= 0;

          return (
            <div key={item.symbol} className="flex items-center gap-4">
              {/* Symbol */}
              <span className="w-14 text-sm font-medium text-slate-900 dark:text-slate-100">
                {item.symbol}
              </span>

              {/* Bar */}
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isProfit ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  style={{
                    width: `${(Math.abs(item.pnl) / maxPnl) * 100}%`,
                  }}
                />
              </div>

              {/* Value */}
              <span
                className={`w-24 text-right text-sm font-medium ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
              >
                {isProfit ? "+" : "-"}${Math.abs(item.pnl).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
