const Student = require('../models/Student');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const Device = require('../models/Device');
const config = require('../config');
const { getAttendanceDateString, nowInTimezone, formatTimeDisplay } = require('../utils/timezone');
const { successResponse } = require('../utils/response');

const getOverview = async (req, res, next) => {
  try {
    const todayStr = getAttendanceDateString();
    const heartbeatCutoff = new Date(Date.now() - config.deviceHeartbeatThresholdSeconds * 1000);

    const [
      totalActiveStudents,
      totalStudents,
      presentToday,
      lateToday,
      activeCards,
      totalDevices,
      onlineDevices,
    ] = await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Student.countDocuments(),
      Attendance.countDocuments({
        attendanceDate: todayStr,
        status: { $in: ['present', 'late', 'half_day'] },
      }),
      Attendance.countDocuments({
        attendanceDate: todayStr,
        status: 'late',
      }),
      RfidCard.countDocuments({ status: 'active' }),
      Device.countDocuments(),
      Device.countDocuments({
        status: 'active',
        lastSeen: { $gte: heartbeatCutoff },
      }),
    ]);

    const absentToday = Math.max(0, totalActiveStudents - presentToday);
    const attendancePercentage = totalActiveStudents > 0
      ? Math.round((presentToday / totalActiveStudents) * 100)
      : 0;

    return successResponse(res, {
      overview: {
        totalStudents,
        totalActiveStudents,
        presentToday,
        absentToday,
        lateToday,
        attendancePercentage,
        activeCards,
        totalDevices,
        onlineDevices,
        date: todayStr,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const now = nowInTimezone();
    const startDate = now.minus({ days: days - 1 }).toFormat('yyyy-MM-dd');
    const endDate = now.toFormat('yyyy-MM-dd');

    const [totalActiveStudents, aggregatedRecords] = await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Attendance.aggregate([
        {
          $match: {
            attendanceDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { date: '$attendanceDate', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build lookup map from single aggregation result
    const countsByDate = {};
    aggregatedRecords.forEach((item) => {
      const date = item._id.date;
      const status = item._id.status;
      if (!countsByDate[date]) countsByDate[date] = { present: 0, late: 0 };
      if (status === 'present' || status === 'late' || status === 'half_day') {
        countsByDate[date].present += item.count;
      }
      if (status === 'late') {
        countsByDate[date].late += item.count;
      }
    });

    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const dt = now.minus({ days: i });
      const dateStr = dt.toFormat('yyyy-MM-dd');
      const dayName = dt.toFormat('ccc'); // Mon, Tue, etc.

      const dayCounts = countsByDate[dateStr] || { present: 0, late: 0 };
      const present = dayCounts.present;
      const late = dayCounts.late;
      const onTime = Math.max(0, present - late);
      const absent = Math.max(0, totalActiveStudents - present);

      trends.push({
        date: dateStr,
        day: dayName,
        present,
        onTime,
        late,
        absent,
        total: totalActiveStudents,
      });
    }

    return successResponse(res, { trends });
  } catch (error) {
    next(error);
  }
};

const getDistribution = async (req, res, next) => {
  try {
    const todayStr = getAttendanceDateString();
    const totalActiveStudents = await Student.countDocuments({ status: 'active' });

    const [presentCount, lateCount] = await Promise.all([
      Attendance.countDocuments({
        attendanceDate: todayStr,
        status: { $in: ['present', 'late', 'half_day'] },
      }),
      Attendance.countDocuments({
        attendanceDate: todayStr,
        status: 'late',
      }),
    ]);

    const onTimeCount = Math.max(0, presentCount - lateCount);
    const absentCount = Math.max(0, totalActiveStudents - presentCount);

    const distribution = [
      { name: 'On Time', value: onTimeCount, color: '#10B981' }, // green
      { name: 'Late', value: lateCount, color: '#F59E0B' },       // amber
      { name: 'Absent', value: absentCount, color: '#EF4444' },    // red
    ];

    return successResponse(res, { distribution });
  } catch (error) {
    next(error);
  }
};

const getClassComparison = async (req, res, next) => {
  try {
    const todayStr = getAttendanceDateString();

    const [students, todayRecords] = await Promise.all([
      Student.find({ status: 'active' }, 'className studentId').lean(),
      Attendance.find({
        attendanceDate: todayStr,
        status: { $in: ['present', 'late', 'half_day'] },
      }, 'studentId').lean(),
    ]);

    const presentSet = new Set(todayRecords.map((r) => r.studentId));
    const classesMap = {};

    students.forEach((s) => {
      const cls = s.className || 'General';
      if (!classesMap[cls]) {
        classesMap[cls] = { total: 0, presentCount: 0 };
      }
      classesMap[cls].total++;
      if (presentSet.has(s.studentId)) {
        classesMap[cls].presentCount++;
      }
    });

    const comparison = Object.entries(classesMap).map(([className, data]) => {
      const percentage = data.total > 0 ? Math.round((data.presentCount / data.total) * 100) : 0;
      return {
        className,
        totalStudents: data.total,
        presentCount: data.presentCount,
        absentCount: Math.max(0, data.total - data.presentCount),
        percentage,
      };
    });

    return successResponse(res, { comparison });
  } catch (error) {
    next(error);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const records = await Attendance.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const studentIds = [...new Set(records.map((r) => r.studentId))];
    const deviceIds = [...new Set(records.map((r) => r.deviceId))];

    const [students, devices] = await Promise.all([
      Student.find({ studentId: { $in: studentIds } }, 'studentId name className').lean(),
      Device.find({ deviceId: { $in: deviceIds } }, 'deviceId deviceName location').lean(),
    ]);

    const studentMap = Object.fromEntries(students.map((s) => [s.studentId, s]));
    const deviceMap = Object.fromEntries(devices.map((d) => [d.deviceId, d]));

    const activity = records.map((r) => ({
      _id: r._id,
      studentId: r.studentId,
      studentName: studentMap[r.studentId]?.name || 'Unknown',
      className: studentMap[r.studentId]?.className || '-',
      cardUid: r.cardUid,
      deviceId: r.deviceId,
      deviceName: deviceMap[r.deviceId]?.deviceName || r.deviceId,
      location: deviceMap[r.deviceId]?.location || 'Main Gate',
      attendanceDate: r.attendanceDate,
      checkInTime: r.checkInTime ? formatTimeDisplay(r.checkInTime) : null,
      checkOutTime: r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : null,
      rawCheckInTime: r.checkInTime,
      status: r.status,
      timestamp: r.createdAt,
    }));

    return successResponse(res, { activity });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getTrends,
  getDistribution,
  getClassComparison,
  getRecentActivity,
};

