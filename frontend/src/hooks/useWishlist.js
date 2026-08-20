import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@config/constants";
import { useAuth } from "@context/AuthProvider";
import {
  addToWishlist,
  fetchWishlist,
  moveToCart,
  removeFromWishlist,
} from "@services/wishlist.service";

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wishlist });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart });
  };

  const getWishlistItems = () =>
    queryClient.getQueryData(QUERY_KEYS.wishlist) || [];

  const setWishlistItems = (updater) => {
    queryClient.setQueryData(QUERY_KEYS.wishlist, (current = []) =>
      updater(current),
    );
  };

  const query = useQuery({
    queryKey: QUERY_KEYS.wishlist,
    queryFn: fetchWishlist,
    enabled: isAuthenticated,
  });

  return {
    ...query,
    items: query.data || [],
    addItem: useMutation({
      mutationFn: addToWishlist,
      onMutate: async (productId) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.wishlist });
        const previousItems = getWishlistItems();
        const exists = previousItems.some(
          (item) => Number(item.id) === Number(productId),
        );

        if (!exists) {
          setWishlistItems((current) => [
            ...current,
            { id: productId, __optimisticWishlistItem: true },
          ]);
        }

        return { previousItems };
      },
      onError: (_error, _productId, context) => {
        if (context?.previousItems) {
          queryClient.setQueryData(QUERY_KEYS.wishlist, context.previousItems);
        }
      },
      onSettled: refresh,
    }),
    removeItem: useMutation({
      mutationFn: removeFromWishlist,
      onMutate: async (productId) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.wishlist });
        const previousItems = getWishlistItems();
        setWishlistItems((current) =>
          current.filter((item) => Number(item.id) !== Number(productId)),
        );

        return { previousItems };
      },
      onError: (_error, _productId, context) => {
        if (context?.previousItems) {
          queryClient.setQueryData(QUERY_KEYS.wishlist, context.previousItems);
        }
      },
      onSettled: refresh,
    }),
    moveItemToCart: useMutation({
      mutationFn: moveToCart,
      onMutate: async (productId) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEYS.wishlist });
        const previousItems = getWishlistItems();
        setWishlistItems((current) =>
          current.filter((item) => Number(item.id) !== Number(productId)),
        );

        return { previousItems };
      },
      onError: (_error, _productId, context) => {
        if (context?.previousItems) {
          queryClient.setQueryData(QUERY_KEYS.wishlist, context.previousItems);
        }
      },
      onSettled: refresh,
    }),
  };
}
