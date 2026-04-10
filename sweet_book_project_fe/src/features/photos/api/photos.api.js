import { api } from '../../../lib/axios';

export const photosApi = {
  upload: (groupId, formData, onProgress) =>
    api.post(`/photos/groups/${groupId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  getPhotos: (groupId, params) =>
    api.get(`/photos/groups/${groupId}`, { params }),
  getChapters: (groupId) => api.get(`/photos/groups/${groupId}/chapters`),
  getPhoto: (photoId) => api.get(`/photos/${photoId}`),
  updatePhoto: (photoId, payload) => api.patch(`/photos/${photoId}`, payload),
  deletePhoto: (photoId) => api.delete(`/photos/${photoId}`),
};
