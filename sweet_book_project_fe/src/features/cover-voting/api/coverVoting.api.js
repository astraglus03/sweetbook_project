import { api } from '../../../lib/axios';

export const coverVotingApi = {
  list: (groupId) => api.get(`/groups/${groupId}/cover-candidates`),
  create: (groupId, dto) => api.post(`/groups/${groupId}/cover-candidates`, dto),
  remove: (groupId, id) => api.delete(`/groups/${groupId}/cover-candidates/${id}`),
  toggleVote: (groupId, id) => api.post(`/groups/${groupId}/cover-candidates/${id}/vote`),
  confirm: (groupId, id) => api.post(`/groups/${groupId}/cover-candidates/${id}/confirm`),
};
