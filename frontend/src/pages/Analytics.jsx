import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Building,
  Filter,
  Search,
  Download,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Activity,
  Layers,
  Award,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsService, studentService, alertService } from '../services';

const TABS = [
  { id: 'overview', label: 'Overview & Trends', icon: TrendingUp },
  { id: 'students', label: 'Student Analytics', icon: Users },
  { id: 'classes', label: 'Classes & Depts', icon: Building },
  { id: 'heatmap', label: 'Heatmap & Patterns', icon: Calendar },
  { id: 'punctuality', label: 'Punctuality', icon: Clock },
  { id: 'risk', label: 'Risk Monitoring', icon: AlertTriangle },
  { id: 'quality', label: 'Data Quality', icon: ShieldAlert },
];

export const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('last30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Overview & Trends State
  const [overviewData, setOverviewData] = useState(null);
  const [trendsData, setTrendsData] = useState([]);
  const [trendInterval, setTrendInterval] = useState('daily');

  // Student Analytics State
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Classes State
  const [classesData, setClassesData] = useState(null);

  // Heatmap State
  const [heatmapData, setHeatmapData] = useState(null);

  // Punctuality State
  const [punctualityData, setPunctualityData] = useState(null);

  // Risk Monitoring State
  const [riskData, setRiskData] = useState(null);
  const [reviewModalStudent, setReviewModalStudent] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Data Quality State
  const [qualityData, setQualityData] = useState(null);

  // Initial Class & Student loading
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const res = await studentService.getStudents({ limit: 500 });
        const students = res.students || [];
        setStudentsList(students);
        const classes = [...new Set(students.map((s) => s.className).filter(Boolean))].sort();
        setAvailableClasses(classes);
        if (students.length > 0) {
          setSelectedStudentId(students[0].studentId);
        }
      } catch (err) {
        console.error('Failed to load initial student data', err);
      }
    };
    fetchInit();
  }, []);

  // Fetch data depending on active tab
  const fetchTabData = useCallback(async () => {
    setLoading(true);
    setError('');

    const queryParams = {
      period,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      className: selectedClass || undefined,
    };

    try {
      if (activeTab === 'overview') {
        const [overviewRes, trendsRes] = await Promise.all([
          analyticsService.getOverview(queryParams),
          analyticsService.getTrends({ ...queryParams, interval: trendInterval }),
        ]);
        setOverviewData(overviewRes);
        setTrendsData(trendsRes.trends || []);
      } else if (activeTab === 'classes') {
        const res = await analyticsService.getClassesAnalytics(queryParams);
        setClassesData(res);
      } else if (activeTab === 'heatmap') {
        const res = await analyticsService.getHeatmap(queryParams);
        setHeatmapData(res);
      } else if (activeTab === 'punctuality') {
        const res = await analyticsService.getPunctuality(queryParams);
        setPunctualityData(res);
      } else if (activeTab === 'risk') {
        const res = await analyticsService.getRiskOverview(queryParams);
        setRiskData(res);
      } else if (activeTab === 'quality') {
        const res = await analyticsService.getDataQuality();
        setQualityData(res);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, period, startDate, endDate, selectedClass, trendInterval]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Fetch individual student analytics when selected
  useEffect(() => {
    if (activeTab === 'students' && selectedStudentId) {
      const fetchStudent = async () => {
        setStudentLoading(true);
        try {
          const res = await analyticsService.getStudentAnalytics(selectedStudentId);
          setStudentAnalytics(res);
        } catch (err) {
          console.error('Error fetching student analytics:', err);
        } finally {
          setStudentLoading(false);
        }
      };
      fetchStudent();
    }
  }, [activeTab, selectedStudentId]);

  // Review Alert handler
  const handleReviewAlert = async (e) => {
    e.preventDefault();
    if (!reviewModalStudent) return;
    setReviewLoading(true);
    try {
      await alertService.reviewAlert(reviewModalStudent.studentId, reviewComment);
      setReviewModalStudent(null);
      setReviewComment('');
      // Refresh risk tab
      const res = await analyticsService.getRiskOverview({ className: selectedClass });
      setRiskData(res);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const kpis = overviewData?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <LineChartIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Attendance Intelligence & Analytics</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Server-aggregated institutional KPIs, early-warning indicators, punctuality patterns, and data quality metrics.
          </p>
        </div>

        {/* Global Period & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="today">Today</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {period === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-xl text-slate-700 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-xl text-slate-700 dark:text-slate-200"
              />
            </div>
          )}

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <button
            onClick={fetchTabData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Active Students</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {kpis.totalActiveStudents ?? '--'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Enrolled in scope</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Attendance Rate</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {kpis.averageAttendancePercentage ?? 0}%
              </div>
              <div className="flex items-center space-x-1 text-[11px] mt-1 font-semibold">
                {(kpis.attendanceImprovementDelta ?? 0) >= 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600">+{kpis.attendanceImprovementDelta}% vs prev</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-rose-600">{kpis.attendanceImprovementDelta}% vs prev</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Present Days</span>
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                {kpis.totalPresentDays ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Sessions recorded</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Late Arrivals</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {kpis.totalLateArrivals ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Past gate cutoff</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>High Attendance</span>
                <Award className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {kpis.excellentAttendanceCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">≥ 90% benchmark</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Low Attendance</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {kpis.poorAttendanceCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">&lt; 75% threshold</div>
            </div>
          </div>

          {/* Attendance Trends Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Interactive Attendance Trends & Volume
                </h3>
                <p className="text-xs text-slate-400">
                  Daily, weekly, and monthly attendance distributions with volume stacking
                </p>
              </div>

              {/* View Switcher */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl space-x-1 text-xs">
                {['daily', 'weekly', 'monthly'].map((intvl) => (
                  <button
                    key={intvl}
                    onClick={() => setTrendInterval(intvl)}
                    className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all ${
                      trendInterval === intvl
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {intvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis
                    dataKey={trendInterval === 'daily' ? 'date' : trendInterval === 'weekly' ? 'week' : 'month'}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorPresent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    name="Late Arrivals"
                    stroke="#F59E0B"
                    fillOpacity={1}
                    fill="url(#colorLate)"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#EF4444"
                    fillOpacity={0.1}
                    fill="#EF4444"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT 360 ANALYTICS */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Student Selector Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-indigo-500" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Select Student</h3>
                <p className="text-xs text-slate-400">Generate 360-degree attendance profile and streaks</p>
              </div>
            </div>

            <div className="w-full sm:w-72">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {studentsList.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.name} ({s.studentId}) — {s.className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {studentLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-400">Compiling 360-degree profile...</span>
            </div>
          ) : studentAnalytics ? (
            <div className="space-y-6">
              {/* Warnings Banner if student is below threshold */}
              {studentAnalytics.indicators?.isBelowThreshold && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center space-x-3 text-xs">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                  <div>
                    <span className="font-bold">Attendance Risk Alert: </span>
                    This student's attendance rate ({studentAnalytics.metrics.overallAttendanceRate}%) is below the configured {studentAnalytics.metrics.threshold}% threshold.
                  </div>
                </div>
              )}

              {/* Student KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Overall Rate</div>
                  <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {studentAnalytics.metrics.overallAttendanceRate}%
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Last 30 Days</div>
                  <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                    {studentAnalytics.metrics.rateLast30Days}%
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Present Streak</div>
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {studentAnalytics.metrics.longestPresentStreak} days
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Max Absence Streak</div>
                  <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                    {studentAnalytics.metrics.longestAbsentStreak} days
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Avg Arrival Time</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {studentAnalytics.metrics.averageArrivalTime}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Late Arrivals</div>
                  <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                    {studentAnalytics.metrics.totalLateArrivals}
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown Chart & Arrival Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Monthly Attendance Progress</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={studentAnalytics.visualizations.monthlyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="rate" name="Rate %" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Calendar Heatmap */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Attendance Heatmap Matrix</h4>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400">
                      <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span><span>Present</span></span>
                      <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span><span>Late</span></span>
                      <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span><span>Absent</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 max-h-64 overflow-y-auto p-1">
                    {studentAnalytics.visualizations.calendarHeatmap.map((cell) => (
                      <div
                        key={cell.date}
                        className={`p-2 rounded-xl text-center text-[10px] font-mono font-bold transition-transform hover:scale-110 cursor-pointer ${
                          cell.status === 'present'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : cell.status === 'late'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}
                        title={`${cell.date}: ${cell.status.toUpperCase()}${cell.checkIn ? ` (In: ${cell.checkIn})` : ''}`}
                      >
                        {cell.date.slice(5)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: CLASSES & DEPTS */}
      {activeTab === 'classes' && classesData && (
        <div className="space-y-6">
          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-5 rounded-3xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Highest Attendance Class
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {classesData.summary?.highestAttendanceClass?.name || 'N/A'}
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-semibold">
                {classesData.summary?.highestAttendanceClass?.rate}% Average Attendance
              </p>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 p-5 rounded-3xl">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Lowest Attendance Class
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {classesData.summary?.lowestAttendanceClass?.name || 'N/A'}
              </div>
              <p className="text-xs text-rose-600 mt-1 font-semibold">
                {classesData.summary?.lowestAttendanceClass?.rate}% Average Attendance
              </p>
            </div>
          </div>

          {/* Classes Comparison Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Class Performance Comparison</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classesData.classes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="className" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="attendanceRate" name="Attendance Rate %" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
              Department-Wise Distribution
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Sessions</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {classesData.departments?.map((dept) => (
                  <tr key={dept.department}>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{dept.department}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{dept.totalStudents}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{dept.totalPresent}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{dept.attendanceRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HEATMAP & PATTERNS */}
      {activeTab === 'heatmap' && heatmapData && (
        <div className="space-y-6">
          {/* Pattern Alert Badges */}
          {heatmapData.identifiedPatterns?.length > 0 && (
            <div className="space-y-2">
              {heatmapData.identifiedPatterns.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 rounded-2xl flex items-center space-x-3 text-xs"
                >
                  <Activity className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                  <span className="font-medium">{pat}</span>
                </div>
              ))}
            </div>
          )}

          {/* Weekday Intensity Grid */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Day-of-Week Attendance Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 pt-2">
              {heatmapData.weekdayMatrix?.map((w) => (
                <div
                  key={w.weekday}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 text-center space-y-1"
                >
                  <div className="text-xs font-bold text-slate-500 uppercase">{w.dayName}</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{w.presentCount}</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{w.lateCount} late</div>
                  <div className="text-[10px] text-slate-400">{w.lateRate}% late rate</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PUNCTUALITY ANALYTICS */}
      {activeTab === 'punctuality' && punctualityData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Average Arrival Time</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {punctualityData.averageArrivalTime}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Late Arrivals</span>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {punctualityData.totalLate}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Late Percentage</span>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {punctualityData.latePercentage}%
              </div>
            </div>
          </div>

          {/* Buckets Progress & Frequent Latecomers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Arrival Time Distribution Buckets</h4>
              <div className="space-y-3 pt-2">
                {punctualityData.buckets?.map((b) => (
                  <div key={b.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{b.label}</span>
                      <span>{b.count} scans</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${punctualityData.totalScans > 0 ? (b.count / punctualityData.totalScans) * 100 : 0}%`,
                          backgroundColor: b.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequent Latecomers List */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Frequent Late Arrivals</h4>
              <div className="space-y-2">
                {(!punctualityData.frequentLatecomers || punctualityData.frequentLatecomers.length === 0) ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Zero frequent latecomers in selected period.</p>
                ) : (
                  punctualityData.frequentLatecomers.map((s) => (
                    <div
                      key={s.studentId}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.studentId} • {s.className}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
                        {s.lateCount} lates
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RISK MONITORING */}
      {activeTab === 'risk' && riskData && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold">Normal</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {riskData.summary?.normalCount ?? 0}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold">Needs Attention</span>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {riskData.summary?.needsAttentionCount ?? 0}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold">At Risk</span>
              <div className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1">
                {riskData.summary?.atRiskCount ?? 0}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold">Critical Deficit</span>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {riskData.summary?.criticalCount ?? 0}
              </div>
            </div>
          </div>

          {/* Flagged Students List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Flagged Students Requiring Review</h3>
              <span className="text-xs text-slate-400">{riskData.alerts?.length || 0} students flagged</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(!riskData.alerts || riskData.alerts.length === 0) ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Zero students currently flagged under attendance risk monitoring rules.
                </div>
              ) : (
                riskData.alerts.map((al) => (
                  <div key={al.studentId} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{al.studentName}</span>
                        <span className="text-xs font-mono text-slate-400">({al.studentId})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            al.riskClassification === 'critical'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : al.riskClassification === 'at_risk'
                              ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {al.riskClassification.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 space-y-0.5 pt-1">
                        {al.reasons?.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => setReviewModalStudent(al)}
                      className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100 transition-colors whitespace-nowrap self-start sm:self-auto"
                    >
                      Review & Log
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Review Modal */}
          {reviewModalStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Review Risk Alert: {reviewModalStudent.studentName}
                </h3>
                <p className="text-xs text-slate-400">
                  Record an administrative note or intervention action into the immutable audit trail.
                </p>

                <form onSubmit={handleReviewAlert} className="space-y-4">
                  <textarea
                    rows={3}
                    placeholder="e.g. Spoke with guardian regarding repeated Monday absences; medical excuse pending."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    required
                  />

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setReviewModalStudent(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reviewLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                    >
                      {reviewLoading ? 'Recording...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DATA QUALITY */}
      {activeTab === 'quality' && qualityData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Missing Check-outs</span>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {qualityData.categories?.missingCheckoutCount ?? 0}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Inactive Student Records</span>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {qualityData.categories?.inactiveStudentRecordCount ?? 0}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Blocked Card Activity</span>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {qualityData.categories?.blockedCardActivityCount ?? 0}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
              Surfaced Data Consistency Flags
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(!qualityData.anomalies || qualityData.anomalies.length === 0) ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Zero consistency anomalies detected in historical attendance records.
                </div>
              ) : (
                qualityData.anomalies.map((anom) => (
                  <div key={anom.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white">{anom.category}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{anom.date}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">{anom.description}</p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        anom.severity === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {anom.severity}
                    </span>
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
