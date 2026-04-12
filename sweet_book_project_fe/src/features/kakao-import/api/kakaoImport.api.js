import { api } from '../../../lib/axios';

export const kakaoImportApi = {
  upload: (groupId, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/groups/${groupId}/kakao-import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: 120000, // 2분
    });
  },
  getUnmatched: (groupId) => api.get(`/groups/${groupId}/kakao-import/unmatched`),
  saveMappings: (groupId, mappings) =>
    api.post(`/groups/${groupId}/kakao-import/mappings`, { mappings }),
};
