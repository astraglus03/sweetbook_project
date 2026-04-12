import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kakaoImportApi } from '../api/kakaoImport.api';

export function useKakaoImport(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }) => {
      const res = await kakaoImportApi.upload(groupId, file, onProgress);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] });
      queryClient.invalidateQueries({ queryKey: ['chapters', groupId] });
    },
  });
}

export function useSaveKakaoMappings(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings) => {
      const res = await kakaoImportApi.saveMappings(groupId, mappings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] });
    },
  });
}
