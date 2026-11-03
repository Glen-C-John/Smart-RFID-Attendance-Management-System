import api from './api';

export const reportService = {
  async generateReport(params = {}) {
    const res = await api.get('/reports', { params });
    return res.data;
  },
};

