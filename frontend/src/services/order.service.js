import { getOrder, getOrders, getOrderTracking } from "@api/order.api";

export const listOrders = async (params) => {
  const response = await getOrders(params);
  return {
    items: response.data.data || [],
    pagination: response.data.pagination || null,
  };
};
export const fetchOrder = async (orderId) =>
  (await getOrder(orderId)).data.data;
export const fetchOrderTracking = async (orderId) =>
  (await getOrderTracking(orderId)).data.data;
