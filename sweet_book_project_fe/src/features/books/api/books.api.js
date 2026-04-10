import { api } from '../../../lib/axios';

export const booksApi = {
  getSpecs: () => api.get('/books/specs'),
  getTemplates: (bookSpecUid) => api.get(`/books/specs/${bookSpecUid}/templates`),
  createBook: (groupId, payload) => api.post(`/books/groups/${groupId}`, payload),
  getGroupBooks: (groupId) => api.get(`/books/groups/${groupId}`),
  getBook: (bookId) => api.get(`/books/${bookId}`),
  getPages: (bookId) => api.get(`/books/${bookId}/pages`),
  addPages: (bookId, pages) => api.post(`/books/${bookId}/pages`, { pages }),
  updatePage: (bookId, pageId, payload) => api.patch(`/books/${bookId}/pages/${pageId}`, payload),
  deletePage: (bookId, pageId) => api.delete(`/books/${bookId}/pages/${pageId}`),
  finalize: (bookId) => api.post(`/books/${bookId}/finalize`),
  toggleShare: (bookId) => api.post(`/books/${bookId}/toggle-share`),
};
