import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Clock,
  Building,
  ShieldAlert,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { settingsService } from '../services/settingsService';

export const Settings = () => {
  const [formData, setFormData] = useState({
    institutionName: '',
    workDayStartTime: '09:00',
    lateThresholdTime: '09:30',
    cooldownSeconds: 60,
    checkoutMinIntervalMinutes: 30,
    enableCheckout: true,
    timezone: 'Asia/Kolkata',
    deviceHeartbeatThresholdSeconds: 90,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch initial settings
  const fetchSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await settingsService.getSettings();
      if (data) {
        setFormData({
          institutionName: data.institutionName || 'Smart IoT Institute of Technology',
          workDayStartTime: data.workDayStartTime || '09:00',
          lateThresholdTime: data.lateThresholdTime || '09:30',
          cooldownSeconds: data.cooldownSeconds ?? 60,
          checkoutMinIntervalMinutes: data.checkoutMinIntervalMinutes ?? 30,
          enableCheckout: data.enableCheckout ?? true,
          timezone: data.timezone || 'Asia/Kolkata',
          deviceHeartbeatThresholdSeconds: data.deviceHeartbeatThresholdSeconds ?? 90,
        });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const updated = await settingsService.updateSettings(formData);
      setFormData({
        institutionName: updated.institutionName,
        workDayStartTime: updated.workDayStartTime,
        lateThresholdTime: updated.lateThresholdTime,
        cooldownSeconds: updated.cooldownSeconds,
        checkoutMinIntervalMinutes: updated.checkoutMinIntervalMinutes,
        enableCheckout: updated.enableCheckout,
        timezone: updated.timezone,
        deviceHeartbeatThresholdSeconds: updated.deviceHeartbeatThresholdSeconds,
      });
      setSuccessMessage('System settings have been successfully updated and applied.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update settings. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading system configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <SettingsIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>System Settings</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure institutional policies, RFID scan thresholds, workday timings, and device timeouts.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-2xl shadow-sm text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 rounded-2xl shadow-sm text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Institutional Profile */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Organization Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Institutional branding and location identity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institution / Organization Name
              </label>
              <input
                type="text"
                name="institutionName"
                value={formData.institutionName}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400 mt-1">Displayed in report headers, audit logs, and banners.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Timezone (IANA)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Asia/Kolkata"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Standard timezone for date calculation and midnight rollover.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Attendance Timing Policies */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Attendance Timings & Cutoffs</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rules determining on-time presence and late arrival</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Workday Start Time (HH:mm)
              </label>
              <input
                type="time"
                name="workDayStartTime"
                value={formData.workDayStartTime}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Standard time of entry.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Arrival Cutoff (HH:mm)
              </label>
              <input
                type="time"
                name="lateThresholdTime"
                value={formData.lateThresholdTime}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Scans recorded after this time are automatically flagged as "Late".</p>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware & RFID Logic Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">RFID Debounce & Device Parameters</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan throttling, duplicate guardrails, and heartbeat windows</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Card Cooldown (Seconds)
              </label>
              <input
                type="number"
                name="cooldownSeconds"
                value={formData.cooldownSeconds}
                onChange={handleChange}
                min="5"
                max="3600"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                Suppresses rapid duplicate scans on the same reader within this window.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Device Offline Threshold (Seconds)
              </label>
              <input
                type="number"
                name="deviceHeartbeatThresholdSeconds"
                value={formData.deviceHeartbeatThresholdSeconds}
                onChange={handleChange}
                min="10"
                max="600"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                Seconds without ping before an ESP8266 node is shown as "Offline".
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Check-Out Gap (Minutes)
              </label>
              <input
                type="number"
                name="checkoutMinIntervalMinutes"
                value={formData.checkoutMinIntervalMinutes}
                onChange={handleChange}
                min="0"
                max="720"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum time that must elapse after check-in before a scan is logged as check-out.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="relative flex items-center space-x-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  name="enableCheckout"
                  checked={formData.enableCheckout}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Enable Two-Way Check-Out
                  </span>
                  <p className="text-xs text-slate-400">
                    If disabled, subsequent scans will be treated as duplicate check-ins.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

