import {
  createReview,
  getProductReviews,
  markReviewHelpful,
} from "@api/review.api";

export const listProductReviews = async (productId, params) => {
  const response = await getProductReviews(productId, params);
  return {
    items: response.data.data || [],
    pagination: response.data.pagination || null,
  };
};
export const submitReview = async (payload) =>
  (await createReview(payload)).data.data;
export const voteReviewHelpful = async (reviewId) =>
  markReviewHelpful(reviewId);
