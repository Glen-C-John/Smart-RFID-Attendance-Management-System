import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSocket } from '../../context/SocketContext';
import { CheckCircle2, AlertCircle, X, Radio } from 'lucide-react';

export const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toastNotification, dismissToast } = useSocket();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onOpenMobileMenu={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Real-time Floating Scan Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`flex items-start space-x-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm ${
              toastNotification.success
                ? 'bg-emerald-900/90 text-white border-emerald-500/40 shadow-emerald-900/40'
                : 'bg-rose-900/90 text-white border-rose-500/40 shadow-rose-900/40'
            }`}
          >
            <div className="p-1 rounded-lg bg-white/10 flex-shrink-0 mt-0.5">
              {toastNotification.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-300" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center space-x-1.5 text-xs text-white/70 font-medium">
                <Radio className="w-3 h-3 text-indigo-300 animate-pulse" />
                <span>Live RFID Scan</span>
              </div>
              <h4 className="font-bold text-sm text-white truncate mt-0.5">
                {toastNotification.studentName || 'Unregistered Card'}
              </h4>
              <p className="text-xs text-white/80 mt-0.5">{toastNotification.message}</p>
              <div className="flex items-center space-x-2 mt-2 text-[11px] text-white/60">
                <span>UID: {toastNotification.cardUid}</span>
                {toastNotification.attendanceStatus && (
                  <span className="uppercase px-1.5 py-0.5 rounded bg-white/20 text-white font-semibold">
                    {toastNotification.attendanceStatus}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={dismissToast}
              className="p-1 text-white/60 hover:text-white rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
