import api from "./axios";
import { ENDPOINTS } from "./endpoints";

const CART = ENDPOINTS.cart;

export const getCart = () => api.get(CART);
export const addCartItem = (payload) => api.post(`${CART}/add`, payload);
export const updateCartItem = (itemId, quantity) =>
  api.put(`${CART}/update`, { item_id: itemId, quantity });
export const removeCartItem = (itemId) =>
  api.delete(`${CART}/remove`, { data: { item_id: itemId } });
export const clearCart = () => api.delete(`${CART}/clear`);
export const applyCoupon = (code) => api.post(`${CART}/apply-coupon`, { code });
export const removeCoupon = () => api.delete(`${CART}/remove-coupon`);
