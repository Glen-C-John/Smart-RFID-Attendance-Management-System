import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  Mail,
  Phone,
  Building,
} from 'lucide-react';
import { studentService } from '../services/studentService';
import { cardService } from '../services/cardService';
import { attendanceService } from '../services/attendanceService';

export const StudentDetails = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    try {
      const studentData = await studentService.getStudentById(id);
      setStudent(studentData);

      // Fetch attendance history for this student
      const attData = await attendanceService.getAttendanceByStudent(studentData.studentId, { limit: 50 });
      setAttendanceRecords(attData.records || []);
    } catch (err) {
      console.error('Error fetching student details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleToggleCardStatus = async (card) => {
    setIsUpdatingCard(true);
    try {
      if (card.status === 'active') {
        await cardService.blockCard(card.cardUid);
      } else {
        await cardService.activateCard(card.cardUid);
      }
      fetchStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update card status');
    } finally {
      setIsUpdatingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading student profile...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-sm">Student profile not found.</p>
        <Link to="/students" className="mt-4 inline-block text-xs text-indigo-500 font-semibold hover:underline">
          &larr; Back to Students List
        </Link>
      </div>
    );
  }

  const totalSessions = attendanceRecords.length;
  const presentSessions = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const lateSessions = attendanceRecords.filter((r) => r.status === 'late').length;
  const onTimeSessions = attendanceRecords.filter((r) => r.status === 'present').length;
  const attendancePercentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center space-x-3">
        <Link
          to="/students"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Back to students"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {student.name} • {student.studentId}
          </p>
        </div>
      </div>

      {/* Top Profile & Statistics Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Details Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {student.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">{student.name}</h3>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">{student.studentId}</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1.5 ${
                  student.status === 'active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {student.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Building className="w-4 h-4 text-slate-400" />
              <span>{student.className} {student.department && `• ${student.department}`}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{student.email || 'No email registered'}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{student.phone || 'No phone registered'}</span>
            </div>
          </div>
        </div>

        {/* Assigned RFID Cards Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>Assigned RFID Cards</span>
            </h3>
            <span className="text-xs text-slate-400">{student.cards?.length || 0} card(s)</span>
          </div>

          <div className="space-y-3">
            {(!student.cards || student.cards.length === 0) ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-slate-400">
                No RFID cards currently assigned to this student.
              </div>
            ) : (
              student.cards.map((card) => (
                <div
                  key={card._id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{card.cardUid}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        card.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {card.status}
                    </span>
                  </div>

                  {card.storedTagData && (
                    <p className="text-[11px] text-slate-400">
                      Legacy Block 2 Data: <span className="text-slate-600 dark:text-slate-300 font-semibold">"{card.storedTagData}"</span>
                    </p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleToggleCardStatus(card)}
                      disabled={isUpdatingCard}
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                        card.status === 'active'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}
                    >
                      {card.status === 'active' ? 'Block Card' : 'Activate Card'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance KPI Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Attendance Summary</h3>
            <p className="text-xs text-slate-400">Historical performance rate</p>
          </div>

          <div className="text-center my-auto py-2">
            <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {attendancePercentage}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Average Attendance</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{totalSessions}</p>
              <p className="text-[10px] text-slate-400">Recorded</p>
            </div>
            <div>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">{onTimeSessions}</p>
              <p className="text-[10px] text-slate-400">On-Time</p>
            </div>
            <div>
              <p className="font-bold text-amber-600 dark:text-amber-400">{lateSessions}</p>
              <p className="text-[10px] text-slate-400">Late</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Attendance History Log</h3>
          <p className="text-xs text-slate-400">All past check-in sessions recorded for this student</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Date</th>
                <th className="px-4 py-3">Check-In Time</th>
                <th className="px-4 py-3">Check-Out Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Card Used</th>
                <th className="px-4 py-3 rounded-r-lg">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No historical attendance records found for this student.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {r.attendanceDate}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {new Date(r.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.checkOutTime
                        ? new Date(r.checkOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : r.status === 'late'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {r.cardUid}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {r.deviceId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

