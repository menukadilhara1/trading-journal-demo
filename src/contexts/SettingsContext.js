import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({
        name: '',
        email: '',
        timezone: 'America/New_York',
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
        week_starts_on: 'monday',
    });
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (res.ok) {
                const data = await res.json();
                // API returns { id, name, email, ... } directly or wrapped
                // Check if it's wrapped in 'data' or flat
                const user = data.data || data;

                setSettings({
                    name: user.name || '',
                    email: user.email || '',
                    timezone: user.timezone || 'America/New_York', // keep backend value if exists
                    currency: user.currency || 'USD',
                    date_format: user.date_format || 'MM/DD/YYYY',
                    week_starts_on: user.week_starts_on || 'monday',
                });
            } else {
                console.warn("Settings fetch failed", res.status);
            }
        } catch (error) {
            console.error('Failed to load settings (using defaults):', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings) => {
        try {
            // Get CSRF token
            const getCookie = (name) => {
                const parts = document.cookie.split("; ").map(v => v.split("="));
                const found = parts.find(([k]) => k === name);
                return found ? decodeURIComponent(found[1] || "") : "";
            };

            const xsrf = getCookie("XSRF-TOKEN");

            const res = await fetch(`${API_BASE}/api/user/settings`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf || '',
                },
                body: JSON.stringify(newSettings),
            });

            if (res.ok) {
                const data = await res.json();
                setSettings(data.user);
                return { success: true };
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Settings update failed:', errorData);
                return { success: false, error: errorData.message || 'Failed to update settings' };
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            return { success: false, error: error.message };
        }
    };

    const getCurrencySymbol = () => {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            JPY: '¥',
        };
        return symbols[settings.currency] || '$';
    };

    const formatDate = (date) => {
        if (!date) return '';

        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();

        switch (settings.date_format) {
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
            default:
                return `${month}/${day}/${year}`;
        }
    };

    const value = {
        settings,
        loading,
        updateSettings,
        getCurrencySymbol,
        formatDate,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
