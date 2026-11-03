import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Clock,
  Edit3,
  FileText,
  X,
  Loader2,
  Calendar,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { attendanceService } from '../services';

export const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    status: '',
    checkInTime: '',
    checkOutTime: '',
    reason: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Preset Dates (Today, Yesterday, 7 Days, 30 Days)
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    setPage(1);

    const now = new Date();
    const toDateStr = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const today = toDateStr(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = toDateStr(yesterday);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setStartDate(toDateStr(past));
      setEndDate(toDateStr(now));
    } else if (preset === '30days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      setStartDate(toDateStr(past));
      setEndDate(toDateStr(now));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        status: statusFilter,
        className: classFilter,
        search,
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (startDate) {
        params.attendanceDate = startDate;
      }

      const res = await attendanceService.getAttendance(params);
      setRecords(res.records || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, statusFilter, classFilter, search]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleOpenCorrect = (record) => {
    setSelectedRecord(record);
    setCorrectionData({
      status: record.status,
      checkInTime: record.checkInTime ? new Date(record.checkInTime).toISOString().slice(0, 16) : '',
      checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toISOString().slice(0, 16) : '',
      reason: '',
    });
    setFormError('');
    setIsCorrectModalOpen(true);
  };

  const handleOpenAudit = (record) => {
    setSelectedRecord(record);
    setIsAuditModalOpen(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      await attendanceService.correctAttendance(selectedRecord._id, correctionData);
      setIsCorrectModalOpen(false);
      fetchAttendance();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to apply manual correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Attendance Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Total {total} attendance sessions recorded
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Date Preset Buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`px-3 py-1.5 rounded-xl transition-all flex-shrink-0 ${
                datePreset === preset.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student name or ID..."
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="present">Present (On-Time)</option>
            <option value="late">Late Arrival</option>
            <option value="absent">Absent</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Classes</option>
            <option value="CSE-A">CSE-A</option>
            <option value="CSE-B">CSE-B</option>
            <option value="CSE-1">CSE-1</option>
            <option value="ECE-1">ECE-1</option>
            <option value="ECE-2">ECE-2</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Check-In</th>
                <th className="px-4 py-3.5">Check-Out</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Card UID</th>
                <th className="px-4 py-3.5">Scanner Node</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading attendance logs...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.studentName}</div>
                      <div className="text-[11px] text-slate-400">{r.studentId} • {r.className}</div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {r.attendanceDate}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(r.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {r.checkOutTime
                        ? new Date(r.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                        : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : r.status === 'late'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-slate-500">
                      {r.cardUid}
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-[11px]">
                      {r.location || r.deviceId}
                    </td>
                    <td className="px-4 py-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenCorrect(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Manual Attendance Correction"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenAudit(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                        title="View Audit Trail & Modification History"
                      >
                        <History className="w-4 h-4" />
                        {r.auditLog?.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1"></span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Attendance Correction Modal */}
      {isCorrectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Manual Attendance Correction</h3>
                <p className="text-[11px] text-slate-400">
                  {selectedRecord?.studentName} ({selectedRecord?.studentId}) • {selectedRecord?.attendanceDate}
                </p>
              </div>
              <button onClick={() => setIsCorrectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCorrectionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attendance Status *
                </label>
                <select
                  required
                  value={correctionData.status}
                  onChange={(e) => setCorrectionData({ ...correctionData, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="present">Present (On-Time)</option>
                  <option value="late">Late Arrival</option>
                  <option value="absent">Mark Absent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justification Reason * (Strictly Audited)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this record is being manually modified (e.g. Card sensor malfunction, verified doctor note, excused delay)..."
                  value={correctionData.reason}
                  onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This reason will be permanently stored in MongoDB audit history along with your administrator identity.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCorrectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Correction...' : 'Commit Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>Modification Audit Trail</span>
              </h3>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
              {(!selectedRecord?.auditLog || selectedRecord.auditLog.length === 0) ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <p>No manual modifications recorded.</p>
                  <p className="text-[11px] text-slate-500 mt-1">This record was automatically scanned via RFID hardware.</p>
                </div>
              ) : (
                selectedRecord.auditLog.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Modified by: {log.modifiedBy}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      Reason: <span className="text-slate-700 dark:text-slate-300 font-normal">"{log.reason}"</span>
                    </p>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                      <div>Original: {JSON.stringify(log.previousValues)}</div>
                      <div>Updated: {JSON.stringify(log.newValues)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

