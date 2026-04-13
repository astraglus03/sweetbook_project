import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personalBookApi } from '../api/personal-book.api';

export function useFaceAnchor(groupId) {
  return useQuery({
    queryKey: ['face-anchor', groupId],
    queryFn: async () => {
      const res = await personalBookApi.getAnchor(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegisterFaceAnchor(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files) => {
      const fd = new FormData();
      for (const f of files) fd.append('photos', f);
      const res = await personalBookApi.registerAnchor(groupId, fd);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['face-anchor', groupId] });
      qc.invalidateQueries({
        queryKey: ['groups', groupId, 'personal-book'],
      });
    },
  });
}

export function useDeleteFaceAnchor(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => personalBookApi.deleteAnchor(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['face-anchor', groupId] });
    },
  });
}

export function useMyPersonalBook(groupId) {
  return useQuery({
    queryKey: ['groups', groupId, 'personal-book'],
    queryFn: async () => {
      const res = await personalBookApi.getMyPersonalBook(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 60 * 1000,
  });
}

export function useGeneratePersonalBookForMe(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await personalBookApi.generateForMe(groupId);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['groups', groupId, 'personal-book'],
      });
    },
  });
}

export function useGeneratePersonalBooksForGroup(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await personalBookApi.generateForGroup(groupId);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['groups', groupId, 'personal-book'],
      });
    },
  });
}

export function usePersonalBookJob(groupId, jobId) {
  return useQuery({
    queryKey: ['personal-book-job', groupId, jobId],
    queryFn: async () => {
      const res = await personalBookApi.getJob(groupId, jobId);
      return res.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'completed' || state === 'failed' ? false : 2000;
    },
  });
}

export function useExcludePhoto(groupId, bookId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId) =>
      personalBookApi.excludePhoto(groupId, bookId, photoId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['groups', groupId, 'personal-book'],
      });
      qc.invalidateQueries({ queryKey: ['books', bookId, 'pages'] });
    },
  });
}
