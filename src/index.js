import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

// Theme Bootstrap
const savedTheme = localStorage.getItem("theme");
// Default to light (false) if no saved preference, ignoring system preference
const shouldDark = savedTheme === "dark";
document.documentElement.classList.toggle("dark", shouldDark);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ToastProvider>
    </SettingsProvider>
  </React.StrictMode>
);