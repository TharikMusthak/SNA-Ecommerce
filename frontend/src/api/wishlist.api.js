import api from "./axios";
import { ENDPOINTS } from "./endpoints";

const WISHLIST = ENDPOINTS.wishlist;

export const getWishlist = () => api.get(WISHLIST);
export const addWishlistItem = (productId) =>
  api.post(`${WISHLIST}/add`, { product_id: productId });
export const removeWishlistItem = (productId) =>
  api.delete(`${WISHLIST}/remove`, { data: { product_id: productId } });
export const moveWishlistItemToCart = (productId) =>
  api.post(`${WISHLIST}/${productId}/move-to-cart`);
