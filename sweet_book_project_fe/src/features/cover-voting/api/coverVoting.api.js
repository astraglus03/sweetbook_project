import { api } from '../../../lib/axios';

export const coverVotingApi = {
  list: (groupId) => api.get(`/groups/${groupId}/cover-candidates`),
  findOne: (groupId, id) => api.get(`/groups/${groupId}/cover-candidates/${id}`),
  create: (groupId, dto) => api.post(`/groups/${groupId}/cover-candidates`, dto),
  update: (groupId, id, dto) => api.patch(`/groups/${groupId}/cover-candidates/${id}`, dto),
  remove: (groupId, id) => api.delete(`/groups/${groupId}/cover-candidates/${id}`),
  toggleVote: (groupId, id) => api.post(`/groups/${groupId}/cover-candidates/${id}/vote`),
  confirm: (groupId, id) => api.post(`/groups/${groupId}/cover-candidates/${id}/confirm`),
};
