const Student = require('../models/Student');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');

class StudentService {
  async createStudent(data) {
    const studentId = (data.studentId || '').trim().toUpperCase();
    const name = (data.name || '').trim();
    const className = (data.className || '').trim();

    if (!studentId || !name || !className) {
      const err = new Error('studentId, name, and className cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    const existing = await Student.findOne({ studentId });
    if (existing) {
      const err = new Error(`Student with ID '${studentId}' already exists`);
      err.statusCode = 409;
      throw err;
    }
    return Student.create({
      ...data,
      studentId,
      name,
      className,
      email: data.email ? data.email.trim() : null,
      phone: data.phone ? data.phone.trim() : null,
      department: data.department ? data.department.trim() : null,
    });
  }

  async getStudents(query = {}, page = 1, limit = 50) {
    const filter = {};
    if (query.className) filter.className = query.className;
    if (query.department) filter.department = query.department;
    if (query.status) filter.status = query.status;
    if (query.search && query.search.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { studentId: { $regex: escaped, $options: 'i' } },
      ];
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ studentId: 1 }).skip(skip).limit(safeLimit),
      Student.countDocuments(filter),
    ]);

    return { students, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  async getStudentById(id) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { $or: [{ _id: id }, { studentId: id.toUpperCase() }] } : { studentId: id.toUpperCase() };
    const student = await Student.findOne(filter);
    if (!student) {
      const err = new Error(`Student '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }
    const cards = await RfidCard.find({ studentId: student.studentId });
    return { ...student.toObject(), cards };
  }

  async updateStudent(id, data) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { $or: [{ _id: id }, { studentId: id.toUpperCase() }] } : { studentId: id.toUpperCase() };

    delete data.studentId; // Prevent changing unique studentId directly

    const updated = await Student.findOneAndUpdate(filter, data, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!updated) {
      const err = new Error(`Student '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }

  async deleteStudent(id, force = false) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filter = isObjectId ? { $or: [{ _id: id }, { studentId: id.toUpperCase() }] } : { studentId: id.toUpperCase() };
    const student = await Student.findOne(filter);
    if (!student) {
      const err = new Error(`Student '${id}' not found`);
      err.statusCode = 404;
      throw err;
    }

    if (!force) {
      // Soft delete: deactivate student and block active cards
      student.status = 'inactive';
      await student.save();
      await RfidCard.updateMany({ studentId: student.studentId }, { status: 'blocked' });
      return { message: 'Student deactivated and associated cards blocked' };
    }

    // Force delete: verify that no historical attendance records exist
    const attendanceCount = await Attendance.countDocuments({ studentId: student.studentId });
    if (attendanceCount > 0) {
      const err = new Error(
        `Cannot permanently delete student '${student.studentId}' with ${attendanceCount} existing attendance records. Deactivate student instead to preserve historical audit data.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Safe permanent delete when no attendance history exists
    await Student.deleteOne({ _id: student._id });
    await RfidCard.deleteMany({ studentId: student.studentId });
    return { message: 'Student and associated RFID cards permanently deleted' };
  }
}

module.exports = new StudentService();

