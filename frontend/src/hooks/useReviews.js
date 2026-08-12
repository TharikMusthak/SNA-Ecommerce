import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listProductReviews, submitReview } from "@services/review.service";

const reviewKey = (productId) => ["reviews", "product", productId];

export function useProductReviews(productId) {
  return useQuery({
    queryKey: reviewKey(productId),
    queryFn: () => listProductReviews(productId, { limit: 20 }),
    enabled: Boolean(productId),
  });
}

export function useSubmitReview(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKey(productId) });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
