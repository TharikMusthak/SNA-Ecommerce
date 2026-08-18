import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getOrders = (params = {}) => api.get(ENDPOINTS.orders, { params });
export const getOrder = (orderId) => api.get(`${ENDPOINTS.orders}/${orderId}`);
export const createOrder = (payload, idempotencyKey) =>
  api.post(`${ENDPOINTS.orders}/create`, payload, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
export const createRazorpayCheckout = (paymentId) =>
  api.post(`${ENDPOINTS.payments}/create-order`, { payment_id: paymentId });
export const cancelOrder = (orderId, reason) =>
  api.post(`${ENDPOINTS.orders}/${orderId}/cancel`, { reason });
export const reorder = (orderId) =>
  api.post(`${ENDPOINTS.orders}/${orderId}/reorder`);
