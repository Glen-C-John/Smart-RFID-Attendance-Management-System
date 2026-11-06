import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  User,
  History,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { auditLogService } from '../services';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [operation, setOperation] = useState('');
  const [recordType, setRecordType] = useState('');
  const [administrator, setAdministrator] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await auditLogService.getLogs({
        page,
        limit: pagination.limit,
        operation: operation || undefined,
        recordType: recordType || undefined,
        administrator: administrator || undefined,
      });
      setLogs(res.logs || []);
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve audit logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, operation, recordType, administrator]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <span>Administrative Audit Trail</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Immutable, non-editable security ledger recording all administrative updates, manual attendance corrections, risk reviews, and schedule changes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Administrator</label>
            <input
              type="text"
              placeholder="e.g. admin"
              value={administrator}
              onChange={(e) => setAdministrator(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Operation Type</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
            >
              <option value="">All Operations</option>
              <option value="manual_correction">Manual Attendance Correction</option>
              <option value="review_attendance_alert">Review Attendance Alert</option>
              <option value="update_calendar_settings">Update Calendar Settings</option>
              <option value="add_holiday">Add Holiday</option>
              <option value="remove_holiday">Remove Holiday</option>
              <option value="create_report_schedule">Create Report Schedule</option>
              <option value="update_report_schedule">Update Report Schedule</option>
              <option value="delete_report_schedule">Delete Report Schedule</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Entity Type</label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
            >
              <option value="">All Entities</option>
              <option value="Attendance">Attendance</option>
              <option value="AttendanceAlert">AttendanceAlert</option>
              <option value="InstitutionCalendar">InstitutionCalendar</option>
              <option value="ReportSchedule">ReportSchedule</option>
              <option value="Student">Student</option>
              <option value="RfidCard">RfidCard</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Audit Event Ledger</h3>
          </div>
          <span className="text-xs text-slate-400">{pagination.total} events recorded</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-slate-400">Loading audit records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            No audit records found matching the filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log._id;
              return (
                <div key={log._id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white">{log.operation}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                          {log.recordType}{log.recordId ? ` : ${log.recordId}` : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                          {log.administrator}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">{log.reason}</p>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      {(log.previousValue || log.newValue) && (
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        >
                          {isExpanded ? 'Hide Diff' : 'View Diff'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON Diff */}
                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-x-auto">
                      <div>
                        <span className="text-rose-400 font-bold block mb-1">Previous Values:</span>
                        <pre className="text-[10px]">{JSON.stringify(log.previousValue, null, 2) || 'None'}</pre>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-bold block mb-1">New Values:</span>
                        <pre className="text-[10px]">{JSON.stringify(log.newValue, null, 2) || 'None'}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
