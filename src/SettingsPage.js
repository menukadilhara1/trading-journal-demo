import React, { useState, useEffect } from "react";
import {
  Save, Check
} from 'lucide-react';
import { useSettings } from './contexts/SettingsContext';

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    timezone: 'America/New_York',
  });

  // Load settings into form
  useEffect(() => {
    if (!loading && settings) {
      setFormData({
        name: settings.name || '',
        email: settings.email || '',
        timezone: settings.timezone || 'America/New_York',
      });
    }
  }, [settings, loading]);

  const handleSave = async () => {
    // Client-side validation
    if (!formData.name.trim()) {
      setSaveStatus('error');
      // You could add a specific error state for fields, but for now we reuse the status
      alert("Name is required");
      return;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setSaveStatus('error');
      alert("Please enter a valid email address");
      return;
    }

    setSaveStatus('saving');
    const result = await updateSettings(formData);

    if (result.success) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
      // Update global user state if name changed (optional, requires passing setState or context)
      window.dispatchEvent(new CustomEvent('user:updated', { detail: formData }));
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6 flex items-center justify-center">
        <div className="text-[#64748B]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 p-6 transition-colors duration-300">
      {/* Header */}
      <div className="mb-6">
        <div className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">Settings</div>
        <div className="text-sm text-[#64748B] dark:text-slate-400">Manage your profile</div>
      </div>

      {/* Settings Container */}
      <div className="max-w-3xl">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 transition-colors">
          {/* Profile Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#171717] dark:text-slate-100 mb-2">Profile Information</h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400">Update your personal details</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-slate-200 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm text-[#171717] dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-slate-200 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-30 text-sm text-[#171717] dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors"
                />
              </div>


            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-6 pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-[#171717] dark:text-slate-100 mb-2">Security</h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400">Manage your password and security settings</p>
            </div>

            <ChangePasswordForm />
          </div>

          {/* Data & Privacy Section */}
          <div className="space-y-6 pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-[#171717] dark:text-slate-100 mb-2">Data & Privacy</h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400">Export your data or delete your account</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-[#E2E8F0] dark:border-slate-800">
                <div>
                  <h3 className="font-semibold text-[#171717] dark:text-slate-100 text-sm">Export Data</h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">Download a copy of your journal entries and trades.</p>
                </div>
                <ExportDataButton />
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-400 text-sm">Delete Account</h3>
                  <p className="text-xs text-red-700 dark:text-red-500 mt-1">Permanently remove your account and all data.</p>
                </div>
                <DeleteAccountButton />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
            {saveStatus && (
              <span className={`text-sm font-medium ${saveStatus === 'saved' ? 'text-[#10B981] dark:text-emerald-400' :
                saveStatus === 'error' ? 'text-[#EF4444] dark:text-rose-400' :
                  'text-[#64748B] dark:text-slate-500'
                }`}>
                {saveStatus === 'saved' ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Changes saved
                  </span>
                ) : saveStatus === 'error' ? (
                  'Failed to save'
                ) : (
                  'Saving...'
                )}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-6 py-2 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#1d4ed8] disabled:opacity-50 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState(null); // 'saving', 'success', 'error'
  const [msg, setMsg] = useState('');
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setStatus('saving');
    setMsg('');

    try {
      await fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: 'include' });

      // Get CSRF
      const getCookie = (name) => {
        const parts = document.cookie.split("; ").map(v => v.split("="));
        const found = parts.find(([k]) => k === name);
        return found ? (found[1] || "") : "";
      };
      const xsrf = getCookie("XSRF-TOKEN");

      const res = await fetch(`${API_BASE}/api/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : '',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          password: password,
          password_confirmation: passwordConfirmation
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');

      setStatus('success');
      setMsg('Password updated successfully');
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
      setTimeout(() => setStatus(null), 3000);

    } catch (err) {
      setStatus('error');
      setMsg(err.message);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-4 bg-[#F8FAFC] dark:bg-slate-800/50 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-800 transition-colors">
      {status === 'success' && <div className="text-green-600 dark:text-emerald-400 text-sm mb-2">✅ {msg}</div>}
      {status === 'error' && <div className="text-red-600 dark:text-rose-400 text-sm mb-2">❌ {msg}</div>}

      <div>
        <label className="block text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-1">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#171717] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-1">New Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#171717] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={passwordConfirmation}
            onChange={e => setPasswordConfirmation(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-[#171717] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
        </div>
      </div>
      <div className="text-right">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 font-semibold text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
        >
          {status === 'saving' ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  );
}

function ExportDataButton() {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  const handleExport = async () => {
    window.open(`${API_BASE}/api/user/export`, '_blank');
    // Note: For sanctum auth, simply opening a new tab might fail if cookies are strict SameSite.
    // Better approach: fetch blob and download manually.
  };

  const handleDownload = async () => {
    try {
      // Basic fetch to trigger download
      const res = await fetch(`${API_BASE}/api/user/export`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_journal_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Failed to export data: " + e.message);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="px-4 py-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 font-medium text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750 transition"
    >
      Download JSON
    </button>
  );
}

function DeleteAccountButton() {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  const getCookie = (name) => {
    const parts = document.cookie.split("; ").map(v => v.split("="));
    const found = parts.find(([k]) => k === name);
    return found ? (found[1] || "") : "";
  };

  const ensureCsrf = async () => {
    await fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: "include" });
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you ABSOLUTELY SURE? This cannot be undone.")) return;
    if (!window.confirm("Last chance. Delete your account and ALL data?")) return;

    try {
      await ensureCsrf();
      const xsrf = getCookie("XSRF-TOKEN");

      const res = await fetch(`${API_BASE}/api/user`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": xsrf ? decodeURIComponent(xsrf) : "",
        },
      });

      const text = await res.text();

      if (!res.ok) {
        alert(`Failed to delete account (${res.status}).\n\n${text}`);
        return;
      }

      // After delete, force clean state by going to login/root
      window.location.replace("/login");
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="px-4 py-2 bg-red-100 text-red-700 font-medium text-xs rounded-lg hover:bg-red-200"
    >
      Delete Account
    </button>
  );
}
