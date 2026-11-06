import api from './api';

export { default as api } from './api';

export const authService = {
  async login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.token) {
      localStorage.setItem('rfid_auth_token', res.data.token);
      localStorage.setItem('rfid_auth_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data.user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network failure on logout
    } finally {
      localStorage.removeItem('rfid_auth_token');
      localStorage.removeItem('rfid_auth_user');
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('rfid_auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem('rfid_auth_token'));
  },
};

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

export const studentService = {
  async getStudents(params = {}) {
    const res = await api.get('/students', { params });
    return res.data;
  },

  async getStudentById(id) {
    const res = await api.get(`/students/${id}`);
    return res.data.student;
  },

  async createStudent(data) {
    const res = await api.post('/students', data);
    return res.data.student;
  },

  async updateStudent(id, data) {
    const res = await api.put(`/students/${id}`, data);
    return res.data.student;
  },

  async deleteStudent(id, force = false) {
    const res = await api.delete(`/students/${id}${force ? '?force=true' : ''}`);
    return res.data;
  },
};

export const cardService = {
  async getCards(params = {}) {
    const res = await api.get('/cards', { params });
    return res.data;
  },

  async getCardByUid(uid) {
    const res = await api.get(`/cards/${encodeURIComponent(uid)}`);
    return res.data.card;
  },

  async registerCard(data) {
    const res = await api.post('/cards/register', data);
    return res.data.card;
  },

  async blockCard(uid) {
    const res = await api.put(`/cards/${encodeURIComponent(uid)}/block`);
    return res.data.card;
  },

  async activateCard(uid) {
    const res = await api.put(`/cards/${encodeURIComponent(uid)}/activate`);
    return res.data.card;
  },
};

export const deviceService = {
  async getDevices() {
    const res = await api.get('/devices');
    return res.data.devices;
  },

  async getDeviceById(id) {
    const res = await api.get(`/devices/${id}`);
    return res.data.device;
  },

  async registerDevice(data) {
    const res = await api.post('/devices/register', data);
    return res.data.device;
  },

  async updateDevice(id, data) {
    const res = await api.put(`/devices/${id}`, data);
    return res.data.device;
  },

  async updateDeviceStatus(id, status) {
    const res = await api.put(`/devices/${id}/status`, { status });
    return res.data.device;
  },
};

export const dashboardService = {
  async getOverview() {
    const res = await api.get('/dashboard/overview');
    return res.data.overview;
  },

  async getTrends(days = 7) {
    const res = await api.get(`/dashboard/trends?days=${days}`);
    return res.data.trends;
  },

  async getDistribution() {
    const res = await api.get('/dashboard/distribution');
    return res.data.distribution;
  },

  async getClassComparison() {
    const res = await api.get('/dashboard/class-comparison');
    return res.data.comparison;
  },

  async getRecentActivity(limit = 10) {
    const res = await api.get(`/dashboard/recent-activity?limit=${limit}`);
    return res.data.activity;
  },
};

export const reportService = {
  async generateReport(params = {}) {
    const res = await api.get('/reports', { params });
    return res.data;
  },

  async buildReport(data) {
    const res = await api.post('/reports/generate', data);
    return res.data;
  },

  async getHistory(limit = 50) {
    const res = await api.get(`/reports/history?limit=${limit}`);
    return res.data;
  },
};

export const analyticsService = {
  async getOverview(params = {}) {
    const res = await api.get('/analytics/overview', { params });
    return res.data;
  },

  async getTrends(params = {}) {
    const res = await api.get('/analytics/trends', { params });
    return res.data;
  },

  async getStudentAnalytics(studentId) {
    const res = await api.get(`/analytics/student/${studentId}`);
    return res.data;
  },

  async getClassesAnalytics(params = {}) {
    const res = await api.get('/analytics/classes', { params });
    return res.data;
  },

  async getHeatmap(params = {}) {
    const res = await api.get('/analytics/heatmap', { params });
    return res.data;
  },

  async getPunctuality(params = {}) {
    const res = await api.get('/analytics/punctuality', { params });
    return res.data;
  },

  async getDataQuality() {
    const res = await api.get('/analytics/data-quality');
    return res.data;
  },

  async getRiskOverview(params = {}) {
    const res = await api.get('/analytics/risk', { params });
    return res.data;
  },
};

export const alertService = {
  async getAlerts(params = {}) {
    const res = await api.get('/alerts', { params });
    return res.data;
  },

  async reviewAlert(studentId, comment) {
    const res = await api.patch(`/alerts/${studentId}/review`, { comment });
    return res.data;
  },
};

export const calendarService = {
  async getCalendar() {
    const res = await api.get('/calendar');
    return res.data.calendar;
  },

  async updateCalendar(data) {
    const res = await api.put('/calendar', data);
    return res.data.calendar;
  },

  async addHoliday(data) {
    const res = await api.post('/calendar/holiday', data);
    return res.data.calendar;
  },

  async removeHoliday(id) {
    const res = await api.delete(`/calendar/holiday/${id}`);
    return res.data.calendar;
  },

  async addSemester(data) {
    const res = await api.post('/calendar/semester', data);
    return res.data.calendar;
  },

  async removeSemester(id) {
    const res = await api.delete(`/calendar/semester/${id}`);
    return res.data.calendar;
  },
};

export const scheduleService = {
  async getSchedules() {
    const res = await api.get('/report-schedules');
    return res.data.schedules;
  },

  async createSchedule(data) {
    const res = await api.post('/report-schedules', data);
    return res.data.schedule;
  },

  async updateSchedule(id, data) {
    const res = await api.put(`/report-schedules/${id}`, data);
    return res.data.schedule;
  },

  async deleteSchedule(id) {
    const res = await api.delete(`/report-schedules/${id}`);
    return res.data;
  },

  async runScheduleNow(id) {
    const res = await api.post(`/report-schedules/${id}/run-now`);
    return res.data;
  },
};

export const auditLogService = {
  async getLogs(params = {}) {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  },
};

export const settingsService = {
  async getSettings() {
    const res = await api.get('/settings');
    return res.data.settings;
  },

  async updateSettings(data) {
    const res = await api.put('/settings', data);
    return res.data.settings;
  },
};

