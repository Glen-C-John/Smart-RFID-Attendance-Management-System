const studentService = require('../services/studentService');
const { successResponse } = require('../utils/response');

const createStudent = async (req, res, next) => {
  try {
    const { studentId, name, email, phone, className, department } = req.body;
    if (!studentId || !name || !className) {
      return res.status(400).json({
        success: false,
        message: 'studentId, name, and className are required fields',
      });
    }

    const student = await studentService.createStudent({
      studentId,
      name,
      email,
      phone,
      className,
      department,
    });

    return successResponse(res, { student }, 'Student created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await studentService.getStudents(req.query, page, limit);
    return successResponse(res, result, 'Students retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return successResponse(res, { student }, 'Student details retrieved');
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const updated = await studentService.updateStudent(req.params.id, req.body);
    return successResponse(res, { student: updated }, 'Student updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const result = await studentService.deleteStudent(req.params.id, force);
    return successResponse(res, {}, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};

