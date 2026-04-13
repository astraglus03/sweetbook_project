import { useInfiniteQuery } from '@tanstack/react-query';
import { activitiesApi } from '../api/activities.api';

export function useActivities(groupId) {
  return useInfiniteQuery({
    queryKey: ['groups', groupId, 'activities'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await activitiesApi.list(groupId, { page: pageParam, limit: 20 });
      return res.data ?? res;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta ?? {};
      if (page < totalPages) return page + 1;
      return undefined;
    },
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });
}
