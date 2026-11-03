import api from './api';

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
