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

