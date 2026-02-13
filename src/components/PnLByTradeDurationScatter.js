import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export default function PnLByTradeDurationScatter({ points = [] }) {

  // points: [{ durationMin: 12.5, pnl: -34 }, ...]
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">PnL by Trade Duration</div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:opacity-10" />
            <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" />

            <XAxis
              dataKey="durationMin"
              type="number"
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={{ stroke: '#E2E8F0', strokeOpacity: 0.5 }}
              name="Duration (min)"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              dataKey="pnl"
              type="number"
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={{ stroke: '#E2E8F0', strokeOpacity: 0.5 }}
              name="PnL"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              itemStyle={{ fontSize: '12px' }}
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(v, n) => {
                const label = String(n || "").toLowerCase();
                if (label.includes("pnl")) {
                  return [`$${Number(v).toFixed(2)}`, "PnL"];
                }
                return [`${Number(v).toFixed(1)} min`, "Duration"];
              }}
            />


            <Scatter
              data={points.filter((p) => p.pnl >= 0)}
              fill="#10B981"
              name="Profit"
            />
            <Scatter
              data={points.filter((p) => p.pnl < 0)}
              fill="#EF4444"
              name="Loss"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
