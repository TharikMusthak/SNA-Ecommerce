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

  const query = useQuery({
    queryKey: QUERY_KEYS.wishlist,
    queryFn: fetchWishlist,
    enabled: isAuthenticated,
  });

  return {
    ...query,
    items: query.data || [],
    addItem: useMutation({ mutationFn: addToWishlist, onSuccess: refresh }),
    removeItem: useMutation({
      mutationFn: removeFromWishlist,
      onSuccess: refresh,
    }),
    moveItemToCart: useMutation({ mutationFn: moveToCart, onSuccess: refresh }),
  };
}
