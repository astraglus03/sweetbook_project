import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../api/books.api';

export function useBookSpecs() {
  return useQuery({
    queryKey: ['books', 'specs'],
    queryFn: async () => {
      const res = await booksApi.getSpecs();
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useThemes(bookSpecUid) {
  return useQuery({
    queryKey: ['books', 'themes', bookSpecUid],
    queryFn: async () => {
      const res = await booksApi.getThemes(bookSpecUid);
      return res.data;
    },
    enabled: !!bookSpecUid,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTemplates(bookSpecUid) {
  return useQuery({
    queryKey: ['books', 'templates', bookSpecUid],
    queryFn: async () => {
      const res = await booksApi.getTemplates(bookSpecUid);
      return res.data;
    },
    enabled: !!bookSpecUid,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCoverTemplates(bookSpecUid) {
  return useQuery({
    queryKey: ['books', 'cover-templates', bookSpecUid],
    queryFn: async () => {
      const res = await booksApi.getCoverTemplates(bookSpecUid);
      return res.data;
    },
    enabled: !!bookSpecUid,
    staleTime: 10 * 60 * 1000,
  });
}

export function useGroupBooks(groupId) {
  return useQuery({
    queryKey: ['books', 'group', groupId],
    queryFn: async () => {
      const res = await booksApi.getGroupBooks(groupId);
      return res.data;
    },
    enabled: !!groupId,
    staleTime: 60 * 1000,
  });
}

export function useMyBooks() {
  return useQuery({
    queryKey: ['books', 'my'],
    queryFn: async () => {
      const res = await booksApi.getMyBooks();
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useBook(bookId) {
  return useQuery({
    queryKey: ['books', bookId],
    queryFn: async () => {
      const res = await booksApi.getBook(bookId);
      return res.data;
    },
    enabled: !!bookId,
  });
}

export function useBookPages(bookId) {
  return useQuery({
    queryKey: ['books', bookId, 'pages'],
    queryFn: async () => {
      const res = await booksApi.getPages(bookId);
      return res.data;
    },
    enabled: !!bookId,
  });
}

export function useCreateBook(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await booksApi.createBook(groupId, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'group', groupId] });
    },
  });
}

export function useDeleteBook(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId) => booksApi.deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['books', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'personal-book'] });
    },
  });
}

export function useAddPages(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pages) => booksApi.addPages(bookId, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'pages'] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}

export function useUpdatePage(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, ...payload }) => booksApi.updatePage(bookId, pageId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'pages'] });
    },
  });
}

export function useDeletePage(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId) => booksApi.deletePage(bookId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'pages'] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}

export function useFinalizeBook(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => booksApi.finalize(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}

export function useAvailableTemplates(bookId) {
  return useQuery({
    queryKey: ['books', bookId, 'availableTemplates'],
    queryFn: async () => {
      const res = await booksApi.getAvailableTemplates(bookId);
      return res.data;
    },
    enabled: !!bookId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTemplateLayout(bookId) {
  return useQuery({
    queryKey: ['books', bookId, 'templateLayout'],
    queryFn: async () => {
      const res = await booksApi.getTemplateLayout(bookId);
      return res.data;
    },
    enabled: !!bookId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useBookSpecInfo(bookId) {
  return useQuery({
    queryKey: ['books', bookId, 'specInfo'],
    queryFn: async () => {
      const res = await booksApi.getSpecInfo(bookId);
      return res.data;
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRetryBook(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => booksApi.retry(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'specInfo'] });
    },
  });
}

export function useToggleShare(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => booksApi.toggleShare(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}

export function useGetCover(bookId) {
  return useQuery({
    queryKey: ['books', bookId, 'cover'],
    queryFn: async () => {
      const res = await booksApi.getCover(bookId);
      return res.data;
    },
    enabled: !!bookId,
  });
}

export function useSetCover(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => booksApi.setCover(bookId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'cover'] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}
