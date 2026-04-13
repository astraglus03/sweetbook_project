import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

export function useFaceModelHealth() {
  return useQuery({
    queryKey: ['face-model-health'],
    queryFn: async () => {
      const res = await api.get('/face-model/health');
      return res.data;
    },
    refetchInterval: (query) => (query.state.data?.ready ? false : 5000),
    staleTime: 30_000,
  });
}
