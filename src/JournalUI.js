import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Save, Calendar, Check, X, Upload, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { getCookie, ensureCsrf } from './utils/csrf';
import imageCompression from 'browser-image-compression';
import EmptyState from './components/ui/EmptyState';
import Button from './components/ui/Button';

import { MOODS, resolveMood } from './constants/moods';
import Twemoji from './components/ui/Twemoji';

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

// Mood options
const MOOD_OPTIONS = MOODS;


// Process check items
const PROCESS_CHECKS = [
  { emoji: "🧭", text: "I followed my plan (entries + exits)", key: "followedPlan" },
  { emoji: "⚖️", text: "I respected my risk rules", key: "respectedRisk" },
  { emoji: "🧠", text: "No revenge trades or emotional clicks", key: "noRevengeTrades" },
  { emoji: "⏱️", text: "I waited for valid setups", key: "waitedForSetups" },
  { emoji: "🧹", text: "I avoided overtrading", key: "avoidedOvertrading" },
];

export default function JournalUI({ trades: propTrades }) {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMood, setSelectedMood] = useState(null);
  const [outcome, setOutcome] = useState("");
  const [processChecks, setProcessChecks] = useState({});
  const [takeaway, setTakeaway] = useState("");
  const [photos, setPhotos] = useState([]);
  const [trades, setTrades] = useState([]);
  const [journals, setJournals] = useState({});
  const [allJournals, setAllJournals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loadingJournals, setLoadingJournals] = useState(true);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [page, setPage] = useState(1);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Get date key for current date
  const dateKey = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [currentDate]);

  // Load trades from backend
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/trades`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (!res.ok) throw new Error(`Failed to load trades`);

        const data = await res.json();
        if (!alive) return;

        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setTrades(list);
      } catch (e) {
        console.error('Failed to load trades:', e);
      }
    })();

    return () => { alive = false; };
  }, []);

  // Mock data for demo
  const MOCK_JOURNALS = useMemo(() => [
    {
      id: 1, date: "2026-02-01", rating: "happy",
      content: JSON.stringify({ outcome: "Strong start to the month. Followed the plan perfectly.", takeaway: "Keep waiting for A+ setups." }),
      process_checks: { followedPlan: true, respectedRisk: true, noRevengeTrades: true, waitedForSetups: true, avoidedOvertrading: true }
    },
    {
      id: 2, date: "2026-02-03", rating: "confident",
      content: JSON.stringify({ outcome: "Gold moved exactly as analyzed. Partial took at 1:2R.", takeaway: "Trust the analysis." }),
      process_checks: { followedPlan: true, respectedRisk: true, noRevengeTrades: true }
    },
    {
      id: 3, date: "2026-02-05", rating: "excited",
      content: JSON.stringify({ outcome: "Crypto pump was insane. Caught the bottom wick.", takeaway: "Don't fade momentum." }),
      process_checks: { followedPlan: true, respectedRisk: true, waitedForSetups: false }
    },
    {
      id: 4, date: "2026-02-07", rating: "annoyed",
      content: JSON.stringify({ outcome: "Choppy weekend price action. Shouldn't have traded.", takeaway: "No trading on weekends unless volatility is high." }),
      process_checks: { followedPlan: false, avoidedOvertrading: false }
    },
    {
      id: 5, date: "2026-02-10", rating: "frustrated",
      content: JSON.stringify({ outcome: "Got stopped out by news wick. Position sizing was too big.", takeaway: "Reduce risk during red folder news." }),
      process_checks: { followedPlan: true, respectedRisk: false }
    },
    {
      id: 6, date: "2026-02-12", rating: "excited",
      content: JSON.stringify({ outcome: "Tesla swing trade paid off. Held through the pullback.", takeaway: "Patience pays." }),
      process_checks: { followedPlan: true, respectedRisk: true, noRevengeTrades: true }
    },
    {
      id: 7, date: "2026-02-14", rating: "relaxed",
      content: JSON.stringify({ outcome: "Small scalp on SOL. Quick in and out.", takeaway: "Don't overstay welcome on scalps." }),
      process_checks: { followedPlan: true, respectedRisk: true }
    },
    {
      id: 8, date: "2026-02-16", rating: "frustrated",
      content: JSON.stringify({ outcome: "Fakeout on NAS100. Entered too early.", takeaway: "Wait for candle close." }),
      process_checks: { waitedForSetups: false }
    },
    {
      id: 9, date: "2026-02-20", rating: "excited",
      content: JSON.stringify({ outcome: "SPX rally at open. Classic gap fill setup.", takeaway: "Gap fills are reliable." }),
      process_checks: { followedPlan: true, respectedRisk: true, avoidedOvertrading: true }
    },
    {
      id: 10, date: "2026-02-23", rating: "happy",
      content: JSON.stringify({ outcome: "Best trade of the month. NAS100 runner.", takeaway: "Let winners run." }),
      process_checks: { followedPlan: true, respectedRisk: true, noRevengeTrades: true, waitedForSetups: true, avoidedOvertrading: true }
    }
  ], []);



  // Load trades from props or backend
  useEffect(() => {
    // If trades passed via props (Demo/Promo mode), use them
    if (propTrades && propTrades.length > 0) {
      setTrades(propTrades);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/trades`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (!res.ok) throw new Error(`Failed to load trades`);

        const data = await res.json();
        if (!alive) return;

        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setTrades(list);
      } catch (e) {
        console.error('Failed to load trades:', e);
      }
    })();

    return () => { alive = false; };
  }, [propTrades]);

  // Load all journal entries for history
  useEffect(() => {
    setAllJournals(MOCK_JOURNALS);
    setLoadingJournals(false);
  }, [MOCK_JOURNALS]);

  // Load journal entry from backend
  useEffect(() => {
    setLoadingEntry(true);
    const entry = MOCK_JOURNALS.find(j => j.date === dateKey);

    if (entry) {
      setSelectedMood(entry.rating || null);
      setProcessChecks(entry.process_checks || {});
      setPhotos(entry.photos || []);

      try {
        const parsed = JSON.parse(entry.content);
        setOutcome(parsed.outcome || "");
        setTakeaway(parsed.takeaway || "");
      } catch (e) {
        setOutcome(entry.content || "");
        setTakeaway("");
      }
    } else {
      setSelectedMood(null);
      setOutcome("");
      setProcessChecks({});
      setTakeaway("");
      setPhotos([]);
    }
    setLoadingEntry(false);
  }, [dateKey, MOCK_JOURNALS]);

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 3) {
      alert("Maximum 3 photos allowed per journal entry");
      return;
    }

    setUploadingPhotos(true);
    const compressedPhotos = [];
    for (const file of files) {
      try {
        const options = {
          maxSizeMB: 0.2, // 200KB
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: file.type,
        };

        const compressedFile = await imageCompression(file, options);
        const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
        compressedPhotos.push(base64);
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }

    setPhotos([...photos, ...compressedPhotos].slice(0, 3));
    setUploadingPhotos(false);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Save journal entry
  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaveMessage("🔒 Demo Mode: Saving disabled.");
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 2000);
    }, 500);
  };

  // Get trades for current date
  const todaysTrades = useMemo(() => {
    return trades.filter(trade => {
      const tradeDate = trade.trade_date || trade.date || trade.created_at;
      if (!tradeDate) return false;

      const date = new Date(tradeDate);
      const tradeDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      return tradeDateKey === dateKey;
    });
  }, [trades, dateKey]);

  // Calculate today's stats
  const todaysStats = useMemo(() => {
    const totalPnl = todaysTrades.reduce((sum, trade) => {
      return sum + (Number(trade.pnl ?? trade.dollarAmount ?? 0));
    }, 0);

    const wins = todaysTrades.filter(t => {
      const pnl = Number(t.pnl ?? t.dollarAmount ?? 0);
      return pnl > 0;
    }).length;

    const losses = todaysTrades.filter(t => {
      const pnl = Number(t.pnl ?? t.dollarAmount ?? 0);
      return pnl < 0;
    }).length;

    return {
      totalPnl,
      wins,
      losses,
      total: todaysTrades.length
    };
  }, [todaysTrades]);

  // Navigation
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Toggle process check
  const toggleCheck = (key) => {
    setProcessChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Format date
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const shortDate = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const isToday = dateKey === new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 p-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">Journal</h1>
          <p className="text-[#64748B] dark:text-slate-400 font-medium mt-1">
            Reflect on your performance and stay disciplined.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl px-4 py-3 text-center text-sm font-medium text-[#10B981] dark:text-emerald-400 mb-6 transition-colors">
          {saveMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Date selector card - Horizontal Bar Style */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-4 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Navigation & Date */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousDay}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <button
                  onClick={goToNextDay}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{formattedDate}</div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {isToday ? 'Today' : shortDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick stats */}
            <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Trades</span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">
                  {todaysStats.total}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">P&L</span>
                <span className={`text-xl font-black leading-none mt-1 ${todaysStats.totalPnl > 0 ? 'text-emerald-500 dark:text-emerald-400' :
                  todaysStats.totalPnl < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'
                  }`}>
                  {todaysStats.totalPnl > 0 ? '+' : ''}{todaysStats.totalPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Win / Loss</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{todaysStats.wins}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">W</span>
                  <span className="mx-0.5 text-slate-200 dark:text-slate-800">/</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{todaysStats.losses}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">L</span>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Two Column Grid for Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Mood selector */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 transition-colors">
              <div className="mb-4">
                <div className="text-sm font-bold text-[#171717] dark:text-slate-100">How did you feel?</div>
                <div className="text-xs text-[#64748B] dark:text-slate-500">Select your mood for this day</div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {MOOD_OPTIONS.map(mood => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${selectedMood === mood.value
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                  >
                    <Twemoji hex={mood.hex} size={20} />
                    <span className="text-sm font-medium">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Process checks */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-4 transition-colors">
              <div>
                <div className="text-lg font-bold text-[#171717] dark:text-slate-100">✅ Process checks</div>
                <div className="text-sm text-[#64748B] dark:text-slate-400">
                  Tick the behaviors that mattered today.
                </div>
              </div>

              <div className="space-y-2">
                {PROCESS_CHECKS.map(check => (
                  <CheckRow
                    key={check.key}
                    emoji={check.emoji}
                    text={check.text}
                    checked={processChecks[check.key] || false}
                    onToggle={() => toggleCheck(check.key)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* One takeaway */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-3 transition-colors">
              <div>
                <div className="text-lg font-bold text-[#171717] dark:text-slate-100">💡 One takeaway</div>
                <div className="text-sm text-[#64748B] dark:text-slate-400">
                  The single rule to apply tomorrow.
                </div>
              </div>

              <textarea
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
                placeholder="Trust the setup earlier. If conditions are clear, execute without hesitation."
                className="w-full rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-800 p-4 text-sm text-[#171717] dark:text-slate-200 placeholder:text-[#94A3B8] dark:placeholder:text-slate-600 focus:border-[#2563EB] dark:focus:border-blue-500 focus:outline-none min-h-[100px] resize-y transition-colors"
              />
            </div>

            {/* Today's Outcome & Photos Combined */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-4 transition-colors">
              <div>
                <div className="text-lg font-bold text-[#171717] dark:text-slate-100">📝 Today's outcome</div>
                <div className="text-sm text-[#64748B] dark:text-slate-400">
                  2–4 lines. What happened, and what it means.
                </div>
              </div>

              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Stayed disciplined overall. Followed the plan and respected risk. Execution was clean, but I hesitated on one A+ setup."
                className="w-full rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-800 p-4 text-sm text-[#171717] dark:text-slate-200 placeholder:text-[#94A3B8] dark:placeholder:text-slate-600 focus:border-[#2563EB] dark:focus:border-blue-500 focus:outline-none min-h-[100px] resize-y transition-colors"
              />

              {/* Photos Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold text-[#171717]">📸 Photos</div>
                  <div className="text-sm text-[#64748B]">
                    Max 3 photos
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.startsWith('data:') ? photo : `${API_BASE}/storage/${photo}`}
                        alt={`Photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-xl border-2 border-[#E2E8F0]"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {photos.length < 3 && !uploadingPhotos && (
                    <label className="w-24 h-24 border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#2563EB] dark:hover:border-blue-500 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-[#64748B] dark:text-slate-500" />
                    </label>
                  )}

                  {uploadingPhotos && (
                    <div className="w-24 h-24 border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                      <span className="text-[10px] text-gray-500 dark:text-slate-500 font-medium">Processing...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#1d4ed8] disabled:opacity-50 transition flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trades summary (if any) - Full Width */}
        {
          todaysTrades.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 transition-colors">
              <div className="text-sm font-bold text-[#171717] dark:text-slate-100 mb-4">
                📊 Trades on this day ({todaysTrades.length})
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {todaysTrades.map((trade, idx) => (
                  <TradeCard key={trade.id || idx} trade={trade} />
                ))}
              </div>
            </div>
          )
        }

        {/* Saved Entries - Horizontal Grid at Bottom */}
        {
          loadingJournals ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 transition-colors">
              <div className="text-lg font-bold text-[#171717] dark:text-slate-100 mb-4">
                📚 Saved Entries
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[#FAFAFA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 p-4 animate-pulse">
                    <div className="h-8 w-8 bg-[#E2E8F0] dark:bg-slate-700 rounded-full mb-2"></div>
                    <div className="h-4 bg-[#E2E8F0] dark:bg-slate-700 rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-[#E2E8F0] dark:bg-slate-700 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : allJournals.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 transition-colors">
              <div className="text-lg font-bold text-[#171717] dark:text-slate-100 mb-4">
                📚 Saved Entries ({allJournals.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {allJournals.slice(0, page * 8).map((entry) => (
                  <JournalHistoryCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setExpandedEntry(entry)}
                    isActive={entry.date === dateKey}
                  />
                ))}
              </div>

              {allJournals.length > page * 8 && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300 font-semibold hover:bg-[#F8FAFC] dark:hover:bg-slate-700 hover:text-[#171717] dark:hover:text-slate-100 transition shadow-sm"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No Journal Entries"
              description="You haven't journaled any days yet. Start by filling out the form above!"
            />
          )
        }
      </div >

      {/* Expanded Entry Modal */}
      {
        expandedEntry && (
          <JournalEntryModal
            entry={expandedEntry}
            trades={trades.filter(t => {
              const tradeDate = t.trade_date || t.date || t.created_at;
              if (!tradeDate) return false;
              const date = new Date(tradeDate);
              const tradeDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              return tradeDateKey === expandedEntry.date;
            })}
            onClose={() => setExpandedEntry(null)}
            onNavigate={(date) => {
              setCurrentDate(new Date(date));
              setExpandedEntry(null);
            }}
            onPhotoClick={(photos, index) => {
              setLightboxPhoto(photos);
              setLightboxIndex(index);
            }}
          />
        )
      }

      {/* Photo Lightbox */}
      {
        lightboxPhoto && (
          <PhotoLightbox
            photos={lightboxPhoto}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxPhoto(null)}
            onNext={() => setLightboxIndex((lightboxIndex + 1) % lightboxPhoto.length)}
            onPrev={() => setLightboxIndex((lightboxIndex - 1 + lightboxPhoto.length) % lightboxPhoto.length)}
          />
        )
      }
    </div >
  );
}

// Mood Pill Component
function MoodPill({ emoji, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-xl text-sm font-semibold transition-all
        ${active
          ? "bg-[#2563EB] text-white shadow-md"
          : "bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border border-[#E2E8F0] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:border-[#2563EB] dark:hover:border-blue-500"
        }
      `}
    >
      {emoji} {label}
    </button>
  );
}

function CheckRow({ emoji, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all text-left
        ${checked
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-[#FAFAFA] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:border-[#2563EB] dark:hover:border-blue-500'
        }
      `}
    >
      <div className="text-lg">{emoji}</div>
      <div className="flex-1 text-sm text-[#171717] dark:text-slate-200 font-medium">{text}</div>
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center transition-all
        ${checked
          ? 'bg-[#10B981] dark:bg-emerald-500 text-white'
          : 'bg-white dark:bg-slate-900 border-2 border-[#E2E8F0] dark:border-slate-700'
        }
      `}>
        {checked && <Check className="w-4 h-4" />}
      </div>
    </button>
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
    <div className="bg-[#FAFAFA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-3 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${direction === 'long'
            ? 'bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400'
            : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            }`}>
            {direction === 'long' ? '↑' : '↓'} {direction || 'Long'}
          </div>
          <div className="font-semibold text-sm text-[#171717] dark:text-slate-100">{instrument}</div>
        </div>

        <div className={`text-sm font-bold ${isProfitable ? 'text-[#10B981] dark:text-emerald-400' : isLoss ? 'text-[#EF4444] dark:text-rose-400' : 'text-[#64748B] dark:text-slate-500'
          }`}>
          {isProfitable ? '+' : ''}{pnl.toFixed(2)}
        </div>
      </div>

      {(trade.notes) && (
        <div className="mt-2 text-xs text-[#64748B] dark:text-slate-400 line-clamp-2">
          {trade.notes}
        </div>
      )}
    </div>
  );
}

// Journal History Card Component (Compact)
function JournalHistoryCard({ entry, onClick, isActive }) {
  const mood = resolveMood(entry.rating);
  const moodHex = mood?.hex;
  const moodLabel = mood?.label || "Unknown";

  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  let preview = "";
  try {
    const parsed = JSON.parse(entry.content);
    preview = parsed.outcome || parsed.takeaway || "No content";
  } catch (e) {
    preview = entry.content || "No content";
  }

  // Truncate to ~50 characters
  const truncatedPreview = preview.length > 50 ? preview.substring(0, 50) + "..." : preview;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex flex-col gap-2 rounded-2xl border p-4 transition-all text-left
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 border-[#2563EB] dark:border-blue-500 shadow-sm'
          : 'bg-[#FAFAFA] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:border-[#2563EB] dark:hover:border-blue-500 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 flex justify-center">
          <Twemoji hex={moodHex} size={32} />
        </div>
        <Maximize2 className="w-4 h-4 text-[#64748B] dark:text-slate-400" />
      </div>
      <div className="text-sm font-bold text-[#171717] dark:text-slate-100">{formattedDate}</div>
      <div className="text-xs text-[#64748B] dark:text-slate-400 line-clamp-2">
        {truncatedPreview}
      </div>
      {isActive && (
        <div className="text-xs font-semibold text-[#2563EB] dark:text-blue-400">Current</div>
      )}
    </button>
  );
}

// Photo Lightbox Component
function PhotoLightbox({ photos, currentIndex, onClose, onNext, onPrev }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
      >
        <X className="w-6 h-6" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div className="max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={`${API_BASE}/storage/${photos[currentIndex]}`}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
        {photos.length > 1 && (
          <div className="text-center mt-4 text-white text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>
    </div>
  );
}

// Journal Entry Modal Component
function JournalEntryModal({ entry, trades, onClose, onNavigate, onPhotoClick }) {
  const [navigating, setNavigating] = React.useState(false);

  const mood = resolveMood(entry.rating);
  const moodHex = mood?.hex;
  const moodLabel = mood?.label || "Unknown";

  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let outcome = "";
  let takeaway = "";
  try {
    const parsed = JSON.parse(entry.content);
    outcome = parsed.outcome || "";
    takeaway = parsed.takeaway || "";
  } catch (e) {
    outcome = entry.content || "";
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 p-6 flex items-center justify-between rounded-t-3xl transition-colors">
          <div>
            <div className="text-2xl font-bold text-[#171717] dark:text-slate-100">{formattedDate}</div>
            <div className="text-sm text-[#64748B] dark:text-slate-400 flex items-center gap-2 mt-1">
              <Twemoji hex={moodHex} size={24} />
              <span>{moodLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6 text-[#64748B] dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Process Checks */}
          {entry.process_checks && Object.keys(entry.process_checks).length > 0 && (
            <div>
              <div className="text-sm font-bold text-[#171717] dark:text-slate-100 mb-3">✅ Process Checks</div>
              <div className="space-y-2">
                {PROCESS_CHECKS.map(check => (
                  entry.process_checks[check.key] && (
                    <div key={check.key} className="flex items-center gap-2 text-sm text-[#171717] dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#10B981] dark:text-emerald-400" />
                      <span>{check.emoji} {check.text}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Outcome */}
          {outcome && (
            <div>
              <div className="text-sm font-bold text-[#171717] dark:text-slate-100 mb-2">📌 Outcome</div>
              <div className="text-sm text-[#64748B] dark:text-slate-400 whitespace-pre-wrap">{outcome}</div>
            </div>
          )}

          {/* Takeaway */}
          {takeaway && (
            <div>
              <div className="text-sm font-bold text-[#171717] dark:text-slate-100 mb-2">🎯 Takeaway</div>
              <div className="text-sm text-[#64748B] dark:text-slate-400 whitespace-pre-wrap">{takeaway}</div>
            </div>
          )}

          {/* Photos */}
          {entry.photos && entry.photos.length > 0 && (
            <div>
              <div className="text-sm font-bold text-[#171717] dark:text-slate-100 mb-3">📸 Photos</div>
              <div className="grid grid-cols-3 gap-3">
                {entry.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={`${API_BASE}/storage/${photo}`}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-xl border border-[#E2E8F0] dark:border-slate-800 cursor-pointer hover:opacity-80 transition"
                    onClick={() => onPhotoClick(entry.photos, index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trades */}
          {trades.length > 0 && (
            <div>
              <div className="text-sm font-bold text-[#171717] dark:text-slate-100 mb-3">📊 Trades ({trades.length})</div>
              <div className="space-y-2">
                {trades.map((trade, idx) => (
                  <TradeCard key={trade.id || idx} trade={trade} />
                ))}
              </div>
            </div>
          )}

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => {
              setNavigating(true);
              setTimeout(() => onNavigate(entry.date), 100);
            }}
            disabled={navigating}
            className="w-full px-4 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#1d4ed8] disabled:opacity-70 transition flex items-center justify-center gap-2"
          >
            {navigating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </>
            ) : (
              'Edit Entry'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}