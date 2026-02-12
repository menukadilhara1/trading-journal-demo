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

/* =========================
   Custom Bar Shapes
========================= */
function LossBarShape({ x, y, width, height, fill }) {
  const w = Math.abs(width);
  const startX = width >= 0 ? x : x - w;
  const r = Math.min(6, height / 2);

  return (
    <path
      d={`
        M ${startX + r} ${y}
        H ${startX + w}
        V ${y + height}
        H ${startX + r}
        Q ${startX} ${y + height} ${startX} ${y + height - r}
        V ${y + r}
        Q ${startX} ${y} ${startX + r} ${y}
        Z
      `}
      fill={fill}
    />
  );
}

function ProfitBarShape({ x, y, width, height, fill }) {
  const w = Math.abs(width);
  const startX = width >= 0 ? x : x - w;
  const r = Math.min(6, height / 2);

  return (
    <path
      d={`
        M ${startX} ${y}
        H ${startX + w - r}
        Q ${startX + w} ${y} ${startX + w} ${y + r}
        V ${y + height - r}
        Q ${startX + w} ${y + height} ${startX + w - r} ${y + height}
        H ${startX}
        Z
      `}
      fill={fill}
    />
  );
}

/* =========================
   Component
========================= */
export default function InstrumentProfitAnalysis({ data }) {
  // Check if we have real data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Instrument Profit Analysis
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Losses (left) vs Profits (right)
        </div>
        <div className="flex items-center justify-center h-[240px]">
          <div className="text-center text-slate-400 dark:text-slate-500">
            <p className="text-sm">No trading data available</p>
            <p className="text-xs mt-1">Start adding trades to see analysis</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert losses to negative values
  const chartData = data.map((d) => ({
    instrument: d.instrument,
    profit: d.profit,
    loss: -Math.abs(d.loss),
  }));

  const maxAbs = Math.max(
    1,
    ...chartData.flatMap((d) => [
      Math.abs(d.profit),
      Math.abs(d.loss),
    ])
  );

  const paddedMax = Math.ceil(maxAbs * 1.25);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 transition-colors">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Instrument Profit Analysis
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Losses (left) vs Profits (right)
      </div>

      <div style={{ height: Math.max(240, chartData.length * 52) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            barCategoryGap={24}
            margin={{ top: 10, right: 32, bottom: 10, left: 32 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:opacity-10" />
            <ReferenceLine x={0} stroke="#94A3B8" />

            {/* Instruments */}
            <YAxis
              dataKey="instrument"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              width={80}
            />

            {/* Profit / Loss Axis */}
            <XAxis
              type="number"
              domain={[-paddedMax, paddedMax]}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                if (v === 0) return "0";
                return v < 0
                  ? `-$${Math.abs(v).toLocaleString()}`
                  : `$${v.toLocaleString()}`;
              }}
              tick={{ fontSize: 11, fill: "#64748B" }}
            />

            <Tooltip
              formatter={(value, name) => [
                `$${Math.abs(value).toLocaleString()}`,
                name === "loss" ? "Loss" : "Profit",
              ]}
              labelFormatter={(label) => `Instrument: ${label}`}
            />

            {/* Loss (Left) */}
            <Bar
              dataKey="loss"
              fill="#EF4444"
              barSize={8}
              shape={<LossBarShape />}
            />

            {/* Profit (Right) */}
            <Bar
              dataKey="profit"
              fill="#10B981"
              barSize={8}
              shape={<ProfitBarShape />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
