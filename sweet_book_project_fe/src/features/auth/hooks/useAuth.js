import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export const AUTH_ME_KEY = ['auth', 'me'];

export function useMe() {
  return useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: async () => {
      const res = await authApi.me();
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await authApi.login(payload);
      return res.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_KEY, user);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await authApi.signup(payload);
      return res.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_KEY, null);
      queryClient.clear();
    },
  });
}
