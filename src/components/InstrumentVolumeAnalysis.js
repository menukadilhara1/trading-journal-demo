import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export default function InstrumentVolumeAnalysis({ data }) {
  // Check if we have real data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-sm text-slate-600 mb-4">
          Instrument Volume Analysis
        </div>
        <div className="flex items-center justify-center h-[220px]">
          <div className="text-center text-slate-400">
            <p className="text-sm">No trading data available</p>
            <p className="text-xs mt-1">Start adding trades to see volume analysis</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Dynamic height: space per bar
  const rowHeight = 52; // spacing per value
  const minHeight = 220;
  const chartHeight = Math.max(
    minHeight,
    data.length * rowHeight
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Instrument Volume Analysis
      </div>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barSize={18}
            barCategoryGap={20} // space between bars
            margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:opacity-10" />
            <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" />

            <XAxis
              dataKey="instrument"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
            />

            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(v) => Number(v).toFixed(2)}
            />

            <Bar
              dataKey="volume"
              fill="#2563EB"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
