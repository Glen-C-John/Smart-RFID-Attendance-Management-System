import api from './api';

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

