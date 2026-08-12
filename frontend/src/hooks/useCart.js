import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EMPTY_CART, QUERY_KEYS } from "@config/constants";
import { useAuth } from "@context/AuthProvider";
import {
  addToCart,
  changeCartQuantity,
  deleteCartItem,
  emptyCart,
  fetchCart,
  setCartCoupon,
} from "@services/cart.service";

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart });

  const query = useQuery({
    queryKey: QUERY_KEYS.cart,
    queryFn: fetchCart,
    enabled: isAuthenticated,
  });

  return {
    ...query,
    cart: query.data || EMPTY_CART,
    addItem: useMutation({
      mutationFn: ({ productId, quantity, variantId }) =>
        addToCart(productId, quantity, variantId),
      onSuccess: refresh,
    }),
    updateItem: useMutation({
      mutationFn: ({ itemId, quantity }) =>
        changeCartQuantity(itemId, quantity),
      onSuccess: refresh,
    }),
    removeItem: useMutation({
      mutationFn: deleteCartItem,
      onSuccess: refresh,
    }),
    clear: useMutation({ mutationFn: emptyCart, onSuccess: refresh }),
    applyCoupon: useMutation({ mutationFn: setCartCoupon, onSuccess: refresh }),
  };
}
