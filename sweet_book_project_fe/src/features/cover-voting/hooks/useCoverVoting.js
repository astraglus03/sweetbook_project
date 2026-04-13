import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coverVotingApi } from '../api/coverVoting.api';

function coverCandidatesKey(groupId) {
  return ['cover-candidates', groupId];
}

export function useCoverCandidates(groupId) {
  return useQuery({
    queryKey: coverCandidatesKey(groupId),
    queryFn: async () => {
      const res = await coverVotingApi.list(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });
}

export function useCreateCoverCandidate(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto) => {
      const res = await coverVotingApi.create(groupId, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coverCandidatesKey(groupId) });
    },
  });
}

export function useDeleteCoverCandidate(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await coverVotingApi.remove(groupId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coverCandidatesKey(groupId) });
    },
  });
}

export function useToggleCoverVote(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await coverVotingApi.toggleVote(groupId, id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coverCandidatesKey(groupId) });
    },
  });
}

export function useConfirmCoverCandidate(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await coverVotingApi.confirm(groupId, id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coverCandidatesKey(groupId) });
    },
  });
}
