import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Calendar,
  Download,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Building,
  Plus,
  Trash2,
  Play,
  History,
  Timer,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportService, studentService, scheduleService } from '../services';

const REPORT_TYPES = [
  { id: 'daily', label: '1. Daily Attendance Report' },
  { id: 'weekly', label: '2. Weekly Attendance Report' },
  { id: 'monthly', label: '3. Monthly Attendance Report' },
  { id: 'semester', label: '4. Semester Attendance Report' },
  { id: 'custom', label: '5. Custom Date-Range Report' },
  { id: 'student', label: '6. Individual Student Report' },
  { id: 'class', label: '7. Class-Wise Attendance Report' },
  { id: 'department', label: '8. Department-Wise Report' },
  { id: 'absentee', label: '9. Absentee Report' },
  { id: 'late_arrival', label: '10. Late Arrival Report' },
  { id: 'below_threshold', label: '11. Below Threshold Report' },
  { id: 'consecutive_absence', label: '12. Consecutive Absence Report' },
  { id: 'device_activity', label: '13. RFID Device Activity Report' },
  { id: 'audit_correction', label: '14. Attendance Correction Audit Report' },
];

export const Reports = () => {
  const [activeSection, setActiveSection] = useState('builder'); // 'builder', 'schedules', 'history'

  // Report Builder State
  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [studentId, setStudentId] = useState('');
  const [className, setClassName] = useState('');
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [threshold, setThreshold] = useState(75);
  const [availableClasses, setAvailableClasses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  // Schedules State
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleType, setNewScheduleType] = useState('daily');
  const [newScheduleFreq, setNewScheduleFreq] = useState('daily');
  const [newScheduleTime, setNewScheduleTime] = useState('18:00');
  const [newScheduleFormat, setNewScheduleFormat] = useState('xlsx');

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await studentService.getStudents({ limit: 1000 });
        const classes = [...new Set((res.students || []).map((s) => s.className).filter(Boolean))].sort();
        setAvailableClasses(classes);
      } catch (err) {
        console.error('Failed to fetch class list', err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch Schedules & History when activeSection changes
  useEffect(() => {
    if (activeSection === 'schedules') {
      fetchSchedules();
    } else if (activeSection === 'history') {
      fetchHistory();
    }
  }, [activeSection]);

  const fetchSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const data = await scheduleService.getSchedules();
      setSchedules(data || []);
    } catch (err) {
      console.error('Failed to load schedules', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await reportService.getHistory(50);
      setHistoryList(data.history || []);
    } catch (err) {
      console.error('Failed to load report history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = {
        reportType,
        startDate: reportType === 'daily' ? date : startDate,
        endDate: reportType === 'daily' ? date : endDate,
        studentId: studentId.trim() || undefined,
        className: className || undefined,
        department: department || undefined,
        status: statusFilter || undefined,
        threshold: Number(threshold) || 75,
        format: 'preview',
      };

      const res = await reportService.buildReport(params);
      setReportData(res.reportData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate initial preview
  useEffect(() => {
    handleGenerate();
  }, [reportType]);

  // Export native Excel (.xlsx) from backend
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = {
        reportType,
        startDate: reportType === 'daily' ? date : startDate,
        endDate: reportType === 'daily' ? date : endDate,
        studentId: studentId.trim() || undefined,
        className: className || undefined,
        department: department || undefined,
        status: statusFilter || undefined,
        threshold: Number(threshold) || 75,
        format: 'xlsx',
      };

      const res = await reportService.buildReport(params);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate Excel report');
    } finally {
      setExportingExcel(false);
    }
  };

  // Safe CSV export
  const exportToCSV = () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) return;

    const headers = reportData.columns;
    const rows = reportData.records.map((r) =>
      Object.values(r).map((val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).trim();
        if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
        return `"${str.replace(/"/g, '""')}"`;
      })
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const exportToPDF = () => {
    if (!reportData || !reportData.records) return;

    const doc = new jsPDF('landscape');
    const period = reportData.period || {};
    const title = reportData.title || `Attendance Report (${reportType.toUpperCase()})`;
    const subTitle = `Period: ${period.startDate || 'N/A'} to ${period.endDate || 'N/A'} | Generated: ${new Date().toLocaleString()}`;

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(subTitle, 14, 21);

    const metricsY = 32;
    const summary = reportData.summary || {};
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Students: ${summary.totalStudents || 0}  |  Sessions: ${summary.totalSessions || 0}  |  Present: ${summary.presentCount || 0}  |  Late: ${summary.lateCount || 0}  |  Rate: ${summary.attendanceRate || '0%'}`,
      14,
      metricsY
    );

    const tableHeaders = [reportData.columns];
    const tableData = reportData.records.map((r) => Object.values(r));

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: metricsY + 6,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 30,
      },
    });

    doc.save(`Attendance_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Schedule management handlers
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!newScheduleTitle) return;
    try {
      await scheduleService.createSchedule({
        title: newScheduleTitle,
        reportType: newScheduleType,
        frequency: newScheduleFreq,
        generationTime: newScheduleTime,
        format: newScheduleFormat,
        filters: { className, department, threshold },
      });
      setNewScheduleTitle('');
      fetchSchedules();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create schedule');
    }
  };

  const handleRunNow = async (id) => {
    try {
      await scheduleService.runScheduleNow(id);
      alert('Report generated successfully! Check Generated History.');
      fetchSchedules();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to run schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this recurring report schedule?')) return;
    try {
      await scheduleService.deleteSchedule(id);
      fetchSchedules();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const records = reportData?.records || [];
  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <FileBarChart className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Attendance Reports & Scheduler</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build custom attendance reports, export native Excel/CSV/PDF, and manage automated background schedules.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl space-x-1 text-xs font-semibold">
          <button
            onClick={() => setActiveSection('builder')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeSection === 'builder'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Report Builder
          </button>
          <button
            onClick={() => setActiveSection('schedules')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeSection === 'schedules'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Automated Schedules
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeSection === 'history'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Generated History
          </button>
        </div>
      </div>

      {/* SECTION 1: REPORT BUILDER */}
      {activeSection === 'builder' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={exportToCSV}
              disabled={records.length === 0 || loading}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 font-medium text-xs shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={records.length === 0 || loading || exportingExcel}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={exportToPDF}
              disabled={records.length === 0 || loading}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>

          {/* Configuration Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 14 Available Report Types */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Report Type (14 Formats Available)
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {REPORT_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {reportType === 'daily' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Granular Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Class Filter
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="">All Classes</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STU101"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Attendance Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
                >
                  <Filter className="w-4 h-4" />
                  <span>{loading ? 'Compiling Preview...' : 'Compile Report Preview'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Preview Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {reportData?.title || 'Report Preview'}
                </h3>
                <p className="text-xs text-slate-400">
                  {records.length} records matching current filter configuration
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400">Compiling report dataset...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                No attendance activity matched the selected timeframe or filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] tracking-wider font-semibold text-slate-500">
                    <tr>
                      {reportData?.columns?.map((col, idx) => (
                        <th key={idx} className="py-3 px-4">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 font-medium">
                        {Object.values(r).map((val, cIdx) => (
                          <td key={cIdx} className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: AUTOMATED SCHEDULES */}
      {activeSection === 'schedules' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Configure Automated Report Schedule</h3>
            <p className="text-xs text-slate-400">
              The server will automatically compile and export report datasets into server archives at designated intervals.
            </p>

            <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              <input
                type="text"
                placeholder="Schedule Title (e.g. Daily Class Export)"
                value={newScheduleTitle}
                onChange={(e) => setNewScheduleTitle(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
              <select
                value={newScheduleType}
                onChange={(e) => setNewScheduleType(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="daily">Daily Attendance</option>
                <option value="weekly">Weekly Attendance</option>
                <option value="monthly">Monthly Attendance</option>
                <option value="class">Class-Wise</option>
                <option value="absentee">Absentees</option>
                <option value="late_arrival">Late Arrivals</option>
                <option value="below_threshold">Below Threshold</option>
              </select>
              <select
                value={newScheduleFreq}
                onChange={(e) => setNewScheduleFreq(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Friday)</option>
                <option value="monthly">Monthly (1st of month)</option>
              </select>
              <select
                value={newScheduleFormat}
                onChange={(e) => setNewScheduleFormat(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
              </select>
              <button
                type="submit"
                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
              >
                Create Schedule
              </button>
            </form>
          </div>

          {/* Schedules List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
              Active Recurring Schedules
            </div>

            {schedulesLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Zero automated schedules configured. Add one above.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {schedules.map((sc) => (
                  <div key={sc._id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{sc.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                          {sc.frequency} • {sc.format.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Report: {sc.reportType} • Last Run: {sc.lastRunAt ? new Date(sc.lastRunAt).toLocaleString() : 'Never'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRunNow(sc._id)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[11px] flex items-center space-x-1"
                        title="Run schedule immediately"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Run Now</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(sc._id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: GENERATED HISTORY & DOWNLOADS */}
      {activeSection === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
            Archived Report Exports & Direct Downloads
          </div>

          {historyLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Zero generated reports found in history.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyList.map((h) => (
                <div key={h._id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{h.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                        {h.fileName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {h.recordCount} records • {(h.fileSize / 1024).toFixed(1)} KB • Generated: {new Date(h.createdAt).toLocaleString()} by {h.generatedBy}
                    </div>
                  </div>

                  <a
                    href={`/api/v1/reports/${h._id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
