import api from './api';

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

