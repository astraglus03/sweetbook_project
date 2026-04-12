import { api } from '../../../lib/axios';

export const ordersApi = {
  getCredits: () => api.get('/orders/credits'),
  estimate: (bookId) => api.post(`/orders/books/${bookId}/estimate`),
  createOrderGroup: (bookId, groupId) =>
    api.post(`/orders/books/${bookId}/groups/${groupId}`),
  getOrderGroup: (orderGroupId) =>
    api.get(`/orders/groups/${orderGroupId}`),
  getOrderGroupByBook: (bookId) =>
    api.get(`/orders/books/${bookId}/group`),
  submitShipping: (orderGroupId, payload) =>
    api.put(`/orders/groups/${orderGroupId}/shipping`, payload),
  remindMembers: (orderGroupId) =>
    api.post(`/orders/groups/${orderGroupId}/remind`),
  confirmAndPlace: (orderGroupId) =>
    api.post(`/orders/groups/${orderGroupId}/confirm`),
  getMyOrders: () => api.get('/orders/my'),
  getOrderStatus: (orderId) => api.get(`/orders/${orderId}`),
  cancelOrder: (orderId, cancelReason) =>
    api.post(`/orders/${orderId}/cancel`, { cancelReason }),
  rejectOrder: (orderGroupId, rejectReason) =>
    api.post(`/orders/groups/${orderGroupId}/reject`, { rejectReason }),
  getGroupMembersStatus: (orderGroupId) =>
    api.get(`/orders/groups/${orderGroupId}/members-status`),
};
