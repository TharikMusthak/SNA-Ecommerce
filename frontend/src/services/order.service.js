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
export const fetchOrderTracking = async (orderId) => {
  const response = await getOrderTracking(orderId);
  const tracking = response.data?.data ?? response.data;
  if (!tracking || typeof tracking !== "object" || !tracking.order_number) {
    throw new Error("The tracking API returned an empty response");
  }
  return tracking;
};
