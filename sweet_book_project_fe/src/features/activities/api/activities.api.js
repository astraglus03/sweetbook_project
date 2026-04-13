import { api } from '../../../lib/axios';

export const activitiesApi = {
  list: (groupId, { page = 1, limit = 20 } = {}) =>
    api.get(`/groups/${groupId}/activities`, { params: { page, limit } }),
};
