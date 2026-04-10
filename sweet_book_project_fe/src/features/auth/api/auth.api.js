import { api } from '../../../lib/axios';

export const authApi = {
  signup: (payload) => api.post('/auth/signup', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
};
