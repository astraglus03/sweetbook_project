import { api } from '../../../../lib/axios';

export const personalBookApi = {
  registerAnchor: (groupId, formData) =>
    api.post(`/groups/${groupId}/face-anchor`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  getAnchor: (groupId) => api.get(`/groups/${groupId}/face-anchor`),
  deleteAnchor: (groupId) => api.delete(`/groups/${groupId}/face-anchor`),

  generateForGroup: (groupId) =>
    api.post(`/groups/${groupId}/books/personal/generate`, null, {
      timeout: 10000,
    }),
  getJob: (groupId, jobId) =>
    api.get(`/groups/${groupId}/books/personal/jobs/${jobId}`),
  generateForMe: (groupId) =>
    api.post(`/groups/${groupId}/books/personal/generate/me`, null, {
      timeout: 120000,
    }),
  getMyPersonalBook: (groupId) =>
    api.get(`/groups/${groupId}/books/personal`),
  excludePhoto: (groupId, bookId, photoId) =>
    api.delete(
      `/groups/${groupId}/books/personal/${bookId}/photos/${photoId}`,
    ),
};
