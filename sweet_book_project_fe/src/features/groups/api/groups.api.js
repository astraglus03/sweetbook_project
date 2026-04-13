import { api } from '../../../lib/axios';

export const groupsApi = {
  create: (payload) => api.post('/groups', payload),
  uploadCover: (groupId, formData) =>
    api.post(`/groups/${groupId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyGroups: (params) => api.get('/groups', { params }),
  getDetail: (groupId) => api.get(`/groups/${groupId}`),
  update: (groupId, payload) => api.patch(`/groups/${groupId}`, payload),
  updateStatus: (groupId, status) =>
    api.patch(`/groups/${groupId}/status`, { status }),
  getFaceDetectionStatus: (groupId) =>
    api.get(`/groups/${groupId}/face-detection-status`),
  delete: (groupId) => api.delete(`/groups/${groupId}`),
  getByInviteCode: (code) => api.get(`/groups/join/${code}`),
  join: (groupId, payload) => api.post(`/groups/${groupId}/join`, payload),
  leave: (groupId) => api.post(`/groups/${groupId}/leave`),
  removeMember: (groupId, userId) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  transferOwner: (groupId, payload) =>
    api.patch(`/groups/${groupId}/transfer-owner`, payload),
};
