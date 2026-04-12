import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';

export function useCredits() {
  return useQuery({
    queryKey: ['orders', 'credits'],
    queryFn: async () => {
      const res = await ordersApi.getCredits();
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useEstimate(bookId) {
  return useQuery({
    queryKey: ['orders', 'estimate', bookId],
    queryFn: async () => {
      const res = await ordersApi.estimate(bookId);
      return res.data;
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrderGroupByBook(bookId) {
  return useQuery({
    queryKey: ['orders', 'book', bookId],
    queryFn: async () => {
      const res = await ordersApi.getOrderGroupByBook(bookId);
      return res.data;
    },
    enabled: !!bookId,
    retry: false,
  });
}

export function useCreateOrderGroup(bookId, groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await ordersApi.createOrderGroup(bookId, groupId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'book', bookId] });
    },
  });
}

export function useSubmitShipping(orderGroupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await ordersApi.submitShipping(orderGroupId, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRemindMembers(orderGroupId) {
  return useMutation({
    mutationFn: async () => {
      const res = await ordersApi.remindMembers(orderGroupId);
      return res.data;
    },
  });
}

export function useConfirmAndPlace(orderGroupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await ordersApi.confirmAndPlace(orderGroupId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: async () => {
      const res = await ordersApi.getMyOrders();
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, cancelReason }) => {
      const res = await ordersApi.cancelOrder(orderId, cancelReason);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRejectOrder(orderGroupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rejectReason }) => {
      const res = await ordersApi.rejectOrder(orderGroupId, rejectReason);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useGroupMembersStatus(orderGroupId) {
  return useQuery({
    queryKey: ['orders', 'groups', orderGroupId, 'membersStatus'],
    queryFn: async () => {
      const res = await ordersApi.getGroupMembersStatus(orderGroupId);
      return res.data;
    },
    enabled: !!orderGroupId,
  });
}
