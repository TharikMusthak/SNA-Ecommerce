import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getProductReviews = (productId, params = {}) =>
  api.get(`${ENDPOINTS.reviews}/product/${productId}`, { params });
export const createReview = (payload) => api.post(ENDPOINTS.reviews, payload);
export const updateReview = (reviewId, payload) =>
  api.put(`${ENDPOINTS.reviews}/${reviewId}`, payload);
export const markReviewHelpful = (reviewId) =>
  api.post(`${ENDPOINTS.reviews}/${reviewId}/helpful`);
