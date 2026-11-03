import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Clock, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const Header = ({ onOpenMobileMenu }) => {
  const { isConnected } = useSocket();
  const [currentTime, setCurrentTime] = useState('');
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('rfid_theme') === 'dark' ||
      (!('rfid_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rfid_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rfid_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format in Asia/Kolkata
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateStr = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      setCurrentTime(`${dateStr} • ${timeStr} (IST)`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between">
        {/* Left: Mobile Toggle & Clock */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{currentTime || 'Loading clock...'}</span>
          </div>
        </div>

        {/* Right: Live Connection Pill & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Socket.IO Real-time Status */}
          <div
            className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
            }`}
            title={isConnected ? 'Live WebSocket stream active' : 'Connecting to live WebSocket stream...'}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">Live Sync</span>
                <Wifi className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="hidden sm:inline">Reconnecting</span>
                <WifiOff className="w-3.5 h-3.5" />
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};

