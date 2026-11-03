import api from './api';

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

