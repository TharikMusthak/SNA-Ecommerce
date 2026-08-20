import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EMPTY_CART, QUERY_KEYS } from "@config/constants";
import { useAuth } from "@context/AuthProvider";
import {
  addToCart,
  changeCartQuantity,
  deleteCartItem,
  emptyCart,
  fetchCart,
  clearCartCoupon,
  setCartCoupon,
} from "@services/cart.service";

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart });

  const getCartData = () => queryClient.getQueryData(QUERY_KEYS.cart) || EMPTY_CART;
  const setCartData = (updater) => {
    queryClient.setQueryData(QUERY_KEYS.cart, (current = EMPTY_CART) =>
      updater(current),
    );
  };

  const recalculateSummary = (cart) => {
    const subtotal = cart.items.reduce(
      (total, item) => total + Number(item.line_total || Number(item.unit_price || 0) * Number(item.quantity || 0)),
      0,
    );
    const discount = Number(cart.summary?.discount || 0);
    const shipping = Number(cart.summary?.shipping || 0);
    const tax = Number(cart.summary?.tax || 0);
    return {
      ...cart,
      summary: {
        ...(cart.summary || EMPTY_CART.summary),
        subtotal,
        total: subtotal + tax + shipping - discount,
      },
    };
  };

  const clearCouponFromCart = (cart) => ({
    ...cart,
    summary: {
      ...(cart.summary || EMPTY_CART.summary),
      discount: 0,
      total:
        Number(cart.summary?.subtotal || 0) +
        Number(cart.summary?.tax || 0) +
        Number(cart.summary?.shipping || 0),
    },
  });

  const query = useQuery({
    queryKey: QUERY_KEYS.cart,
    queryFn: fetchCart,
    enabled: isAuthenticated,
    initialData: getCartData(),
    placeholderData: (previousData) => previousData ?? getCartData(),
  });

  return {
    ...query,
    cart: query.data || EMPTY_CART,
    addItem: useMutation({
      mutationFn: ({ productId, quantity, variantId }) =>
        addToCart(productId, quantity, variantId),
      onMutate: async ({ productId, quantity, variantId }) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart });
        const previousCart = getCartData();
        setCartData((current) =>
          recalculateSummary({
            ...current,
            items: [
              ...current.items,
              {
                id: `optimistic-${productId}-${variantId || "default"}`,
                product_id: productId,
                quantity,
                unit_price: 0,
                line_total: 0,
                __optimisticCartItem: true,
              },
            ],
          }),
        );
        return { previousCart };
      },
      onError: (_error, _vars, context) => {
        if (context?.previousCart) {
          queryClient.setQueryData(QUERY_KEYS.cart, context.previousCart);
        }
      },
      onSettled: refresh,
    }),
    updateItem: useMutation({
      mutationFn: ({ itemId, quantity }) =>
        changeCartQuantity(itemId, quantity),
      onMutate: async ({ itemId, quantity }) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart });
        const previousCart = getCartData();
        setCartData((current) => {
          const items = current.items.map((item) => {
            if (Number(item.id) !== Number(itemId)) return item;
            const unitPrice = Number(item.unit_price || 0);
            return {
              ...item,
              quantity,
              line_total: unitPrice * quantity,
            };
          });
          return recalculateSummary({ ...current, items });
        });
        return { previousCart };
      },
      onError: (_error, _vars, context) => {
        if (context?.previousCart) {
          queryClient.setQueryData(QUERY_KEYS.cart, context.previousCart);
        }
      },
      onSettled: refresh,
    }),
    removeItem: useMutation({
      mutationFn: deleteCartItem,
      onMutate: async (itemId) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart });
        const previousCart = getCartData();
        setCartData((current) =>
          recalculateSummary({
            ...current,
            items: current.items.filter(
              (item) => Number(item.id) !== Number(itemId),
            ),
          }),
        );
        return { previousCart };
      },
      onError: (_error, _itemId, context) => {
        if (context?.previousCart) {
          queryClient.setQueryData(QUERY_KEYS.cart, context.previousCart);
        }
      },
      onSettled: refresh,
    }),
    clear: useMutation({
      mutationFn: emptyCart,
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart });
        const previousCart = getCartData();
        queryClient.setQueryData(QUERY_KEYS.cart, EMPTY_CART);
        return { previousCart };
      },
      onError: (_error, _vars, context) => {
        if (context?.previousCart) {
          queryClient.setQueryData(QUERY_KEYS.cart, context.previousCart);
        }
      },
      onSettled: refresh,
    }),
    applyCoupon: useMutation({
      mutationFn: setCartCoupon,
      onSuccess: refresh,
    }),
    removeCoupon: useMutation({
      mutationFn: clearCartCoupon,
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart });
        const previousCart = getCartData();
        setCartData((current) => clearCouponFromCart(current));
        return { previousCart };
      },
      onError: (_error, _vars, context) => {
        if (context?.previousCart) {
          queryClient.setQueryData(QUERY_KEYS.cart, context.previousCart);
        }
      },
      onSettled: refresh,
    }),
  };
}
