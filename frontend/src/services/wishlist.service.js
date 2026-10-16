import {
  addWishlistItem,
  getWishlist,
  moveWishlistItemToCart,
  removeWishlistItem,
} from "@api/wishlist.api";

export const fetchWishlist = async () => (await getWishlist()).data.data || [];
export const addToWishlist = async (productId) => addWishlistItem(productId);
export const removeFromWishlist = async (productId) =>
  removeWishlistItem(productId);
export const moveToCart = async (productId) =>
  moveWishlistItemToCart(productId);
