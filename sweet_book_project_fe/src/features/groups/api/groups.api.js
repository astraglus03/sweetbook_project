import { api } from '../../../lib/axios';

export const groupsApi = {
  create: (payload) => api.post('/groups', payload),
  getMyGroups: (params) => api.get('/groups', { params }),
  getDetail: (groupId) => api.get(`/groups/${groupId}`),
  update: (groupId, payload) => api.patch(`/groups/${groupId}`, payload),
  delete: (groupId) => api.delete(`/groups/${groupId}`),
  getByInviteCode: (code) => api.get(`/groups/join/${code}`),
  join: (groupId, payload) => api.post(`/groups/${groupId}/join`, payload),
  leave: (groupId) => api.post(`/groups/${groupId}/leave`),
  removeMember: (groupId, userId) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  transferOwner: (groupId, payload) =>
    api.patch(`/groups/${groupId}/transfer-owner`, payload),
};
