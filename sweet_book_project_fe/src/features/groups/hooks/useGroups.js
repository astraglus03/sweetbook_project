import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups.api';

const GROUPS_LIST_KEY = ['groups', 'list'];

export function groupDetailKey(groupId) {
  return ['groups', groupId];
}

export function useMyGroups(params = {}) {
  return useQuery({
    queryKey: [...GROUPS_LIST_KEY, params],
    queryFn: async () => {
      const res = await groupsApi.getMyGroups(params);
      return res.data;
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useGroupDetail(groupId) {
  return useQuery({
    queryKey: groupDetailKey(groupId),
    queryFn: async () => {
      const res = await groupsApi.getDetail(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useGroupByCode(code) {
  return useQuery({
    queryKey: ['groups', 'invite', code],
    queryFn: async () => {
      const res = await groupsApi.getByInviteCode(code);
      return res.data;
    },
    enabled: !!code,
    retry: false,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await groupsApi.create(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_LIST_KEY });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, ...payload }) => {
      const res = await groupsApi.update(groupId, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GROUPS_LIST_KEY });
      queryClient.invalidateQueries({
        queryKey: groupDetailKey(variables.groupId),
      });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId) => groupsApi.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_LIST_KEY });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, inviteCode }) => {
      const res = await groupsApi.join(groupId, { inviteCode });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_LIST_KEY });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId) => groupsApi.leave(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_LIST_KEY });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: groupDetailKey(variables.groupId),
      });
    },
  });
}

export function useTransferOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, newOwnerId }) =>
      groupsApi.transferOwner(groupId, { newOwnerId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: groupDetailKey(variables.groupId),
      });
    },
  });
}
