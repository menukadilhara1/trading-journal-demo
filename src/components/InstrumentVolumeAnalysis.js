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
  // Fallback mock data if empty OR if the incoming data looks empty (e.g. only 0 volumes)
  const hasValidData = data && data.length > 0 && data.some(d => (d.volume || 0) > 0);

  const chartData = hasValidData ? data : [
    { instrument: "EURUSD", volume: 15 },
    { instrument: "GBPUSD", volume: 12 },
    { instrument: "NAS100", volume: 25 },
    { instrument: "US30", volume: 18 },
    { instrument: "XAUUSD", volume: 8 },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors h-[350px] flex flex-col">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 flex-none">
        Instrument Volume Analysis
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
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
