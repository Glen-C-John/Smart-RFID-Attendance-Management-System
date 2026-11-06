import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  Building,
} from 'lucide-react';
import { calendarService } from '../services';

const WEEKDAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

export const CalendarManager = () => {
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states for new holiday
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState('public');

  // Form states for new semester
  const [newSemName, setNewSemName] = useState('');
  const [newSemStart, setNewSemStart] = useState('');
  const [newSemEnd, setNewSemEnd] = useState('');
  const [newSemActive, setNewSemActive] = useState(false);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const data = await calendarService.getCalendar();
      setCalendar(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load calendar settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const handleWeekdayToggle = (dayId) => {
    const current = calendar.workingDays || [];
    let updated;
    if (current.includes(dayId)) {
      if (current.length === 1) {
        alert('You must have at least one designated working day.');
        return;
      }
      updated = current.filter((d) => d !== dayId);
    } else {
      updated = [...current, dayId].sort();
    }
    setCalendar({ ...calendar, workingDays: updated });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await calendarService.updateCalendar({
        workingDays: calendar.workingDays,
        lateCountsAsPresent: calendar.lateCountsAsPresent,
        riskThresholdPercentage: Number(calendar.riskThresholdPercentage),
        consecutiveAbsenceThreshold: Number(calendar.consecutiveAbsenceThreshold),
        gracePeriodMinutes: Number(calendar.gracePeriodMinutes),
      });
      setCalendar(updated);
      setMessage('Calendar policies and working schedule saved successfully!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update calendar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    try {
      const updated = await calendarService.addHoliday({
        name: newHolidayName,
        date: newHolidayDate,
        type: newHolidayType,
      });
      setCalendar(updated);
      setNewHolidayName('');
      setNewHolidayDate('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add holiday');
    }
  };

  const handleRemoveHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to remove this holiday?')) return;
    try {
      const updated = await calendarService.removeHoliday(id);
      setCalendar(updated);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove holiday');
    }
  };

  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!newSemName || !newSemStart || !newSemEnd) return;
    try {
      const updated = await calendarService.addSemester({
        name: newSemName,
        startDate: newSemStart,
        endDate: newSemEnd,
        isActive: newSemActive,
      });
      setCalendar(updated);
      setNewSemName('');
      setNewSemStart('');
      setNewSemEnd('');
      setNewSemActive(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add semester');
    }
  };

  const handleRemoveSemester = async (id) => {
    if (!window.confirm('Delete this semester term?')) return;
    try {
      const updated = await calendarService.removeSemester(id);
      setCalendar(updated);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove semester');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading academic calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <CalendarDays className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <span>Institutional Calendar & Working-Day Management</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Define institutional working days, official holidays, academic terms, and denominator rules for true attendance rates.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Working Days & Rules (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Standard Working Weekdays</h3>
            <p className="text-xs text-slate-400">
              Selected days are included in the institutional attendance denominator. Weekends or unselected days are never counted as student absences.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {WEEKDAYS.map((day) => {
                const isSelected = (calendar?.workingDays || []).includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleWeekdayToggle(day.id)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <span>{day.name}</span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Attendance Calculation Policies */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Attendance Calculation Policies</h4>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calendar?.lateCountsAsPresent}
                    onChange={(e) => setCalendar({ ...calendar, lateCountsAsPresent: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Count Late Arrivals as Present in Overall Rate</span>
                    <p className="text-slate-400 text-[11px]">
                      When enabled, late students are credited as present for institutional percentage while being separately flagged in punctuality metrics.
                    </p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={calendar?.riskThresholdPercentage || 75}
                    onChange={(e) => setCalendar({ ...calendar, riskThresholdPercentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Consecutive Absence Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={calendar?.consecutiveAbsenceThreshold || 3}
                    onChange={(e) => setCalendar({ ...calendar, consecutiveAbsenceThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Late Grace Period (Mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={calendar?.gracePeriodMinutes || 10}
                    onChange={(e) => setCalendar({ ...calendar, gracePeriodMinutes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Policies'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Academic Semesters Manager */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Academic Semesters</h3>

            <form onSubmit={handleAddSemester} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                placeholder="Semester Name"
                value={newSemName}
                onChange={(e) => setNewSemName(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
              <input
                type="date"
                value={newSemStart}
                onChange={(e) => setNewSemStart(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
              <input
                type="date"
                value={newSemEnd}
                onChange={(e) => setNewSemEnd(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Add Semester
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {calendar?.semesters?.map((sem) => (
                <div
                  key={sem._id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{sem.name}</span>
                      {sem.isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {sem.startDate} to {sem.endDate}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSemester(sem._id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Official Holidays Sidebar (1 Column) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Holidays & Closures</h3>
            <p className="text-xs text-slate-400">
              Days automatically excluded from working-day attendance calculations.
            </p>

            {/* Add Holiday Form */}
            <form onSubmit={handleAddHoliday} className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <input
                type="text"
                placeholder="Holiday Name (e.g. Republic Day)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
              <select
                value={newHolidayType}
                onChange={(e) => setNewHolidayType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="public">Public Holiday</option>
                <option value="institution">Institutional Holiday</option>
                <option value="emergency">Emergency Closure</option>
              </select>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                Add Holiday
              </button>
            </form>

            {/* Holidays List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(!calendar?.holidays || calendar.holidays.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-6">No holidays registered.</p>
              ) : (
                calendar.holidays.map((h) => (
                  <div
                    key={h._id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{h.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{h.date} • {h.type}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveHoliday(h._id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
