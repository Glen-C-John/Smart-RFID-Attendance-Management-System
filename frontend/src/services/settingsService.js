import api from './api';

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
