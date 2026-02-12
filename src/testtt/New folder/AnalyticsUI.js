import React from "react";

export default function AnalyticsUI() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">Analytics</div>
          <div className="text-sm text-gray-500">
            Overview of your trading performance
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
          >
            Export
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500 mb-1">
              Date range
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold"
              >
                Week
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
              >
                Month
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
              >
                Custom
              </button>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500 mb-1">
              Instrument
            </div>
            <div className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white">
              All
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500 mb-1">
              Session
            </div>
            <div className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white">
              All
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total trades" value="-" sub="-"/>
        <KpiCard title="Win rate" value="-" sub="-"/>
        <KpiCard title="Net P&L" value="-" sub="-"/>
        <KpiCard title="Avg R" value="-" sub="-"/>
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity curve placeholder */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-gray-900">Equity curve</div>
              <div className="text-xs text-gray-500">Cumulative performance</div>
            </div>
            <div className="text-xs text-gray-500">PnL</div>
          </div>

          <div className="h-56 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
            Chart placeholder
          </div>
        </div>

        {/* Breakdown placeholder */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-gray-900">Breakdown</div>
              <div className="text-xs text-gray-500">Session / instrument</div>
            </div>
            <div className="text-xs text-gray-500">View</div>
          </div>

          <div className="space-y-3">
            <MiniRow label="Tokyo" value="-" />
            <MiniRow label="London" value="-" />
            <MiniRow label="New York" value="-" />
            <div className="h-28 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
              Mini chart placeholder
            </div>
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="text-sm font-bold text-gray-900">Recent trades</div>
          <div className="text-xs text-gray-500">
            Latest activity (UI only for now)
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-gray-400 text-sm flex items-center justify-center">
            Table placeholder
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-5">
      <div className="text-xs font-semibold text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function MiniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700 font-semibold">{label}</div>
      <div className="text-sm text-gray-900 font-bold">{value}</div>
    </div>
  );
}
