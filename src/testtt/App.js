import React, { useState, useEffect, useRef } from 'react';
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
  Filter,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Image, 
} from 'lucide-react';

import AnalyticsUI from './AnalyticsUI';
import CalendarUI from './CalendarUI';
import JournalUI from './JournalUI';



// ============================================================================
// CONSTANTS
// ============================================================================
const API_BASE = "http://localhost:8000";

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_MB = 2;
const MAX_SCREENSHOT_BYTES = MAX_SCREENSHOT_MB * 1024 * 1024;


async function apiLogout() {
  await ensureCsrf();
  const xsrf = getCookie("XSRF-TOKEN");

  const res = await fetch(`${API_BASE}/api/logout`, {

    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
      "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
    },
  });

  if (!res.ok) throw new Error(`Logout failed (${res.status})`);
  return res.json().catch(() => ({}));
}



function getCookie(name) {
  const parts = document.cookie.split("; ").map(v => v.split("="));
  const found = parts.find(([k]) => k === name);
  return found ? decodeURIComponent(found[1] || "") : "";
}


async function ensureCsrf() {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: "include",
  });
}





async function apiLogin(email, password) {
  await ensureCsrf();
  const xsrf = getCookie("XSRF-TOKEN");

  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
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
  const rawState = localStorage.getItem(storageKey);

  const raw = localStorage.getItem(storageKey);

  if (!rawState) {
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

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      showToast("Please select a .json backup file.");

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

        // Validate AFTER unwrap
        if (!nextState || !Array.isArray(nextState.accounts)) {
          showToast("Invalid backup file.");
          return;
        }

        confirm("Restore backup? This will overwrite your current local data.", () => {
  // 1. Write storage
  localStorage.setItem(storageKey, JSON.stringify(nextState));

  // 2. Hydrate synchronously
  window.dispatchEvent(new CustomEvent("lazy_trades:restored"));

  // 3. Toast AFTER hydrate tick
  setTimeout(() => {
    showToast("Backup restored");
  }, 0);
});

      } catch (e) {
        showToast("Backup file is not valid JSON.");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}


const MAX_TRADES_FREE = 1000;
const EMOJI_OPTIONS = ['🤑', '😀', '😑', '😒', '🙁'];

const EMOJI_MEANINGS = {
  '🤑': 'Confident',
  '😀': 'Good',
  '😑': 'Meh',
  '😒': 'Bad',
  '🙁': 'Worst'
};

const EMOJI_HEX = {
  '🤑': '1f911',
  '😀': '1f600',
  '😑': '1f611',
  '😒': '1fae4',
  '🙁': '1f641',
};


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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric',year: 'numeric' });
}

// ---------------------------------------------------------------------------
// TWEMOJI RENDER (LOCAL ASSETS)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// TWEMOJI RENDER (LOCAL ASSETS)
// ---------------------------------------------------------------------------
function Twemoji({ hex, size = 48, alt = '' }) {
  if (!hex) return null;
  return (
    <img
      src={`/twemoji/svg/${hex}.svg`}
      alt={alt}
      width={size}
      height={size}
      style={{ display: 'block' }}
      draggable="false"
    />
  );
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
  const nonBE = trades.filter(t => !t.isBreakeven);

  if (nonBE.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      total: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0
    };
  }

  const totalTrades = nonBE.length;

 if (displayMode === 'pnl') {
  const wins = nonBE.filter(t => Number(t.dollarAmount) > 0).length;
  const losses = nonBE.filter(t => Number(t.dollarAmount) < 0).length;
  const winRate = Math.round((wins / totalTrades) * 100);

  const total = nonBE.reduce((sum, t) => sum + (Number(t.dollarAmount) || 0), 0);

  const winSum = nonBE
    .filter(t => Number(t.dollarAmount) > 0)
    .reduce((sum, t) => sum + (Number(t.dollarAmount) || 0), 0);

  const lossSumAbs = Math.abs(
    nonBE
      .filter(t => Number(t.dollarAmount) < 0)
      .reduce((sum, t) => sum + (Number(t.dollarAmount) || 0), 0)
  );

  // ✅ Profit factor logic
  const profitFactor =
    lossSumAbs === 0
      ? (winSum > 0 ? Infinity : 0)
      : (winSum / lossSumAbs);

  return { totalTrades, wins, losses, winRate, total, avgWin: wins ? winSum / wins : 0, avgLoss: losses ? lossSumAbs / losses : 0, profitFactor };
}

  // ✅ R mode expects each trade to already include rComputed (number)
  const wins = nonBE.filter(t => (t.rComputed || 0) > 0).length;
  const losses = nonBE.filter(t => (t.rComputed || 0) < 0).length;
  const winRate = Math.round((wins / totalTrades) * 100);

  const total = nonBE.reduce((sum, t) => sum + (t.rComputed || 0), 0);

  const winSum = nonBE
    .filter(t => (t.rComputed || 0) > 0)
    .reduce((sum, t) => sum + (t.rComputed || 0), 0);

  const avgWin = wins > 0 ? (winSum / wins) : 0;

  const lossSumAbs = Math.abs(
    nonBE
      .filter(t => (t.rComputed || 0) < 0)
      .reduce((sum, t) => sum + (t.rComputed || 0), 0)
  );

  const avgLoss = losses > 0 ? (lossSumAbs / losses) : 0;

  const profitFactor = lossSumAbs > 0 ? (winSum / lossSumAbs) : 0;

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    total: Number(total.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2))
  };
}


// ============================================================================
// APP COMPONENT
// ============================================================================


// tiny toast helper (uses the browser for now)
function showToast(message) {
  alert(message);
}


export default function App() {

  





// ============================
// API (Laravel) - LOAD + CREATE
// ============================


// ✅ ADD THIS HERE (right after the comment)

// Fetch the logged-in user (Step 1: /me user context)
// Tries /api/me first (your new endpoint), falls back to /api/user (what you currently use)
async function apiMe() {
  const tryUrls = [`${API_BASE}/api/me`, `${API_BASE}/api/user`];

  for (const url of tryUrls) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
    });

    if (!res.ok) continue;

    const user = await res.json().catch(() => null);
    if (user) return user;
  }

  throw new Error("Not authenticated");
}

// (keep your existing functions after it)

// ========================================================
// NUCLEAR MODE: Trades are UI-only (no backend connectivity)
// ========================================================

// Always load nothing from backend
async function apiLoadTrades() {
  return [];
}

// Create trade locally: return a minimal “backend-like” object
async function apiCreateTrade(payload) {
  await ensureCsrf();
  const xsrf = getCookie("XSRF-TOKEN");

  const res = await fetch(`${API_BASE}/api/trades`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(data?.message || `Create trade failed (${res.status})`);
  }

  return data;
}


// Update trade locally: just echo back “updated”
async function apiUpdateTrade(id, payload) {
  await ensureCsrf();
  const xsrf = getCookie("XSRF-TOKEN");

  const res = await fetch(`${API_BASE}/api/trades/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(data?.message || `Update trade failed (${res.status})`);
  }

  return data;
}

// Delete trade locally: no-op
async function apiDeleteTrade(id) {
  await ensureCsrf();
  const xsrf = getCookie("XSRF-TOKEN");

  const res = await fetch(`${API_BASE}/api/trades/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Delete trade failed (${res.status})`);
  }

  return;
}


// Screenshot upload locally: no-op
async function apiUploadScreenshot() {
  return { url: null, screenshots: [] };
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






const handleDeleteAccount = (accountId) => {
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
};

useEffect(() => {
  window.apiLogin = apiLogin;
  window.ensureCsrf = ensureCsrf;
  console.log("✅ apiLogin exposed to window");
}, []);

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
  accounts: [],
  activeAccountId: null,

  // ✅ keep your existing root settings
  isSubscribed: false,
  theme: 'light',
  username: '',
  displayMode: 'pnl'
});

const [toastMsg, setToastMsg] = useState("");
const [confirmState, setConfirmState] = useState({ open: false, message: "", onYes: null });
function showToast(msg) {
  setToastMsg(msg);
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => setToastMsg(""), 2200);
}

function askConfirm(message, onYes) {
  setConfirmState({ open: true, message, onYes });
}

const activeAccount =
  state.accounts.find(a => a.id === state.activeAccountId) || null;

const activeTrades = activeAccount?.trades || [];

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
  const [activePage, setActivePage] = useState("trades");

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

const [loginLoading, setLoginLoading] = useState(false);
const [loginError, setLoginError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

// ────────────────────────────────────────────────
//  SINGLE AUTH CHECK – runs once when app loads
// ────────────────────────────────────────────────
useEffect(() => {
  const checkSession = async () => {
    try {
    const res = await fetch(`${API_BASE}/api/user`, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!res.ok) throw new Error("Not authenticated");

      const user = await res.json();
      setIsLoggedIn(true);
      setState(prev => ({
        ...prev,
        username: user?.name || user?.email || "",
      }));
    } catch (err) {
      setIsLoggedIn(false);
      setState(prev => ({ ...prev, username: "" }));
    } finally {
      setAuthChecked(true);
    }
  };

  checkSession();
}, []);
   // empty array = only on mount

  // ============================
// AUTH BOOTSTRAP (RUN ONCE)
// ============================
const [storageHydrated, setStorageHydrated] = useState(false);
const lastLoadedAccountIdRef = useRef(null);




  // =========================================================================
  // PERSISTENCE
  // =========================================================================
function hydrateFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    setStorageHydrated(true);
    return;
  }

  try {
    const parsed = JSON.parse(saved);

    let migratedState;

    if (Array.isArray(parsed.accounts)) {
      // new shape
      migratedState = {
        ...parsed,
        accounts: parsed.accounts.map(acc => ({
          ...acc,
          trades: Array.isArray(acc.trades)
            ? acc.trades.map(t => ({ ...t, feeling: migrateFeeling(t.feeling) }))
            : [],
        })),
      };
    } else {
      // old shape fallback
      const oldTrades = Array.isArray(parsed?.trades)
        ? parsed.trades.map(t => ({ ...t, feeling: migrateFeeling(t.feeling) }))
        : [];

      const main = createAccount({
        name: 'Main',
        startingBalance: parsed?.startingBalance ?? null,
        defaultRiskPct: 1,
        trades: oldTrades,
      });

      migratedState = {
        isSubscribed: !!parsed?.isSubscribed,
        theme: parsed?.theme || 'light',
        username: parsed?.username || '',
        displayMode: parsed?.displayMode || 'pnl',
        accounts: [main],
        activeAccountId: main.id,
      };
    }

    setState(migratedState);
    setStorageHydrated(true);
  } catch (err) {
    console.error("Migration / load failed:", err);
    setStorageHydrated(true);
  }
}

// run once on mount
useEffect(() => {
  hydrateFromStorage();
}, []);

// re-hydrate when a backup is restored (no browser reload)
useEffect(() => {
  const onRestored = () => hydrateFromStorage();
  window.addEventListener("lazy_trades:restored", onRestored);
  return () => window.removeEventListener("lazy_trades:restored", onRestored);
}, []);
   // ← empty deps = run once


useEffect(() => {
  if (!storageHydrated) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}, [state, storageHydrated]);


    useEffect(() => {
  // wait until localStorage is loaded into state
  if (!storageHydrated) return;

  // need an active account selected
  if (!activeAccount) return;

  // prevent re-loading for the same account repeatedly
  if (lastLoadedAccountIdRef.current === state.activeAccountId) return;
  lastLoadedAccountIdRef.current = state.activeAccountId;

  setBackendSyncing(true);

apiLoadTrades()
    .then((backendTrades) => {
      setState((prev) => {
        const nextAccounts = prev.accounts.map((acc) => {
          if (acc.id !== prev.activeAccountId) return acc;

          const existingBackendIds = new Set(
            (acc.trades || [])
              .map((t) => t.backendId)
              .filter(Boolean)
          );

          const mapped = backendTrades
            .filter((bt) => !existingBackendIds.has(bt.id))
            .map((bt) => ({
              // local trade shape (minimal)
              id: `b_${bt.id}`,          // local id
              backendId: bt.id,          // real backend id
              

              ticker: bt.instrument,
              side: bt.direction, // backend is "long" | "short"

              entryPrice: bt.entry ?? null,
              stopPrice: bt.stop_loss ?? null,
              exitPrice: bt.take_profit ?? null,

              notes: bt.notes ?? "",
              dollarAmount: 0,           // backend doesn’t store this yet
              feeling: "😑",             // default mood
              tags: [],
              screenshots: [],
              session: "",
              date: (bt.trade_date || (bt.created_at || "").slice(0, 10)),
              startDateTime: bt.trade_date
  ? `${bt.trade_date}T12:00`
  : (bt.created_at ? bt.created_at.slice(0, 16) : ""),
              endDateTime: "",
              time: "",
              durationMin: null,
              pnlPercent: null,
              riskPctUsed: null,
              isBreakeven: false,
              quantity: null,
            }));

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

      // keep quiet (normal app vibe). If you want: setToastMessage("Offline");
    });
}, [state.activeAccountId]);

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
      setState(prev => ({ ...prev, username: email }));
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



const handleLogout = async () => {
  try {
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
  setState(prev => ({ ...prev, username: "" }));
};


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
// Map local trade form -> backend schema (MVP)
function toNumOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
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

// Map local trade form -> backend schema (MVP)
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

  // ✅ Support multiple field names + convert to number
  const entry = toNumOrNull(td.entry ?? td.entryPrice ?? td.entry_price ?? td.entry_value);
  const stop_loss = toNumOrNull(td.stop_loss ?? td.stopPrice ?? td.stop ?? td.sl);
  const take_profit = toNumOrNull(td.take_profit ?? td.exitPrice ?? td.target ?? td.tp ?? td.takeProfit);

  const result = td.result ?? null;
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
    stop_loss,
    take_profit,
    result,
    notes,
    trade_date,
  };
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

  // UPDATE (backend-first)
  if (editingTrade && (editingTrade.backendId || null)) {
    apiUpdateTrade(editingTrade.backendId, mapLocalTradeToBackend(tradeData))
      .then(() => {
        // update local state ONLY after backend success
        setState((prev) => ({
          ...prev,
          accounts: prev.accounts.map((acc) => {
            if (acc.id !== prev.activeAccountId) return acc;
            return {
              ...acc,
              trades: acc.trades.map((t) =>
                t.id === editingTrade.id
                  ? {
                      ...t,
                      ...tradeData,
                      backendId: editingTrade.backendId,
                      
                    }
                  : t
              ),
            };
          }),
        }));

        setToastMessage("✅ Updated");

        // close modal only after backend success
        setShowTradeForm(false);
        setSelectedMood(null);
        setEditingTrade(null);
        setSelectedTrade(null);
      })
      .catch((e) => {
        setToastMessage(
          `⚠️ Update failed: ${String((e && e.message) || "Unknown error")}`
        );
      })
      .finally(() => setTradeSaving(false));

    return;
  }

  // CREATE (backend-first)
  apiCreateTrade(mapLocalTradeToBackend(tradeData))
    .then((created) => {
      const createdId = String(created?.id ?? "");

      // add to local state ONLY after backend success
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((acc) => {
          if (acc.id !== prev.activeAccountId) return acc;

          const newTrade = {
            ...tradeData,
           id: createdId,

            backendId: createdId || null,
            
          };

          return {
            ...acc,
            trades: [newTrade, ...(acc.trades || [])],
          };
        }),
      }));

      // upload screenshots AFTER trade exists on backend
      if (createdId && files.length > 0) {
        Promise.all(
          files.slice(0, MAX_SCREENSHOTS).map((file) =>
            apiUploadScreenshot(createdId, file)
          )
        )
          .then((results) => {
            const urls = results.map((r) => r?.url).filter(Boolean);
            if (urls.length > 0) {
              // update local trade screenshots to real URLs
              setState((prev) => ({
                ...prev,
                accounts: prev.accounts.map((acc) => {
                  if (acc.id !== prev.activeAccountId) return acc;
                  return {
                    ...acc,
                    trades: (acc.trades || []).map((t) =>
                      t.backendId === createdId ? { ...t, screenshots: urls } : t
                    ),
                  };
                }),
              }));

              // persist URLs into backend trade record
              apiUpdateTrade(createdId, {
                ...mapLocalTradeToBackend(tradeData),
                screenshots: urls,
              }).catch(() => {});
            }
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

  setTradeDeleting(true);

  // If there is no backendId, we cannot delete on backend.
  // In your current phase you said you have no legacy data, so this should basically never happen.

  // 1) Backend delete first (blocking)
  apiDeleteTrade(tradeToDelete.backendId)
    .then(() => {
      // 2) Remove locally ONLY after backend success
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
    })
    .catch((e) => {
      setToastMessage(
        `⚠️ Delete failed: ${String((e && e.message) || "Unknown error")}`
      );
    })
    .finally(() => setTradeDeleting(false));
};


  const toggleDisplayMode = () => {
    setState(prev => ({
      ...prev,
      displayMode: prev.displayMode === 'pnl' ? 'r' : 'pnl'
    }));
  };

const handleToggleBreakeven = (id) => {
  if (!activeAccount) return;

  setState(prev => ({
    ...prev,
    accounts: prev.accounts.map(acc =>
      acc.id === prev.activeAccountId
        ? {
            ...acc,
            trades: acc.trades.map(t =>
              t.id === id ? { ...t, isBreakeven: !t.isBreakeven } : t
            ),
          }
        : acc
    )
  }));

  // keep selectedTrade in sync so UI updates instantly
  setSelectedTrade(prev =>
    prev && prev.id === id ? { ...prev, isBreakeven: !prev.isBreakeven } : prev
  );
};


  // =========================================================================
  // LOGIN SCREEN
  // =========================================================================
   // ✅ Add this ABOVE your "if (!isLoggedIn)"
    if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200
 flex items-center justify-center p-4">
        <div className="text-2xl font-medium text-gray-600 animate-pulse">
          Loading...
        </div>
      </div>
    );
  }


    if (!isLoggedIn) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200
 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-500 p-3 rounded-2xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Lazy Trades</h1>
          </div>

          <p className="text-gray-600 mb-6 text-sm">
            The journal that doesn't scare you.  Track your trades with emojis, not numbers.
          </p>

         <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none mb-3"
          />

        <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none mb-4"
          />

            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                loginLoading
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {loginLoading ? "Logging in..." : "Login"}
            </button>

          
        </div>
      </div>
    );
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



return (
  <>
  
    {/* MAIN WRAPPER */}
 <div className="min-h-screen bg-[#F8FAFC]
 flex p-6 gap-6">


      <Sidebar
        sidebarOpen={sidebarOpen}
        showToast={showToast}
        openConfirm={askConfirm}
        activePage={activePage}
        onNavigate={setActivePage}
        setSidebarOpen={setSidebarOpen}
        trades={filteredTrades}
        stats={stats}
        onLogout={handleLogout}
        username={state.username}
      />

      {/* CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 gap-4">
        <TopBar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          trades={filteredTrades}
          stats={stats}
          backendSyncing={backendSyncing}

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
      <div className="p-0">
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
        />
      </div>

      <div className="mt-5 bg-[#FFFFFF] rounded-[40px] p-3 border border-black/5">
        <div className="mb-4 flex justify-center">
          <TradeViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {viewMode === "cards" ? (
          <TradeFeed
            trades={filteredTrades}
            onSelectTrade={setSelectedTrade}
            displayMode={state.displayMode}
            activeAccount={activeAccount}
            balanceBeforeMap={balanceBeforeMap}
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
    </>
  )}

  {/* OTHER PAGES ONLY */}
  {activePage === "analytics" && <AnalyticsUI />}
  {activePage === "calendar" && <CalendarUI />}
  {activePage === "journal" && <JournalUI />}
</div>

        </div>
      </div>

      {/* Floating button INSIDE wrapper is fine */}
      <FloatingAddButton onClick={handleAddButtonClick} disabled={!canAddTrade} />
    </div>

    {/* Toast (themed) */}
{toastMsg && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
    <div className="px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_15px_rgba(15,23,42,0.18)] text-sm text-slate-800">
      {toastMsg}
    </div>
  </div>
)}

{/* Confirm Modal (themed) */}
{confirmState.open && (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/20"
      onClick={() => setConfirmState({ open: false, message: "", onYes: null })}
    />
    <div className="relative w-[92%] max-w-md rounded-[28px] bg-white/85 backdrop-blur-xl border border-white/60 shadow-[0_12px_30px_rgba(15,23,42,0.25)] p-5">
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
      onClose={() => setCreateAccountOpen(false)}
      onCreate={({ name, startingBalance, defaultRiskPct }) => {
        const acc = createAccount({ name, startingBalance, defaultRiskPct, trades: [] });

        setState((prev) => ({
          ...prev,
          accounts: [acc, ...prev.accounts],
          activeAccountId: acc.id,
        }));

        setCreateAccountOpen(false);
      }}
    />

    <EditAccountModal
      open={editAccountOpen}
      onClose={() => setEditAccountOpen(false)}
      account={activeAccount}
      onDelete={() => setDeleteAccountId(activeAccount?.id)}
      isLastAccount={state.accounts.length === 1}
      onSave={({ name, startingBalance, defaultRiskPct }) => {
        setState((prev) => ({
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === prev.activeAccountId
              ? { ...a, name: name ?? a.name, startingBalance, defaultRiskPct }
              : a
          ),
        }));
        setEditAccountOpen(false);
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

        {/* Themed Toast */}
{showToast.open && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
    <div className="px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_10px_25px_rgba(15,23,42,0.18)] text-sm text-slate-800">
      {showToast.message}
    </div>
  </div>
)}



      </div>
    )}
  </>
);
}
// ============================================================================
// COMPONENTS
// ============================================================================

function CreateAccountModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('Main');
  const [startingBalance, setStartingBalance] = useState('');
  const [defaultRiskPct, setDefaultRiskPct] = useState('1');

  const [error, setError] = useState('');

  useEffect(() => {
 
}, []);


  useEffect(() => {
    if (!open) return;
    setError('');
    setName('Main');
    setStartingBalance('');
    setDefaultRiskPct('1');
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const n = String(name || '').trim();
    const sbRaw = String(startingBalance || '').trim();
    const rpRaw = String(defaultRiskPct || '').trim();

    if (!n) return setError('Account name is required.');
    if (sbRaw === '') return setError('Starting balance is required.');
    if (rpRaw === '') return setError('Default risk % is required.');

    const sb = Number(sbRaw);
    const rp = Number(rpRaw);

    if (!Number.isFinite(sb) || sb < 0) return setError('Starting balance must be a valid number (0 or more).');
    if (!Number.isFinite(rp) || rp <= 0) return setError('Default risk % must be a valid number (> 0).');

    onCreate({ name: n, startingBalance: sb, defaultRiskPct: rp });
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border border-gray-200 shadow-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">Create account</div>
            <div className="text-xs text-gray-500">Required before adding trades</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Account name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Starting balance ($)</label>
            <input
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="e.g. 4000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Default risk %</label>
            <input
              type="number"
              value={defaultRiskPct}
              onChange={(e) => setDefaultRiskPct(e.target.value)}
              placeholder="e.g. 1"
              step="0.1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
          >
            Create
          </button>
          
        </div>
      </div>
    </div>
  );
}

function EditAccountModal({ open, onClose, onSave, onDelete, account, isLastAccount }) {


  const [name, setName] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [defaultRiskPct, setDefaultRiskPct] = useState('');


  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');

    setName(account?.name ?? '');
    setStartingBalance(account?.startingBalance == null ? '' : String(account.startingBalance));
    setDefaultRiskPct(account?.defaultRiskPct == null ? '' : String(account.defaultRiskPct));
  }, [open, account]);

  if (!open) return null;

  const submit = () => {
    const n = String(name || '').trim();
    const sbRaw = String(startingBalance || '').trim();
    const rpRaw = String(defaultRiskPct || '').trim();

    if (!n) return setError('Account name is required.');
    if (sbRaw === '') return setError('Starting balance is required.');
    if (rpRaw === '') return setError('Default risk % is required.');

    const sb = Number(sbRaw);
    const rp = Number(rpRaw);

    if (!Number.isFinite(sb) || sb < 0) return setError('Starting balance must be a valid number (0 or more).');
    if (!Number.isFinite(rp) || rp <= 0) return setError('Default risk % must be a valid number (> 0).');

    onSave({ name: n, startingBalance: sb, defaultRiskPct: rp });
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border border-gray-200 shadow-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">Edit account</div>
            <div className="text-xs text-gray-500">Update balance and default risk</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Account name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Starting balance ($)</label>
            <input
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="e.g. 4000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Default risk %</label>
            <input
              type="number"
              value={defaultRiskPct}
              onChange={(e) => setDefaultRiskPct(e.target.value)}
              placeholder="e.g. 1"
              step="0.1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

<div className="p-5 border-t border-gray-100 flex items-center gap-2">
  {/* Left: Delete */}
 <button
  type="button"
  onClick={onDelete}
  disabled={isLastAccount}
  className={`py-3 px-4 rounded-xl font-semibold border transition
    ${
      isLastAccount
        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
        : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
    }
  `}
>
  Delete
</button>

{isLastAccount && (
  <p className="text-xs text-gray-400 mt-2">
    At least one account must exist
  </p>
)}

  {/* Spacer pushes right group */}
  <div className="flex-1" />

  {/* Right: Cancel + Save grouped */}
  <div className="flex gap-2">
    <button
      type="button"
      onClick={onClose}
      className="py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
    >
      Cancel
    </button>

    <button
      type="button"
      onClick={submit}
      className="py-3 px-6 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
    >
      Save
    </button>
  </div>
</div>



          
        </div>
      </div>
  
  );
}

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
        className="bg-white w-full max-w-md rounded-3xl border border-gray-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">Starting balance</div>
            <div className="text-xs text-gray-500">Used to calculate your balance</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <label className="text-sm text-gray-600 mb-2 block font-semibold">
            Amount ($)
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 4000"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Tip: you can set 0 if you just want to track profit only.
          </p>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
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
  ).sort((a,b) => a.localeCompare(b));

  const reset = () => setFilters({ ticker: '', direction: '', outcome: '', tag: '' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tag */}
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Tag</label>
            <select
              value={filters.tag}
              onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Ticker */}
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Ticker</label>
            <select
              value={filters.ticker}
              onChange={(e) => setFilters(prev => ({ ...prev, ticker: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All</option>
              {tickers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Direction</label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">Outcome</label>
            <select
              value={filters.outcome}
              onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
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
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600"
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
    <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] min-h-[60vh] overflow-hidden flex flex-col">

      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
        </button>

        {/* Body */}
       <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      

          <div className="text-center mb-8 w-full">
            <p className="text-base font-medium text-gray-600">
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
                      hex={EMOJI_HEX[emo]}
                      size={56}
                      alt={EMOJI_MEANINGS[emo]}
                    />
                  </div>

                  <span className="mt-3 text-sm font-semibold text-gray-700">
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
  } catch (e) {}
}, []);

useEffect(() => {
  try {
    localStorage.setItem(QUICK_SYMBOLS_KEY, JSON.stringify(quickSymbols));
  } catch (e) {}
}, [quickSymbols]);


useEffect(() => {
  try {
    const saved = localStorage.getItem(TRADE_FORM_MODE_KEY);
    if (saved === "advanced" || saved === "basic") {
      setTradeFormMode(saved);
    }
  } catch (e) {}
}, []);

useEffect(() => {
  try {
    localStorage.setItem(TRADE_FORM_MODE_KEY, tradeFormMode);
  } catch (e) {}
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
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[90vh] flex flex-col overflow-hidden">

        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">Manage quick symbols</div>
            <div className="text-xs text-gray-500">Max {QUICK_SYMBOLS_MAX}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {draft.slice(0, QUICK_SYMBOLS_MAX).map((s, idx) => (
            <input
              key={idx}
              value={s}
              onChange={(e) => updateAt(idx, e.target.value)}
              placeholder={`Symbol ${idx + 1}`}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
            />
          ))}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
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
      : "border-gray-200 focus:border-blue-500",
    extra,
  ].join(" ");
};


  const [ticker, setTicker] = useState(trade?. ticker || '');
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
        <div className="bg-white w-full max-w-lg rounded-3xl border border-gray-200 shadow-xl">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900">Manage quick tags</div>
              <div className="text-xs text-gray-500">Max {QUICK_TAGS_MAX}</div>
            </div>
  
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
  
          <div className="p-5 space-y-3">
            {draft.map((t, idx) => {
              const value = String(t || '');
              const dup = value.trim() && isDup(draft, value, idx);
  
              return (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={value}
                    onChange={(e) => updateAt(idx, e.target.value)}
                    placeholder={`Tag ${idx + 1}`}
                    className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none ${
                      dup ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
  
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="px-3 py-3 rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200"
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
                className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              >
                + Add tag
              </button>
            )}
          </div>
  
          <div className="p-5 border-t border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
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


  const [dollarAmount, setDollarAmount] = useState(trade?.dollarAmount?. toString() || '');
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
    } catch (e) {}
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem(QUICK_TAGS_KEY, JSON.stringify(quickTags));
    } catch (e) {}
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
    <div className="bg-white w-full max-w-md rounded-3xl border border-gray-200 shadow-xl">
      <div className="p-5 border-b border-gray-100">
        <div className="text-lg font-bold text-gray-900">Advanced stats need extra inputs</div>
        <div className="text-xs text-gray-500 mt-1">
          Old trades might not have enough data. Advanced mode will ask for more fields going forward.
        </div>
      </div>

      <div className="p-5 text-sm text-gray-700">
        You can always switch back to Basic anytime. Nothing gets deleted, advanced fields just hide.
      </div>

      <div className="p-5 border-t border-gray-100 flex gap-2">
        <button
          type="button"
          onClick={() => setShowAdvWarn(false)}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => {
            try { localStorage.setItem(TRADE_FORM_ADV_WARNED_KEY, "1"); } catch (e) {}
            setShowAdvWarn(false);
            setTradeFormMode("advanced");
          }}
          className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
        >
          Enable Advanced
        </button>
      </div>
    </div>
  </div>
)}

    


        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
  {/* Left side */}
  <div>
    <h2 className="text-xl font-semibold text-gray-900">
      {ticker ? ticker.toUpperCase() : 'New Trade'}
    </h2>

    <div className="mt-2 flex items-center gap-3">
      <Twemoji
        hex={EMOJI_HEX[mood]}
        size={28}
        alt={EMOJI_MEANINGS[mood]}
      />
      <div>
        <p className="text-xs text-gray-500">How did this trade felt?</p>
        <p className="text-sm font-semibold text-gray-800">
          {EMOJI_MEANINGS[mood] || '—'}
        </p>
      </div>
    </div>

    {/* ✅ Put your Basic/Advanced toggle HERE (inside left side) */}
    {/* Mode toggle (Basic / Advanced) */}
{/* Trade form mode toggle */}
<div className="mt-4">
  <div className="relative inline-flex rounded-2xl border border-gray-300 bg-white p-1 shadow-sm">
    {/* Sliding highlight */}
    <div
      className={`absolute top-1 bottom-1 left-1 w-[110px] rounded-xl transition-transform duration-200 ${
        tradeFormMode === "advanced" ? "translate-x-[110px]" : "translate-x-0"
      } bg-blue-600`}
    />

    <button
      type="button"
      onClick={() => setTradeFormMode("basic")}
      className={`relative z-10 w-[110px] px-4 py-2 rounded-xl text-sm font-bold transition ${
        tradeFormMode === "basic" ? "text-white" : "text-gray-700 hover:text-gray-900"
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
      className={`relative z-10 w-[110px] px-4 py-2 rounded-xl text-sm font-bold transition ${
        tradeFormMode === "advanced" ? "text-white" : "text-gray-700 hover:text-gray-900"
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
    <span className="text-gray-500">
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


    {/* Example: <YourToggleComponent /> */}
  </div>

  {/* Right side (X always stays here) */}
  <button
    type="button"
    onClick={onClose}
    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
    aria-label="Close"
  >
    <X className="w-6 h-6" />
  </button>
</div>



<div className="flex-1 overflow-y-auto p-6 space-y-6">


          <div className="mt-3">
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm text-gray-600 mb-2 block font-semibold">Symbols</p>

    <button
      type="button"
      onClick={() => setQuickSymbolsOpen(true)}
      className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 text-xs"
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
          className={`px-3 py-1 rounded-full text-sm border transition ${
            active
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
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
  <div>
    <label className="text-xs text-gray-500 mb-0.5 block">Start</label>
    <input
      type="datetime-local"
      value={startDateTime}
      onChange={e => setStartDateTime(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
    />
    <p className="text-xs text-gray-400 mt-1">{formatDateDisplay(date)}</p>
  </div>

  {/* End */}
  <div>
    <label className="text-xs text-gray-500 mb-0.5 block">End</label>
    <input
      ref={endDateTimeRef}
      type="datetime-local"
      value={endDateTime}
      onChange={e => setEndDateTime(e.target.value)}
      className={inputClass("end", endDateTime, "w-full px-4 py-3 rounded-xl border focus:outline-none")}



    />
  </div>

  {/* Session below both */}
  <div className="col-span-2">
    <label className="text-sm text-gray-600 mb-2 block font-semibold">Session</label>
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
  <label className="text-sm text-gray-600 block font-semibold">Direction</label>
  
</div>

            <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  side === 'long'
                    ? 'bg-white text-green-700 shadow'
                    : 'text-gray-500'
                }`}
              >
                LONG ↑
              </button>

              <button
                type="button"
                onClick={() => setSide('short')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  side === 'short'
                    ? 'bg-white text-red-700 shadow'
                    : 'text-gray-500'
                }`}
              >
                SHORT ↓
              </button>
            </div>
                    </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">
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
              <label className="text-sm text-gray-600 mb-2 block font-semibold">
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
              <label className="text-sm text-gray-600 mb-2 block font-semibold">
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
            <label className="text-sm text-gray-600 mb-2 block font-semibold">P&L ($)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                ref={pnlRef}
                placeholder="e.g.  300 or -100"
                value={dollarAmount}
                onChange={e => setDollarAmount(e.target.value)}
                className={inputClass("pnl", dollarAmount, "flex-1")}

              />
              <span className="text-xl font-bold text-gray-600">$</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Breakeven</p>
              <p className="text-xs text-gray-500">Mark this trade as BE</p>
            </div>

            <button
              type="button"
              onClick={() => setIsBreakeven(v => !v)}
              className={`w-14 h-8 rounded-full transition flex items-center px-1 ${
                isBreakeven ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full transition ${
                  isBreakeven ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>


          <div>
  <label className="text-sm text-gray-600 mb-2 block font-semibold">
    Risk % for this trade (optional)
  </label>

  <div className="flex items-center gap-2">
    <input
      type="number"
      value={riskPctUsed}
      onChange={(e) => setRiskPctUsed(e.target.value)}
      placeholder={activeAccount?.defaultRiskPct != null ? String(activeAccount.defaultRiskPct) : 'e.g. 1'}
      step="0.1"
      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
    />
    <span className="text-xl font-bold text-gray-600">%</span>
  </div>

  {activeAccount?.defaultRiskPct != null && (
    <p className="text-xs text-gray-500 mt-2">
      Default: {activeAccount.defaultRiskPct}% (you can override per trade)
    </p>
  )}
</div>



        

          <div>
  <label className="text-sm text-gray-600 mb-2 block font-semibold">Tags</label>

  {/* Quick tags (5 editable) */}
{/* Quick tags (5 saved) */}
<div className="mb-3">
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs text-gray-500">Quick tags</p>

    <button
      type="button"
      onClick={() => setQuickTagsOpen(true)}
      className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 text-xs"
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
          className={`px-3 py-1 rounded-full text-sm border transition ${
            active
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
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
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-100 border border-gray-200"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-gray-500 hover:text-gray-800"
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
      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none"
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
  <label className="text-sm text-gray-600 mb-2 block font-semibold">Notes</label>
  <textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="What happened? Quick lesson? Mistake? Setup note…"
    rows={4}
    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none resize-none"
  />
</div>


          <div>
            <label className="text-sm text-gray-600 mb-2 block font-semibold">
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

                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {screenshots.length < 3 && (
              
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer block">
                <p className="text-gray-500">Tap to upload a screenshot</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
              </label>
            )}
            {shotError && (
  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-4">
    {shotError}
  </div>
)}

          </div>

          {submitError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            {submitError}
          </div>
        )}


<button
  onClick={handleSubmit}
  disabled={!!saving}
  className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
    saving ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
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

function Sidebar({ sidebarOpen, setSidebarOpen, trades, stats, onLogout, username, showToast, openConfirm, activePage, onNavigate }) {
    const [backupExpanded, setBackupExpanded] = useState(false);

  // Auto-close when sidebar collapses
  useEffect(() => {
    if (!sidebarOpen) setBackupExpanded(false);
  }, [sidebarOpen]);

  return (
    <aside
  className={`bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_15px_rgba(15,23,42,0.10)]
  rounded-[28px] overflow-hidden transition-all duration-300 ${
    sidebarOpen ? 'w-[260px]' : 'w-[84px]'
  } flex flex-col`}
>

      <div className="p-6 border-b border-white/60">

        <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="bg-blue-500 p-3 rounded-2xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && <h1 className="text-xl font-bold text-gray-800">Eazy Trades</h1>}

        </div>
      </div>

      
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          
          <button
              type="button"
              onClick={() => onNavigate("trades")}  className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
                ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
                bg-white/60  border border-white/70`}
            >

            <TrendingUp className="w-5 h-5 opacity-50" />
            {sidebarOpen && <span className="font-medium tracking-tight">Trades</span>}
          </button>
          <button
              type="button"
              onClick={() => onNavigate("analytics")}  className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
                ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
                bg-white/60 shadow-sm border border-white/70`}
            >
            <BarChart3 className="w-5 h-5 opacity-80" />
            {sidebarOpen && <span className="font-medium tracking-tight">Analytics</span>}
          </button>
          <button  
          type="button"
            onClick={() => onNavigate("calendar")}
            className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
                ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
                bg-white/60 shadow-sm border border-white/70`}
            >
            <Calendar className="w-5 h-5 opacity-80" />
            {sidebarOpen && <span className="font-medium tracking-tight">Calendar</span>}
          </button>
          <button
  type="button"
  onClick={() => onNavigate("journal")}
  className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
    ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
    bg-white/60 shadow-sm border border-white/70`}
>
  <BookOpen className="w-5 h-5 opacity-80" />
  {sidebarOpen && <span className="font-medium tracking-tight">Journal</span>}
</button>

          <button   className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
              ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
              bg-white/60 shadow-sm border border-white/70`}
          >
            <Settings className="w-5 h-5 opacity-80" />
            {sidebarOpen && <span className="font-medium tracking-tight">Settings</span>}
          </button>
          {/* Backup / Restore */}
        {/* Backup */}
        {/* Backup (expand down) */}
        <div className="w-full">
          <button
            type="button"
            onClick={() => sidebarOpen && setBackupExpanded((v) => !v)}
            className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
        ${sidebarOpen ? "justify-start px-4" : "justify-center px-0"}
        bg-white/60 shadow-sm border border-white/70`}
          >
    <BookOpen className="w-5 h-5 opacity-80" />

    {sidebarOpen && (
      <>
        <span className="font-medium tracking-tight">Backup</span>

        {/* Right-side caret */}
      <ChevronDown
  className={`ml-auto w-5 h-5 text-black/60 transition-transform ${
    backupExpanded ? "rotate-180" : ""
  }`}
/>

      </>
    )}
  </button>

  {/* Children */}
  {sidebarOpen && backupExpanded && (
    <div className="mt-2 ml-10 mr-2 space-y-2">
      <button
        type="button"
        onClick={() => exportBackup(STORAGE_KEY)}
        className="w-full text-left px-4 py-2 rounded-xl bg-white/50 border border-white/60 hover:bg-white/70 transition-all text-sm"
      >
        Export
      </button>

      <button
        type="button"
        onClick={() => restoreBackup(STORAGE_KEY, { toast: showToast, confirm: openConfirm })}
        className="w-full text-left px-4 py-2 rounded-xl bg-white/50 border border-white/60 hover:bg-white/70 transition-all text-sm"
      >
        Restore
      </button>
    </div>
  )}
</div>




        </div>
      </nav>

      <div className="p-4 border-t border-white/60 space-y-2">

        <button   className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
    ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
    bg-white/60 shadow-sm border border-white/70`}
>
          <HelpCircle className="w-5 h-5 opacity-80" />
          {sidebarOpen && <span className="font-medium tracking-tight">Help</span>}
        </button>
       <button   className={`w-full flex items-center gap-3 py-3 rounded-2xl transition-all
    ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'}
    bg-white/60 shadow-sm border border-white/70`}
>
          {sidebarOpen && <span className="font-medium tracking-tight">{username}</span>}

          
        </button>

        
        

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
        >
          
          <X className="w-5 h-5 opacity-80" />
          {sidebarOpen && <span className="font-medium tracking-tight">Logout</span>}
        </button>
        
      </div>
    </aside>
  );
}

function TopBar({
  sidebarOpen,
  setSidebarOpen,
  trades,
  stats,
  backendSyncing,
  displayMode,
  onToggleDisplayMode,
  dateFilter,
  setDateFilter,
  onOpenFilter,
  onCreateAccount,
  onEditAccount,
  
  accounts,
  activeAccountId,
  onSwitchAccount,
}) {


const topBarBtn =
  "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 " +
  "text-gray-700 hover:text-gray-700 transition-all";

  const [calOpen, setCalOpen] = useState(false);
  
 

  return (

  <div
    className="bg-white/70 backdrop-blur-xl border border-white/60 ]
rounded-[20px] px-9 py-3 flex items-center justify-between"
  >
    {/* LEFT */}
    <div className="flex items-center gap-3">
      <button
        onClick={() => setSidebarOpen(v => !v)}
        className="w-10 h-10 rounded-2xl bg-white/70 border border-white/70 shadow-sm
               flex items-center justify-center text-gray-700 hover:bg-white transition"
        aria-label="Toggle sidebar"
        type="button"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>
    </div>

    {/* RIGHT (everything grouped together) */}
    <div className="flex items-center gap-2">
    {backendSyncing && (
  <div className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-600">
    Syncing…
  </div>
)}

      {/* Account group */}
      <div className="flex items-center gap-1 mr-2">
        <button
          onClick={onCreateAccount}
          className={topBarBtn}

          type="button"
        >
          <PlusCircle className="w-4 h-4" />
          Account
        </button>

        <select
          value={activeAccountId || ''}
          onChange={(e) => onSwitchAccount(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm font-medium
              bg-white border border-gray-200
              text-gray-600 hover:text-gray-700
              shadow-sm focus:outline-none"
        >
          {(accounts || []).map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div className="relative">
        <button
          onClick={() => setCalOpen(v => !v)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2
            transition-all
            ${calOpen ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-700'}
          `}
          type="button"
        >
          <Calendar className="w-4 h-4" />
          Date
        </button>

        {calOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCalOpen(false)} />
            <div className="relative z-50">
              <CalendarPopover
                value={dateFilter}
                onChange={setDateFilter}
                onClose={() => setCalOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Filter */}
      <button
        onClick={onOpenFilter}
        className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2
               transition-all text-gray-600 hover:text-gray-700"
        type="button"
      >
        <Filter className="w-4 h-4" />
        Filter
      </button>

      {/* P&L / R */}
      <button
        onClick={onToggleDisplayMode}
        className="px-4 py-2 rounded-xl text-sm font-semibold
               bg-white text-gray-600 shadow-sm flex items-center gap-2"
        type="button"
      >
        {displayMode === 'pnl' ? '💵 P&L' : '📊 R'}
      </button>
    </div>
  </div>
);

}

function CalendarPopover({ value, onChange, onClose }) {
  const [month, setMonth] = useState(() => {
    const base = value.start ? new Date(value.start + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const start = value.start ? new Date(value.start + "T00:00:00") : null;
  const end = value.end ? new Date(value.end + "T00:00:00") : null;

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const startOffset = firstDay.getDay(); // Sun start
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startOffset + 1;
    cells.push(dayNum < 1 || dayNum > daysInMonth
      ? null
      : new Date(month.getFullYear(), month.getMonth(), dayNum)
    );
  }

  const toStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const isSameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isBetween = (d) => {
    if (!start || !end) return false;
    return d >= start && d <= end;
  };

  const pick = (d) => {
    if (!start || (start && end)) {
      onChange({ start: toStr(d), end: "" });
      return;
    }
    if (d < start) onChange({ start: toStr(d), end: toStr(start) });
    else onChange({ start: toStr(start), end: toStr(d) });
  };

  return (
    <div
  className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 z-50"
  onClick={(e) => e.stopPropagation()}
>

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          ‹
        </button>

        <div className="font-semibold text-gray-800">{monthLabel}</div>

        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="h-9" />;

          const selectedStart = isSameDay(d, start);
          const selectedEnd = isSameDay(d, end);
          const inRange = isBetween(d);

          const cls = [
            "h-9 rounded-xl flex items-center justify-center text-sm cursor-pointer select-none",
            selectedStart || selectedEnd ? "bg-gray-900 text-white" : "",
            inRange && !(selectedStart || selectedEnd) ? "bg-gray-100 text-gray-900" : "",
            !(selectedStart || selectedEnd || inRange) ? "hover:bg-gray-50 text-gray-800" : ""
          ].join(" ");

          return (
            <div key={idx} onClick={() => pick(d)} className={cls}>
              {d.getDate()}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => { onChange({ start: "", end: "" }); onClose(); }}
          className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </div>
  );
}


function BalanceSummary({ stats, displayMode, trades, currentBalance, defaultRiskPct, currentOneR }) {



const canEdit = typeof stats.onEditAccount === "function";


 return (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">


    

    

{/* Balance card */}
<div className="relative bg-white rounded-2xl p-6 border border-black/5  flex flex-col">

  <div className="flex items-start justify-between">
    <p className="text-sm text-gray-500 mb-0.5 leading-none">Balance</p>

    <div className="group relative">
      <button
        onClick={canEdit ? stats.onEditAccount : undefined}
        disabled={!canEdit}
        className={`leading-none ${
          canEdit ? "text-gray-400 hover:text-gray-700" : "text-gray-200 cursor-not-allowed"
        }`}
        type="button"
        aria-label="Edit account"
      >
        ✏️
      </button>

      {canEdit && (
        <div className="pointer-events-none absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">
            Edit account
          </div>
        </div>
      )}
    </div>
  </div>

  {stats.startingBalance == null ? (
    <p className="text-lg font-medium text-gray-500 mt-2">Set balance</p>
  ) : (
    <>
      <p className="text-3xl font-bold text-gray-800">
        ${currentBalance.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Started: ${Number(stats.startingBalance).toLocaleString()}
      </p>

      {defaultRiskPct != null && (
        <p className="text-xs text-gray-500 mt-1">
          Default risk: {Number(defaultRiskPct)}% · 1R: $
          {Number(currentOneR || 0).toLocaleString()}
        </p>
      )}
    </>
  )}
</div>

      {/* Total */}
  <div className="bg-white rounded-2xl p-9 border border-black/5  flex flex-col">



        <p className="text-sm text-gray-500 mb-0.5">
          {displayMode === 'pnl' ? 'Total P&L' : 'Total R'}
        </p>
        <p
  className={`text-3xl font-bold ${
    stats.total > 0
      ? 'text-green-400'
      : stats.total < 0
        ? 'text-red-400'
        : 'text-black-500'
  }`}
>
          {displayMode === 'pnl'
  ? `${stats.total > 0 ? '+' : ''}$${stats.total}`
  : `${stats.total > 0 ? '+' : ''}${stats.total}R`}

        </p>
        <p className="text-xs text-gray-500 mt-1">{stats.totalTrades} trades</p>
      </div>

      {/* Win rate */}
   <div className="bg-white rounded-3xl p-9 border border-black/5  flex flex-col">



        <p className="text-sm text-gray-500 mb-0.5 ">Win Rate</p>
        <p className="text-3xl font-bold text-black-600">{stats.winRate}%</p>
        <p className="text-xs text-gray-500 mt-1">
          {stats.wins}W / {stats.losses}L
        </p>
      </div>

      {/* Profit factor */}



 <div className="bg-white rounded-3xl p-9 border border-black/5  flex flex-col">



        <p className="text-sm text-gray-500 mb-0.5">Profit Factor</p>
        <p className="text-3xl font-bold text-gray-800">
  {Number.isFinite(stats.profitFactor)
    ? stats.profitFactor.toFixed(2)
    : "∞"}
</p>

        <p className="text-xs text-gray-500 mt-1">Avg W/L ratio</p>
      </div>
    

    </div>

  );
}

function TradeViewToggle({ viewMode, setViewMode }) {
  return (
    <div className="flex items-center justify-center">


      <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'cards'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-500'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />

        </button>

        <button
          onClick={() => setViewMode('log')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'log'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-500'
          }`}
        >
          <List className="w-4 h-4" />

        </button>
      </div>
    </div>
  );
}



function TradeFeed({ trades, onSelectTrade, displayMode, activeAccount, balanceBeforeMap }) {

  if (trades.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-gray-600 text-lg font-semibold mb-2">No trades yet</p>
        <p className="text-gray-400 text-sm">Click the top + Account button to add your first account</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10 justify-items-center">
      {trades.map(trade => (
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
  );
}


function TradeCard({ trade, onClick, displayMode, activeAccount, balanceBeforeMap }) {
  const isBE = !!trade.isBreakeven;

  const pnl = Number(trade.dollarAmount || 0);
  const r = formatR1(getTradeR(trade, activeAccount, balanceBeforeMap));

  const metricValue = displayMode === "pnl" ? pnl : r;
  const isWin = !isBE && metricValue > 0;
  
  const isLoss = !isBE && metricValue < 0;

  const pillText = isBE
    ? "BE"
    : displayMode === "pnl"
      ? `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl)}`
      : formatRText(r);
  // ✅ fintech-style pill colors + shape (not roundy)
  const pillClass = isBE
    ? "bg-gray-100 text-gray-700 border-gray-200"
    : isWin
      ? "bg-green-100 text-green-700 border-green-200"
      : isLoss
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-gray-100 text-gray-700 border-gray-200";

  const hasShot = trade.screenshots && trade.screenshots.length > 0;

  const formatCardDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // Jan 22
  };

  const sessionValue = trade.session ? String(trade.session).trim() : "";
  const dateValue = formatCardDate(trade.date);
  const dirValue = (trade.side || "").toLowerCase(); // long/short

  const EmptyLine = () => (
    <span className="inline-block w-10 h-[2px] bg-gray-200 rounded-full" />
  );

  return (
    <div
  onClick={onClick}
  className="group bg-white rounded-3xl  hover: transition-all cursor-pointer border border-white/70 overflow-visible flex flex-col w-full max-w-[420px]"
>

      {/* ✅ IMPORTANT: emoji must NOT be inside overflow-hidden box */}
      <div className="relative">
        {/* image wrapper keeps image clipped */}
    <div className="relative w-full h-60  overflow-hidden
                rounded-t-3xl
                
                ring-1 ring-black/5">

          {hasShot ? (
            <>
              <img
                  src={trade.screenshots[0]}
                  alt="Screenshot"
                  loading="lazy"
                  decoding="async"
                  className="
                    w-full h-full object-cover
                    saturate-[0.72] contrast-[0.93] brightness-[1.02]
                    transition duration-300
                    group-hover:saturate-[0.85] group-hover:contrast-[0.97] group-hover:brightness-[1.02]
                  "
                />

{/* calm white veil (glassy, not dark) */}
<div className="absolute inset-0 bg-white/8 transition duration-300 group-hover:bg-white/4" />

{/* gentle depth gradient (very light) */}
<div className="absolute inset-0 bg-gradient-to-t from-black/8 via-transparent to-transparent transition duration-300 group-hover:from-black/5" />

{/* optional: tiny top highlight for “glass” */}
<div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-80" />


            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-10 h-10 text-gray-400 opacity-60" />
            </div>
          )}
        </div>

        {/* ✅ emoji overlap (now visible, not clipped) */}
        <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 z-20">
          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
            <Twemoji
              hex={EMOJI_HEX[trade.feeling]}
              size={34}
              alt={EMOJI_MEANINGS[trade.feeling]}
            />
          </div>
        </div>
      </div>

      {/* body */}
      <div className="px-6 pt-12 pb-6 flex-1 flex flex-col">
        <div className="text-center">
          {/* ✅ less “aggressive” ticker */}
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
            {trade.ticker}
          </h3>

          {/* pill under symbol */}
          <div className="mt-3 flex justify-center">
            <span
              className={`px-5 py-2 rounded-lg border font-semibold text-base shadow-[0_8px_20px_rgba(15,23,42,0.06)] ${pillClass}`}

            >
              {pillText}
            </span>
          </div>
        </div>

        {/* bottom stats */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs text-gray-500">Session</p>

              <div className="mt-2 text-lg font-semibold text-gray-900">
                {sessionValue ? sessionValue : <EmptyLine />}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Date</p>

              <div className="mt-2 text-lg font-semibold text-gray-900">
                {dateValue ? dateValue : <EmptyLine />}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Direction</p>

              <div
                className={`mt-2 text-lg font-semibold ${
                  dirValue === "short"
                    ? "text-red-600"
                    : dirValue === "long"
                      ? "text-green-700"
                      : "text-gray-300"
                }`}
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
}




function TradeLogTable({ trades, onSelectTrade, displayMode, activeAccount, balanceBeforeMap }) {

  if (trades.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-600 text-lg font-semibold mb-2">No trades yet</p>
        <p className="text-gray-400 text-sm">Log trades to see them here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      <div className="overflow-x-auto">
        <table className="w-full text-left table-fixed">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Time</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Ticker</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Qty</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Entry</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Exit</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Dir</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Session</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Mood</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">
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
    ? `${pnlDisplay >= 0 ? "+" : "-"}$${Math.abs(pnlDisplay)}`
    : formatRText(rDisplay);

              return (
                <tr
                  key={trade.id}
                  onClick={() => onSelectTrade(trade)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDateDisplay(trade.date)}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {trade.time || (trade.dateTime ? trade.dateTime.split('T')[1] : '-') }
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                    {trade.ticker}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {trade.quantity ?? '-'}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {trade.entryPrice ?? '-'}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {trade.exitPrice ?? '-'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        trade.side === 'short'

                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {trade.side === 'short' ? 'SHORT ↓' : 'LONG ↑'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {trade.session}
                  </td>

                  <td className="px-4 py-3">
  <div className="w-10 h-10">
    <Twemoji
      hex={EMOJI_HEX[trade.feeling]}
      size={32}
      alt={EMOJI_MEANINGS[trade.feeling]}
    />
  </div>
</td>


                  <td className="px-4 py-3 text-sm font-bold text-right">
          <span
  className={`px-3 py-1 rounded-md border font-semibold ${
    isBE
      ? 'bg-gray-100 text-gray-700 border-gray-200'
      : isWin
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-red-100 text-red-700 border-red-200'
  }`}
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
      className={`fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
        disabled
          ?  'bg-gray-300 text-gray-500 cursor-not-allowed'
          :  'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-xl'
      }`}
    >
      <PlusCircle className="w-7 h-7" />
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

    {/* Header */}
<div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
  <h2 className="text-xl font-semibold text-gray-900">
    {trade.ticker}
  </h2>

  <button
    type="button"
    onClick={onClose}
    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
    aria-label="Close"
  >
    <X className="w-6 h-6" />
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
        alt={`Screenshot ${imageIndex + 1}`}
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
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-sm"

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
           className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-sm"


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
          <div className="absolute bottom-4 right-4 bg-white/90 text-xs rounded-full px-3 py-1">
            {imageIndex + 1} / {trade.screenshots.length}
          </div>
        </>
      )}
    </div>
  </div>
)}


        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6"
        >
                    {/* Screenshot */}
{trade.screenshots && trade.screenshots.length > 0 && (
  <div>
    

    <div className="w-full aspect-video
 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
      <img
        src={trade.screenshots[imageIndex]}
        alt={`Trade screenshot ${imageIndex + 1}`}
        onClick={() => setSelectedImage(trade.screenshots[imageIndex])}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Arrows only if multiple screenshots */}
      {trade.screenshots.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setImageIndex((i) => (i === 0 ? trade.screenshots.length - 1 : i - 1))
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border border-black/10 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Previous screenshot"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() =>
              setImageIndex((i) => (i === trade.screenshots.length - 1 ? 0 : i + 1))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border border-black/10 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Next screenshot"
          >
            ›
          </button>

          <div className="absolute bottom-3 right-3 text-xs bg-white/90 border border-black/10 rounded-full px-3 py-1">
            {imageIndex + 1} / {trade.screenshots.length}
          </div>
        </>
      )}
    </div>
  </div>
)}
          
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Date</p>
              <p className="text-base font-medium">
                {trade.date
                  ? new Date(trade.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-0.5">Session</p>
              <p className="text-base font-medium">{trade.session || '-'}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-0.5">Direction</p>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                  trade.side === 'short'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {trade.side === 'short' ? 'SHORT ↓' : 'LONG ↑'}
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-0.5">Time</p>
              <p className="text-base font-medium">
                {trade.time || (trade.startDateTime ? trade.startDateTime.split('T')[1] : '-') }
              </p>
            </div>
          </div>

          {/* Performance */}
          {(() => {
            const isBE = !!trade.isBreakeven;

            const pnlDisplay = isBE ? 0 : (trade.dollarAmount || 0);
            const rDisplay = isBE ? 0 : formatR1(getTradeR(trade, activeAccount, balanceBeforeMap));

            const pnlPctDisplay = isBE ? 0 : trade.pnlPercent;

            return (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">P&L</p>
                    <p className={`text-xl font-bold ${pnlDisplay >= 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                      {pnlDisplay > 0 ? '+' : ''}${pnlDisplay}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">R</p>
                   <p className={`text-xl font-bold ${rDisplay >= 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                      {formatRText(rDisplay)}
                    </p>

                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">PnL %</p>
                    <p className="text-xl font-bold text-gray-800">
                      {pnlPctDisplay != null ? `${pnlPctDisplay}%` : '-'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Duration</p>
                    <p className="text-xl font-bold text-gray-800">
                      {trade.durationMin != null ? formatDurationHuman(trade.durationMin) : '-'}
                    </p>
                  </div>

                  {/* Breakeven toggle */}
                  <div className="col-span-2 sm:col-span-4">
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Breakeven</p>
                        <p className="text-xs text-gray-500">Mark this trade as BE</p>
                      </div>

                      <button
                        type="button"
                        onClick={onToggleBreakeven}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          isBE ? 'bg-gray-400' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            isBE ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Execution */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
                <p className="text-lg font-semibold text-gray-800">{trade.quantity ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Entry</p>
                <p className="text-lg font-semibold text-gray-800">{trade.entryPrice ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Exit</p>
                <p className="text-lg font-semibold text-gray-800">{trade.exitPrice ?? '-'}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {trade.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Notes</p>
              <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{trade.notes}</p>
            </div>
          )}



          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onEdit}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Edit Trade
            </button>
            <button
              onClick={onDeleteClick}
              className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors"
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
         <button
  onClick={onConfirm}
  disabled={!!deleting}
  className={`px-4 py-2 rounded-xl font-semibold ${
    deleting ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-600"
  }`}
>
  {deleting ? "Deleting..." : "Delete"}
</button>

        </div>
      </div>
    </div>
  );
}
