import api from './api';

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

