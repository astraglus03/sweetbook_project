import { api } from '../../../lib/axios';

export const booksApi = {
  getSpecs: () => api.get('/books/specs'),
  getTemplates: (bookSpecUid) => api.get(`/books/specs/${bookSpecUid}/templates`),
  getThemes: (bookSpecUid) => api.get(`/books/specs/${bookSpecUid}/themes`),
  createBook: (groupId, payload) => api.post(`/books/groups/${groupId}`, payload),
  getGroupBooks: (groupId) => api.get(`/books/groups/${groupId}`),
  getMyBooks: () => api.get('/books/my'),
  getBook: (bookId) => api.get(`/books/${bookId}`),
  getPages: (bookId) => api.get(`/books/${bookId}/pages`),
  addPages: (bookId, pages) => api.post(`/books/${bookId}/pages`, { pages }),
  updatePage: (bookId, pageId, payload) => api.patch(`/books/${bookId}/pages/${pageId}`, payload),
  deletePage: (bookId, pageId) => api.delete(`/books/${bookId}/pages/${pageId}`),
  finalize: (bookId) => api.post(`/books/${bookId}/finalize`, null, { timeout: 120000 }),
  retry: (bookId) => api.post(`/books/${bookId}/retry`),
  getTemplateLayout: (bookId) => api.get(`/books/${bookId}/template-layout`),
  getAvailableTemplates: (bookId) => api.get(`/books/${bookId}/available-templates`),
  getSpecInfo: (bookId) => api.get(`/books/${bookId}/spec-info`),
  toggleShare: (bookId) => api.post(`/books/${bookId}/toggle-share`),
  getCover: (bookId) => api.get(`/books/${bookId}/cover`),
  setCover: (bookId, payload) => api.post(`/books/${bookId}/cover`, payload, {
    timeout: 30000,
  }),
};
