import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  PlusCircle,
  BookOpen,
  LayoutGrid,
  List,
  TrendingUp,
  Calendar,
  BarChart3,
  ChevronDown,
  Settings,
  User,
  Camera,
  ImagePlus,
  Upload,
  Filter,
  Plus,
  X,
  Edit2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Image,
  Eye,
  EyeOff,
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CreateAccountModal from './components/modals/CreateAccountModal';
import EditAccountModal from './components/modals/EditAccountModal';
import SupportModal from './components/modals/SupportModal';
import { useToast } from './contexts/ToastContext';
import EmptyState from './components/ui/EmptyState';
import PageLoader from './components/ui/PageLoader';
import TradeListSkeleton from './components/ui/TradeListSkeleton';
import TradeTableSkeleton from './components/ui/TradeTableSkeleton';

import { MOODS, getMoodHex, resolveMood } from './constants/moods';
import Twemoji from './components/ui/Twemoji';

// Lazy Load Pages
const AnalyticsUI = React.lazy(() => import('./AnalyticsUI'));
const CalendarUI = React.lazy(() => import('./CalendarUI'));
const JournalUI = React.lazy(() => import('./JournalUI'));
const SettingsPage = React.lazy(() => import('./SettingsPage'));

const AuthPage = React.lazy(() => import('./AuthPage'));
const ForgotPasswordPage = React.lazy(() => import('./ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('./VerifyEmailPage'));






// ============================================================================
// CONSTANTS
// ============================================================================
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

// ✅ Session guard: handles Back/Forward cache (BFCache) restoring old dashboard UI
// Runs on back/forward navigation and redirects to /login if session cookie is gone.
const verifySessionOnce = async () => {
  // Demo: no-op
  return;
};


const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_MB = 2;
const MAX_SCREENSHOT_BYTES = MAX_SCREENSHOT_MB * 1024 * 1024;


async function apiLogout() {
  await ensureCsrf();
  const raw = getCookie("XSRF-TOKEN");
  const xsrf = raw ? decodeURIComponent(raw) : "";

  const res = await fetch(`${API_BASE}/api/logout`, {

    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
      "X-XSRF-TOKEN": xsrf,
    },
  });

  if (!res.ok) throw new Error(`Logout failed (${res.status})`);
  return res.json().catch(() => ({}));
}



function getCookie(name) {
  const parts = document.cookie.split("; ").map(v => v.split("="));
  const found = parts.find(([k]) => k === name);
  return found ? (found[1] || "") : "";
}


async function ensureCsrf() {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: "include",
  });
}





async function apiLogin(email, password) {
  await ensureCsrf();
  const raw = getCookie("XSRF-TOKEN");
  const xsrf = raw ? decodeURIComponent(raw) : "";

  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": xsrf,
    },
    body: new URLSearchParams({ email, password }),
  });

  // read text first so we can safely parse or show HTML errors
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(data?.message || `Login failed (${res.status})`);
  }

  return data; // expect { ok: true } etc.
}



const STORAGE_KEY = 'lazy_trades_v1';

// ============================
// BACKUP / RESTORE (localStorage)
// Works from ANY component in this file (no hooks needed)
// ============================
function exportBackup(storageKey) {
  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    alert("No data found to export.");
    return;
  }

  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `lazy-trades-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}


// Minimal, strict validation: only allow the shapes we expect.
// We do NOT validate every field (avoid guessing your schema).
function isValidBackupState(state) {
  if (!isPlainObject(state)) return false;

  // REQUIRED
  if (!Array.isArray(state.accounts)) return false;

  // OPTIONAL but if present must be arrays
  if ("trades" in state && !Array.isArray(state.trades)) return false;
  if ("tags" in state && !Array.isArray(state.tags)) return false;
  if ("quickTags" in state && !Array.isArray(state.quickTags)) return false;
  if ("quickSymbols" in state && !Array.isArray(state.quickSymbols)) return false;

  return true;
}


function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Minimal, strict validation: only allow the shapes we expect.
// We do NOT validate every field (avoid guessing your schema).



function restoreBackup(storageKey, ui) {
  const toast = ui?.toast || ((m) => alert(m));
  const confirm = ui?.confirm || ((m, onYes) => (window.confirm(m) ? onYes() : null));

  // Helper: safe call if your project has these already
  const maybeEnsureCsrf = async () => {
    try {
      if (typeof ensureCsrf === "function") await ensureCsrf();
    } catch (_) { }
  };

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      toast("Please select a .json backup file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        // Accept BOTH formats:
        // 1) wrapped: { app, version, exportedAt, theme, state }
        // 2) raw: { accounts: [...] }
        const nextState =
          parsed && parsed.state && parsed.app === "lazy_trades"
            ? parsed.state
            : parsed;

        if (!nextState || !Array.isArray(nextState.accounts)) {
          toast("Invalid backup file.");
          return;
        }

        confirm("Restore backup? This will DELETE all current trades and replace with backup data.", async () => {
          // 1) Write storage
          localStorage.setItem(storageKey, JSON.stringify(nextState));

          // 2) Hydrate UI from localStorage
          window.dispatchEvent(new CustomEvent("lazy_trades:restored"));

          // 3) Sync restored trades to backend (so Analytics sees them)
          try {
            toast("Clearing backend trades...");

            await maybeEnsureCsrf();

            // ✅ STEP 1: DELETE ALL EXISTING BACKEND TRADES
            const backendRes = await fetch(`${API_BASE}/api/trades`, {
              credentials: "include",
              headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest",
              },
            });

            if (backendRes.ok) {
              const backendJson = await backendRes.json();
              const backendList = Array.isArray(backendJson) ? backendJson : (backendJson?.data ?? []);

              // Delete each existing trade
              for (const trade of backendList) {
                try {
                  await fetch(`${API_BASE}/api/trades/${trade.id}`, {
                    method: "DELETE",
                    credentials: "include",
                    headers: {
                      "Accept": "application/json",
                      "X-Requested-With": "XMLHttpRequest",
                      ...(typeof getCookie === "function" && getCookie("XSRF-TOKEN")
                        ? { "X-XSRF-TOKEN": decodeURIComponent(getCookie("XSRF-TOKEN")) }
                        : {}),
                    },
                  });
                } catch (e) {
                  console.error("Failed to delete trade:", trade.id, e);
                }
              }
            }

            toast("Uploading backup trades...");

            // ✅ STEP 2: UPLOAD ALL TRADES AND MAP OLD->NEW IDs
            const restoredTrades = [];
            for (const acc of nextState.accounts || []) {
              const t = Array.isArray(acc.trades) ? acc.trades : [];
              for (const tr of t) restoredTrades.push(tr);
            }

            // ✅ Track mapping of old local IDs to new backend IDs
            const idMapping = new Map();
            let uploaded = 0;

            for (const tr of restoredTrades) {
              try {
                const oldId = tr.id; // Save old ID

                // ✅ Remove backendId and id so it creates as new
                const cleanTrade = { ...tr };
                delete cleanTrade.backendId;
                delete cleanTrade.id;

                const payload = mapLocalTradeToBackend(cleanTrade);

                await maybeEnsureCsrf();

                const postRes = await fetch(`${API_BASE}/api/trades`, {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    ...(typeof getCookie === "function" && getCookie("XSRF-TOKEN")
                      ? { "X-XSRF-TOKEN": decodeURIComponent(getCookie("XSRF-TOKEN")) }
                      : {}),
                  },
                  body: JSON.stringify(payload),
                });

                if (postRes.ok) {
                  const created = await postRes.json();
                  const newBackendId = String(created?.id || created?.data?.id || "");

                  // ✅ Store the ID mapping
                  if (oldId && newBackendId) {
                    idMapping.set(String(oldId), newBackendId);
                  }

                  uploaded++;
                } else {
                  console.error("Failed to upload trade:", await postRes.text().catch(() => ""));
                }
              } catch (e) {
                console.error("Error uploading trade:", e);
              }
            }

            // ✅ STEP 3: UPDATE LOCALSTORAGE WITH NEW BACKEND IDs
            for (const acc of nextState.accounts || []) {
              if (!Array.isArray(acc.trades)) continue;

              for (const tr of acc.trades) {
                const oldId = String(tr.id || "");
                const newBackendId = idMapping.get(oldId);

                if (newBackendId) {
                  tr.id = newBackendId;
                  tr.backendId = newBackendId;
                }
              }
            }

            // ✅ STEP 4: SAVE UPDATED STATE TO LOCALSTORAGE
            localStorage.setItem(storageKey, JSON.stringify(nextState));

            toast(`✅ Restored ${uploaded} of ${restoredTrades.length} trades. Reloading...`);

            // ✅ STEP 5: TRIGGER HYDRATION AND RELOAD
            window.dispatchEvent(new CustomEvent("lazy_trades:restored"));
            setTimeout(() => window.location.reload(), 1000);
          } catch (e) {
            console.error(e);
            toast("Backup restore failed: " + (e?.message || "Unknown error"));
          }
        });
      } catch (e) {
        toast("Backup file is not valid JSON.");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}


const MAX_TRADES_FREE = 1000;

// Use centralized MOODS
const EMOJI_OPTIONS = MOODS.map(m => m.emoji);
const EMOJI_MEANINGS = MOODS.reduce((acc, m) => ({ ...acc, [m.emoji]: m.label }), {});

const SESSION_PRESETS = [
  'Sydney',
  'Tokyo',
  'New York',
  'London',

];

const R_PRESETS = ['+3', '+2', '+1', '0', '-1', '-2'];

const createAccount = ({ name, startingBalance, defaultRiskPct, trades = [] }) => ({
  id: crypto.randomUUID(),
  name: String(name || 'Main'),
  startingBalance: startingBalance == null ? null : Number(startingBalance),
  defaultRiskPct: Number(defaultRiskPct ?? 1),
  trades: Array.isArray(trades) ? trades : [],
});


const QUICK_TAGS_KEY = 'lazy_quick_tags_v1';
const QUICK_TAGS_DEFAULT = ['A+', 'ORB', 'Breakout', 'Retest', 'Reentry'];
const QUICK_TAGS_MAX = 5;
const QUICK_SYMBOLS_KEY = 'lazy_quick_symbols_v1';
const QUICK_SYMBOLS_DEFAULT = ['US100', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSDT'];
const QUICK_SYMBOLS_MAX = 5;

const normalizeSymbol = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '');


const normalizeTag = (s) => String(s || '').trim().replace(/\s+/g, ' ');
const equalsTag = (a, b) => normalizeTag(a).toLowerCase() === normalizeTag(b).toLowerCase();

const TAG_SUGGESTIONS_KEY = 'lazy_tag_suggestions_v1';
const TRADE_FORM_MODE_KEY = "lazy_trade_form_mode_v1"; // "basic" | "advanced"
const TRADE_FORM_ADV_WARNED_KEY = "lazy_trade_form_adv_warned_v1"; // "1" once warned


const MAX_TAGS_PER_TRADE = 8;
const MAX_SAVED_SUGGESTIONS = 40;
const MAX_TAG_LENGTH = 18;


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
// ---------------------------------------------------------------------------
// MOOD MIGRATION (old emoji -> new emoji)
// ---------------------------------------------------------------------------
const MOOD_MIGRATION_MAP = {
  '🎉': '🤑',
  '😊': '😀',
  '😐': '😑',
  '😤': '😒',
  '😰': '🙁',
};
function formatRText(x) {
  const n = formatR1(x);
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(1)}R`;
}

function migrateFeeling(feeling) {
  if (!feeling) return feeling;
  return MOOD_MIGRATION_MAP[feeling] || feeling;
}

function formatDateDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}



function formatDurationHuman(min) {
  const m = Number(min);
  if (!Number.isFinite(m) || m < 0) return '-';
  if (m === 0) return '0m';

  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = Math.floor(m % 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  return parts.join(' ');
}

// ============================================================================
// R HELPERS (Step 7)
// ============================================================================

function getAccountCurrentBalance(account) {
  if (!account) return 0;
  const start = Number(account.startingBalance) || 0;

  const pnlSum = (account.trades || []).reduce((sum, t) => {
    if (t?.isBreakeven) return sum;
    return sum + (Number(t?.dollarAmount) || 0);
  }, 0);

  return start + pnlSum;
}

function getTradeRiskPct(trade, account) {
  const pct =
    trade?.riskPctUsed != null
      ? Number(trade.riskPctUsed)
      : Number(account?.defaultRiskPct);

  return Number.isFinite(pct) && pct > 0 ? pct : 0;
}

// We need a stable chronological order to compute balance before each trade.
// Oldest -> newest.
function tradeSortKey(t) {
  const dt =
    t?.startDateTime ||
    (t?.date ? `${t.date}T${t.time || "00:00"}` : null);

  const ms = dt ? new Date(dt).getTime() : NaN;
  if (Number.isFinite(ms)) return ms;

  // fallback: id is Date.now().toString() in your app
  const idMs = Number(t?.id);
  return Number.isFinite(idMs) ? idMs : 0;
}

function buildBalanceBeforeMap(account) {
  const map = new Map();
  if (!account) return map;

  const trades = Array.isArray(account.trades) ? [...account.trades] : [];
  trades.sort((a, b) => tradeSortKey(a) - tradeSortKey(b));

  let bal = Number(account.startingBalance) || 0;

  for (const t of trades) {
    map.set(t.id, bal);

    // update balance AFTER this trade (exclude BE)
    if (!t?.isBreakeven) {
      bal += Number(t?.dollarAmount) || 0;
    }
  }

  return map;
}

function getTradeOneR(trade, account, balanceBeforeMap) {
  if (!trade || !account) return 0;

  const balBefore = balanceBeforeMap?.get(trade.id);
  const base = Number.isFinite(balBefore)
    ? balBefore
    : getAccountCurrentBalance(account); // fallback

  const pct = getTradeRiskPct(trade, account);
  return (base * pct) / 100;
}

function getTradeR(trade, account, balanceBeforeMap) {
  if (!trade || !account) return 0;
  if (trade.isBreakeven) return 0;

  const oneR = getTradeOneR(trade, account, balanceBeforeMap);
  if (!Number.isFinite(oneR) || oneR <= 0) return 0;

  const pnl = Number(trade.dollarAmount) || 0;
  return pnl / oneR;
}

function formatR1(x) {
  const n = Number(x) || 0;
  return Number(n.toFixed(1));
}


function calculateStats(trades, displayMode) {
  const all = Array.isArray(trades) ? trades : [];

  // ✅ Strong BE detection (works for old + new trades)
  const isBE = (t) => {
    if (!t) return false;
    if (t.isBreakeven) return true;

    const r = String(t.result ?? "").toLowerCase().trim();
    if (r === "breakeven") return true;

    // If user saved pnl = 0 in simple mode, treat as BE
    const da = t.dollarAmount;
    if (da !== null && da !== undefined && da !== "" && Number(da) === 0) return true;

    return false;
  };

  const breakevens = all.filter(isBE);
  const graded = all.filter((t) => !isBE(t)); // wins + losses only

  const totalTrades = all.length;
  const winsPnl = graded.filter((t) => Number(t.dollarAmount) > 0).length;
  const lossesPnl = graded.filter((t) => Number(t.dollarAmount) < 0).length;

  // ✅ WinRate should use graded trades (wins/losses), not total including BE
  const gradedCount = winsPnl + lossesPnl;
  const winRate = gradedCount > 0 ? Math.round((winsPnl / gradedCount) * 100) : 0;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      winRate: 0,
      total: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
    };
  }

  // =========================
  // PNL MODE
  // =========================
  if (displayMode === "pnl") {
    const total = graded.reduce((sum, t) => sum + (Number(t.dollarAmount) || 0), 0);

    const winSum = graded
      .filter((t) => Number(t.dollarAmount) > 0)
      .reduce((sum, t) => sum + (Number(t.dollarAmount) || 0), 0);

    const lossSumAbs = Math.abs(
      graded
        .filter((t) => Number(t.dollarAmount) < 0)
        .reduce((sum, t) => sum + (Number(t.dollarAmount) || 0), 0)
    );

    const profitFactor =
      lossSumAbs === 0 ? (winSum > 0 ? Infinity : 0) : winSum / lossSumAbs;

    return {
      totalTrades,
      wins: winsPnl,
      losses: lossesPnl,
      breakevens: breakevens.length, // ✅ ALWAYS present now
      winRate,
      total,
      avgWin: winsPnl ? winSum / winsPnl : 0,
      avgLoss: lossesPnl ? lossSumAbs / lossesPnl : 0,
      profitFactor,
    };
  }

  // =========================
  // R MODE
  // =========================
  const winsR = graded.filter((t) => (t.rComputed || 0) > 0).length;
  const lossesR = graded.filter((t) => (t.rComputed || 0) < 0).length;
  const gradedCountR = winsR + lossesR;
  const winRateR = gradedCountR > 0 ? Math.round((winsR / gradedCountR) * 100) : 0;

  const total = graded.reduce((sum, t) => sum + (t.rComputed || 0), 0);

  const winSum = graded
    .filter((t) => (t.rComputed || 0) > 0)
    .reduce((sum, t) => sum + (t.rComputed || 0), 0);

  const lossSumAbs = Math.abs(
    graded
      .filter((t) => (t.rComputed || 0) < 0)
      .reduce((sum, t) => sum + (t.rComputed || 0), 0)
  );

  const profitFactor = lossSumAbs > 0 ? winSum / lossSumAbs : 0;

  return {
    totalTrades,
    wins: winsR,
    losses: lossesR,
    breakevens: breakevens.length, // ✅ ALWAYS present now
    winRate: winRateR,
    total: Number(total.toFixed(2)),
    avgWin: winsR > 0 ? Number((winSum / winsR).toFixed(2)) : 0,
    avgLoss: lossesR > 0 ? Number((lossSumAbs / lossesR).toFixed(2)) : 0,
    profitFactor: Number(profitFactor.toFixed(2)),
  };
}


// ============================================================================
// APP COMPONENT
// ============================================================================


// showToast is now inside App component using context
// =========================
// Helpers (backend payload)
// =========================
function toNumOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapLocalTradeToBackend(td) {
  const instrumentRaw =
    td.instrument ??
    td.symbol ??
    td.ticker ??
    td.pair ??
    td.market ??
    "";
  const instrument = String(instrumentRaw).trim().toUpperCase();

  const sideRaw = String(td.direction ?? td.side ?? "long").toLowerCase();
  const direction = sideRaw === "short" ? "short" : "long";

  const entry = toNumOrNull(td.entry ?? td.entryPrice ?? td.entry_price ?? td.entry_value);
  const exit = toNumOrNull(td.exit ?? td.exitPrice ?? td.actualExit);
  const stop_loss = toNumOrNull(td.stop_loss ?? td.stopPrice ?? td.stop ?? td.sl);
  const take_profit = toNumOrNull(td.take_profit ?? td.target ?? td.tp ?? td.takeProfit);

  const pnl = toNumOrNull(
    td.dollarAmount ?? td.pnl ?? td.p_and_l ?? td.netPnl ?? td.net_pnl ?? td.profit
  );


  const lots = toNumOrNull(td.quantity ?? td.lots ?? td.volume) || 1;

  let result = td.result ?? null;

  // ✅ Force result recalculation based on current flags/values
  // This ensures toggling BE works even if 'result' was already set
  if (td.isBreakeven) {
    result = "breakeven";
  } else if (pnl !== null) {
    // If NOT explicitly BE, recalc based on PnL
    if (Math.abs(pnl) < 0.01) result = "breakeven";
    else if (pnl > 0) result = "win";
    else result = "loss";
  }
  // If no PnL and no BE flag, keep existing result or default to null

  const duration_min = toNumOrNull(td.durationMin ?? td.duration_min ?? td.duration);

  const sessionRaw =
    td.session ??
    td.sessionName ??
    td.tradeSession ??
    td.marketSession ??
    td.selectedSession ??
    null;
  const session = sessionRaw ? String(sessionRaw).trim() : null;

  const emotion = td.feeling ?? td.emotion ?? td.mood ?? null;

  let tags = null;
  if (Array.isArray(td.tags) && td.tags.length > 0) {
    tags = JSON.stringify(td.tags);
  }

  const notes = String(td.notes ?? "");

  const trade_date =
    td.trade_date ??
    td.date ??
    (td.startDateTime ? String(td.startDateTime).slice(0, 10) : null) ??
    new Date().toISOString().slice(0, 10);

  return {
    instrument,
    direction,
    entry,
    exit,
    stop_loss,
    take_profit,
    pnl,
    lots,
    result,
    duration_min,
    session,
    emotion,
    tags,
    notes,
    trade_date,
    screenshots: td.screenshots || [],
  };
}


export default function App() {
  const { addToast } = useToast();
  const showToast = (message) => addToast(message, 'info');

  const [urlKey, setUrlKey] = useState(0);
  useEffect(() => {
    const handlePop = () => setUrlKey(prev => prev + 1);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);










  // ============================
  // API (Laravel) - LOAD + CREATE
  // ============================
  const didAuthCheck = useRef(false);

  // ========================================================
  // PAYWALL (Trial Ended) - Frontend Gate
  // ========================================================
  const DODO_CHECKOUT_URL = "https://test.checkout.dodopayments.com/buy/pdt_0NY8yX8jUL9oTGkun3ifJ?quantity=1";

  const [isPaywalled, setIsPaywalled] = useState(false);
  const [paywallMeta, setPaywallMeta] = useState({ code: null, message: null });

  // ========================================================
  // PROMOTIONAL DEMO MOCK DATA
  // ========================================================
  const MOCK_USER = {
    id: 1,
    name: "Demo Trader",
    email: "demo@antigravity.com",
    plan: "pro",
    subscription_status: "active",
    email_verified_at: new Date().toISOString(),
    trial_ends_at: null
  };

  const MOCK_ACCOUNTS = [
    {
      id: "demo-acc-1",
      backendId: 101,
      name: "Main Portfolio",
      startingBalance: 10000,
      defaultRiskPct: 1,
      currency: "USD",
      trades: []
    },
    {
      id: "demo-acc-2",
      backendId: 102,
      name: "Aggressive Growth",
      startingBalance: 5000,
      defaultRiskPct: 2,
      currency: "USD",
      trades: []
    }
  ];

  const MOCK_TRADES = [
    { id: 1001, instrument: "NAS100", direction: "long", entry: 15400.5, exit: 15620.2, pnl: 450.00, lots: 1, result: "win", trade_date: "2026-02-10", notes: "Breakout play on H1", screenshots: [] },
    { id: 1002, instrument: "XAUUSD", direction: "short", entry: 2042.1, exit: 2038.5, pnl: 360.00, lots: 2, result: "win", trade_date: "2026-02-11", notes: "Resistance rejection", screenshots: [] },
    { id: 1003, instrument: "BTCUSDT", direction: "long", entry: 43200, exit: 42800, pnl: -400.00, lots: 0.1, result: "loss", trade_date: "2026-02-11", notes: "Stop hunted before pump", screenshots: [] },
    { id: 1004, instrument: "NAS100", direction: "long", entry: 15600, exit: 15600.5, pnl: 5.00, lots: 1, result: "breakeven", trade_date: "2026-02-12", notes: "Tightened SL too early", screenshots: [] },
    { id: 1005, instrument: "EURUSD", direction: "short", entry: 1.0850, exit: 1.0810, pnl: 400.00, lots: 5, result: "win", trade_date: "2026-02-12", notes: "Trend continuation", screenshots: [] },
  ];

  // Attach trades to the first account
  MOCK_ACCOUNTS[0].trades = MOCK_TRADES;


  // Fetch the logged-in user (Step 1: /me user context)
  async function apiMe() {
    return MOCK_USER;
  }

  // ========================================================
  // NUCLEAR MODE: Trades are UI-only (no backend connectivity)
  // ========================================================

  async function apiLoadTrades() {
    return MOCK_TRADES;
  }

  async function apiCreateTrade(payload) {
    return { ...payload, id: Math.floor(Math.random() * 1000000) };
  }

  async function apiUpdateTrade(id, payload) {
    return { ...payload, id };
  }

  async function apiDeleteTrade(id) {
    return;
  }

  async function apiUploadScreenshot(tradeId, file) {
    return { url: "https://via.placeholder.com/800x400?text=Demo+Screenshot" };
  }

  async function apiLoadAccounts() {
    return MOCK_ACCOUNTS;
  }

  async function apiCreateAccount(payload) {
    return { ...payload, id: Math.floor(Math.random() * 10000) };
  }

  async function apiUpdateAccount(id, payload) {
    return { ...payload, id };
  }

  async function apiDeleteAccount(id) {
    return;
  }








  const [deleteAccountId, setDeleteAccountId] = useState(null);

  const [authChecked, setAuthChecked] = useState(false);



  const [toastMessage, setToastMessage] = useState(null);
  const [backendSyncing, setBackendSyncing] = useState(false);
  const [tradeSaving, setTradeSaving] = useState(false);
  const [tradeDeleting, setTradeDeleting] = useState(false);




  // ============================
  // TEMP LOGIN TEST (REMOVE LATER)
  // ============================




  // ============================
  // API (Laravel) - LOAD + CREATE
  // ============================






  const handleDeleteAccount = async (accountId) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account?.backendId) return;

    try {
      // Delete account in backend (cascade deletes trades)
      await apiDeleteAccount(account.backendId);

      // Update frontend state
      setState((prev) => {
        if (prev.accounts.length <= 1) return prev;

        const remaining = prev.accounts.filter((a) => a.id !== accountId);
        if (remaining.length === 0) return prev;

        return {
          ...prev,
          accounts: remaining,
          activeAccountId: remaining[0].id,
        };
      });

      setToastMessage("Account deleted");
    } catch (e) {
      console.error("Failed to delete account:", e);
      setToastMessage("⚠️ Failed to delete account");
    }
  };

  useEffect(() => {
    window.apiLogin = apiLogin;
    window.ensureCsrf = ensureCsrf;
    console.log("✅ apiLogin exposed to window");
  }, []);

  // ✅ Handle Billing Return (Success/Refresh)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (path === '/billing/return' || params.has('subscription_id')) {
      (async () => {
        try {
          const user = await apiMe();
          const subActive = !!(user?.plan === 'pro' || user?.subscription_status === 'active');
          localStorage.setItem('lazy_is_subscribed_v1', subActive ? 'true' : 'false');

          setState(prev => ({
            ...prev,
            plan: user?.plan || 'trial',
            subscription_status: user?.subscription_status || null,
            isSubscribed: subActive
          }));

          if (user?.plan === 'pro' || user?.subscription_status === 'active' || user?.subscription_status === 'trialing') {
            showToast("Success! Your Pro status is active.", "success");
            // Clean up URL to just /billing
            window.history.replaceState({}, '', '/billing');
          }
        } catch (e) {
          console.error("Failed to refresh user after payment:", e);
        }
      })();
    }
  }, [urlKey]);

  // ============================
  // THEMED UI: Toast + Confirm
  // ============================


  useEffect(() => {
    if (!toastMessage) return;

    const t = setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => clearTimeout(t);
  }, [toastMessage]);


  const handleSwitchAccount = (id) => {
    setState((prev) => ({ ...prev, activeAccountId: id }));
  };

  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);


  const [state, setState] = useState({
    // ✅ NEW foundation
    accounts: MOCK_ACCOUNTS,
    activeAccountId: MOCK_ACCOUNTS[0].id,

    // ✅ keep your existing root settings
    isSubscribed: true,
    theme: 'light',
    username: MOCK_USER.email,
    displayName: MOCK_USER.name,
    emailVerified: MOCK_USER.email_verified_at,
    displayMode: 'pnl',
    plan: 'pro', // 'trial' or 'pro'
    subscription_status: 'active' // e.g. 'active', 'trialing', 'canceled'
  });



  const [confirmState, setConfirmState] = useState({ open: false, message: "", onYes: null });

  function askConfirm(message, onYes) {
    setConfirmState({ open: true, message, onYes });
  }

  const activeAccount =
    state.accounts.find(a => a.id === state.activeAccountId) || null;

  //const activeTrades = activeAccount?.trades || [];
  const activeTrades = activeAccount?.trades
    ? [...activeAccount.trades].sort((a, b) => {
      const aDate = a.startDateTime || a.date || '';
      const bDate = b.startDateTime || b.date || '';
      return bDate.localeCompare(aDate);  // Newest date first
    })
    : [];

  const balanceBeforeMap = buildBalanceBeforeMap(activeAccount);



  const currentBalance = getAccountCurrentBalance(activeAccount);

  const currentOneR =
    activeAccount
      ? (currentBalance * (Number(activeAccount.defaultRiskPct) || 0)) / 100
      : 0;


  const hasAccountSettings =
    !!activeAccount &&
    activeAccount.startingBalance != null &&
    activeAccount.defaultRiskPct != null;

  const canAddTrade =
    hasAccountSettings &&
    (state.isSubscribed || activeTrades.length < MAX_TRADES_FREE);




  useEffect(() => {
    if (!state.activeAccountId && state.accounts.length > 0) {
      setState(prev => ({ ...prev, activeAccountId: prev.accounts[0].id }));
    }
  }, [state.activeAccountId, state.accounts.length]);


  const [dateFilter, setDateFilter] = useState({ start: '', end: '' }); // YYYY-MM-DD
  const [filters, setFilters] = useState({
    ticker: '',
    direction: '', // 'buy' | 'sell' | ''
    outcome: '',   // 'win' | 'loss' | 'be' | ''
    tag: ''        // single tag for now (simple)
  });

  const [filterOpen, setFilterOpen] = useState(false);


  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('hideBalance') === 'true');

  useEffect(() => {
    localStorage.setItem('hideBalance', hideBalance);
  }, [hideBalance]);

  const [activePage, setActivePage] = useState(() => {
    const p = window.location.pathname;
    if (p === "/billing") return "billing";
    return "trades";
  });

  const [dateRange, setDateRange] = useState('week'); // 'today' | 'week' | 'month' | 'custom'
  const [customRange, setCustomRange] = useState({ start: '', end: '' }); // YYYY-MM-DD

  const [viewMode, setViewMode] = useState('cards');
  const [showMoodScreen, setShowMoodScreen] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);






  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    setIsLoggedIn(true);
    setAuthChecked(true);
  }, []);

  // ============================
  // AUTH BOOTSTRAP (RUN ONCE)
  // ============================
  const [storageHydrated, setStorageHydrated] = useState(false);
  const lastLoadedAccountIdRef = useRef(null);




  // =========================================================================
  // LOAD ACCOUNTS FROM BACKEND ON LOGIN
  // =========================================================================
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountCreating, setAccountCreating] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(null); // ID of account being deleted
  const [loggingOut, setLoggingOut] = useState(false);

  // ✅ 1) Preload mood emojis (runs once)
  useEffect(() => {
    MOODS.forEach((m) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = `/twemoji/svg/${m.hex}.svg`;
      document.head.appendChild(link);
    });
  }, []);

  // ✅ 2) Load accounts from backend when logged in
  useEffect(() => {
    if (!isLoggedIn || !authChecked) return;

    setAccountsLoading(true);

    apiLoadAccounts()
      .then((backendAccounts) => {
        setState((prev) => {
          const mappedAccounts = backendAccounts.map((ba) => ({
            id: String(ba.id),
            backendId: ba.id,
            name: ba.name,
            startingBalance: Number(ba.starting_balance) || 0,
            defaultRiskPct: ba.default_risk_pct,
            trades: [],
          }));

          return {
            ...prev,
            accounts: mappedAccounts,
            activeAccountId: mappedAccounts.length > 0 ? mappedAccounts[0].id : null,
          };
        });
      })
      .catch((e) => {
        console.error("Failed to load accounts:", e);
      })
      .finally(() => {
        setAccountsLoading(false);
      });
  }, [isLoggedIn, authChecked]);

  // ✅ 3) Save state to localStorage (only while logged in)
  useEffect(() => {
    if (!isLoggedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isLoggedIn]);

  // ✅ 4) Load trades for active account (only when logged in)
  useEffect(() => {
    if (!isLoggedIn || !activeAccount) return;

    // prevent re-loading for the same account repeatedly
    if (lastLoadedAccountIdRef.current === state.activeAccountId) return;
    lastLoadedAccountIdRef.current = state.activeAccountId;

    setBackendSyncing(true);

    apiLoadTrades()
      .then((backendTrades) => {
        setState((prev) => {
          const nextAccounts = prev.accounts.map((acc) => {
            if (acc.id !== prev.activeAccountId) return acc;

            const accountTrades = backendTrades.filter((bt) => {
              const tradeAccountId = bt.account_id ? Number(bt.account_id) : null;
              const currentAccountId = acc.backendId ? Number(acc.backendId) : null;
              return tradeAccountId === currentAccountId || bt.account_id === null;
            });

            const existingBackendIds = new Set(
              (acc.trades || []).map((t) => String(t.backendId)).filter(Boolean)
            );

            const mapped = accountTrades
              .filter((bt) => !existingBackendIds.has(String(bt.id)))
              .map((bt) => {
                const resultRaw = String(bt.result || "").toLowerCase();
                const isBE = resultRaw === "breakeven" || resultRaw === "be";

                return {
                  id: `b_${bt.id}`,
                  backendId: bt.id,
                  createdAt: bt.created_at ? new Date(bt.created_at).getTime() : Date.now(),

                  ticker: bt.instrument,
                  side: bt.direction,

                  entryPrice: bt.entry ?? null,
                  stopPrice: bt.stop_loss ?? null,
                  exitPrice: bt.take_profit ?? null,

                  notes: bt.notes ?? "",
                  dollarAmount: Number(bt.pnl) || 0,
                  feeling: bt.emotion || "😑",
                  tags: bt.tags ? JSON.parse(bt.tags) : [],
                  screenshots: bt.screenshots || [],
                  session: bt.session || "",
                  date: bt.trade_date || (bt.created_at || "").slice(0, 10),
                  startDateTime: bt.trade_date
                    ? `${bt.trade_date.slice(0, 10)}T12:00`
                    : bt.created_at
                      ? bt.created_at.slice(0, 16)
                      : "",
                  endDateTime: "",
                  time: "",
                  durationMin: bt.duration_min,
                  pnlPercent: null,
                  riskPctUsed: null,
                  isBreakeven: isBE,
                  quantity: bt.lots,
                };
              });

            return {
              ...acc,
              trades: [...mapped, ...(acc.trades || [])],
            };
          });

          return { ...prev, accounts: nextAccounts };
        });

        setBackendSyncing(false);
      })
      .catch((e) => {
        console.error(e);
        setBackendSyncing(false);
      });
  }, [state.activeAccountId, isLoggedIn, activeAccount]);

  // =========================================================================
  // ROUTING & GATES
  // =========================================================================
  const path = window.location.pathname;

  // 1. Public Routes (No Auth Needed)
  if (path === '/forgot-password') return (
    <Suspense fallback={<PageLoader />}>
      <ForgotPasswordPage />
    </Suspense>
  );
  if (path.startsWith('/reset-password') || path.startsWith('/password-reset')) return (
    <Suspense fallback={<PageLoader />}>
      <ResetPasswordPage />
    </Suspense>
  );

  // 2. Auth Loading
  if (!authChecked) {
    return <PageLoader text="Verifying session..." />;
  }

  // 3. Login Gate
  if (!isLoggedIn) {

    if (path === '/signup') {
      return (
        <Suspense fallback={<PageLoader />}>
          <AuthPage initialMode="signup" />
        </Suspense>
      );
    }
    // Default for /login or any other protected route is to show Login
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthPage initialMode="signin" />
      </Suspense>
    );
  }

  // 4. Verification Gate (Logged In Users)
  // If user is on /verify-email OR we want to force them (if they have no email_verified_at)
  const isVerifying = path === '/verify-email';
  const needsVerification = !state.emailVerified;

  if (isVerifying) {
    return (
      <Suspense fallback={<PageLoader />}>
        <VerifyEmailPage user={{ email: state.username, email_verified_at: state.emailVerified }} onLogout={handleLogout} />
      </Suspense>
    );
  }

  // Optional: Force Verification globally?
  // if (needsVerification && path !== '/') { return <VerifyEmailPage ... />; }

  // 4b. Billing Route (logged-in users)
  if (path === '/billing') {
    return (
      <div className="min-h-screen bg-[#F7F9FB] dark:bg-slate-950 relative transition-colors duration-300">
        <div className="flex min-h-screen">
          <Sidebar
            sidebarOpen={sidebarOpen}
            showToast={showToast}
            openConfirm={askConfirm}
            activePage="billing"
            onNavigate={(page) => { setActivePage(page); window.history.pushState({}, '', page === 'billing' ? '/billing' : '/'); }}
            setSidebarOpen={setSidebarOpen}
            trades={[]}
            stats={{}}
            onLogout={handleLogout}
            isLoggingOut={loggingOut}
            username={state.username}
            displayName={state.displayName}
            exportBackup={exportBackup}
            restoreBackup={state.isSubscribed ? restoreBackup : () => showToast("Restore is a Pro feature. Upgrade to enable.", "warning")}
            STORAGE_KEY={STORAGE_KEY}
            isPro={state.isSubscribed}
            onOpenSupport={() => setIsSupportModalOpen(true)}
          />
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto py-10 px-4">
              <PaywallCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. App Loading (Accounts)
  if (accountsLoading) {
    return <PageLoader text="Loading your accounts..." />;
  }

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleLogin = async () => {
    setLoginError('');

    const email = String(loginEmail || '').trim();
    const password = String(loginPassword || '');

    if (!email || !password) {
      setLoginError('Email and password are required.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await apiLogin(email, password); // ✅ calls Laravel

      // if backend says ok, log in
      if (res?.ok) {
        // Clear local storage and reset state for new user
        localStorage.removeItem(STORAGE_KEY);
        setState({
          accounts: [],
          activeAccountId: null,
          isSubscribed: false,
          theme: 'light',
          username: email,
          displayMode: 'pnl'
        });

        setLoginEmail('');
        setLoginPassword('');
        setIsLoggedIn(true);
      } else {
        setLoginError('Login failed. Check credentials.');
      }
    } catch (e) {
      setLoginError(e?.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };



  async function handleLogout() {
    try {
      setLoggingOut(true);
      await ensureCsrf();
      const xsrf = getCookie("XSRF-TOKEN");

      const res = await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
        },
      });

      console.log("logout status:", res.status, await res.text());
    } catch (e) {
      console.log("logout error", e);
    }

    setIsLoggedIn(false);

    // ✅ CLEAR LOCAL DATA ON LOGOUT
    localStorage.removeItem(STORAGE_KEY);

    setState({
      accounts: [],
      activeAccountId: null,
      isSubscribed: false,
      theme: 'light',
      username: '',
      displayMode: 'pnl'
    });
    setLoggingOut(false);
  }

  async function startCheckout(plan = "pro") {
    try {
      // Keep cookies / session working
      await ensureCsrf();

      const xsrf = getCookie("XSRF-TOKEN");

      // Use renamed endpoint to bypass AdBlock
      const res = await fetch(`${API_BASE}/api/subscription/upgrade`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
        },
        body: JSON.stringify({ plan }),
      });

      const text = await res.text().catch(() => "");
      let data = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!res.ok) {
        throw new Error(data?.message || `Checkout failed (${res.status})`);
      }

      const url = data?.checkout_url || data?.url;
      if (!url) throw new Error("No checkout_url returned from backend");

      window.location.href = url;
    } catch (e) {
      console.error(e);
      alert(e?.message || "Checkout failed");
    }
  }





  const handleAddButtonClick = () => {
    // 1) No account yet -> must create
    if (!activeAccount) {
      setCreateAccountOpen(true);
      return;
    }

    // 2) Account exists but missing required settings -> must edit
    if (activeAccount.startingBalance == null || activeAccount.defaultRiskPct == null) {
      setEditAccountOpen(true);
      return;
    }

    // 3) Trial limit -> block
    if (!state.isSubscribed && activeTrades.length >= MAX_TRADES_FREE) {
      return;
    }

    // 4) Normal flow
    setShowMoodScreen(true);
    setSelectedMood(null);
    setEditingTrade(null);
  };


  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    setShowMoodScreen(false);
    setShowTradeForm(true);
  };

  async function readError(res) {
    const text = await res.text().catch(() => "");
    try {
      const json = JSON.parse(text);
      const details = formatLaravelErrors(json?.errors);
      return details || json?.message || text || `HTTP ${res.status}`;
    } catch {
      return text || `HTTP ${res.status}`;
    }
  }

  function formatLaravelErrors(errors) {
    if (!errors || typeof errors !== "object") return null;

    // errors = { field: ["msg1", "msg2"], other: ["msg"] }
    const lines = [];
    for (const [field, msgs] of Object.entries(errors)) {
      const cleanField = String(field).replace(/_/g, " ");
      const text = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
      lines.push(`${cleanField}: ${text}`);
    }
    return lines.join(" | ");
  }
  function validateTradeInput(trade) {
    const errors = [];

    // ✅ Your local trade uses ticker + side
    const instrumentRaw =
      trade?.instrument ??
      trade?.ticker ??
      trade?.symbol ??
      trade?.pair ??
      trade?.market ??
      "";

    const instrument = String(instrumentRaw || "").trim();
    if (!instrument) errors.push("Instrument is required.");

    const directionRaw = trade?.direction ?? trade?.side ?? "";
    const direction = String(directionRaw || "").trim();
    if (!direction) errors.push("Direction is required.");

    const dateRaw =
      trade?.trade_date ??
      trade?.date ??
      (trade?.startDateTime ? String(trade.startDateTime).slice(0, 10) : "");

    const date = String(dateRaw || "").trim();
    if (!date) errors.push("Trade date is required.");

    // ✅ Validate numbers for BOTH backend-style + your local field names
    const numericCandidates = [
      trade?.entry, trade?.entryPrice,
      trade?.stop_loss, trade?.stopPrice,
      trade?.take_profit, trade?.exitPrice,
    ];

    for (const v of numericCandidates) {
      if (v === null || v === undefined || v === "") continue;
      const num = Number(v);
      if (Number.isNaN(num)) {
        errors.push("Price fields must be valid numbers.");
        break;
      }
    }

    return errors;
  }

  function calcRMultiple(trade) {
    const entry = Number(trade?.entryPrice ?? trade?.entry ?? "");
    const stop = Number(trade?.stopPrice ?? trade?.stop_loss ?? "");
    const tp = Number(trade?.exitPrice ?? trade?.take_profit ?? "");

    if ([entry, stop, tp].some((n) => Number.isNaN(n))) return null;

    const risk = Math.abs(entry - stop);
    if (!risk || risk === 0) return null;

    const reward = Math.abs(tp - entry);
    const r = reward / risk;

    if (!Number.isFinite(r)) return null;
    return r;
  }








  const handleAddTrade = (tradeData) => {
    if (!state.isSubscribed && activeTrades.length >= MAX_TRADES_FREE) {
      alert(`Trial limited to ${MAX_TRADES_FREE} trades. Upgrade to unlock.`);
      return;
    }

    const validationErrors = validateTradeInput(tradeData);
    if (validationErrors.length > 0) {
      setToastMessage(`⚠️ ${validationErrors[0]}`);
      return;
    }

    if (!activeAccount) {
      alert("Create an account first.");
      return;
    }

    setTradeSaving(true);

    const files = Array.isArray(tradeData?.__screenshotFiles)
      ? tradeData.__screenshotFiles
      : [];

    // OPTIMISTIC UPDATE: Update UI immediately before API call

    // -------------------------------------------------------------------------
    // CASE 1: UPDATE EXISTING TRADE
    // -------------------------------------------------------------------------
    if (editingTrade && (editingTrade.backendId || null)) {
      const prevTrade = { ...editingTrade }; // Snapshot for rollback

      // 1. Update UI Optimistically
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((acc) => {
          if (acc.id !== prev.activeAccountId) return acc;
          return {
            ...acc,
            trades: acc.trades.map((t) =>
              t.id === editingTrade.id
                ? { ...t, ...tradeData, backendId: editingTrade.backendId }
                : t
            ),
          };
        }),
      }));

      setToastMessage("✅ Updated");
      window.dispatchEvent(new CustomEvent('trades:changed'));
      setShowTradeForm(false);
      setSelectedMood(null);
      setEditingTrade(null);
      setSelectedTrade(null);

      // 2. Call API in background
      apiUpdateTrade(editingTrade.backendId, mapLocalTradeToBackend(tradeData))
        .then(async () => {
          // ✅ Upload screenshots on EDIT too
          if (editingTrade.backendId && files.length > 0) {
            const results = await Promise.all(
              files.slice(0, MAX_SCREENSHOTS).map((file) =>
                apiUploadScreenshot(editingTrade.backendId, file)
              )
            );

            // ✅ prefer screenshots array returned from backend (truth)
            const lastScreens = results
              .map((r) => r?.screenshots)
              .filter((arr) => Array.isArray(arr) && arr.length > 0)
              .pop();

            const urls = results.map((r) => r?.url).filter(Boolean);
            const nextScreens = Array.isArray(lastScreens) ? lastScreens : urls;

            if (nextScreens.length > 0) {
              setState((prev) => ({
                ...prev,
                accounts: prev.accounts.map((acc) => {
                  if (acc.id !== prev.activeAccountId) return acc;
                  return {
                    ...acc,
                    trades: acc.trades.map((t) =>
                      t.id === editingTrade.id
                        ? { ...t, screenshots: nextScreens, backendId: editingTrade.backendId }
                        : t
                    ),
                  };
                }),
              }));
            }

            // ✅ DO NOT call apiUpdateTrade(...) with screenshots anymore.
          }
        })
        .catch((e) => {
          // 3. Rollback on failure
          console.error("Update failed, rolling back", e);
          setToastMessage(`⚠️ Update failed. Reverting...`);

          setState((prev) => ({
            ...prev,
            accounts: prev.accounts.map((acc) => {
              if (acc.id !== prev.activeAccountId) return acc;
              return {
                ...acc,
                trades: acc.trades.map((t) =>
                  t.id === editingTrade.id ? prevTrade : t
                ),
              };
            }),
          }));
        })
        .finally(() => setTradeSaving(false));

      return;
    }

    // -------------------------------------------------------------------------
    // CASE 2: CREATE NEW TRADE
    // -------------------------------------------------------------------------

    // 1. Create Temp ID and Update UI Optimistically
    const tempId = "temp_" + Date.now();
    const tempTrade = {
      ...tradeData,
      id: tempId,
      backendId: null, // Will be filled after API success
      createdAt: Date.now(),
      account_id: activeAccount.backendId,
    };

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) => {
        if (acc.id !== prev.activeAccountId) return acc;
        return {
          ...acc,
          trades: [tempTrade, ...(acc.trades || [])],
        };
      }),
    }));

    setToastMessage("✅ Saved");
    window.dispatchEvent(new CustomEvent('trades:changed'));
    setShowTradeForm(false);
    setSelectedMood(null);
    setEditingTrade(null);
    setSelectedTrade(null);

    // 2. Call API in background
    apiCreateTrade(mapLocalTradeToBackend(tradeData))
      .then((created) => {
        const realId = String(created?.id ?? "");

        // 3. Replace temp ID with real ID
        setState((prev) => ({
          ...prev,
          accounts: prev.accounts.map((acc) => {
            if (acc.id !== prev.activeAccountId) return acc;
            return {
              ...acc,
              trades: acc.trades.map(t =>
                t.id === tempId
                  ? { ...t, id: realId, backendId: realId }
                  : t
              ),
            };
          }),
        }));

        // 4. Upload screenshots if any
        if (realId && files.length > 0) {
          Promise.all(
            files.slice(0, MAX_SCREENSHOTS).map((file) =>
              apiUploadScreenshot(realId, file)
            )
          )
            .then((results) => {
              // ✅ backend returns { url, screenshots }
              const lastScreens = results
                .map((r) => r?.screenshots)
                .filter((arr) => Array.isArray(arr) && arr.length > 0)
                .pop();

              const urls = results.map((r) => r?.url).filter(Boolean);
              const nextScreens = Array.isArray(lastScreens) ? lastScreens : urls;

              if (nextScreens.length > 0) {
                setState((prev) => ({
                  ...prev,
                  accounts: prev.accounts.map((acc) => {
                    if (acc.id !== prev.activeAccountId) return acc;
                    return {
                      ...acc,
                      trades: acc.trades.map((t) =>
                        t.id === realId ? { ...t, screenshots: nextScreens } : t
                      ),
                    };
                  }),
                }));
              }

              // ✅ DO NOT call apiUpdateTrade(...) anymore. Backend already saved screenshots.
            })
            .catch((err) => {
              setToastMessage(
                `⚠️ Trade saved, screenshot upload failed: ${String(
                  err?.message || "Unknown error"
                )}`
              );
            });
        }
        setToastMessage("✅ Saved");

        window.dispatchEvent(new CustomEvent('trades:changed'));

        setShowTradeForm(false);

        // close modal only after backend success
        setShowTradeForm(false);
        setSelectedMood(null);
        setEditingTrade(null);
        setSelectedTrade(null);
      })
      .catch((e) => {
        setToastMessage(
          `⚠️ Save failed: ${String((e && e.message) || "Unknown error")}`
        );
      })
      .finally(() => setTradeSaving(false));
  };


  const handleEditTrade = (trade) => {
    setEditingTrade(trade);
    setSelectedMood(trade.feeling);
    setShowTradeForm(true);
    setSelectedTrade(null);
  };

  const handleDeleteTrade = (id) => {
    if (!activeAccount) return;

    // Find the trade before deleting (need backendId)
    const tradeToDelete =
      (activeAccount.trades || []).find((t) => t.id === id) || null;

    // Optimistic delete: remove instantly, no loading state needed globally
    // setTradeDeleting(true); <--- REMOVED to fix "stuck deleting" bug

    // If there is no backendId, we cannot delete on backend.
    // In your current phase you said you have no legacy data, so this should basically never happen.

    // OPTIMISTIC DELETION

    const prevAccounts = [...state.accounts]; // Snapshot for rollback

    // 1. Remove locally immediately
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) =>
        acc.id === prev.activeAccountId
          ? { ...acc, trades: (acc.trades || []).filter((t) => t.id !== id) }
          : acc
      ),
    }));

    setShowDeleteConfirm(null);
    setSelectedTrade(null);
    setToastMessage("🗑️ Deleted");
    window.dispatchEvent(new CustomEvent('trades:changed'));

    // 2. Call API in background
    apiDeleteTrade(tradeToDelete.backendId)
      .catch((e) => {
        // 3. Rollback on failure
        console.error("Delete failed, rolling back", e);
        setToastMessage(`⚠️ Delete failed. Restoring...`);

        setState((prev) => ({
          ...prev,
          accounts: prevAccounts
        }));
      });
    // .finally(() => setTradeDeleting(false)); <--- REMOVED
  };


  const toggleDisplayMode = () => {
    setState(prev => ({
      ...prev,
      displayMode: prev.displayMode === 'pnl' ? 'r' : 'pnl'
    }));
  };

  const handleToggleBreakeven = (id) => {
    if (!activeAccount) return;

    // 1. Find the trade in the current active account
    const trade = activeAccount.trades.find(t => t.id === id);
    if (!trade) return;

    // 2. New value
    const newVal = !trade.isBreakeven;

    // 3. Optimistic update (Local State)
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(acc =>
        acc.id === prev.activeAccountId
          ? {
            ...acc,
            trades: acc.trades.map(t =>
              t.id === id ? { ...t, isBreakeven: newVal } : t
            ),
          }
          : acc
      )
    }));

    // Keep selectedTrade in sync so UI updates instantly
    setSelectedTrade(prev =>
      prev && prev.id === id ? { ...prev, isBreakeven: newVal } : prev
    );

    // 4. Backend update (Critical for Analytics)
    if (trade.backendId) {
      // Create updated trade object to generate correct payload
      const updatedTrade = { ...trade, isBreakeven: newVal };
      const payload = mapLocalTradeToBackend(updatedTrade);

      console.log("Saving Breakeven Toggle:", { id, newVal, payload }); // ✅ DEBUG LOG

      apiUpdateTrade(trade.backendId, payload)
        .then(() => {
          // Notify AnalyticsUI to reload
          window.dispatchEvent(new CustomEvent('trades:changed'));
          setToastMessage(newVal ? "Marked as Breakeven" : "Unmarked Breakeven");
        })
        .catch(e => {
          console.error("Failed to update breakeven status:", e);
          setToastMessage("⚠️ Failed to save status");
          // Optionally revert state here if strict consistency is needed
        });
    }
  };


  // =========================================================================
  // LOGIN SCREEN
  // =========================================================================
  // ✅ Add this ABOVE your "if (!isLoggedIn)"
  if (!authChecked) {
    return <PageLoader text="Verifying session..." />;
  }


  if (!isLoggedIn) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthPage />
      </Suspense>
    );
  }

  // Show loading screen while accounts are being loaded
  if (accountsLoading) {
    return <PageLoader text="Loading your accounts..." />;
  }




  // =========================================================================
  // MAIN APP
  // =========================================================================

  function isInRange(tradeDateStr, range, custom) {
    if (!tradeDateStr) return false;
    const d = new Date(tradeDateStr + 'T00:00:00');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === 'today') return d >= todayStart;

    if (range === 'week') {
      const day = (todayStart.getDay() + 6) % 7; // Monday start
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - day);
      return d >= weekStart;
    }

    if (range === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= monthStart;
    }

    if (range === 'custom') {
      if (!custom.start && !custom.end) return true;
      const start = custom.start ? new Date(custom.start + 'T00:00:00') : new Date('1970-01-01');
      const end = custom.end ? new Date(custom.end + 'T23:59:59') : new Date('2999-12-31');
      return d >= start && d <= end;
    }

    return true;
  }


  // ---------------------------------------------------------------------------
  // FILTERED TRADES (clean)
  // ---------------------------------------------------------------------------
  const filteredTrades = (activeTrades || []).filter((t) => {
    // must have date if date filter is active
    if ((dateFilter.start || dateFilter.end) && !t.date) return false;

    // --- date range filter ---
    if (dateFilter.start || dateFilter.end) {
      const d = new Date(t.date + 'T00:00:00');

      const start = dateFilter.start
        ? new Date(dateFilter.start + 'T00:00:00')
        : new Date('1970-01-01T00:00:00');

      const end = dateFilter.end
        ? new Date(dateFilter.end + 'T23:59:59')
        : new Date('2999-12-31T23:59:59');

      if (!(d >= start && d <= end)) return false;
    }

    // --- ticker ---
    if (filters.ticker) {
      if ((t.ticker || '').toUpperCase() !== filters.ticker.toUpperCase()) return false;
    }

    // --- direction ---
    if (filters.direction) {
      if ((t.side || '').toLowerCase() !== filters.direction.toLowerCase()) return false;
    }

    // --- tag ---
    if (filters.tag) {
      const has = (t.tags || []).some((tag) => equalsTag(tag, filters.tag));
      if (!has) return false;
    }

    // --- outcome: win / loss / be ---
    if (filters.outcome) {
      const isBE = !!t.isBreakeven;

      if (filters.outcome === 'be') {
        if (!isBE) return false;
      } else {
        if (isBE) return false;

        if (state.displayMode === 'pnl') {
          if (filters.outcome === 'win' && !(Number(t.dollarAmount) > 0)) return false;
          if (filters.outcome === 'loss' && !(Number(t.dollarAmount) < 0)) return false;
        } else {
          const r = getTradeR(t, activeAccount, balanceBeforeMap);
          if (filters.outcome === 'win' && !(r > 0)) return false;
          if (filters.outcome === 'loss' && !(r < 0)) return false;
        }
      }
    }

    return true;
  });

  // stats trades (attach rComputed if needed)
  const tradesForStats =
    state.displayMode === 'pnl'
      ? filteredTrades
      : filteredTrades.map((t) => ({
        ...t,
        rComputed: getTradeR(t, activeAccount, balanceBeforeMap),
      }));

  const stats = {
    ...calculateStats(tradesForStats, state.displayMode),
    startingBalance: activeAccount?.startingBalance ?? null,
  };

  function PaywallCard() {
    const [billingCycle, setBillingCycle] = useState('monthly');

    return (
      <div className="w-full">
        <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 sm:p-8 transition-colors">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-4">
              Pricing
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Simple, transparent pricing
            </h2>

            <p className="mt-3 text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto font-medium">
              Start free, upgrade when you&apos;re ready. No hidden fees.
            </p>

            {/* Toggle */}
            <div className="mt-6 inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-1.5 py-1.5 shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all ${billingCycle === 'monthly'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all ${billingCycle === 'yearly'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                Yearly
              </button>
              <span className="ml-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                Save 20%
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-2 sm:px-6 pb-6">
            {/* Free */}
            <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Free</h3>

              <div className="mt-2 flex items-end gap-2">
                <div className="text-3xl font-extrabold text-slate-900">$0</div>
                <div className="text-slate-500 pb-1 text-sm">for 14 days</div>
              </div>

              <p className="mt-2 text-slate-600 text-sm">Basic tracking to get started</p>

              <ul className="mt-6 space-y-3 text-slate-700 text-sm">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Full access for 14 days</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Unlimited trades</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Basic analytics</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Screenshot attachments</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Email support</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-10 w-full rounded-full border border-black/10 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Logout
              </button>

              <p className="mt-4 text-xs text-slate-500">
                Code: <span className="font-mono">{paywallMeta?.code || "TRIAL_ENDED"}</span>
              </p>
            </div>

            {/* Pro */}
            <div className="relative bg-blue-50/60 border border-blue-500/60 rounded-3xl p-6 shadow-sm">
              <div className="absolute left-1/2 -top-3 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-blue-600 text-[10px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900">Pro</h3>

              <div className="mt-2 flex items-end gap-2">
                <div className="text-3xl font-extrabold text-slate-900">$7.90</div>
                <div className="text-slate-500 pb-1 text-sm">/month</div>
              </div>

              <p className="mt-2 text-slate-600 text-sm">Everything you need to improve</p>

              <ul className="mt-6 space-y-3 text-slate-700 text-sm">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Unlimited trades</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Advanced analytics &amp; reports</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Session &amp; instrument breakdown</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>R-multiple tracking</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Priority support</span>
                </li>
              </ul>

              {state.isSubscribed ? (
                <div className="mt-10 space-y-3">
                  <div className="w-full rounded-full bg-emerald-50 border border-emerald-200 px-6 py-3 font-semibold text-emerald-700 text-center">
                    Current Plan: Pro
                  </div>
                  <button
                    type="button"
                    onClick={() => { window.open(`${API_BASE}/api/billing/portal`, '_blank'); }}
                    className="block w-full rounded-full bg-white border border-slate-200 px-6 py-3 font-semibold text-slate-700 text-center hover:bg-slate-50 transition"
                  >
                    Manage Subscription
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startCheckout('pro')}
                  className="mt-10 block w-full rounded-full bg-blue-600 px-6 py-4 font-bold text-white shadow-lg hover:bg-blue-700 transition transform hover:-translate-y-1"
                >
                  {state.subscription_status === 'canceled' ? 'Re-activate Pro →' : 'Get Started →'}
                </button>
              )}

              <p className="mt-4 text-xs text-slate-500">
                Your data stays safe. Upgrade unlocks instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }





  return (
    <>
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        showToast={showToast}
      />

      {/* MAIN WRAPPER */}
      {/* MAIN WRAPPER */}
      <div className="min-h-screen bg-[#F7F9FB] dark:bg-slate-950 relative transition-colors duration-300">

        {/* Blur wrapper for paywall */}
        <div className={`flex min-h-screen ${isPaywalled ? "blur-sm opacity-20 pointer-events-none select-none" : ""}`}>

          {/* Sidebar */}
          <Sidebar
            sidebarOpen={sidebarOpen}
            showToast={showToast}
            openConfirm={askConfirm}
            activePage={activePage}
            onNavigate={(page) => { setActivePage(page); window.history.pushState({}, '', page === 'billing' ? '/billing' : '/'); }}
            setSidebarOpen={setSidebarOpen}
            trades={filteredTrades}
            stats={stats}
            onLogout={handleLogout}
            isLoggingOut={loggingOut}
            username={state.username}
            displayName={state.displayName}
            exportBackup={exportBackup}
            restoreBackup={state.isSubscribed ? restoreBackup : () => showToast("Restore is a Pro feature. Upgrade to enable.", "warning")}
            STORAGE_KEY={STORAGE_KEY}
            isPro={state.isSubscribed}
            onOpenSupport={() => setIsSupportModalOpen(true)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              trades={filteredTrades}
              stats={stats}
              backendSyncing={backendSyncing}
              activePage={activePage}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              displayMode={state.displayMode}
              onToggleDisplayMode={toggleDisplayMode}
              onOpenFilter={() => setFilterOpen(true)}
              onCreateAccount={() => setCreateAccountOpen(true)}
              onEditAccount={() => setEditAccountOpen(true)}
              accounts={state.accounts}
              activeAccountId={state.activeAccountId}
              onSwitchAccount={handleSwitchAccount}
            />

            <div className="flex-1 overflow-y-auto">
              <div className="pb-6">
                {/* TRADES ONLY */}
                {activePage === "trades" && (
                  <>
                    <div className="pb-6">
                      <BalanceSummary
                        stats={{
                          ...stats,
                          onEditAccount: hasAccountSettings ? () => setEditAccountOpen(true) : null,
                        }}
                        displayMode={state.displayMode}
                        trades={filteredTrades}
                        currentBalance={currentBalance}
                        defaultRiskPct={activeAccount?.defaultRiskPct ?? null}
                        currentOneR={currentOneR}
                        hideBalance={hideBalance}
                        setHideBalance={setHideBalance}
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <div className="p-6">
                        <div className="pt-4 bg-[white] dark:bg-slate-900/90 opacity-90 rounded-xl p-6 border border-black/5 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Recent Trades</h2>
                            <div className="mb- flex justify-center">
                              <TradeViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                            </div>
                          </div>

                          {backendSyncing && filteredTrades.length === 0 ? (
                            viewMode === "cards" ? <TradeListSkeleton /> : <TradeTableSkeleton />
                          ) : filteredTrades.length === 0 ? (
                            <EmptyState
                              icon={TrendingUp}
                              title={activeTrades.length === 0 ? "No trades yet" : "No trades found"}
                              description={
                                activeTrades.length === 0
                                  ? "Record your first trade to start tracking your journey."
                                  : "Try adjusting your filters to see more trades."
                              }
                              actionLabel={activeTrades.length === 0 ? "Add Trade" : "Clear Filters"}
                              onAction={
                                activeTrades.length === 0
                                  ? handleAddButtonClick
                                  : () => setFilters({ ticker: '', direction: '', outcome: '', tag: '' })
                              }
                            />
                          ) : viewMode === "cards" ? (
                            <TradeFeed
                              trades={filteredTrades}
                              onSelectTrade={setSelectedTrade}
                              displayMode={state.displayMode}
                              activeAccount={activeAccount}
                              balanceBeforeMap={balanceBeforeMap}
                              isLoading={backendSyncing}
                            />
                          ) : (
                            <TradeLogTable
                              trades={filteredTrades}
                              onSelectTrade={setSelectedTrade}
                              displayMode={state.displayMode}
                              activeAccount={activeAccount}
                              balanceBeforeMap={balanceBeforeMap}
                            />
                          )}

                          {activeAccount && !state.isSubscribed && activeTrades.length >= MAX_TRADES_FREE && (
                            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                              <p className="text-yellow-800 font-semibold">
                                Trial limited to {MAX_TRADES_FREE} trades
                              </p>
                              <button
                                onClick={() => setState((prev) => ({ ...prev, isSubscribed: true }))}
                                className="mt-3 bg-yellow-500 text-white px-6 py-2 rounded-xl font-medium hover:bg-yellow-600 transition-colors"
                              >
                                Unlock (Demo)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* OTHER PAGES ONLY */}
                <Suspense fallback={<PageLoader />}>
                  {activePage === "analytics" && (
                    <AnalyticsUI
                      trades={activeTrades}
                      startingBalance={Number(activeAccount?.startingBalance) || 0}
                      isActive={activePage === "analytics"}
                      isLoading={backendSyncing}
                    />
                  )}

                  {activePage === "calendar" && <CalendarUI trades={activeTrades} />}
                  {activePage === "journal" && <JournalUI />}
                  {activePage === "setting" && <SettingsPage />}
                  {activePage === "billing" && (
                    <div className="max-w-6xl mx-auto py-10 px-4">
                      <PaywallCard />
                    </div>
                  )}
                </Suspense>
              </div>
            </div>
          </div>

          {/* Floating button INSIDE wrapper */}
          <FloatingAddButton onClick={handleAddButtonClick} disabled={!canAddTrade} />
        </div>

        {/* Paywall overlay (OUTSIDE flex container) */}
        {isPaywalled && (
          <div className="absolute inset-0 z-50 flex items-center justify-center px-6 py-16">
            <div className="absolute inset-0 bg-[#F7F9FB]/40" />
            <div className="relative w-full max-w-6xl">
              <PaywallCard />
            </div>
          </div>
        )}
      </div>


      {/* Confirm Modal (themed) */}
      {confirmState.open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setConfirmState({ open: false, message: "", onYes: null })}
          />
          <div className="relative w-[92%] max-w-md rounded-[28px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.25)] p-5">
            <div className="text-slate-900 font-semibold mb-2">Confirm</div>
            <div className="text-slate-700 text-sm mb-4">{confirmState.message}</div>

            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-2xl bg-white/60 border border-white/70 hover:bg-white/80 transition-all text-sm"
                onClick={() => setConfirmState({ open: false, message: "", onYes: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-2xl bg-slate-900 text-white hover:opacity-90 transition-all text-sm"
                onClick={() => {
                  const fn = confirmState.onYes;
                  setConfirmState({ open: false, message: "", onYes: null });
                  if (fn) fn();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODALS OUTSIDE MAIN WRAPPER (cleaner, avoids layout clipping) */}
      <CreateAccountModal
        open={createAccountOpen}
        isLoading={accountCreating}
        onClose={() => setCreateAccountOpen(false)}
        onCreate={async ({ name, startingBalance, defaultRiskPct }) => {
          try {
            setAccountCreating(true);
            // Create account in backend
            const backendAccount = await apiCreateAccount({
              name,
              starting_balance: startingBalance,
              default_risk_pct: defaultRiskPct,
            });

            // Add to frontend state
            const acc = {
              id: String(backendAccount.id),
              backendId: backendAccount.id,
              name: backendAccount.name,
              startingBalance: backendAccount.starting_balance,
              defaultRiskPct: backendAccount.default_risk_pct,
              trades: [],
            };

            setState((prev) => ({
              ...prev,
              accounts: [acc, ...prev.accounts],
              activeAccountId: acc.id,
            }));

            setCreateAccountOpen(false);
            setToastMessage("Account created!");
          } catch (err) {
            console.error(err);
            alert("Failed to create account");
            setToastMessage("⚠️ Failed to create account");
          } finally {
            setAccountCreating(false);
          }
        }}
      />

      <EditAccountModal
        open={editAccountOpen}
        onClose={() => setEditAccountOpen(false)}
        account={activeAccount}
        onDelete={() => setDeleteAccountId(activeAccount?.id)}
        isLastAccount={state.accounts.length === 1}
        onSave={async ({ name, startingBalance, defaultRiskPct }) => {
          if (!activeAccount?.backendId) return;

          try {
            // Update account in backend
            await apiUpdateAccount(activeAccount.backendId, {
              name,
              starting_balance: startingBalance,
              default_risk_pct: defaultRiskPct,
            });

            // Update frontend state
            setState((prev) => ({
              ...prev,
              accounts: prev.accounts.map((a) =>
                a.id === prev.activeAccountId
                  ? { ...a, name, startingBalance, defaultRiskPct }
                  : a
              ),
            }));

            setEditAccountOpen(false);
            setToastMessage("Account updated!");
          } catch (e) {
            console.error("Failed to update account:", e);
            setToastMessage("⚠️ Failed to update account");
          }
        }}
      />

      {showMoodScreen && (
        <MoodScreen
          onSelectMood={handleMoodSelect}
          onClose={() => setShowMoodScreen(false)}
          isEditing={!!editingTrade}
        />
      )}

      {showTradeForm && selectedMood && (
        <TradeFormModal
          onClose={() => {
            setShowTradeForm(false);
            setSelectedMood(null);
            setEditingTrade(null);
          }}
          onSubmit={handleAddTrade}
          saving={tradeSaving}

          mood={selectedMood}
          trade={editingTrade}
          displayMode={state.displayMode}
          activeAccount={activeAccount}
        />
      )}

      {selectedTrade && (
        <ExpandedTradeModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onEdit={() => handleEditTrade(selectedTrade)}
          onDeleteClick={() => setShowDeleteConfirm(selectedTrade.id)}
          onToggleBreakeven={() => handleToggleBreakeven(selectedTrade.id)}
          displayMode={state.displayMode}
          activeAccount={activeAccount}
          balanceBeforeMap={balanceBeforeMap}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={() => handleDeleteTrade(showDeleteConfirm)}
          deleting={tradeDeleting}

          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {deleteAccountId && (
        <DeleteConfirmModal
          title="Delete account?"
          message="This account and its trades will be permanently deleted. This can't be undone."
          confirmText="Delete account"
          onConfirm={() => {
            handleDeleteAccount(deleteAccountId);
            setDeleteAccountId(null);
            setEditAccountOpen(false);
            setToastMessage("Account deleted");
          }}
          onCancel={() => setDeleteAccountId(null)}
        />
      )}

      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        trades={activeTrades}
        filters={filters}
        setFilters={setFilters}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[6000]">
          <div className="px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg">
            {toastMessage}
          </div>





        </div>
      )}
    </>
  );
}
// ============================================================================
// COMPONENTS
// ============================================================================





function StartingBalanceModal({ open, initialValue, onClose, onSave }) {
  const [value, setValue] = useState(
    initialValue == null ? '' : String(initialValue)
  );

  useEffect(() => {
    if (open) setValue(initialValue == null ? '' : String(initialValue));
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  if (!open) return null;

  const handleSave = () => {
    const raw = String(value ?? '').trim();

    // ✅ user cleared it -> revert to "Not set"
    if (raw === '') {
      onSave(null);
      return;
    }

    const num = Number(raw);

    // ✅ block invalid
    if (!Number.isFinite(num) || num < 0) {
      // (no browser alert) just ignore OR you can show a small message later
      return;
    }

    onSave(num);
  };


  return (
    <div
      className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4"

    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-[#171717] dark:text-slate-100">Starting balance</div>
            <div className="text-xs text-[#64748B] dark:text-slate-400">Used to calculate your balance</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#64748B] dark:text-slate-400"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <label className="text-sm text-[#64748B] dark:text-slate-400 mb-2 block font-semibold">
            Amount ($)
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 4000"
            className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#171717] dark:text-slate-200 focus:border-[#2563EB] focus:outline-none"
          />
          <p className="text-xs text-[#64748B] dark:text-slate-500 mt-2">
            Tip: you can set 0 if you just want to track profit only.
          </p>
        </div>

        <div className="p-6 border-t border-[#E2E8F0] dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#2563EB]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}



function FilterModal({ open, onClose, trades, filters, setFilters }) {
  if (!open) return null;

  const tickers = Array.from(new Set(trades.map(t => (t.ticker || '').toUpperCase()).filter(Boolean))).sort();

  const allTags = Array.from(
    new Set(trades.flatMap(t => (t.tags || []).map(x => normalizeTag(x))).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const reset = () => setFilters({ ticker: '', direction: '', outcome: '', tag: '' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-6 border dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#171717] dark:text-slate-100">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-[#64748B] dark:text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tag */}
          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">Tag</label>
            <select
              value={filters.tag}
              onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="">All</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Ticker */}
          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">Ticker</label>
            <select
              value={filters.ticker}
              onChange={(e) => setFilters(prev => ({ ...prev, ticker: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="">All</option>
              {tickers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">Direction</label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="">All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">Outcome</label>
            <select
              value={filters.outcome}
              onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="">All</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="be">Breakeven</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { reset(); onClose(); }}
            className="flex-1 bg-[#F8FAFC] text-[#64748B] py-3 rounded-xl font-semibold hover:bg-gray-200"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#2563EB]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}



function MoodScreen({ onSelectMood, onClose, isEditing }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] min-h-[60vh] overflow-hidden flex flex-col border dark:border-slate-800 transition-colors">

        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-5 p-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-[#64748B] dark:text-slate-400" />
        </button>

        {/* Body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">


          <div className="text-center mb-8 w-full">
            <p className="text-base font-medium text-[#64748B]">
              How did this trade feel?
            </p>
          </div>

          <div className="w-full max-w-xl">
            {/* responsive grid: 2 cols on mobile, 5 on desktop */}
            <div className="flex justify-center gap-10 w-full">

              {EMOJI_OPTIONS.map((emo) => {
                return (
                  <button
                    key={emo}
                    onClick={() => onSelectMood(emo)}
                    className="group flex flex-col items-center focus:outline-none"
                    type="button"
                  >
                    <div className="rounded-full p-3 transition group-hover:ring-4 group-hover:ring-blue-100 group-hover:scale-110">
                      <Twemoji
                        hex={resolveMood(emo)?.hex}
                        size={56}
                        alt={resolveMood(emo)?.label}
                      />
                    </div>

                    <span className="mt-3 text-sm font-semibold text-[#64748B]">
                      {EMOJI_MEANINGS[emo]}
                    </span>
                  </button>
                );
              })}

            </div>


            {/* tiny helper text */}
            <p className="text-center text-xs text-gray-400 mt-8">
              Pick one feeling to continue.
            </p>
          </div>
        </div>

      </div>
    </div>

  );
}



function TradeFormModal({ onClose, onSubmit, mood, trade, displayMode, activeAccount, saving }) {





  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const [tradeFormMode, setTradeFormMode] = useState("basic"); // "basic" | "advanced"
  const [showAdvWarn, setShowAdvWarn] = useState(false);


  const tickerRef = useRef(null);
  const pnlRef = useRef(null);

  const endDateTimeRef = useRef(null);
  const qtyRef = useRef(null);
  const exitPriceRef = useRef(null);
  const entryPriceRef = useRef(null);







  const [quickSymbolsOpen, setQuickSymbolsOpen] = useState(false);
  const [quickSymbols, setQuickSymbols] = useState(QUICK_SYMBOLS_DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUICK_SYMBOLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          let fixed = parsed
            .slice(0, QUICK_SYMBOLS_MAX)
            .map(normalizeSymbol)
            .filter(Boolean);

          while (fixed.length < QUICK_SYMBOLS_MAX) {
            fixed.push(QUICK_SYMBOLS_DEFAULT[fixed.length]);
          }
          setQuickSymbols(fixed);
        }
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_SYMBOLS_KEY, JSON.stringify(quickSymbols));
    } catch (e) { }
  }, [quickSymbols]);


  useEffect(() => {
    try {
      const saved = localStorage.getItem(TRADE_FORM_MODE_KEY);
      if (saved === "advanced" || saved === "basic") {
        setTradeFormMode(saved);
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TRADE_FORM_MODE_KEY, tradeFormMode);
    } catch (e) { }
  }, [tradeFormMode]);


  const today = new Date().toISOString().split('T')[0];

  function QuickSymbolsManagerModal({ open, onClose, quickSymbols, setQuickSymbols }) {
    const [draft, setDraft] = useState(quickSymbols);

    useEffect(() => {
      if (open) setDraft(quickSymbols);
    }, [open, quickSymbols]);

    const updateAt = (idx, value) => {
      const next = [...draft];
      next[idx] = value;
      setDraft(next);
    };

    const save = () => {
      let cleaned = draft
        .map((s) => normalizeSymbol(s))
        .filter(Boolean);

      // remove duplicates
      const seen = new Set();
      cleaned = cleaned.filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });

      cleaned = cleaned.slice(0, QUICK_SYMBOLS_MAX);

      while (cleaned.length < QUICK_SYMBOLS_MAX) {
        cleaned.push(QUICK_SYMBOLS_DEFAULT[cleaned.length]);
      }

      setQuickSymbols(cleaned);
      onClose();
    };

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[90vh] flex flex-col overflow-hidden border dark:border-slate-800 transition-colors">

          <div className="p-6 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-[#171717] dark:text-slate-100">Manage quick symbols</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400">Max {QUICK_SYMBOLS_MAX}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-[#64748B] dark:text-slate-400" />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {draft.slice(0, QUICK_SYMBOLS_MAX).map((s, idx) => (
              <input
                key={idx}
                value={s}
                onChange={(e) => updateAt(idx, e.target.value)}
                placeholder={`Symbol ${idx + 1}`}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#171717] dark:text-slate-200 focus:border-[#2563EB] focus:outline-none transition-colors"
              />
            ))}
          </div>

          <div className="p-6 border-t border-[#E2E8F0] dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="flex-1 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#2563EB]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [isBreakeven, setIsBreakeven] = useState(!!trade?.isBreakeven);

  // ✅ required-highlight helpers
  const isEmpty = (v) => String(v ?? "").trim() === "";

  const isRequiredField = (key) => {
    // BASIC: Symbol + P&L (P&L not required if BE)
    if (tradeFormMode === "basic") {
      if (key === "ticker") return true;
      if (key === "pnl") return !isBreakeven;
      return false;
    }

    // ADVANCED: Symbol, Entry, Exit, Qty, P&L (P&L not required if BE)
    if (tradeFormMode === "advanced") {
      if (["ticker", "direction", "end", "session", "qty", "entry", "exit"].includes(key)) return true;
      if (key === "pnl") return !isBreakeven;
      return false;
    }


    return false;
  };

  const inputClass = (key, value, extra = "") => {
    const missing = isRequiredField(key) && isEmpty(value);

    return [
      "w-full px-4 py-3 rounded-xl border focus:outline-none",
      missing
        ? "border-rose-400 bg-rose-50/40 focus:border-rose-500"
        : "border-[#E2E8F0] focus:border-blue-500",
      extra,
    ].join(" ");
  };


  const [ticker, setTicker] = useState(trade?.ticker || '');
  function QuickTagsManagerModal({


    open,
    onClose,
    quickTags,
    setQuickTags,
  }) {
    const symbolRef = useRef(null);

    const rRef = useRef(null);
    const tickerRef = useRef(null);



    const [draft, setDraft] = useState(quickTags);

    useEffect(() => {
      if (open) setDraft(quickTags);
    }, [open, quickTags]);

    const norm = (s) => normalizeTag(s);
    const isDup = (arr, value, skipIdx) => {
      const v = norm(value).toLowerCase();
      return arr.some((t, i) => i !== skipIdx && norm(t).toLowerCase() === v);
    };

    const updateAt = (idx, value) => {
      const next = [...draft];
      next[idx] = value;
      setDraft(next);
    };

    const removeAt = (idx) => {
      const next = draft.filter((_, i) => i !== idx);
      setDraft(next);
    };

    const addOne = () => {
      if (draft.length >= QUICK_TAGS_MAX) return;
      setDraft([...draft, '']);
    };

    const save = () => {
      // clean, no empty, no dups, max 5
      let cleaned = draft
        .map((t) => norm(String(t || '')))
        .filter(Boolean);

      // remove duplicates (case-insensitive), keep first occurrence
      const seen = new Set();
      cleaned = cleaned.filter((t) => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      cleaned = cleaned.slice(0, QUICK_TAGS_MAX);

      // fill up to 5 with defaults (so UI always shows 5)
      while (cleaned.length < QUICK_TAGS_MAX) {
        const fallback = QUICK_TAGS_DEFAULT[cleaned.length];
        if (!cleaned.some(x => equalsTag(x, fallback))) cleaned.push(fallback);
        else cleaned.push(`Tag ${cleaned.length + 1}`);
      }

      setQuickTags(cleaned);
      onClose();
    };

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-xl transition-colors">
          <div className="p-6 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-[#171717] dark:text-slate-100">Manage quick tags</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400">Max {QUICK_TAGS_MAX}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-[#64748B] dark:text-slate-400" />
            </button>
          </div>

          <div className="p-6 space-y-3 text-[#171717] dark:text-slate-200">
            {draft.map((t, idx) => {
              const value = String(t || '');
              const dup = value.trim() && isDup(draft, value, idx);

              return (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={value}
                    onChange={(e) => updateAt(idx, e.target.value)}
                    placeholder={`Tag ${idx + 1}`}
                    className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none bg-white dark:bg-slate-950 transition-colors ${dup ? 'border-red-300 focus:border-red-400' : 'border-[#E2E8F0] dark:border-slate-700 focus:border-blue-500'
                      }`}
                  />

                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="px-3 py-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:text-[#EF4444] hover:border-red-200 dark:hover:border-rose-900"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {draft.length < QUICK_TAGS_MAX && (
              <button
                type="button"
                onClick={addOne}
                className="w-full py-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:border-[#E2E8F0] dark:hover:border-slate-600 hover:bg-[#FAFAFA] dark:hover:bg-slate-800 transition-colors"
              >
                + Add tag
              </button>
            )}
          </div>

          <div className="p-6 border-t border-[#E2E8F0] dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="flex-1 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#2563EB]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }


  const [side, setSide] = useState(trade?.side || 'long');
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() || '');
  const [entryPrice, setEntryPrice] = useState(trade?.entryPrice?.toString() || '');
  const [quickTagsOpen, setQuickTagsOpen] = useState(false);

  const [stopPrice, setStopPrice] = useState(trade?.stopPrice?.toString() || '');

  const [exitPrice, setExitPrice] = useState(trade?.exitPrice?.toString() || '');
  const [startDateTime, setStartDateTime] = useState(
    trade?.startDateTime ||
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

  const [endDateTime, setEndDateTime] = useState(trade?.endDateTime || '');
  const [date, setDate] = useState(trade?.date || today);

  const [session, setSession] = useState(trade?.session ?? "");


  const [dollarAmount, setDollarAmount] = useState(trade?.dollarAmount?.toString() || '');
  const [riskPctUsed, setRiskPctUsed] = useState(
    trade?.riskPctUsed != null
      ? String(trade.riskPctUsed)
      : (activeAccount?.defaultRiskPct != null ? String(activeAccount.defaultRiskPct) : '')
  );


  const [notes, setNotes] = useState(trade?.notes || '');
  const [screenshots, setScreenshots] = useState(trade?.screenshots || []);
  const [screenshotFiles, setScreenshotFiles] = useState([]);
  const [shotError, setShotError] = useState("");

  const [tags, setTags] = useState(trade?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [quickTags, setQuickTags] = useState(QUICK_TAGS_DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUICK_TAGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const fixed = parsed
            .slice(0, QUICK_TAGS_MAX)
            .map(t => normalizeTag(t))
            .filter(Boolean);

          while (fixed.length < QUICK_TAGS_MAX) {
            fixed.push(QUICK_TAGS_DEFAULT[fixed.length]);
          }
          setQuickTags(fixed);
        }
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_TAGS_KEY, JSON.stringify(quickTags));
    } catch (e) { }
  }, [quickTags]);


  const [tagSuggestions, setTagSuggestions] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAG_SUGGESTIONS_KEY);
      if (saved) setTagSuggestions(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load tag suggestions', e);
    }
  }, []);


  const norm = (s) => (s || '').trim().toLowerCase();
  const hasLetterOrNumber = (s) => /[a-z0-9]/i.test(s);

  const persistSuggestions = (next) => {
    setTagSuggestions(next);
    try {
      localStorage.setItem(TAG_SUGGESTIONS_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save tag suggestions', e);
    }
  };

  const saveSuggestion = (tag) => {
    const t = tag.trim();
    if (!t) return;

    const n = norm(t);
    // avoid duplicates (case-insensitive)
    const filtered = tagSuggestions.filter(x => norm(x) !== n);

    // newest first, cap to MAX_SAVED_SUGGESTIONS
    const next = [t, ...filtered].slice(0, MAX_SAVED_SUGGESTIONS);
    persistSuggestions(next);
  };

  const toggleTag = (tag) => {
    const clean = normalizeTag(tag);
    if (!clean) return;

    setTags((prev) => {
      const exists = prev.some((x) => equalsTag(x, clean));

      if (!exists && prev.length >= MAX_TAGS_PER_TRADE) {
        alert(`Max ${MAX_TAGS_PER_TRADE} tags per trade`);
        return prev;
      }

      if (exists) return prev.filter((x) => !equalsTag(x, clean));
      return [...prev, clean];
    });
  };




  const addCustomTag = () => {
    let t = customTag.trim();
    if (!t) return;

    if (t.length > MAX_TAG_LENGTH) {
      alert(`Max tag length is ${MAX_TAG_LENGTH} characters`);
      return;
    }

    if (!hasLetterOrNumber(t)) {
      alert('Tag must contain at least one letter or number');
      return;
    }

    // prevent duplicates (case-insensitive)
    if (tags.some((x) => equalsTag(x, t))) {
      setCustomTag('');
      return;
    }


    if (tags.length >= MAX_TAGS_PER_TRADE) {
      alert(`Max ${MAX_TAGS_PER_TRADE} tags per trade`);
      return;
    }

    setTags((prev) => [...prev, t]);
    saveSuggestion(t); // ✅ auto-save as suggestion
    setCustomTag('');
  };

  const editQuickTag = (idx) => {
    const current = quickTags[idx] || '';
    const next = normalizeTag(prompt('Rename quick tag:', current) || '');
    if (!next) return;

    // prevent duplicates (case-insensitive)
    const dup = quickTags.some((t, i) => i !== idx && equalsTag(t, next));
    if (dup) return;

    setQuickTags(prev => prev.map((t, i) => (i === idx ? next : t)));
  };


  const removeTag = (tag) => {
    setTags((prev) => prev.filter((t) => !equalsTag(t, tag)));
  };



  const removeSuggestion = (tag) => {
    const next = tagSuggestions.filter((t) => norm(t) !== norm(tag));
    persistSuggestions(next);
  };


  const handleScreenshotUpload = (e) => {
    setShotError("");

    const file = e.target.files?.[0];
    if (!file) return;

    // reset input so selecting same file again works
    e.target.value = "";

    if (screenshots.length >= MAX_SCREENSHOTS) {
      setShotError(`Max ${MAX_SCREENSHOTS} screenshots per trade.`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setShotError("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setShotError(`Image too large. Max ${MAX_SCREENSHOT_MB}MB.`);
      return;
    }

    // Preview (base64) for UI only
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result;
      if (!preview) return;

      setScreenshots((prev) => [...prev, preview]);
      setScreenshotFiles((prev) => [...prev, file]);
    };
    reader.readAsDataURL(file);
  };


  const handleSubmit = () => {
    setErrors({});
    setSubmitError("");

    // 1) Symbol (always required)
    if (!ticker.trim()) {
      setSubmitError("Please fill all required fields to save this trade.");
      tickerRef.current?.focus();
      return;
    }

    // 2) Advanced required fields (entry must be BEFORE exit)
    if (tradeFormMode === "advanced") {
      if (!String(quantity).trim()) {
        setSubmitError("Please fill all required fields to save this trade.");
        qtyRef.current?.focus();
        return;
      }

      if (!String(entryPrice).trim()) {
        setSubmitError("Please fill all required fields to save this trade.");
        entryPriceRef.current?.focus();
        return;
      }

      if (!String(exitPrice).trim()) {
        setSubmitError("Please fill all required fields to save this trade.");
        exitPriceRef.current?.focus();
        return;
      }
    }

    // 3) P&L (required unless Breakeven)
    if (!isBreakeven && !String(dollarAmount).trim()) {
      setSubmitError("Please fill all required fields to save this trade.");
      pnlRef.current?.focus();
      return;
    }

    // 3️⃣ Advanced required fields

    if (tradeFormMode === "advanced") {

      // 1️⃣ Symbol
      if (!ticker.trim()) {
        setSubmitError('Please fill all required fields to save this trade.');
        tickerRef.current?.focus();
        return;
      }

      // 2️⃣ End datetime (required)
      if (!String(endDateTime).trim()) {
        setSubmitError('Please fill all required fields to save this trade.');
        endDateTimeRef.current?.focus();
        return;
      }

      // 3️⃣ Quantity (required)
      if (!String(quantity).trim()) {
        setSubmitError('Please fill all required fields to save this trade.');
        qtyRef.current?.focus();
        return;
      }
      // 4️⃣ Entry Price (required in Advanced)
      if (tradeFormMode === "advanced") {
        if (!String(entryPrice).trim()) {
          setSubmitError('Please fill all required fields to save this trade.');
          entryPriceRef.current?.focus();
          return;
        }
      }

      // 4️⃣ Exit Price (required)
      if (!String(exitPrice).trim()) {
        setSubmitError('Please fill all required fields to save this trade.');
        exitPriceRef.current?.focus();
        return;
      }

      // 5️⃣ P&L (NOT required if breakeven)
      if (!isBreakeven) {
        if (!String(dollarAmount).trim()) {
          setSubmitError('Please fill all required fields to save this trade.');
          pnlRef.current?.focus();
          return;
        }
      }

    }





    const finalDollarAmount = isBreakeven ? "0" : dollarAmount;
    const dollarVal = parseFloat(finalDollarAmount) || 0;

    let pnlPercent = null;

    if (entryPrice && exitPrice) {
      const entry = parseFloat(entryPrice);
      const exit = parseFloat(exitPrice);

      if (entry > 0) {
        if (side === 'long') {
          pnlPercent = ((exit - entry) / entry) * 100;
        } else {
          pnlPercent = ((entry - exit) / entry) * 100;
        }

        pnlPercent = parseFloat(pnlPercent.toFixed(2));
      }
    }



    let durationMin = null;

    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      const diffMs = end - start;

      if (!Number.isNaN(diffMs) && diffMs >= 0) {
        durationMin = Math.round(diffMs / 60000);
      }
    }



    const newTrade = {


      ticker: ticker.toUpperCase(),



      // time
      date: startDateTime ? startDateTime.split('T')[0] : date,
      startDateTime,
      endDateTime,
      time: startDateTime ? startDateTime.split('T')[1] : null,
      durationMin,

      // direction + execution
      side,
      quantity: quantity ? parseFloat(quantity) : null,
      entryPrice: entryPrice ? parseFloat(entryPrice) : null,
      stopPrice: stopPrice ? parseFloat(stopPrice) : null,
      exitPrice: exitPrice ? parseFloat(exitPrice) : null,

      // performance
      dollarAmount: dollarVal,
      pnlPercent,     // already number or null
      riskPctUsed: riskPctUsed === '' ? null : Number(riskPctUsed),


      isBreakeven,

      // meta
      session,
      feeling: mood,
      tags,
      notes,
      screenshots,
      __screenshotFiles: screenshotFiles,
    };

    setSubmitError('');

    onSubmit(newTrade);
  };

  return (
    <div className="fixed left-0 top-0 w-screen h-screen bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Advanced warning modal */}
        {showAdvWarn && (
          <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl border border-[#E2E8F0] shadow-xl">
              <div className="p-6 border-b border-[#E2E8F0]">
                <div className="text-lg font-bold text-[#171717]">Advanced stats need extra inputs</div>
                <div className="text-xs text-[#64748B] mt-1">
                  Old trades might not have enough data. Advanced mode will ask for more fields going forward.
                </div>
              </div>

              <div className="p-6 text-sm text-[#64748B]">
                You can always switch back to Basic anytime. Nothing gets deleted, advanced fields just hide.
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvWarn(false)}
                  className="flex-1 py-3 rounded-xl bg-[#F8FAFC] text-[#64748B] font-semibold hover:bg-gray-200"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem(TRADE_FORM_ADV_WARNED_KEY, "1"); } catch (e) { }
                    setShowAdvWarn(false);
                    setTradeFormMode("advanced");
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#2563EB]"
                >
                  Enable Advanced
                </button>
              </div>
            </div>
          </div>
        )}




        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] p-6 flex items-start justify-between">
          {/* Left side */}
          <div>
            <h2 className="text-xl font-semibold text-[#171717]">
              {ticker ? ticker.toUpperCase() : 'New Trade'}
            </h2>

            <div className="mt-2 flex items-center gap-3">
              <Twemoji
                hex={resolveMood(mood)?.hex}
                size={28}
                alt={resolveMood(mood)?.label}
              />
              <div>
                <p className="text-xs text-[#64748B]">How did this trade felt?</p>
                <p className="text-sm font-semibold text-[#171717]">
                  {resolveMood(mood)?.label || '—'}
                </p>
              </div>
            </div>

            {/* ✅ Put your Basic/Advanced toggle HERE (inside left side) */}
            {/* Mode toggle (Basic / Advanced) */}
            {/* Trade form mode toggle */}
            <div className="mt-4">
              <div className="relative inline-flex rounded-2xl border border-[#E2E8F0] bg-white p-1 shadow-sm">
                {/* Sliding highlight */}
                <div
                  className={`absolute top-1 bottom-1 left-1 w-[110px] rounded-xl transition-transform duration-200 ${tradeFormMode === "advanced" ? "translate-x-[110px]" : "translate-x-0"
                    } bg-[#2563EB]`}
                />

                <button
                  type="button"
                  onClick={() => setTradeFormMode("basic")}
                  className={`relative z-10 w-[110px] px-4 py-2 rounded-xl text-sm font-bold transition ${tradeFormMode === "basic" ? "text-white" : "text-[#64748B] hover:text-[#171717]"
                    }`}
                >
                  Basic
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const warned = localStorage.getItem(TRADE_FORM_ADV_WARNED_KEY) === "1";
                    if (!warned) {
                      setShowAdvWarn(true);
                      return;
                    }
                    setTradeFormMode("advanced");
                  }}
                  className={`relative z-10 w-[110px] px-4 py-2 rounded-xl text-sm font-bold transition ${tradeFormMode === "advanced" ? "text-white" : "text-[#64748B] hover:text-[#171717]"
                    }`}
                >
                  Advanced
                </button>
              </div>

              <div className="mt-2 text-xs">
                {tradeFormMode === "basic" ? (
                  <span className="text-blue-700 font-semibold">
                    Basic: quick add, minimum required fields.
                  </span>
                ) : (
                  <span className="text-blue-700 font-semibold">
                    Advanced: extra fields required for advanced stats.
                  </span>

                )}<div className="mt-2 flex items-start gap-1.5 text-[11px] leading-4">
                  <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-gray-400" />

                  {tradeFormMode === "basic" ? (
                    <span className="text-[#64748B]">
                      Advanced stats are hidden. Switch to <b>Advanced</b> and fill extra fields to unlock them.
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      Only trades saved with these extra fields affect advanced stats.
                    </span>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Right side (X always stays here) */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#F8FAFC] rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* TRADE INPUT WINDOW */}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">


          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#64748B] mb-2 block font-semibold">Symbols</p>

              <button
                type="button"
                onClick={() => setQuickSymbolsOpen(true)}
                className="px-3 py-1 rounded-full border border-[#E2E8F0] text-[#64748B] hover:text-[#171717] hover:border-[#E2E8F0] text-xs"
                title="Manage quick symbols"
              >
                ✏️ Manage
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickSymbols.map((sym) => {
                const active = normalizeSymbol(ticker) === normalizeSymbol(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setTicker(sym)}
                    className={`px-3 py-1 rounded-full text-sm border transition ${active
                      ? 'bg-[#2563EB] text-white border-blue-500'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#E2E8F0]'
                      }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          <div>


            <input

              type="text"
              placeholder="US100, TSLA, EUR/USD, etc."
              ref={tickerRef}
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              className={inputClass("ticker", ticker, "text-lg")}

            />
          </div>





          <div className="grid grid-cols-2 gap-4">

            {/* Start */}
            {/* Start */}
            <div>
              <label className="text-xs text-[#64748B] mb-0.5 block">Start</label>
              <input
                type="datetime-local"
                value={startDateTime}
                max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={e => setStartDateTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">{formatDateDisplay(date)}</p>
            </div>

            {/* End */}
            {/* End */}
            <div>
              <label className="text-xs text-[#64748B] mb-0.5 block">End</label>
              <input
                ref={endDateTimeRef}
                type="datetime-local"
                value={endDateTime}
                max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={e => setEndDateTime(e.target.value)}
                className={inputClass("end", endDateTime, "w-full px-4 py-3 rounded-xl border focus:outline-none")}
              />
            </div>

            {/* Session below both */}
            <div className="col-span-2">
              <label className="text-sm text-[#64748B] mb-2 block font-semibold">Session</label>
              <select
                value={session}
                onChange={e => setSession(e.target.value)}
                className={inputClass("session", session, "w-full px-4 py-3 rounded-xl border focus:outline-none")}
              >
                <option value="">(Select session)</option>
                {SESSION_PRESETS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>


            </div>
          </div>



          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#64748B] block font-semibold">Direction</label>

            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${side === 'long'
                  ? 'bg-white text-[#15803D] shadow'
                  : 'text-[#64748B]'
                  }`}
              >
                LONG ↑
              </button>

              <button
                type="button"
                onClick={() => setSide('short')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${side === 'short'
                  ? 'bg-white text-red-700 shadow'
                  : 'text-[#64748B]'
                  }`}
              >
                SHORT ↓
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">
              Quantity
            </label>

            <input
              ref={qtyRef}
              type="number"
              placeholder="e.g. 1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className={inputClass("qty", quantity)}

            />
          </div>
          <div className="grid grid-cols-2 gap-4">


            <div>
              <label className="text-sm text-[#64748B] mb-2 block font-semibold">
                Entry Price
              </label>
              <input
                ref={entryPriceRef}

                type="number"
                placeholder="e.g. 16850"
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
                className={inputClass("entry", entryPrice)}

              />
            </div>

            <div>
              <label className="text-sm text-[#64748B] mb-2 block font-semibold">
                Exit Price
              </label>
              <input
                ref={exitPriceRef}
                type="number"
                placeholder="e.g. 16920"
                value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                className={inputClass("exit", exitPrice)}

              />
            </div>

          </div>



          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">P&L ($)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                ref={pnlRef}
                placeholder="e.g.  300 or -100"
                value={dollarAmount}
                onChange={e => setDollarAmount(e.target.value)}
                className={inputClass("pnl", dollarAmount, "flex-1")}

              />
              <span className="text-xl font-bold text-[#64748B]">$</span>
            </div>
          </div>

          {/* FIXME: Breakeven toggle needs refactoring 
          <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#171717]">Breakeven</p>
              <p className="text-xs text-[#64748B]">Mark this trade as BE</p>
            </div>
            
            <button type="button" className="w-14 h-8 rounded-full transition flex items-center px-1 bg-gray-300">
               <div className="w-6 h-6 bg-white rounded-full transition translate-x-0" />
            </button>
          </div>
          */}


          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">
              Risk % for this trade (optional)
            </label>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={riskPctUsed}
                onChange={(e) => setRiskPctUsed(e.target.value)}
                placeholder={activeAccount?.defaultRiskPct != null ? String(activeAccount.defaultRiskPct) : 'e.g. 1'}
                step="0.1"
                className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
              />
              <span className="text-xl font-bold text-[#64748B]">%</span>
            </div>

            {activeAccount?.defaultRiskPct != null && (
              <p className="text-xs text-[#64748B] mt-2">
                Default: {activeAccount.defaultRiskPct}% (you can override per trade)
              </p>
            )}
          </div>





          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">Tags</label>

            {/* Quick tags (5 editable) */}
            {/* Quick tags (5 saved) */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#64748B]">Quick tags</p>

                <button
                  type="button"
                  onClick={() => setQuickTagsOpen(true)}
                  className="px-3 py-1 rounded-full border border-[#E2E8F0] text-[#64748B] hover:text-[#171717] hover:border-[#E2E8F0] text-xs"
                  title="Manage quick tags"
                >
                  ✏️ Manage
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickTags.map((qt) => {
                  const active = tags.some((t) => equalsTag(t, qt));
                  return (
                    <button
                      key={qt}
                      type="button"
                      onClick={() => toggleTag(qt)}
                      className={`px-3 py-1 rounded-full text-sm border transition ${active
                        ? 'bg-[#2563EB] text-white border-blue-500'
                        : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#E2E8F0]'
                        }`}
                    >
                      {qt}
                    </button>
                  );
                })}
              </div>
            </div>



            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-[#64748B] hover:text-[#171717]"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Preset tags */}


            {/* Custom tag input */}
            <div className="flex gap-2">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add custom tag and press Enter"
                className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-4 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? Quick lesson? Mistake? Setup note…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] focus:outline-none resize-none"
            />
          </div>


          <div>
            <label className="text-sm text-[#64748B] mb-2 block font-semibold">
              Charts / Screenshots ({screenshots.length}/3)
            </label>
            {screenshots.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {screenshots.map((screenshot, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        setScreenshots((prev) => prev.filter((_, i) => i !== idx));
                        setScreenshotFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}

                      className="absolute top-1 right-1 bg-[#FEF2F2]0 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {screenshots.length < 3 && (

              <label className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer block">
                <p className="text-[#64748B]">Tap to upload a screenshot</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
              </label>
            )}
            {shotError && (
              <div className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-red-200 rounded-xl px-4 py-3 mt-4">
                {shotError}
              </div>
            )}

          </div>

          {submitError && (
            <div className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-red-200 rounded-xl px-4 py-3 mb-4">
              {submitError}
            </div>
          )}


          <button
            onClick={handleSubmit}
            disabled={!!saving}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${saving ? "bg-gray-300 text-[#64748B] cursor-not-allowed" : "bg-[#2563EB] text-white hover:bg-[#2563EB]"
              }`}
          >
            {saving ? (trade ? "Updating..." : "Saving...") : (trade ? "Update Trade" : "Save Trade")}
          </button>



          <QuickTagsManagerModal
            open={quickTagsOpen}
            onClose={() => setQuickTagsOpen(false)}
            quickTags={quickTags}
            setQuickTags={setQuickTags}
          />
          <QuickSymbolsManagerModal
            open={quickSymbolsOpen}
            onClose={() => setQuickSymbolsOpen(false)}
            quickSymbols={quickSymbols}
            setQuickSymbols={setQuickSymbols}
          />


        </div>
      </div>
    </div>
  );
}


function BalanceSummary({ stats, displayMode, trades, currentBalance, defaultRiskPct, currentOneR, hideBalance, setHideBalance }) {



  const canEdit = typeof stats.onEditAccount === "function";

  //HERO CARDS//


  return (
    <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-4 pt-6 gap-6 px-6">






      {/* Balance card */}
      <div className="relative bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#2563EB]/40 flex flex-col">

        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">BALANCE</p>

          <div className="flex items-center gap-2 group relative">
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-gray-400 dark:text-slate-500 hover:text-[#64748B] dark:hover:text-slate-300 transition-colors"
              type="button"
              aria-label={hideBalance ? "Show balance" : "Hide balance"}
            >
              {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={canEdit ? stats.onEditAccount : undefined}
              disabled={!canEdit}
              className={`leading-none ${canEdit ? "text-gray-400 dark:text-slate-500 hover:text-[#64748B] dark:hover:text-slate-300" : "text-gray-200 dark:text-slate-800 cursor-not-allowed"
                } `}
              type="button"
              aria-label="Edit account"
            >
              <Edit2 className="w-4 h-4 text-gray-500 dark:text-slate-400" strokeWidth={2} />
            </button>

            {canEdit && (
              <div className="pointer-events-none absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-gray-900 dark:bg-slate-800 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">
                  Settings
                </div>
              </div>
            )}
          </div>
        </div>

        {stats.startingBalance == null ? (
          <p className="text-lg font-medium text-[#64748B] dark:text-slate-400 mt-2">Set balance</p>
        ) : (
          <>
            <p className={`text-3xl font-bold text-gray-800 dark:text-slate-100 tracking-tight mb-1 transition-all duration-300 ${hideBalance ? "blur-md select-none" : ""}`}>
              ${currentBalance.toLocaleString()}
            </p>
            <div className={`transition-all duration-300 ${hideBalance ? "blur-sm select-none" : ""}`}>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Started: ${Number(stats.startingBalance).toLocaleString()}
              </p>
            </div>

            {defaultRiskPct != null && (
              <p className={`text-xs text-gray-500 dark:text-slate-400 transition-all duration-300 ${hideBalance ? "blur-sm select-none" : ""}`}>
                Default risk: {Number(defaultRiskPct)}% · 1R: $
                {Number(currentOneR || 0).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>

      {/* Total */}
      <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 transition-all duration-200 hover:shadow-md 
  hover:-translate-y-0.5 hover:border-[#2563EB]/40 flex flex-col">



        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {displayMode === 'pnl' ? 'Total P&L' : 'Total R'}
        </p>
        <p
          className={`text-3xl font-bold tracking-tight mb-1 ${stats.total > 0
            ? 'text-[#10B981]'
            : stats.total < 0
              ? 'text-[#EF4444]'
              : 'text-gray-800 dark:text-slate-100'
            }`}
        >
          {displayMode === 'pnl'
            ? `${stats.total > 0 ? '+' : ''}$${stats.total} `
            : `${stats.total > 0 ? '+' : ''}${stats.total} R`}

        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{stats.totalTrades} trades</p>
      </div>

      {/* Win rate */}

      <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#2563EB]/40 flex flex-col">



        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ">Win Rate</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-slate-100 tracking-tight mb-1">{stats.winRate}%</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {stats.wins}W / {stats.losses}L / {stats.breakevens} BE
        </p>
      </div>

      {/* Profit factor */}



      <div className="bg-white dark:bg-slate-900 opacity-90 rounded-xl p-6 border border-black/10 dark:border-slate-800 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#2563EB]/40 flex flex-col">



        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Profit Factor</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-slate-100 tracking-tight mb-1">
          {Number.isFinite(stats.profitFactor)
            ? stats.profitFactor.toFixed(2)
            : "∞"}
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">Avg W/L ratio</p>
      </div>
    </div>
  );
}



function TradeViewToggle({ viewMode, setViewMode }) {
  return (
    <div className="flex items-center justify-center">
      <div className="bg-[#F1F5F9] dark:bg-slate-800/50 rounded-xl p-1 flex gap-0.5 inline-flex transition-colors">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 ${viewMode === 'cards'
            ? 'bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-400 shadow-sm'
            : 'text-[#64748B] dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            } `}
          aria-label="Grid View"
        >
          <LayoutGrid className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <button
          onClick={() => setViewMode('log')}
          className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 ${viewMode === 'log'
            ? 'bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-400 shadow-sm'
            : 'text-[#64748B] dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            } `}
          aria-label="List View"
        >
          <List className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}


// TradeListSkeleton imported from components


function TradeFeed({ trades, onSelectTrade, displayMode, activeAccount, balanceBeforeMap, isLoading }) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Reset page when filters change (different trades array)
  useEffect(() => {
    setPage(1);
  }, [trades]);

  // ✅ Show skeleton ONLY when we have nothing yet (first load)
  if (isLoading && (!trades || trades.length === 0)) {
    return <TradeListSkeleton />;
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-[#64748B] text-lg font-semibold mb-2">No trades yet</p>
        <p className="text-gray-400 text-sm">Click the top + Account button to add your first account</p>
      </div>
    );
  }
  const displayedTrades = trades.slice(0, page * ITEMS_PER_PAGE);

  //------------------------------------------//
  //TRADE CARD //
  //-----------------------------------------//
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
        {displayedTrades.map(trade => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onClick={() => onSelectTrade(trade)}
            displayMode={displayMode}
            activeAccount={activeAccount}
            balanceBeforeMap={balanceBeforeMap}
          />

        ))}
      </div>

      {trades.length > displayedTrades.length && (
        <div className="flex justify-center mt-12">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-8 py-3 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] font-semibold hover:bg-[#F8FAFC] hover:text-[#171717] transition shadow-sm hover:shadow active:scale-95"
          >
            Load More Trades
          </button>
        </div>
      )}
    </>
  );
}


const TradeCard = React.memo(function TradeCard({ trade, onClick, displayMode, activeAccount, balanceBeforeMap }) {
  const isBE = !!trade.isBreakeven;
  const [imgLoaded, setImgLoaded] = useState(false);

  const pnl = Number(trade.dollarAmount || 0);
  const r = formatR1(getTradeR(trade, activeAccount, balanceBeforeMap));

  const metricValue = displayMode === "pnl" ? pnl : r;
  const isWin = !isBE && metricValue > 0;

  const isLoss = !isBE && metricValue < 0;

  const pillText = isBE
    ? "BE"
    : displayMode === "pnl"
      ? `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl)} `
      : formatRText(r);
  // ✅ fintech-style pill colors + shape (not roundy)
  const pillClass = isBE
    ? "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
    : isWin
      ? "bg-green-100 text-[#15803D] border-green-200"
      : isLoss
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]";

  const hasShot = trade.screenshots && trade.screenshots.length > 0;

  const formatCardDate = (dateStr) => {
    if (!dateStr) return null;
    // If it looks like it already has time info (T or :), parse directly
    if (dateStr.includes('T') || dateStr.includes(':')) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    }

    // Otherwise assume YYYY-MM-DD and force local midnight
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr; // Fallback to raw string if invalid
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // Jan 22
  };

  const sessionValue = trade.session ? String(trade.session).trim() : "";
  const dateValue = formatCardDate(trade.date);
  const dirValue = (trade.side || "").toLowerCase(); // long/short

  const EmptyLine = () => (
    <span className="inline-block w-10 h-[2px] bg-gray-200 rounded-full" />
  );

  return (

    /* solo Trade card block ,  transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#2563EB]/40 flex flex-col */
    <div
      onClick={onClick}
      className="bg-[#EFF6FF]/30 dark:bg-slate-900/50 border-2 border-transparent dark:border-slate-800 hover:border-[#2563EB]/40 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg h-full flex flex-col"
    >

      {/* ✅ IMPORTANT: emoji must NOT be inside overflow-hidden box */}
      <div className="relative ">
        {/* image wrapper keeps image clipped */}
        <div className="relative bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] dark:from-slate-800 dark:to-slate-900 w-full h-48 overflow-hidden rounded-t-2xl group/image">
          {hasShot ? (
            <>
              {/* Skeleton Placeholder */}
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-slate-800 animate-pulse z-10" />
              )}

              <img
                src={trade.screenshots[0]}
                alt="Trade screenshot"
                loading="lazy"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Subtle Glass Morphism Overlay */}
              <div
                className="
        absolute inset-0 
        opacity-10 group-hover/image:opacity-0
        transition-opacity duration-500
        pointer-events-none
      "
              >
                <div className="absolute inset-0  bg-gradient-to-br from-blue-500/5 to-green-500/5" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/8 to-transparent" />
                <div className="absolute inset-0 rounded-t-2xl border border-white/15 dark:border-white/5" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/60 dark:border-slate-700 shadow-sm flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>

              <div className="text-sm font-semibold text-slate-800">

              </div>
              <div className="text-xs italic text-slate-500 dark:text-slate-400 mt-1">
                Screenshots help spot patterns and mistakes faster.
              </div>
            </div>
          )}
        </div>


        {/* ✅ emoji overlap (now visible, not clipped) */}
        <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 z-20">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 backdrop-blur-md border border-white dark:border-slate-700 shadow-md flex items-center justify-center text-3xl">
            <Twemoji
              hex={resolveMood(trade.emotion || trade.mood || trade.feeling)?.hex}
              size={34}
              alt={resolveMood(trade.emotion || trade.mood || trade.feeling)?.label}
            />
          </div>
        </div>
      </div>

      {/* body */}

      <div className="relative px-6 pt-12 pb-6 flex-1 flex flex-col overflow-hidden">
        {/* Decorative background elements */}


        {/* Subtle decorative lines in corner - VISIBLE TEST VERSION */}

        <div className="text-center relative z-10">
          {/* ✅ less “aggressive” ticker */}
          <h3 className="text-2xl font-bold text-[#171717] dark:text-slate-100 mb-4 tracking-tight">
            {trade.ticker}
          </h3>

          {/* pill under symbol */}
          <div className="mt-3 flex justify-center">
            <span
              className={`inline-flex items-center shadow-sm justify-center px-6 py-3 bg-[#DCFCE7] dark:bg-emerald-900/30 rounded-xl mb-4 ${pillClass} `}

            >
              {pillText}
            </span>
          </div>
        </div>

        {/* bottom stats */}
        <div className="mt-6 pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 mb-1 uppercase tracking-wider">SESSION</div>

              <div className="text-sm font-bold text-[#171717] dark:text-slate-200">
                {sessionValue ? sessionValue : <EmptyLine />}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 mb-1 uppercase tracking-wider">DATE</div>

              <div className="text-sm font-bold text-[#171717] dark:text-slate-200">
                {dateValue ? dateValue : <EmptyLine />}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 mb-1 uppercase tracking-wider">DIRECTION</div>

              <div
                className={`text-sm font-bold ${dirValue === "short"
                  ? "text-[#EF4444]"
                  : dirValue === "long"
                    ? "text-[#15803D] dark:text-emerald-400"
                    : "text-[#171717] dark:text-slate-200"
                  } `}
              >
                {dirValue === "long"
                  ? "Long"
                  : dirValue === "short"
                    ? "Short"
                    : <EmptyLine />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});




function TradeLogTable({ trades, onSelectTrade, displayMode, activeAccount, balanceBeforeMap }) {

  if (trades.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-[#64748B] text-lg font-semibold mb-2">No trades yet</p>
        <p className="text-gray-400 text-sm">Log trades to see them here</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E2E8F0] dark:border-slate-800 overflow-hidden transition-colors">

      <div className="overflow-x-auto">
        <table className="w-full text-left table-fixed">
          <thead className="bg-[#FAFAFA] dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Time</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Ticker</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Qty</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Entry</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Exit</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Dir</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Session</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400">Mood</th>
              <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-slate-400 text-right">
                {displayMode === 'pnl' ? 'P&L' : 'R'}
              </th>
            </tr>
          </thead>

          <tbody>
            {trades.map((trade) => {
              const isBE = !!trade.isBreakeven;

              const pnlDisplay = isBE ? 0 : (trade.dollarAmount || 0);
              const rDisplay = isBE ? 0 : formatR1(getTradeR(trade, activeAccount, balanceBeforeMap));

              const pnlPctDisplay = isBE ? 0 : trade.pnlPercent;

              const isWin =
                !isBE && (displayMode === 'pnl' ? trade.dollarAmount > 0 : rDisplay > 0);



              const resultValue = isBE
                ? "BE"
                : displayMode === "pnl"
                  ? `${pnlDisplay >= 0 ? "+" : "-"}$${Math.abs(pnlDisplay)} `
                  : formatRText(rDisplay);

              return (
                <tr
                  key={trade.id}
                  onClick={() => onSelectTrade(trade)}
                  className="border-b border-[#E2E8F0] dark:border-slate-800 hover:bg-[#FAFAFA] dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-[#64748B] dark:text-slate-400">
                    {formatDateDisplay(trade.date || trade.dateTime ? (trade.date || trade.dateTime).split('T')[0] : null)}
                  </td>

                  <td className="px-4 py-3 text-sm text-[#64748B] dark:text-slate-400">
                    {trade.time || (trade.dateTime ? trade.dateTime.split('T')[1]?.substring(0, 5) : '-')}
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold text-[#171717] dark:text-slate-100">
                    {trade.ticker}
                  </td>

                  <td className="px-4 py-3 text-sm text-[#64748B] dark:text-slate-400">
                    {trade.quantity ?? '-'}
                  </td>

                  <td className="px-4 py-3 text-sm text-[#64748B] dark:text-slate-400">
                    {trade.entryPrice ?? '-'}
                  </td>

                  <td className="px-4 py-3 text-sm text-[#64748B] dark:text-slate-400">
                    {trade.exitPrice ?? '-'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${trade.side === 'short'

                        ? 'bg-[#FEF2F2] dark:bg-rose-900/30 text-red-700 dark:text-rose-400'
                        : 'bg-[#F0FDF4] dark:bg-emerald-900/30 text-[#15803D] dark:text-emerald-400'
                        } `}
                    >
                      {trade.side === 'short' ? 'SHORT ↓' : 'LONG ↑'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-[#64748B] dark:text-slate-400">
                    {trade.session}
                  </td>

                  <td className="px-4 py-3">
                    <div className="w-10 h-10">
                      <Twemoji
                        hex={resolveMood(trade.emotion || trade.mood || trade.feeling)?.hex}
                        size={20}
                        alt={resolveMood(trade.emotion || trade.mood || trade.feeling)?.label}
                      />
                    </div>
                  </td>


                  <td className="px-4 py-3 text-sm font-bold text-right">
                    <span
                      className={`px-3 py-1 rounded-md border font-semibold ${isBE
                        ? 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border-[#E2E8F0] dark:border-slate-700'
                        : isWin
                          ? 'bg-green-100 dark:bg-emerald-900/30 text-[#15803D] dark:text-emerald-400 border-green-200 dark:border-emerald-800'
                          : 'bg-red-100 dark:bg-rose-900/30 text-red-700 dark:text-rose-400 border-red-200 dark:border-rose-800'
                        } `}
                    >
                      {resultValue}
                    </span>

                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function FloatingAddButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fixed bottom-8 right-8 w-14 h-14 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full shadow-[0_8px_16px_rgba(37,99,235,0.3)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-[50]`}
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
}



function ExpandedTradeModal({ trade, onClose, onEdit, onDeleteClick, onToggleBreakeven, displayMode, activeAccount, balanceBeforeMap }) {

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [trade]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  {/* Body OF EXPANDED CARD */ }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header - IMPROVED */}
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#171717] tracking-tight">
              {trade.ticker}
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">Trade Details</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#64748B]" strokeWidth={2} />
          </button>
        </div>

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <img
                src={trade.screenshots[imageIndex]}
                alt={`Screenshot ${imageIndex + 1} `}
                className="max-w-[90vw] max-h-[90vh] rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Arrows (only if multiple screenshots) */}
              {trade.screenshots.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex((i) =>
                        i === 0 ? trade.screenshots.length - 1 : i - 1
                      );
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border border-[#E2E8F0] text-[#171717] rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                    aria-label="Previous image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex((i) =>
                        i === trade.screenshots.length - 1 ? 0 : i + 1
                      );
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border border-[#E2E8F0] text-[#171717] rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                    aria-label="Next image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Counter */}
                  <div className="absolute bottom-4 right-4 bg-white/90 border border-[#E2E8F0] text-xs font-semibold rounded-full px-3 py-1.5">
                    {imageIndex + 1} / {trade.screenshots.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Screenshot - IMPROVED */}
          {trade.screenshots && trade.screenshots.length > 0 && trade.screenshots[0] ? (
            <div className="w-full aspect-video bg-gradient-to-br from-[#FAFAFA] to-[#F8FAFC] rounded-xl overflow-hidden border border-[#E2E8F0] relative group">
              <img
                src={trade.screenshots[imageIndex]}
                alt={`Trade screenshot ${imageIndex + 1} `}
                onClick={() => setSelectedImage(trade.screenshots[imageIndex])}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
              />

              {/* Arrows only if multiple screenshots - IMPROVED */}
              {trade.screenshots.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setImageIndex((i) => (i === 0 ? trade.screenshots.length - 1 : i - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border border-[#E2E8F0] rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all"
                    aria-label="Previous screenshot"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#171717]" strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setImageIndex((i) => (i === trade.screenshots.length - 1 ? 0 : i + 1))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border border-[#E2E8F0] rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all"
                    aria-label="Next screenshot"
                  >
                    <ChevronRight className="w-5 h-5 text-[#171717]" strokeWidth={2.5} />
                  </button>

                  <div className="absolute bottom-3 right-3 text-xs bg-white/90 border border-[#E2E8F0] rounded-full px-3 py-1.5 font-semibold text-[#171717]">
                    {imageIndex + 1} / {trade.screenshots.length}
                  </div>
                </>
              )}
            </div>
          ) : null}
          {/* Meta - IMPROVED */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Date</p>
              <p className="text-base font-bold text-[#171717]">
                {trade.date
                  ? new Date(trade.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                  : '-'}
              </p>
            </div>

            <div className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Session</p>
              <p className="text-base font-bold text-[#171717]">{trade.session || '-'}</p>
            </div>

            <div className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Direction</p>
              <span
                className={`inline - flex items - center gap - 1.5 px - 3 py - 1.5 rounded - lg text - sm font - bold ${trade.side === 'short'
                  ? 'bg-[#FEF2F2] text-[#DC2626]'
                  : 'bg-[#F0FDF4] text-[#15803D]'
                  } `}
              >
                {trade.side === 'short' ? '↓ SHORT' : '↑ LONG'}
              </span>
            </div>

            <div className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Time</p>
              <p className="text-base font-bold text-[#171717]">
                {trade.time || (trade.startDateTime ? trade.startDateTime.split('T')[1] : '-')}
              </p>
            </div>
          </div>

          {/* Performance - IMPROVED */}
          {(() => {
            const isBE = !!trade.isBreakeven;
            const pnlDisplay = isBE ? 0 : (trade.dollarAmount || 0);
            const rDisplay = isBE ? 0 : formatR1(getTradeR(trade, activeAccount, balanceBeforeMap));
            const pnlPctDisplay = isBE ? 0 : trade.pnlPercent;

            return (
              <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
                <div className="text-sm font-semibold text-[#171717] mb-4">Performance</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">P&L</p>
                    <p className={`text - 2xl font - bold tracking - tight ${pnlDisplay >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'} `}>
                      {pnlDisplay > 0 ? '+' : ''}${pnlDisplay}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">R</p>
                    <p className={`text - 2xl font - bold tracking - tight ${rDisplay >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'} `}>
                      {formatRText(rDisplay)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">PnL %</p>
                    <p className="text-2xl font-bold text-[#171717] tracking-tight">
                      {pnlPctDisplay != null ? `${pnlPctDisplay}% ` : '-'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Duration</p>
                    <p className="text-2xl font-bold text-[#171717] tracking-tight">
                      {trade.durationMin != null ? formatDurationHuman(trade.durationMin) : '-'}
                    </p>
                  </div>

                  {/* Breakeven toggle - IMPROVED */}
                  <div className="col-span-2 sm:col-span-4">
                    <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#171717]">Breakeven</p>
                        <p className="text-xs text-[#64748B] mt-0.5">Mark this trade as BE</p>
                      </div>

                      <button
                        type="button"
                        onClick={onToggleBreakeven}
                        className={`relative inline - flex h - 6 w - 11 items - center rounded - full transition - colors ${isBE ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
                          } `}
                      >
                        <span
                          className={`inline - block h - 4 w - 4 transform rounded - full bg - white transition - transform ${isBE ? 'translate-x-6' : 'translate-x-1'
                            } `}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Execution - IMPROVED */}
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
            <div className="text-sm font-semibold text-[#171717] mb-4">Execution</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Quantity</p>
                <p className="text-base font-bold text-[#171717]">{trade.quantity ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Entry</p>
                <p className="text-base font-bold text-[#171717]">{trade.entryPrice ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Exit</p>
                <p className="text-base font-bold text-[#171717]">{trade.exitPrice ?? '-'}</p>
              </div>
            </div>
          </div>

          {/* Notes - IMPROVED */}
          {trade.notes && (
            <div className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
              <p className="text-sm font-semibold text-[#171717] mb-2">Notes</p>
              <p className="text-[#171717] leading-relaxed text-sm">{trade.notes}</p>
            </div>
          )}

          {/* Actions - IMPROVED */}
          <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={onEdit}
              className="flex-1 bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1D4ED8] transition-colors shadow-sm"
            >
              Edit Trade
            </button>
            <button
              onClick={onDeleteClick}
              className="px-6 py-3 bg-white border border-[#E2E8F0] text-[#EF4444] rounded-xl font-semibold hover:bg-[#FEF2F2] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({

  title = "Delete?",
  message = "This action can't be undone.",
  confirmText = "Delete",
  deleting,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">

      <div className="bg-white rounded-3xl max-w-sm w-full shadow-lg p-6">
        <h2 className="text-2xl font-bold text-[#171717] mb-2">{title}</h2>
        <p className="text-[#64748B] mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#F8FAFC] text-[#64748B] py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!!deleting}
            className={`flex-1 bg-gray-300 text-[#64748B] py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors ${deleting ? "bg-gray-300 text-[#64748B] cursor-not-allowed" : "bg-[#EF4444] text-white hover:bg-red-600"
              } `}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

        </div>
      </div>
    </div>
  );
}
