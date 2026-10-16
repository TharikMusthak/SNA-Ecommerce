import {
  addCartItem,
  applyCoupon,
  clearCart,
  getCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "@api/cart.api";

export const fetchCart = async () => (await getCart()).data.data;
export const addToCart = async (productId, quantity = 1, variantId = null) =>
  (
    await addCartItem({
      product_id: productId,
      quantity,
      ...(variantId ? { variant_id: variantId } : {}),
    })
  ).data.data;
export const changeCartQuantity = async (itemId, quantity) =>
  (await updateCartItem(itemId, quantity)).data.data;
export const deleteCartItem = async (itemId) => removeCartItem(itemId);
export const emptyCart = async () => clearCart();
export const setCartCoupon = async (code) =>
  (await applyCoupon(code)).data.data;
export const clearCartCoupon = async () => removeCoupon();
