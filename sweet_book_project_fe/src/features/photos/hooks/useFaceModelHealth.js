import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

export function useFaceModelHealth() {
  return useQuery({
    queryKey: ['face-model-health'],
    queryFn: () => api.get('/face-model/health'),
    refetchInterval: (data) => (data?.ready ? false : 5000),
    staleTime: 30_000,
  });
}
