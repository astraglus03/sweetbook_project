import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { photosApi } from '../api/photos.api';

export function photosKey(groupId, params) {
  return ['photos', groupId, params];
}

export function usePhotos(groupId, params = {}) {
  return useQuery({
    queryKey: photosKey(groupId, params),
    queryFn: async () => {
      const res = await photosApi.getPhotos(groupId, params);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 60 * 1000,
  });
}

export function useChapters(groupId) {
  return useQuery({
    queryKey: ['photos', groupId, 'chapters'],
    queryFn: async () => {
      const res = await photosApi.getChapters(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 60 * 1000,
  });
}

export function useUploadPhotos(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ files, onProgress }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const res = await photosApi.upload(groupId, formData, onProgress);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] });
    },
  });
}

export function useDeletePhoto(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId) => photosApi.deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] });
    },
  });
}

export function useUpdatePhoto(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, ...payload }) => {
      const res = await photosApi.updatePhoto(photoId, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] });
    },
  });
}
