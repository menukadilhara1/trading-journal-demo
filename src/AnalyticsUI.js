import React, { useEffect, useMemo, useState } from "react";

import { Download, RefreshCw, TrendingUp, TrendingDown, Calendar, Target, BarChart2, Activity, X, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import QuickPnLChart from "./components/QuickPnLChart";
import WeeklyHeatmap, { WeeklySummaryCard } from "./components/WeeklyHeatmap";
import TradesBySymbol from "./components/TradesBySymbol";
import MoodCorrelation from "./components/MoodCorrelation";
import TradingDayPerformance from "./components/TradingDayPerformance";
import SessionWinRates from "./components/SessionWinRates";
import PnLByTradeDurationScatter from "./components/PnLByTradeDurationScatter";
import InstrumentProfitAnalysis from "./components/InstrumentProfitAnalysis";
import InstrumentVolumeAnalysis from "./components/InstrumentVolumeAnalysis";
import ChartSkeleton from './components/ui/ChartSkeleton';
import { getMoodHex } from './constants/moods';






// ✅ Backend base URL (keep in sync with App.js)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

// =========================
// Helpers (backend payload)
// =========================

// ✅ Maps local trade object -> backend payload (includes optional analytics fields)


// Chart colors matching your theme
const COLORS = {
  profit: '#10B981',
  loss: '#EF4444',
  neutral: '#64748B',
  primary: '#2563EB',
  background: '#FAFAFA',
  border: '#E2E8F0'
};
// =========================
// Helpers (backend payload)
// =========================
function toNumOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}





export default function AnalyticsUI({ isActive, startingBalance = 0, trades: propTrades = [], isLoading }) {
  // Custom Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customRange, setCustomRange] = useState({ start: null, end: null });
  const [tempCustomRange, setTempCustomRange] = useState({ start: "", end: "" });

  const [dateRange, setDateRange] = useState('week');

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [instrumentFilter, setInstrumentFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");

  // ✅ USE PROP TRADES (Source of truth from App.js)
  const trades = propTrades;

  // ✅ FIX: Add refresh trigger to reload data without full page refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ✅ FIX: Auto-refresh when user switches back to this tab/page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh data
        setRefreshTrigger(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for trade changes from other pages
  useEffect(() => {
    const handleTradeChange = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('trades:changed', handleTradeChange);

    return () => {
      window.removeEventListener('trades:changed', handleTradeChange);
    };
  }, []);

  // Refresh when Analytics page becomes active
  useEffect(() => {
    if (isActive) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [isActive]);

  // =========================
  // Trade field normalizer
  // =========================
  function normalizeTrade(t) {
    // Try many common field names so it works with minimal tweaking.
    const instrument = (t.instrument ?? t.ticker ?? t.symbol ?? "Unknown").toString();
    const session = (t.session ?? t.market_session ?? t.trade_session ?? "").toString().trim();

    const directionRaw = (t.direction ?? t.side ?? t.trade_direction ?? "").toString().toLowerCase();
    const direction =
      directionRaw === "long" || directionRaw === "buy"
        ? "long"
        : directionRaw === "short" || directionRaw === "sell"
          ? "short"
          : "";

    // pnl: allow numeric or string
    // pnl: allow numeric or string, but DO NOT default to 0 (0 is a real number)
    const pnlRaw = t.pnl ?? t.dollarAmount ?? t.profit ?? t.net_pnl ?? t.result_amount ?? t.p_and_l ?? t.pl ?? null;

    let pnlNum = null;
    if (pnlRaw !== null && pnlRaw !== undefined && pnlRaw !== "") {
      const n = Number(pnlRaw);
      pnlNum = Number.isFinite(n) ? n : null;
    }

    // If pnl is missing, try to infer outcome from "result" (win/loss/breakeven)
    const resultRaw = (t.result ?? t.outcome ?? t.trade_result ?? "").toString().toLowerCase();

    // ✅ Priority check: explicit isBreakeven flag (from App.js local state)
    let outcome = "";
    if (t.isBreakeven === true) {
      outcome = "be";
    } else {
      outcome =
        resultRaw.includes("win") ? "win" :
          resultRaw.includes("loss") ? "loss" :
            resultRaw.includes("be") || resultRaw.includes("break") ? "be" :
              "";
    }

    // ✅ If Breakeven, force PnL to 0 for all charts/stats
    if (outcome === 'be') {
      pnlNum = 0;
    }

    const lotsNum = Number(t.lots ?? t.volume ?? t.qty ?? t.quantity ?? 0);

    // duration (minutes) best-effort
    const durationMin = Number(t.durationMin ?? t.duration_min ?? t.duration ?? 0);

    // emotion label (string)
    const emotionRaw = (t.emotion ?? t.mood ?? t.feeling ?? "").toString();
    // ✅ Normalize emotion: lowercase, trim, remove emojis if needed (or keep them but normalize)
    // We'll keep emojis but trimming is key.
    const emotion = emotionRaw.trim().toLowerCase();

    // date
    // ✅ Heatmap must use the REAL trade date only.
    // Do NOT fallback to created_at, otherwise old trades "leak" into this week.
    // App.js uses 'date' (YYYY-MM-DD string) or 'startDateTime'
    const rawDate = t.date ?? t.trade_date ?? t.tradeDate ?? t.startDateTime ?? null;

    let dateObj = null;
    if (rawDate) {
      // If it's already a Date object, use it
      if (rawDate instanceof Date) {
        dateObj = isNaN(rawDate.getTime()) ? null : rawDate;
      } else {
        // Parse string date (handles YYYY-MM-DD, ISO strings, etc.)
        const parsed = new Date(rawDate);
        dateObj = isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    // ✅ Duration calc: if durationMin is missing, try to calc from start/end times
    let calculatedDuration = Number(t.durationMin ?? t.duration_min ?? t.duration ?? 0);
    if (!calculatedDuration && t.startDateTime && t.endDateTime) {
      const start = new Date(t.startDateTime);
      const end = new Date(t.endDateTime);
      if (!isNaN(start) && !isNaN(end)) {
        const diffMs = end - start;
        calculatedDuration = Math.round(diffMs / 60000); // ms to minutes
      }
    }

    return {
      instrument,
      session,
      direction,
      pnl: pnlNum,       // null means "unknown"
      outcome,           // win/loss/be or ""
      lots: Number.isFinite(lotsNum) ? lotsNum : 0,
      durationMin: Number.isFinite(calculatedDuration) ? calculatedDuration : 0,
      emotion,
      date: dateObj,
    };
  }

  const normalizedTrades = useMemo(() => trades.map(normalizeTrade), [trades]);

  const debugSample = useMemo(() => {
    const raw = trades.slice(0, 3);
    const norm = normalizedTrades.slice(0, 3);
    return { raw, norm };
  }, [trades, normalizedTrades]);

  // ✅ Dynamic Filters: Derive unique Instruments and Sessions from actual data
  const uniqueInstruments = useMemo(() => {
    const set = new Set(normalizedTrades.map(t => t.instrument).filter(Boolean));
    return Array.from(set).sort();
  }, [normalizedTrades]);

  const uniqueSessions = useMemo(() => {
    const set = new Set(normalizedTrades.map(t => t.session).filter(Boolean));
    return Array.from(set).sort();
  }, [normalizedTrades]);

  // Helper function to get date range filter
  const getDateRangeFilter = (range) => {
    const now = new Date();
    // Normalize "today" to end of day for inclusive comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (range) {
      case 'week': {
        // Last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        return (date) => {
          if (!date) return false;
          const d = new Date(date);
          return d >= weekAgo && d <= today;
        };
      }

      case 'month': {
        // Current calendar month (1st to today)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return (date) => {
          if (!date) return false;
          const d = new Date(date);
          return d >= startOfMonth && d <= today;
        };
      }

      case 'custom': {
        // If no custom range set, show all or default to month?
        // Let's safe default to "show all" if invalid, but user will set it via modal.
        if (!customRange.start && !customRange.end) return () => true;

        const start = customRange.start ? new Date(customRange.start) : new Date(0); // Epoch
        start.setHours(0, 0, 0, 0);

        const end = customRange.end ? new Date(customRange.end) : new Date(8640000000000000); // Far future
        end.setHours(23, 59, 59, 999);

        return (date) => {
          if (!date) return false;
          const d = new Date(date);
          return d >= start && d <= end;
        };
      }

      default:
        // 'all' or fallback
        return () => true;
    }
  };

  const filteredTrades = useMemo(() => {
    // If range is custom but we are in the process of picking, fallback to all?
    // Actually, stick to current logic.
    const dateFilter = getDateRangeFilter(dateRange);

    return normalizedTrades.filter((t) => {
      const okInstrument = instrumentFilter === "All" ? true : t.instrument === instrumentFilter;
      const okSession = sessionFilter === "All" ? true : t.session === sessionFilter;
      const okDate = dateFilter(t.date);

      return okInstrument && okSession && okDate;
    });
  }, [normalizedTrades, instrumentFilter, sessionFilter, dateRange, customRange]);

  // =========================
  // Analytics calculations
  // =========================
  const stats = useMemo(() => {
    const list = filteredTrades;

    const graded = list.filter(t => t.pnl !== null || t.outcome); // has pnl or outcome label

    // If pnl is available, use it for $ metrics
    const pnlKnown = graded.filter(t => t.pnl !== null && Number.isFinite(t.pnl));

    // ✅ Exclude breakeven trades from Win/Loss counts even if they have PnL
    const wins = pnlKnown.filter(t => t.pnl > 0 && t.outcome !== "be");
    const losses = pnlKnown.filter(t => t.pnl < 0 && t.outcome !== "be");

    // For win-rate, use outcome if pnl is missing
    const winsCount =
      graded.filter(t => (t.pnl !== null ? (t.pnl > 0 && t.outcome !== "be") : t.outcome === "win")).length;

    const lossesCount =
      graded.filter(t => (t.pnl !== null ? (t.pnl < 0 && t.outcome !== "be") : t.outcome === "loss")).length;

    const totalTrades = graded.length; // only graded trades count
    const totalAllTrades = list.length;
    const ungradedTrades = totalAllTrades - totalTrades;


    const sum = (arr) => arr.reduce((a, b) => a + b, 0);

    const totalWinPnl = sum(wins.map(t => t.pnl));
    const totalLossPnlAbs = Math.abs(sum(losses.map(t => t.pnl))); // abs

    const netPnl = totalWinPnl - totalLossPnlAbs; // ✅ Restored missing calc

    const avgWin = wins.length ? totalWinPnl / wins.length : 0;
    const avgLoss = losses.length ? (Math.abs(sum(losses.map(t => t.pnl))) / losses.length) : 0;

    const winRatio = totalTrades ? (winsCount / totalTrades) * 100 : 0;
    const profitFactor = totalLossPnlAbs > 0 ? (totalWinPnl / totalLossPnlAbs) : (wins.length ? 999 : 0);

    // trading days count
    const dayKey = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "unknown";
    const uniqueDays = new Set(list.map(t => dayKey(t.date)));

    const totalLots = sum(list.map(t => t.lots));

    const biggestWin = wins.length ? Math.max(...wins.map(t => t.pnl)) : 0;
    const biggestLoss = losses.length ? Math.abs(Math.min(...losses.map(t => t.pnl))) : 0;

    return {
      totalAllTrades,
      gradedTrades: totalTrades,
      ungradedTrades,
      avgWin,
      winRatio,
      avgLoss,
      profitFactor,
      totalDays: uniqueDays.has("unknown") ? uniqueDays.size - 1 : uniqueDays.size,
      totalTrades,
      totalLots,
      biggestWin,
      biggestLoss,
      netPnl,     // ✅ Return it
      winsCount,  // ✅ Return it (used in win ratio card subtext?)
      lossesCount // ✅ Return it
    };

  }, [filteredTrades]);



  // Direction analysis (long/short)
  const directionData = useMemo(() => {
    const list = filteredTrades;

    const sideStats = (side) => {
      const s = list.filter(t => t.direction === side);
      const wins = s.filter(t => (t.pnl !== null ? t.pnl > 0 : t.outcome === "win"));
      const losses = s.filter(t => (t.pnl !== null ? t.pnl < 0 : t.outcome === "loss"));
      const sum = (arr) => arr.reduce((a, b) => a + b, 0);
      const totalWins = sum(wins.map(t => t.pnl));
      const totalLossesAbs = Math.abs(sum(losses.map(t => t.pnl)));
      const profit = totalWins - totalLossesAbs;

      const totalTrades = s.length;
      const gradedCount = s.filter(t => t.pnl !== null || t.outcome).length;
      const winRate = gradedCount ? (wins.length / gradedCount) * 100 : 0;

      return {
        profit,
        wins: wins.length,
        losses: losses.length,
        winRate,
        totalWins,
        totalLosses: totalLossesAbs,
      };
    };

    const short = sideStats("short");
    const long = sideStats("long");

    const overallTrades = list.length;
    const overallWins = list.filter(t => t.pnl > 0).length;
    const overallLosses = list.filter(t => t.pnl < 0).length;

    return {
      short,
      long,
      overall: {
        totalTrades: overallTrades,
        wins: overallWins,
        losses: overallLosses,
        winRate: overallTrades ? (overallWins / overallTrades) * 100 : 0,
      },
    };
  }, [filteredTrades]);

  // Scatter: duration vs pnl
  const durationScatterData = useMemo(() => {
    return filteredTrades
      .filter(t => t.durationMin > 0 && t.pnl !== null)

      .slice(0, 200) // safety cap
      .map(t => ({
        durationMin: t.durationMin,
        pnl: t.pnl,
        type: (t.pnl ?? 0) >= 0 ? "win" : "loss",
      }));

  }, [filteredTrades]);

  // Instrument breakdown
  const instrumentData = useMemo(() => {
    const map = new Map();
    for (const t of filteredTrades) {
      const key = t.instrument || "Unknown";
      if (!map.has(key)) map.set(key, { name: key, wins: 0, losses: 0, volume: 0 });
      const row = map.get(key);
      if (t.pnl >= 0) row.wins += t.pnl;
      else row.losses += Math.abs(t.pnl);
      row.volume += t.lots;
    }
    return Array.from(map.values()).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  }, [filteredTrades]);

  // Emotion breakdown
  const emotionData = useMemo(() => {
    const colorFor = (name) => {
      const n = name.toLowerCase();
      if (n.includes("conf") || n.includes("good") || n.includes("calm")) return COLORS.profit;
      if (n.includes("worst") || n.includes("fear") || n.includes("panic")) return COLORS.loss;
      if (n.includes("bad")) return "#F59E0B";
      return COLORS.neutral;
    };

    const map = new Map();
    for (const t of filteredTrades) {
      const startKey = t.emotion?.trim() ? t.emotion.trim() : "Unspecified";
      // Normalize key to lowercase for aggregation
      const key = startKey.toLowerCase();
      // Store original casing for display if first time seeing it, or just use capitalized version
      if (!map.has(key)) map.set(key, { count: 0, original: startKey });

      const entry = map.get(key);
      entry.count += 1;
    }

    const rows = Array.from(map.values())
      .map(({ original, count }) => ({ name: original, value: count, color: colorFor(original) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Add emojis if your stored emotions are plain text
    return rows.map(r => {
      const lower = r.name.toLowerCase();
      const emoji =
        lower.includes("conf") ? "🥳" :
          lower.includes("good") ? "😀" :
            lower.includes("meh") ? "😐" :
              lower.includes("bad") ? "🙁" :
                lower.includes("worst") ? "😫" :
                  r.name === "Unspecified" ? "🤷" : "🤔";
      return { ...r, name: `${emoji} ${r.name}` };
    });
  }, [filteredTrades]);

  // ✅ TradesBySymbol dataset (REAL)
  const tradesBySymbolData = useMemo(() => {
    const map = new Map();

    for (const t of filteredTrades) {
      const key = t.instrument || "Unknown";
      if (!map.has(key)) map.set(key, { symbol: key, trades: 0, pnl: 0 });

      const row = map.get(key);
      row.trades += 1;

      if (t.pnl !== null && Number.isFinite(t.pnl)) {
        row.pnl += t.pnl;
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 12);
  }, [filteredTrades]);

  // ✅ MoodCorrelation dataset (REAL)
  const moodChartData = useMemo(() => {
    const map = new Map();

    for (const t of filteredTrades) {
      const label = (t.emotion || "").trim();
      if (!label) continue;

      if (!map.has(label)) {
        map.set(label, { label, trades: 0, wins: 0, pnlSum: 0, pnlCount: 0 });
      }

      const row = map.get(label);
      row.trades += 1;

      // win/loss based on pnl if present, else outcome label
      const isWin = t.pnl !== null ? t.pnl > 0 : t.outcome === "win";
      if (isWin) row.wins += 1;

      if (t.pnl !== null && Number.isFinite(t.pnl)) {
        row.pnlSum += t.pnl;
        row.pnlCount += 1;
      }
    }

    return Array.from(map.values())
      .map((r) => ({
        label: r.label,
        hex: getMoodHex(r.label), // ✅ Add hex for Twemoji
        trades: r.trades,
        winRate: r.trades ? Math.round((r.wins / r.trades) * 100) : 0,
        avgPnL: r.pnlCount ? Math.round(r.pnlSum / r.pnlCount) : 0,
      }))
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 8);
  }, [filteredTrades]);

  // =========================
  // Chart datasets (REAL)
  // =========================

  const instrumentProfitLoss = useMemo(() => {
    const map = new Map();

    for (const t of filteredTrades) {
      const key = t.instrument || "Unknown";
      if (!map.has(key)) map.set(key, { instrument: key, profit: 0, loss: 0 });

      // only count pnl when known
      if (t.pnl === null || !Number.isFinite(t.pnl)) continue;

      const row = map.get(key);
      if (t.pnl >= 0) row.profit += t.pnl;
      else row.loss += Math.abs(t.pnl);
    }

    return Array.from(map.values()).sort(
      (a, b) => (b.profit - b.loss) - (a.profit - a.loss)
    );
  }, [filteredTrades]);

  const instrumentVolume = useMemo(() => {
    const map = new Map();

    for (const t of filteredTrades) {
      const key = t.instrument || "Unknown";
      if (!map.has(key)) map.set(key, { instrument: key, volume: 0 });

      const row = map.get(key);
      row.volume += Number(t.lots) || 0;
    }

    return Array.from(map.values()).sort((a, b) => b.volume - a.volume);
  }, [filteredTrades]);

  const equityCurveData = useMemo(() => {
    const list = filteredTrades
      .filter(t => t.date instanceof Date && t.pnl !== null && Number.isFinite(t.pnl))
      .sort((a, b) => a.date - b.date);

    let running = 0;
    const data = list.map(t => {
      const tradePnl = t.pnl; // Individual trade PnL
      running += tradePnl;    // Cumulative PnL
      return {
        date: t.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        cumulativePnl: running,      // Total cumulative PnL
        tradePnl: tradePnl,          // Individual trade PnL
        instrument: t.instrument,     // For tooltip
      };
    });
    return data;
  }, [filteredTrades]);




  // ✅ FIXED: Weekly Heatmap Data - Resets each month, only shows data for days that have passed
  const weeklyHeatmapData = useMemo(() => {
    const dayCols = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Convert any Date to "local date only" (no time). Noon avoids DST edge cases.
    const asLocalDay = (dt) => {
      const d = new Date(dt);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    };

    const startOfWeekMonday = (date) => {
      const d = asLocalDay(date);
      const day = d.getDay(); // 0=Sun..6=Sat
      const diff = day === 0 ? -6 : 1 - day; // move to Monday
      d.setDate(d.getDate() + diff);
      return d;
    };

    const getWeekOfMonth = (date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

      // Adjust so Monday = 0
      const firstMonday = firstDayOfWeek === 0 ? 2 : (8 - firstDayOfWeek + 1);

      if (date.getDate() < firstMonday) {
        return 1;
      }

      return Math.ceil((date.getDate() - firstMonday + 1) / 7) + 1;
    };

    const weekKey = (mondayDate) => {
      const y = mondayDate.getFullYear();
      const m = String(mondayDate.getMonth() + 1).padStart(2, "0");
      const dd = String(mondayDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    const weekdayShort = (date) =>
      asLocalDay(date).toLocaleDateString(undefined, { weekday: "short" });

    // ✅ Get current month and build weeks ONLY for current month
    const now = asLocalDay(new Date());
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get first Monday of the current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const firstMonday = startOfWeekMonday(firstDayOfMonth);

    // Build weeks for current month only (max 5 weeks per month)
    const weeks = [];
    let currentWeekStart = new Date(firstMonday);
    let weekNumber = 1;

    // Generate up to 5 weeks (enough for any month)
    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(currentWeekStart);

      // Check if this week belongs to current month
      // A week belongs to a month if its Monday is in that month OR if most of its days are in that month
      const weekMonth = weekStart.getMonth();
      const weekYear = weekStart.getFullYear();

      // Only include weeks that start in current month or have days in current month
      if (weekYear === currentYear && weekMonth === currentMonth) {
        weeks.push({
          key: weekKey(weekStart),
          data: dayCols.map(() => null), // null = no data yet
          weekNumber: weekNumber
        });
        weekNumber++;
      }

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);

      // Stop if we've moved to next month
      if (currentWeekStart.getMonth() !== currentMonth) {
        break;
      }
    }

    const weekIndex = new Map(weeks.map((w, idx) => [w.key, idx]));

    // ✅ Fill from trades - ONLY trades from current month
    for (const t of filteredTrades) {
      if (!(t.date instanceof Date) || Number.isNaN(t.date)) continue;

      // Skip trades not from current month
      const tradeMonth = t.date.getMonth();
      const tradeYear = t.date.getFullYear();
      if (tradeMonth !== currentMonth || tradeYear !== currentYear) continue;

      if (t.pnl === null || !Number.isFinite(t.pnl)) continue;

      const localDay = asLocalDay(t.date);
      const monday = startOfWeekMonday(localDay);
      const wKey = weekKey(monday);
      if (!weekIndex.has(wKey)) continue;

      const day = weekdayShort(localDay);
      const col = dayCols.indexOf(day);
      if (col === -1) continue;

      const weekIdx = weekIndex.get(wKey);

      // Initialize to 0 if null (first trade for this day)
      if (weeks[weekIdx].data[col] === null) {
        weeks[weekIdx].data[col] = 0;
      }

      weeks[weekIdx].data[col] += t.pnl;
    }

    // ✅ Clean up: Keep structure for UI
    // null = future day (disabled)
    // undefined = past day with no trades (show as no data)
    // 0 = breakeven trade (amber)
    // number = actual PnL (red/green)
    const todayShort = now.toLocaleDateString(undefined, { weekday: "short" });
    const todayCol = dayCols.indexOf(todayShort);
    const currentWeekOfMonth = getWeekOfMonth(now);

    weeks.forEach((week, weekIdx) => {
      week.data = week.data.map((val, dayIdx) => {
        // For past weeks, keep null as undefined for no-trade days
        if (weekIdx + 1 < currentWeekOfMonth) {
          return val === null ? undefined : Number(val.toFixed(2));
        }

        // For current week
        if (weekIdx + 1 === currentWeekOfMonth) {
          // Days up to and including today: keep null as undefined for no-trade days
          if (dayIdx <= todayCol) {
            return val === null ? undefined : Number(val.toFixed(2));
          }
          // Future days in current week: keep null (will be disabled in UI)
          return null;
        }

        // For future weeks: keep all null (will be disabled in UI)
        return null;
      });
    });

    return weeks.map((w, i) => ({
      week: `Week ${i + 1}`,
      data: w.data.map((v) => {
        if (v === null) return null; // future day
        if (v === undefined) return undefined; // past day, no trade
        return Number.isFinite(v) ? Number(v.toFixed(2)) : undefined;
      }),
    }));
  },

    [filteredTrades]);



  // Generate weekly summary from heatmap data
  const weeklyData = useMemo(() => {
    if (!weeklyHeatmapData || weeklyHeatmapData.length === 0) return [];

    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });

    return weeklyHeatmapData.map((week, index) => {
      // Calculate total PnL for the week
      const weekPnL = week.data.reduce((sum, dayValue) => {
        if (typeof dayValue === 'number') {
          return sum + dayValue;
        }
        return sum;
      }, 0);

      // Count days with trades
      const daysWithTrades = week.data.filter(
        (dayValue) => typeof dayValue === 'number'
      ).length;

      // Generate date range (approximate)
      const weekNumber = index + 1;
      const startDay = (weekNumber - 1) * 7 + 1;
      const endDay = Math.min(startDay + 6, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());

      return {
        week: week.week,
        range: `${currentMonth} ${startDay}-${endDay}`,
        pnl: weekPnL,
        days: daysWithTrades
      };
    }).filter(w => w.days > 0); // Only show weeks with trades
  }, [weeklyHeatmapData]);


  const tradingDayData = useMemo(() => {
    const map = new Map(["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => [d, 0]));
    for (const t of filteredTrades) {
      if (!t.date || t.pnl === null) continue;
      const d = t.date.toLocaleDateString(undefined, { weekday: "short" });
      if (map.has(d)) map.set(d, map.get(d) + t.pnl);
    }
    return Array.from(map.entries()).map(([day, pnl]) => ({ day, pnl }));
  }, [filteredTrades]);

  const sessionWinRates = useMemo(() => {
    const map = new Map();
    for (const t of filteredTrades) {
      if (!t.session || t.pnl === null) continue;
      if (!map.has(t.session)) map.set(t.session, { wins: 0, total: 0 });
      const s = map.get(t.session);
      s.total++;
      if (t.pnl > 0) s.wins++;
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      winRate: v.total ? (v.wins / v.total) * 100 : 0
    }));
  }, [filteredTrades]);


  // Show skeleton if loading and no data
  if (isLoading && (!trades || trades.length === 0)) {
    return (
      <div className="p-6">
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 transition-colors duration-300">



      {loading && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-sm text-[#64748B] animate-pulse">
          Loading analytics…
        </div>
      )}

      {!loading && loadError && (
        <div className="bg-white rounded-xl border border-[#EF4444]/30 p-6 text-sm text-[#EF4444]">
          {loadError}
        </div>
      )}

      {!loading && !loadError && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">Analytics</div>
              <div className="text-sm text-[#64748B] dark:text-slate-400">Your performance, visualized</div>
            </div>






            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 text-sm font-semibold hover:shadow-sm flex items-center gap-2 disabled:opacity-50 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 text-sm font-semibold hover:shadow-sm flex items-center gap-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>




          {/* Controls row */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs font-semibold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-2">
                  Date range
                </div>
                <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-800 p-1 rounded-lg">
                  {["Week", "Month", "Custom"].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => {
                        const r = range.toLowerCase();
                        if (r === 'custom') {
                          // Keep visible selection on custom, but open modal to define it
                          setDateRange('custom');
                          setShowDatePicker(true);
                          // Initialize temp vars with current custom range or today
                          setTempCustomRange({
                            start: customRange.start || new Date().toISOString().split('T')[0],
                            end: customRange.end || new Date().toISOString().split('T')[0]
                          });
                        } else {
                          setDateRange(r);
                        }
                      }}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-all ${dateRange === range.toLowerCase()
                        ? "bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-400 shadow-sm"
                        : "text-[#64748B] dark:text-slate-400 hover:text-[#171717] dark:hover:text-slate-200"
                        }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-2">
                  Instrument
                </div>
                <select
                  value={instrumentFilter}
                  onChange={(e) => setInstrumentFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-[#171717] dark:text-slate-200 bg-white dark:bg-slate-800 focus:border-[#2563EB] dark:focus:border-blue-500 focus:outline-none transition-colors"
                >
                  <option value="All">All</option>
                  {uniqueInstruments.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-2">
                  Session
                </div>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-[#171717] dark:text-slate-200 bg-white dark:bg-slate-800 focus:border-[#2563EB] dark:focus:border-blue-500 focus:outline-none transition-colors"
                >
                  <option value="All">All</option>
                  {uniqueSessions.map(sess => (
                    <option key={sess} value={sess}>{sess}</option>
                  ))}
                </select>

              </div>
            </div>
          </div>

          <div className="w-full">
            <QuickPnLChart data={equityCurveData} initialBalance={startingBalance || 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            <div className="lg:col-span-2">
              <WeeklyHeatmap weeks={weeklyHeatmapData} />
            </div>

            <div className="lg:col-span-1">
              <WeeklySummaryCard weeklySummary={weeklyData} />
            </div>
          </div>




          {stats.ungradedTrades > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-[#F59E0B]/30 p-4 text-sm text-[#0F172A] dark:text-slate-200">
              <div className="font-bold text-[#F59E0B]">Heads up</div>
              <div className="text-[#64748B] dark:text-slate-400 mt-1">
                {stats.ungradedTrades} trades are missing <b>Result</b> or <b>PnL</b>, so win-rate and profit stats only use
                <b> {stats.gradedTrades}</b> graded trades.
              </div>
            </div>
          )}
          {/* Key Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">


            <KpiCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Net P&L"
              value={`${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`}
              sub={stats.netPnl > 0 ? "Profit" : stats.netPnl < 0 ? "Loss" : "Breakeven"}
              valueColor={
                stats.netPnl > 0 ? 'text-[#10B981]' :
                  stats.netPnl < 0 ? 'text-[#EF4444]' :
                    'text-[#64748B]' // Gray for 0
              }
            />
            <KpiCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Avg Win"
              value={`$${stats.avgWin.toFixed(2)}`}
              sub="Per winning trade"
              valueColor="text-gray-500"
            />
            <KpiCard
              icon={<Target className="w-5 h-5" />}
              title="Win Ratio"
              value={`${stats.winRatio.toFixed(1)}%`}
              sub={`${stats.winsCount} wins / ${stats.lossesCount} losses`}
              valueColor="text-gray-500"
            />
            <KpiCard
              icon={<TrendingDown className="w-5 h-5" />}
              title="Avg Loss"
              value={`$${stats.avgLoss.toFixed(2)}`}
              sub="Per losing trade"
              valueColor="text-gray-500"
            />
            <KpiCard
              icon={<Activity className="w-5 h-5" />}
              title="Profit Factor"
              value={stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2)}
              sub="Wins / Losses"
              valueColor={stats.profitFactor >= 1 ? "text-gray-500" : "text-gray-500"}
            />
          </div>

          {/* Biggest Win/Loss */}


          {/* Direction Analysis - 3 Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-">
            <DirectionDonutCard
              title="Short Analysis"
              profit={directionData.short.profit}
              wins={directionData.short.wins}
              losses={directionData.short.losses}
              winRate={directionData.short.winRate}
              totalWins={directionData.short.totalWins}
              totalLosses={directionData.short.totalLosses}

            />

            <DirectionDonutCard
              title="Profitability"
              totalTrades={directionData.overall.totalTrades}
              wins={directionData.overall.wins}
              losses={directionData.overall.losses}
              winRate={directionData.overall.winRate}
              isOverall
            />

            <DirectionDonutCard
              title="Long Analysis"
              profit={directionData.long.profit}
              wins={directionData.long.wins}
              losses={directionData.long.losses}
              winRate={directionData.long.winRate}
              totalWins={directionData.long.totalWins}
              totalLosses={directionData.long.totalLosses}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Biggest Win"
              value={`$${stats.biggestWin.toFixed(2)}`}
              sub="Single best trade"
              valueColor="text-[#10B981]"
            />

            <KpiCard
              icon={<TrendingDown className="w-5 h-5" />}
              title="Biggest Loss"
              value={`-$${stats.biggestLoss.toFixed(2)}`}
              sub="Single worst trade"
              valueColor="text-[#EF4444]"
            />
          </div>
          {/* Weekly Summary + Emotion Analysis */}
          {/* Trades + Mood (fills the empty right space) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT */}
            <TradesBySymbol data={tradesBySymbolData} />


            {/* RIGHT */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-6">
              <div className="text-base font-bold text-[#171717] dark:text-slate-100 mb-4">
                Mood → Performance
              </div>
              <MoodCorrelation moodData={moodChartData} />

            </div>
          </div>




          {/* Duration Analysis */}


          {/* Placeholder for more charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TradingDayPerformance data={tradingDayData} />


            <SessionWinRates sessions={sessionWinRates} />

          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PnLByTradeDurationScatter points={durationScatterData} />


            <InstrumentProfitAnalysis data={instrumentProfitLoss} />

          </div>

          <InstrumentVolumeAnalysis data={instrumentVolume} />


        </>
      )
      }





      {/* CUSTOM DATE PICKER MODAL */}
      {
        showDatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-[#E2E8F0] dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex justify-between items-center bg-[#F8FAFC] dark:bg-slate-800">
                <h3 className="font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                  Select Date Range
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-[#64748B] dark:text-slate-400 hover:text-[#EF4444] dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-500 uppercase tracking-wider block">Start Date</label>
                  <input
                    type="date"
                    value={tempCustomRange.start}
                    onChange={(e) => setTempCustomRange({ ...tempCustomRange, start: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] dark:focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#64748B] dark:text-slate-500 uppercase tracking-wider block">End Date</label>
                  <input
                    type="date"
                    value={tempCustomRange.end}
                    onChange={(e) => setTempCustomRange({ ...tempCustomRange, end: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] dark:focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-[#F8FAFC] dark:bg-slate-800 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-[#0F172A] dark:hover:text-slate-100 border border-transparent hover:border-[#E2E8F0] dark:hover:border-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCustomRange({
                      start: tempCustomRange.start ? new Date(tempCustomRange.start) : null,
                      end: tempCustomRange.end ? new Date(tempCustomRange.end) : null
                    });
                    setShowDatePicker(false);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  Apply Range
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >

  );
}

// KPI Card Component
function KpiCard({ icon, title, value, sub, valueColor = 'text-[#171717] dark:text-slate-100' }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-5 hover:shadow-md hover:-translate-y-0.5 hover:border-[#2563EB]/40 dark:hover:border-blue-500/40 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#64748B] dark:text-slate-400">{icon}</div>
        <div className="text-xs font-semibold text-[#64748B] dark:text-slate-500 uppercase tracking-wider">
          {title}
        </div>
      </div>
      <div className={`text-3xl font-bold tracking-tight ${valueColor}`}>
        {value}
      </div>
      <div className="text-sm text-[#64748B] dark:text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

// Direction Donut Card Component
function DirectionDonutCard({ title, profit, wins, losses, winRate, totalWins, totalLosses, totalTrades, isOverall }) {
  const data = isOverall
    ? [
      { name: 'Wins', value: wins, color: COLORS.profit },
      { name: 'Losses', value: losses, color: COLORS.loss }
    ]
    : [
      { name: 'Wins', value: wins, color: COLORS.profit },
      { name: 'Losses', value: losses, color: COLORS.loss }
    ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-6">
      <div className="text-base font-bold text-[#171717] dark:text-slate-100 mb-4">{title}</div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="72%"           // 👈 pushes donut down onto the divider
            startAngle={180}
            endAngle={0}
            innerRadius={70}   // 👈 thicker donut
            outerRadius={90}
            paddingAngle={0}
            cornerRadius={6}
          >


            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <text
            x="50%"
            y="72%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm font-semibold"
            fill={COLORS.neutral}
          >
            {isOverall ? 'Total Trades' : 'Profit'}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-bold"
            fill={isOverall ? COLORS.neutral : (profit >= 0 ? COLORS.profit : COLORS.loss)}
          >
            {isOverall ? totalTrades : `${profit >= 0 ? '+' : ''}$${Math.abs(profit).toFixed(2)}`}
          </text>
        </PieChart>
      </ResponsiveContainer>

      {isOverall ? (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#10B981] dark:text-emerald-400">{winRate.toFixed(1)}%</div>
            <div className="text-xs text-[#64748B] dark:text-slate-500 mt-1">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-[#64748B] dark:text-slate-400">
              <span className="text-[#10B981] dark:text-emerald-400 font-bold">{wins}W</span> / <span className="text-[#EF4444] dark:text-red-400 font-bold">{losses}L</span>
            </div>
            <div className="text-xs text-[#64748B] dark:text-slate-500 mt-1">Record</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
          <div className="text-center">
            <div className="text-sm font-bold text-[#10B981] dark:text-emerald-400">Wins ({wins})</div>
            <div className="text-xs text-[#64748B] dark:text-slate-500">${totalWins.toFixed(0)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-[#171717] dark:text-slate-200">{winRate.toFixed(0)}%</div>
            <div className="text-xs text-[#64748B] dark:text-slate-500">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-[#EF4444] dark:text-red-400">Losses ({losses})</div>
            <div className="text-xs text-[#64748B] dark:text-slate-500">${totalLosses.toFixed(0)}</div>
          </div>
        </div>
      )}
    </div>
  );
}