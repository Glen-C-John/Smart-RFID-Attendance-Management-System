const Attendance = require('../models/Attendance');
const RfidCard = require('../models/RfidCard');
const Student = require('../models/Student');
const config = require('../config');
const {
  toTimezone,
  getAttendanceDateString,
  formatTimeDisplay,
  isLateArrival,
  diffInMinutes,
} = require('../utils/timezone');

class AttendanceService {
  /**
   * Process a card scan event from an IoT device.
   * @param {Object} scanData
   * @param {string} scanData.deviceId
   * @param {string} scanData.cardUid
   * @param {string} [scanData.tagData]
   * @param {string|Date} [scanData.timestamp]
   * @param {string} [scanData.eventId]
   */
  async processScan({ deviceId, cardUid, tagData, timestamp, eventId }) {
    const normalizedUid = RfidCard.normalizeUid(cardUid);
    const scanDt = toTimezone(timestamp);
    const scanDateJS = scanDt.toJSDate();
    const attendanceDate = getAttendanceDateString(scanDateJS);

    // 1. Network retry idempotency: check if eventId already processed
    if (eventId) {
      const existingEvent = await Attendance.findOne({ eventId });
      if (existingEvent) {
        const student = await Student.findOne({ studentId: existingEvent.studentId });
        return {
          success: true,
          studentName: student ? student.name : 'Unknown',
          message: 'Attendance already recorded (idempotent retry)',
          attendanceStatus: existingEvent.status,
          checkInTime: formatTimeDisplay(existingEvent.checkInTime),
          checkOutTime: existingEvent.checkOutTime ? formatTimeDisplay(existingEvent.checkOutTime) : null,
          data: existingEvent,
        };
      }
    }

    // 2. Lookup RFID card
    const card = await RfidCard.findOne({ cardUid: normalizedUid });
    if (!card) {
      return {
        success: false,
        statusCode: 404,
        message: 'Unregistered RFID card',
      };
    }

    if (card.status === 'blocked') {
      return {
        success: false,
        statusCode: 403,
        message: 'RFID card is blocked',
      };
    }

    // Optionally update storedTagData if provided and not yet stored
    if (tagData && !card.storedTagData) {
      card.storedTagData = tagData.trim();
      await card.save();
    }

    // 3. Lookup registered student
    const student = await Student.findOne({ studentId: card.studentId });
    if (!student) {
      return {
        success: false,
        statusCode: 404,
        message: 'Associated student record not found',
      };
    }

    if (student.status !== 'active') {
      return {
        success: false,
        statusCode: 403,
        message: `Student account is ${student.status}`,
      };
    }

    // 4. Check for existing attendance record today
    let attendanceRecord = await Attendance.findOne({
      studentId: student.studentId,
      attendanceDate,
    });

    if (attendanceRecord) {
      // 4a. Check duplicate scan cooldown
      const lastActionTime = attendanceRecord.checkOutTime || attendanceRecord.checkInTime;
      const secondsSinceLastAction = Math.abs(
        (scanDateJS.getTime() - new Date(lastActionTime).getTime()) / 1000
      );

      if (secondsSinceLastAction < config.attendance.cooldownSeconds) {
        return {
          success: true,
          studentName: student.name,
          message: 'Duplicate scan ignored (cooldown active)',
          attendanceStatus: attendanceRecord.status,
          checkInTime: formatTimeDisplay(attendanceRecord.checkInTime),
          checkOutTime: attendanceRecord.checkOutTime ? formatTimeDisplay(attendanceRecord.checkOutTime) : null,
          isDuplicate: true,
          data: attendanceRecord,
        };
      }

      // 4b. Check-out logic
      if (config.attendance.enableCheckout) {
        if (!attendanceRecord.checkOutTime) {
          const minutesSinceCheckIn = diffInMinutes(scanDateJS, attendanceRecord.checkInTime);

          if (minutesSinceCheckIn >= config.attendance.checkoutMinIntervalMinutes) {
            attendanceRecord.checkOutTime = scanDateJS;
            if (eventId && !attendanceRecord.eventId) {
              attendanceRecord.eventId = eventId;
            }
            await attendanceRecord.save();

            return {
              success: true,
              studentName: student.name,
              message: 'Check-out recorded successfully',
              attendanceStatus: attendanceRecord.status,
              action: 'check_out',
              checkInTime: formatTimeDisplay(attendanceRecord.checkInTime),
              checkOutTime: formatTimeDisplay(attendanceRecord.checkOutTime),
              data: attendanceRecord,
            };
          } else {
            return {
              success: true,
              studentName: student.name,
              message: `Already checked in recently. Minimum check-out window is ${config.attendance.checkoutMinIntervalMinutes} minutes.`,
              attendanceStatus: attendanceRecord.status,
              checkInTime: formatTimeDisplay(attendanceRecord.checkInTime),
              data: attendanceRecord,
            };
          }
        } else {
          return {
            success: true,
            studentName: student.name,
            message: 'Attendance session already completed for today',
            attendanceStatus: attendanceRecord.status,
            checkInTime: formatTimeDisplay(attendanceRecord.checkInTime),
            checkOutTime: formatTimeDisplay(attendanceRecord.checkOutTime),
            data: attendanceRecord,
          };
        }
      } else {
        return {
          success: true,
          studentName: student.name,
          message: 'Attendance already recorded for today',
          attendanceStatus: attendanceRecord.status,
          checkInTime: formatTimeDisplay(attendanceRecord.checkInTime),
          data: attendanceRecord,
        };
      }
    }

    // 5. First scan of the day -> Check-in
    const status = isLateArrival(scanDateJS) ? 'late' : 'present';

    try {
      attendanceRecord = await Attendance.create({
        studentId: student.studentId,
        cardUid: normalizedUid,
        deviceId,
        attendanceDate,
        checkInTime: scanDateJS,
        status,
        eventId: eventId || undefined,
      });

      return {
        success: true,
        studentName: student.name,
        message: 'Attendance recorded',
        attendanceStatus: attendanceRecord.status,
        action: 'check_in',
        checkInTime: formatTimeDisplay(attendanceRecord.checkInTime),
        data: attendanceRecord,
      };
    } catch (err) {
      // Handle race condition duplicate key
      if (err.code === 11000) {
        const existing = await Attendance.findOne({
          studentId: student.studentId,
          attendanceDate,
        });
        return {
          success: true,
          studentName: student.name,
          message: 'Attendance already recorded',
          attendanceStatus: existing.status,
          checkInTime: formatTimeDisplay(existing.checkInTime),
          data: existing,
        };
      }
      throw err;
    }
  }

  /**
   * Query attendance records with filters.
   */
  async getAttendance(filter = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'studentId', select: 'name className department email', foreignField: 'studentId' }),
      Attendance.countDocuments(filter),
    ]);

    return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAttendanceById(id) {
    return Attendance.findById(id);
  }

  async getAttendanceByStudent(studentId, page = 1, limit = 50) {
    return this.getAttendance({ studentId: studentId.toUpperCase() }, page, limit);
  }

  async getAttendanceByDate(dateStr, page = 1, limit = 50) {
    return this.getAttendance({ attendanceDate: dateStr }, page, limit);
  }
}

module.exports = new AttendanceService();

