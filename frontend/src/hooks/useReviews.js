import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listProductReviews,
  saveReview,
  submitReview,
  voteReviewHelpful,
} from "@services/review.service";

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

export function useUpdateReview(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKey(productId) });
         queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useMarkReviewHelpful(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: voteReviewHelpful,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKey(productId) });
    },
  });
}
