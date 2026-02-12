import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function QuickPnLChart({ data = [], initialBalance = 0 }) {
  // Transform data to show actual balance
  // Note: data[].cumulativePnl is ALREADY cumulative from AnalyticsUI

  const balanceData = data.map((d, index) => ({
    index, // Unique key for Recharts
    date: d.date,
    balance: (Number(initialBalance) || 0) + (Number(d.cumulativePnl) || 0),
    tradePnl: Number(d.tradePnl) || 0,  // Individual trade PnL for tooltip
    instrument: d.instrument || 'Unknown'
  }));

  // ... calculateYDomain stays the same ...
  const calculateYDomain = () => {
    if (balanceData.length === 0) {
      // If no data, show a range around initial balance
      const padding = Math.max(initialBalance * 0.02, 50);
      return [
        initialBalance - padding,
        initialBalance + padding
      ];
    }

    // Filter out invalid balances (NaN, Infinity, null, undefined)
    const validBalances = balanceData
      .map(d => d.balance)
      .filter(b => Number.isFinite(b));

    if (validBalances.length === 0) {
      // No valid data, fallback to initial balance range
      const padding = Math.max(initialBalance * 0.02, 50);
      return [
        initialBalance - padding,
        initialBalance + padding
      ];
    }

    const minBalance = Math.min(...validBalances);
    const maxBalance = Math.max(...validBalances);

    // Add padding for better visualization
    // For small ranges, use a minimum range to make changes visible
    const range = maxBalance - minBalance;
    const minRange = Math.max(initialBalance * 0.01, 100); // At least 1% of balance or $100
    const effectiveRange = Math.max(range, minRange);
    const padding = effectiveRange * 0.1; // 10% padding

    return [
      minBalance - padding,
      maxBalance + padding
    ];
  };

  const [yMin, yMax] = calculateYDomain();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 w-full transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">P&L Overview</h3>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            1M
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            3M
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            YTD
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={balanceData}>
            <XAxis
              dataKey="index"
              axisLine={false}
              tickLine={false}
              tickFormatter={(idx) => balanceData[idx]?.date || ""}
              tick={{ fontSize: 11, fill: document.documentElement.classList.contains('dark') ? "#94a3b8" : "#64748b" }}
            />

            <YAxis
              domain={[yMin, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: document.documentElement.classList.contains('dark') ? "#94a3b8" : "#64748b" }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />

            <Tooltip
              cursor={{ stroke: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0', strokeWidth: 1 }}
              wrapperStyle={{ zIndex: 1000 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;

                const dataPoint = payload[0].payload; // Get the full data point
                const balance = dataPoint.balance;
                const tradePnl = dataPoint.tradePnl;
                const instrument = dataPoint.instrument;

                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-3 min-w-[160px]">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{instrument}</p>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">This Trade</p>
                        <p className={`text-lg font-bold ${tradePnl > 0 ? 'text-green-600 dark:text-emerald-400' : tradePnl < 0 ? 'text-red-600 dark:text-rose-400' : 'text-slate-500'}`}>
                          {tradePnl > 0 ? '+' : ''}${Number(tradePnl).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Balance After</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          ${Number(balance).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Reference line at initial balance */}
            <ReferenceLine
              y={initialBalance}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />

            {/* Area with dots on the line */}
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="none"
              dot={{ fill: '#2563eb', r: 4 }}
              activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}