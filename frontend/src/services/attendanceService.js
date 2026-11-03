import api from './api';

export const attendanceService = {
  async getAttendance(params = {}) {
    const res = await api.get('/attendance', { params });
    return res.data;
  },

  async getAttendanceById(id) {
    const res = await api.get(`/attendance/${id}`);
    return res.data.attendance;
  },

  async getAttendanceByStudent(studentId, params = {}) {
    const res = await api.get(`/attendance/student/${studentId}`, { params });
    return res.data;
  },

  async correctAttendance(id, data) {
    const res = await api.patch(`/attendance/${id}`, data);
    return res.data.attendance;
  },
};
