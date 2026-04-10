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

export function useToggleShare(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => booksApi.toggleShare(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
  });
}
