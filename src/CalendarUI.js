import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon, RefreshCw, Activity } from 'lucide-react';

// ✅ Backend base URL (keep in sync with App.js)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

// Theme colors matching your app
const COLORS = {
  profit: '#10B981',
  loss: '#EF4444',
  neutral: '#64748B',
  primary: '#2563EB',
  background: '#FAFAFA',
  border: '#E2E8F0'
};

export default function CalendarUI({ trades = [] }) {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  // trades is now a prop!
  // const [loading, setLoading] = useState(true); // managed by parent or implied

  // Auto-refresh on tab focus - Keeping this just to force re-render if needed, but props should handle it
  // Actually, we don't need refreshTrigger for logic anymore if props drive it.
  // We can keep it simple.

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Mon=0, Sun=6

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const map = {};

    trades.forEach(trade => {
      const dateStr = trade.trade_date || trade.date || trade.created_at;
      if (!dateStr) return;

      const date = new Date(dateStr);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!map[key]) {
        map[key] = {
          trades: [],
          totalPnl: 0,
          wins: 0,
          losses: 0,
          breakevens: 0
        };
      }

      map[key].trades.push(trade);

      // ✅ Fix: Handle Breakeven Logic Consistent with Analytics
      // If manually marked BE or outcome is 'be', treat as 0 PnL
      const isBreakeven = trade.isBreakeven || trade.outcome === 'be';
      const pnl = isBreakeven ? 0 : Number(trade.pnl ?? trade.dollarAmount ?? 0);

      map[key].totalPnl += pnl;

      if (isBreakeven || Math.abs(pnl) < 0.01) {
        map[key].breakevens++;
      } else if (pnl > 0) {
        map[key].wins++;
      } else if (pnl < 0) {
        map[key].losses++;
      }
    });

    return map;
  }, [trades]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];

    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = tradesByDate[dateKey];

      days.push({
        day,
        dateKey,
        isCurrentMonth: true,
        isToday: isToday(year, month, day),
        data: dayData
      });
    }

    // Fill remaining cells
    while (days.length % 7 !== 0) {
      days.push({ day: null, isCurrentMonth: false });
    }

    return days;
  }, [year, month, daysInMonth, startingDayOfWeek, tradesByDate]);

  // Get selected day trades
  const selectedDayData = selectedDate ? tradesByDate[selectedDate] : null;

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayKey);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 p-6 space-y-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">Calendar</div>
          <div className="text-sm text-[#64748B] dark:text-slate-400">
            {trades.length} trades loaded
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 font-semibold hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid + Selected Day Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-bold text-[#171717] dark:text-slate-100">{monthName}</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400">Click a day to see trades</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-5 h-5 text-[#64748B] dark:text-slate-400" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-5 h-5 text-[#64748B] dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-[#64748B] dark:text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayInfo, idx) => (
              <DayCell
                key={idx}
                dayInfo={dayInfo}
                isSelected={selectedDate === dayInfo.dateKey}
                onClick={() => {
                  if (dayInfo.isCurrentMonth && dayInfo.day) {
                    setSelectedDate(dayInfo.dateKey);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Selected Day Panel */}
        <SelectedDayPanel
          selectedDate={selectedDate}
          dayData={selectedDayData}
          onClose={() => setSelectedDate(null)}
        />
      </div>
    </div>
  );
}

// Helper: Check if date is today
function isToday(year, month, day) {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

// Day Cell Component
function DayCell({ dayInfo, isSelected, onClick }) {
  if (!dayInfo.isCurrentMonth || !dayInfo.day) {
    return <div className="h-24" />;
  }

  const { day, isToday, data } = dayInfo;
  const hasTrades = data && data.trades.length > 0;
  const totalPnl = data?.totalPnl ?? 0;
  const isProfitable = totalPnl > 0;
  const isLoss = totalPnl < 0;

  // Determine background color based on P&L
  let bgColor = 'bg-white dark:bg-slate-900';
  let borderColor = 'border-[#E2E8F0] dark:border-slate-800';
  let textColor = 'text-[#171717] dark:text-slate-100';
  let pnlColor = 'text-[#64748B] dark:text-slate-400';

  if (hasTrades) {
    if (isProfitable) {
      bgColor = 'bg-emerald-50 dark:bg-emerald-900/20'; // Light green background for profit
      borderColor = 'border-emerald-200 dark:border-emerald-800/50';
      pnlColor = 'text-emerald-700 dark:text-emerald-400'; // Darker green text
    } else if (isLoss) {
      bgColor = 'bg-red-50 dark:bg-red-900/20'; // Light red background for loss
      borderColor = 'border-red-200 dark:border-red-800/50';
      pnlColor = 'text-red-700 dark:text-red-400'; // Darker red text
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        h-24 rounded-xl border transition-all text-left p-3 relative
        ${isSelected
          ? 'border-[#2563EB] dark:border-blue-500 shadow-md ring-2 ring-[#2563EB] dark:ring-blue-500 ring-opacity-30'
          : borderColor
        }
        ${bgColor}
        ${hasTrades ? 'hover:shadow-md' : 'hover:bg-[#F8FAFC] dark:hover:bg-slate-800'}
        ${isToday ? 'ring-2 ring-[#2563EB] dark:ring-blue-500 ring-opacity-50' : ''}
      `}
    >
      {/* Day number */}
      <div className={`text-sm font-bold ${isToday ? 'text-[#2563EB] dark:text-blue-400' : textColor}`}>
        {day}
      </div>

      {/* Trade info */}
      {hasTrades ? (
        <div className="mt-2 space-y-1">
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1">
            {data.trades.length} <Activity className="w-3 h-3 text-[#64748B] dark:text-slate-400" />
          </div>
          <div className={`text-xs font-bold ${pnlColor}`}>
            ${Math.abs(totalPnl).toFixed(2)}
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <div className="text-[11px] text-[#94A3B8] dark:text-slate-600">-</div>
        </div>
      )
      }

      {/* Today indicator dot */}
      {
        isToday && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-[#2563EB] dark:bg-blue-400 rounded-full" />
        )
      }
    </button >
  );
}

// Selected Day Panel Component
function SelectedDayPanel({ selectedDate, dayData, onClose }) {
  if (!selectedDate) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-[#171717] dark:text-slate-100">Selected Day</div>
            <div className="text-xs text-[#64748B] dark:text-slate-400">No day selected</div>
          </div>
          <CalendarIcon className="w-5 h-5 text-[#64748B] dark:text-slate-400" />
        </div>

        <div className="rounded-2xl border border-dashed border-[#E2E8F0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/50 p-12 text-[#94A3B8] dark:text-slate-500 text-sm text-center">
          Click a day on the calendar to view trades
        </div>
      </div>
    );
  }

  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const totalPnl = dayData?.totalPnl ?? 0;
  const wins = dayData?.wins ?? 0;
  const losses = dayData?.losses ?? 0;
  const breakevens = dayData?.breakevens ?? 0;
  const totalTrades = dayData?.trades?.length ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm font-bold text-[#171717] dark:text-slate-100">{formattedDate}</div>
          <div className="text-xs text-[#64748B] dark:text-slate-400">{totalTrades} {totalTrades === 1 ? 'trade' : 'trades'}</div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-lg transition"
        >
          <svg className="w-4 h-4 text-[#64748B] dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!dayData || totalTrades === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFAFA] p-12 text-[#94A3B8] text-sm text-center">
          No trades on this day
        </div>
      ) : (
        <div className="space-y-4">
          {/* Day Summary */}
          <div className="bg-[#FAFAFA] dark:bg-slate-800/50 rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-800">
            <div className="text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-3">Day Summary</div>

            <div className="space-y-2">
              {/* Total P&L */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B] dark:text-slate-400">Total P&L</span>
                <span className={`text-lg font-bold ${totalPnl > 0 ? 'text-[#10B981] dark:text-emerald-400' : totalPnl < 0 ? 'text-[#EF4444] dark:text-red-400' : 'text-[#64748B] dark:text-slate-400'
                  }`}>
                  {totalPnl > 0 ? '+' : ''}{totalPnl.toFixed(2)}
                </span>
              </div>

              {/* Win/Loss breakdown */}
              <div className="flex items-center gap-4 text-xs pt-2 border-t border-[#E2E8F0] dark:border-slate-700">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#10B981] dark:bg-emerald-400 rounded-full" />
                  <span className="text-[#64748B] dark:text-slate-400">{wins} wins</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#EF4444] dark:bg-red-400 rounded-full" />
                  <span className="text-[#64748B] dark:text-slate-400">{losses} losses</span>
                </div>
                {breakevens > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#64748B] dark:bg-slate-400 rounded-full" />
                    <span className="text-[#64748B] dark:text-slate-400">{breakevens} BE</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trade List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-2">Trades</div>

            {dayData.trades.map((trade, idx) => (
              <TradeCard key={trade.id || idx} trade={trade} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Trade Card Component
function TradeCard({ trade }) {
  const pnl = Number(trade.pnl ?? trade.dollarAmount ?? 0);
  const isProfitable = pnl > 0;
  const isLoss = pnl < 0;
  const instrument = trade.instrument || trade.ticker || trade.symbol || 'Unknown';
  const direction = (trade.direction || trade.side || '').toLowerCase();

  return (
    <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-3 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Direction indicator */}
          <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${direction === 'long'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
            }`}>
            {direction === 'long' ? '↑' : '↓'} {direction || 'Long'}
          </div>

          {/* Instrument */}
          <div className="font-semibold text-sm text-[#171717] dark:text-slate-100">{instrument}</div>
        </div>

        {/* P&L */}
        <div className={`text-sm font-bold ${isProfitable ? 'text-[#10B981] dark:text-emerald-400' : isLoss ? 'text-[#EF4444] dark:text-red-400' : 'text-[#64748B] dark:text-slate-400'
          }`}>
          {isProfitable ? '+' : ''}{pnl.toFixed(2)}
        </div>
      </div>

      {/* Additional info if available */}
      {(trade.session || trade.emotion) && (
        <div className="flex items-center gap-2 mt-2 text-xs text-[#64748B] dark:text-slate-400">
          {trade.session && <span>📍 {trade.session}</span>}
          {trade.emotion && <span>{trade.emotion}</span>}
        </div>
      )}
    </div>
  );
}