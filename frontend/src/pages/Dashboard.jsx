import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  CreditCard,
  Cpu,
  TrendingUp,
  Radio,
  RefreshCw,
  Building,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { useSocket } from '../context/SocketContext';

export const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { lastScanEvent } = useSocket();

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [over, tr, dist, comp, act] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getTrends(7),
        dashboardService.getDistribution(),
        dashboardService.getClassComparison(),
        dashboardService.getRecentActivity(8),
      ]);
      setOverview(over);
      setTrends(tr);
      setDistribution(dist);
      setComparison(comp);
      setRecentActivity(act);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Re-fetch automatically when a live RFID scan event arrives via Socket.IO
  useEffect(() => {
    if (lastScanEvent) {
      fetchDashboardData(true);
    }
  }, [lastScanEvent, fetchDashboardData]);

  // Periodic polling fallback every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Active Students',
      value: overview?.totalActiveStudents ?? 0,
      sub: `${overview?.totalStudents ?? 0} total enrolled`,
      icon: Users,
      color: 'indigo',
    },
    {
      title: 'Present Today',
      value: overview?.presentToday ?? 0,
      sub: `${overview?.attendancePercentage ?? 0}% attendance rate`,
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      title: 'Late Arrivals',
      value: overview?.lateToday ?? 0,
      sub: 'After late threshold',
      icon: Clock,
      color: 'amber',
    },
    {
      title: 'Absent Today',
      value: overview?.absentToday ?? 0,
      sub: 'Students not scanned',
      icon: UserX,
      color: 'rose',
    },
    {
      title: 'Active RFID Cards',
      value: overview?.activeCards ?? 0,
      sub: 'Assigned to students',
      icon: CreditCard,
      color: 'blue',
    },
    {
      title: 'Connected IoT Scanners',
      value: `${overview?.onlineDevices ?? 0} / ${overview?.totalDevices ?? 0}`,
      sub: `${overview?.onlineDevices ?? 0} devices currently online`,
      icon: Cpu,
      color: overview?.onlineDevices > 0 ? 'emerald' : 'slate',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Attendance Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time IoT metrics for {overview?.date || 'Today'}
          </p>
        </div>

        <button
          onClick={() => fetchDashboardData()}
          disabled={isRefreshing}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Top 6 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl bg-${card.color}-500/10 text-${card.color}-600 dark:text-${card.color}-400`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section: 7-Day Trend + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Attendance Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Weekly Attendance Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Past 7 days on-time vs late arrival analysis</p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium">
              <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>On-Time</span>
              </span>
              <span className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Late</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="onTimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="onTime" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#onTimeGrad)" name="On-Time" />
                <Area type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#lateGrad)" name="Late" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Status Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Today's Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ratio of present, late, and absent students</p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            {distribution.map((d, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{d.value}</p>
                <p className="text-[11px] text-slate-400" style={{ color: d.color }}>{d.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Comparison & Recent Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class-wise Comparison Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
              <Building className="w-4 h-4 text-indigo-500" />
              <span>Class Performance</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Attendance percentage by academic batch</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="className" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Attendance Rate']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="percentage" fill="#6366f1" radius={[6, 6, 0, 0]} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Scan Activity Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Live RFID Scan Activity</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time attendance events streamed from IoT nodes</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              Live Stream
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold rounded-lg">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Student</th>
                  <th className="px-3 py-2.5">Card UID</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 rounded-r-lg">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                      No attendance activity recorded yet today.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.studentName}</div>
                        <div className="text-[10px] text-slate-400">{item.studentId} • {item.className}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.cardUid}
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                        {item.checkInTime || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'present'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : item.status === 'late'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                        {item.location || item.deviceId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

