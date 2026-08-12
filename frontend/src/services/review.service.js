import {
  createReview,
  getProductReviews,
  markReviewHelpful,
} from "@api/review.api";

export const listProductReviews = async (productId, params) => {
  const response = await getProductReviews(productId, params);
  const payload = response.data?.data ?? response.data ?? {};
  const items = Array.isArray(payload)
    ? payload
    : payload.items ?? payload.reviews ?? [];

  return {
    items: Array.isArray(items) ? items : [],
    pagination:
      payload.pagination ?? payload.meta ?? response.data?.pagination ?? null,
  };
};
export const submitReview = async (payload) =>
  (await createReview(payload)).data.data;

export const voteReviewHelpful = async (reviewId) =>
  markReviewHelpful(reviewId);
