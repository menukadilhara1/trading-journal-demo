import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Save, Calendar, Check, X, Upload, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { getCookie, ensureCsrf } from './utils/csrf';
import imageCompression from 'browser-image-compression';

// Γ£à Backend base URL (keep in sync with App.js)
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
const MOOD_OPTIONS = [
  { emoji: "≡ƒÿÉ", label: "Neutral", value: "neutral" },
  { emoji: "≡ƒÿä", label: "Confident", value: "confident" },
  { emoji: "≡ƒÿ░", label: "Stressed", value: "stressed" },
  { emoji: "≡ƒÿñ", label: "Frustrated", value: "frustrated" },
  { emoji: "≡ƒÿ┤", label: "Tired", value: "tired" },
  { emoji: "≡ƒÿè", label: "Happy", value: "happy" },
];

// Process check items
const PROCESS_CHECKS = [
  { emoji: "≡ƒº¡", text: "I followed my plan (entries + exits)", key: "followedPlan" },
  { emoji: "ΓÜû∩╕Å", text: "I respected my risk rules", key: "respectedRisk" },
  { emoji: "≡ƒºá", text: "No revenge trades or emotional clicks", key: "noRevengeTrades" },
  { emoji: "ΓÅ▒∩╕Å", text: "I waited for valid setups", key: "waitedForSetups" },
  { emoji: "≡ƒº╣", text: "I avoided overtrading", key: "avoidedOvertrading" },
];

export default function JournalUI() {
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

  // Load all journal entries for history
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingJournals(true);
        const res = await fetch(`${API_BASE}/api/journal`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (!alive) return;
          setAllJournals(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load journal history:', e);
      } finally {
        if (alive) setLoadingJournals(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load journal entry from backend
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingEntry(true);
        const res = await fetch(`${API_BASE}/api/journal?date=${dateKey}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (!alive) return;

          if (data) {
            setSelectedMood(data.rating || null);
            setProcessChecks(data.process_checks || {});
            setPhotos(data.photos || []);

            // Handle content (JSON or string)
            try {
              const parsed = JSON.parse(data.content);
              setOutcome(parsed.outcome || "");
              setTakeaway(parsed.takeaway || "");
            } catch (e) {
              // Fallback for plain text
              setOutcome(data.content || "");
              setTakeaway("");
            }
          } else {
            // No entry found, reset
            setSelectedMood(null);
            setOutcome("");
            setProcessChecks({});
            setTakeaway("");
            setPhotos([]);
          }
        }
      } catch (e) {
        console.error("Failed to load journal:", e);
      } finally {
        if (alive) setLoadingEntry(false);
      }
    })();
    return () => { alive = false; };
  }, [dateKey]);

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 3) {
      alert("Maximum 3 photos allowed per journal entry");
      return;
    }

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
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Save journal entry
  const handleSave = async () => {
    const entryContent = JSON.stringify({ outcome, takeaway });
    const xsrf = getCookie("XSRF-TOKEN");

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/journal`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrf || "",
        },
        body: JSON.stringify({
          date: dateKey,
          content: entryContent,
          rating: selectedMood,
          process_checks: processChecks,
          photos: photos
        })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend reject (${res.status}): ${txt}`);
      }

      const savedData = await res.json();
      setSaveMessage("Γ£à Saved!");
      setTimeout(() => setSaveMessage(""), 2000);

      // Refresh journal history
      setLoadingJournals(true);
      const historyRes = await fetch(`${API_BASE}/api/journal`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setAllJournals(Array.isArray(historyData) ? historyData : []);
      }
      setLoadingJournals(false);
    } catch (e) {
      console.error('Failed to save journal:', e);
      setSaveMessage(`Γ¥î ${e.message}`);
      setTimeout(() => setSaveMessage(""), 5000);
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-[#0F172A]">Journal</div>
          <div className="text-sm text-[#64748B]">
            Daily reflection. Keep it simple, honest, and consistent.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] font-semibold hover:bg-[#F8FAFC] transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 text-center text-sm font-medium text-[#10B981] mb-6">
          {saveMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Date selector card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Date selector */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToPreviousDay}
                className="p-2 rounded-lg hover:bg-[#F8FAFC] transition"
              >
                <ChevronLeft className="w-5 h-5 text-[#64748B]" />
              </button>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <div className="text-sm font-bold text-[#171717]">{formattedDate}</div>
                  <div className="text-xs text-[#64748B]">
                    {isToday ? 'Today' : shortDate}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={goToNextDay}
                className="p-2 rounded-lg hover:bg-[#F8FAFC] transition"
              >
                <ChevronRight className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            {/* Quick stats */}
            {todaysStats.total > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B]">Trades:</span>
                  <span className="font-bold text-[#171717]">{todaysStats.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B]">P&L:</span>
                  <span className={`font-bold ${todaysStats.totalPnl > 0 ? 'text-[#10B981]' :
                    todaysStats.totalPnl < 0 ? 'text-[#EF4444]' : 'text-[#64748B]'
                    }`}>
                    {todaysStats.totalPnl > 0 ? '+' : ''}{todaysStats.totalPnl.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-[#64748B]">
                  {todaysStats.wins}W / {todaysStats.losses}L
                </div>
              </div>
            )}

            {todaysStats.total === 0 && (
              <div className="text-sm text-[#94A3B8]">No trades on this day</div>
            )}
          </div>
        </div>

        {/* Two Column Grid for Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Mood selector */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6">
              <div className="mb-4">
                <div className="text-sm font-bold text-[#171717]">How did you feel?</div>
                <div className="text-xs text-[#64748B]">Select your mood for this day</div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {MOOD_OPTIONS.map(mood => (
                  <MoodPill
                    key={mood.value}
                    emoji={mood.emoji}
                    label={mood.label}
                    active={selectedMood === mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                  />
                ))}
              </div>
            </div>

            {/* Process checks */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-4">
              <div>
                <div className="text-lg font-bold text-[#171717]">Γ£à Process checks</div>
                <div className="text-sm text-[#64748B]">
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
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-3">
              <div>
                <div className="text-lg font-bold text-[#171717]">≡ƒÄ» One takeaway</div>
                <div className="text-sm text-[#64748B]">
                  The single rule to apply tomorrow.
                </div>
              </div>

              <textarea
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
                placeholder="Trust the setup earlier. If conditions are clear, execute without hesitation."
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#171717] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none min-h-[100px] resize-y"
              />
            </div>

            {/* Today's Outcome & Photos Combined */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 space-y-4">
              <div>
                <div className="text-lg font-bold text-[#171717]">≡ƒôî Today's outcome</div>
                <div className="text-sm text-[#64748B]">
                  2ΓÇô4 lines. What happened, and what it means.
                </div>
              </div>

              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Stayed disciplined overall. Followed the plan and respected risk. Execution was clean, but I hesitated on one A+ setup."
                className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#171717] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none min-h-[100px] resize-y"
              />

              {/* Photos Section */}
              <div className="pt-2">
                <div className="text-lg font-bold text-[#171717] mb-3">≡ƒô╕ Photos</div>
                <div className="text-sm text-[#64748B] mb-3">
                  Add up to 3 photos (auto-compressed to ~200KB each)
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

                  {photos.length < 3 && (
                    <label className="w-24 h-24 border-2 border-dashed border-[#E2E8F0] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#2563EB] hover:bg-[#F8FAFC] transition">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-[#64748B]" />
                    </label>
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
        {todaysTrades.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6">
            <div className="text-sm font-bold text-[#171717] mb-4">
              ≡ƒôè Trades on this day ({todaysTrades.length})
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {todaysTrades.map((trade, idx) => (
                <TradeCard key={trade.id || idx} trade={trade} />
              ))}
            </div>
          </div>
        )}

        {/* Saved Entries - Horizontal Grid at Bottom */}
        {loadingJournals ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6">
            <div className="text-lg font-bold text-[#171717] mb-4">
              ≡ƒôÜ Saved Entries
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#FAFAFA] rounded-2xl border border-[#E2E8F0] p-4 animate-pulse">
                  <div className="h-8 w-8 bg-[#E2E8F0] rounded-full mb-2"></div>
                  <div className="h-4 bg-[#E2E8F0] rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-[#E2E8F0] rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        ) : allJournals.length > 0 ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6">
            <div className="text-lg font-bold text-[#171717] mb-4">
              ≡ƒôÜ Saved Entries ({allJournals.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allJournals.map((entry) => (
                <JournalHistoryCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => setExpandedEntry(entry)}
                  isActive={entry.date === dateKey}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Expanded Entry Modal */}
      {expandedEntry && (
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
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <PhotoLightbox
          photos={lightboxPhoto}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxPhoto(null)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % lightboxPhoto.length)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + lightboxPhoto.length) % lightboxPhoto.length)}
        />
      )}
    </div>
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
          : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-white hover:border-[#2563EB]"
        }
      `}
    >
      {emoji} {label}
    </button>
  );
}

// Check Row Component
function CheckRow({ emoji, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all text-left
        ${checked
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-[#FAFAFA] border-[#E2E8F0] hover:bg-white hover:border-[#2563EB]'
        }
      `}
    >
      <div className="text-lg">{emoji}</div>
      <div className="flex-1 text-sm text-[#171717] font-medium">{text}</div>
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center transition-all
        ${checked
          ? 'bg-[#10B981] text-white'
          : 'bg-white border-2 border-[#E2E8F0]'
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
    <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-xl p-3 hover:bg-white hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${direction === 'long'
            ? 'bg-blue-50 text-[#2563EB]'
            : 'bg-purple-50 text-purple-600'
            }`}>
            {direction === 'long' ? 'Γåæ' : 'Γåô'} {direction || 'Long'}
          </div>
          <div className="font-semibold text-sm text-[#171717]">{instrument}</div>
        </div>

        <div className={`text-sm font-bold ${isProfitable ? 'text-[#10B981]' : isLoss ? 'text-[#EF4444]' : 'text-[#64748B]'
          }`}>
          {isProfitable ? '+' : ''}{pnl.toFixed(2)}
        </div>
      </div>

      {(trade.notes) && (
        <div className="mt-2 text-xs text-[#64748B] line-clamp-2">
          {trade.notes}
        </div>
      )}
    </div>
  );
}

// Journal History Card Component (Compact)
function JournalHistoryCard({ entry, onClick, isActive }) {
  const moodEmoji = MOOD_OPTIONS.find(m => m.value === entry.rating)?.emoji || "≡ƒô¥";
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
          ? 'bg-blue-50 border-[#2563EB] shadow-sm'
          : 'bg-[#FAFAFA] border-[#E2E8F0] hover:bg-white hover:border-[#2563EB] hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="text-2xl">{moodEmoji}</div>
        <Maximize2 className="w-4 h-4 text-[#64748B]" />
      </div>
      <div className="text-sm font-bold text-[#171717]">{formattedDate}</div>
      <div className="text-xs text-[#64748B] line-clamp-2">
        {truncatedPreview}
      </div>
      {isActive && (
        <div className="text-xs font-semibold text-[#2563EB]">Current</div>
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

  const moodEmoji = MOOD_OPTIONS.find(m => m.value === entry.rating)?.emoji || "≡ƒô¥";
  const moodLabel = MOOD_OPTIONS.find(m => m.value === entry.rating)?.label || "Unknown";
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
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] p-6 flex items-center justify-between rounded-t-3xl">
          <div>
            <div className="text-2xl font-bold text-[#171717]">{formattedDate}</div>
            <div className="text-sm text-[#64748B] flex items-center gap-2 mt-1">
              <span className="text-xl">{moodEmoji}</span>
              <span>{moodLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F8FAFC] transition"
          >
            <X className="w-6 h-6 text-[#64748B]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Process Checks */}
          {entry.process_checks && Object.keys(entry.process_checks).length > 0 && (
            <div>
              <div className="text-sm font-bold text-[#171717] mb-3">Γ£à Process Checks</div>
              <div className="space-y-2">
                {PROCESS_CHECKS.map(check => (
                  entry.process_checks[check.key] && (
                    <div key={check.key} className="flex items-center gap-2 text-sm text-[#171717]">
                      <Check className="w-4 h-4 text-[#10B981]" />
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
              <div className="text-sm font-bold text-[#171717] mb-2">≡ƒôî Outcome</div>
              <div className="text-sm text-[#64748B] whitespace-pre-wrap">{outcome}</div>
            </div>
          )}

          {/* Takeaway */}
          {takeaway && (
            <div>
              <div className="text-sm font-bold text-[#171717] mb-2">≡ƒÄ» Takeaway</div>
              <div className="text-sm text-[#64748B] whitespace-pre-wrap">{takeaway}</div>
            </div>
          )}

          {/* Photos */}
          {entry.photos && entry.photos.length > 0 && (
            <div>
              <div className="text-sm font-bold text-[#171717] mb-3">≡ƒô╕ Photos</div>
              <div className="grid grid-cols-3 gap-3">
                {entry.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={`${API_BASE}/storage/${photo}`}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-xl border border-[#E2E8F0] cursor-pointer hover:opacity-80 transition"
                    onClick={() => onPhotoClick(entry.photos, index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trades */}
          {trades.length > 0 && (
            <div>
              <div className="text-sm font-bold text-[#171717] mb-3">≡ƒôè Trades ({trades.length})</div>
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
