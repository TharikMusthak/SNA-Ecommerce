import api from "./axios";
import { ENDPOINTS } from "./endpoints";

const isFileLike = (value) =>
  typeof File !== "undefined" && value instanceof File;

const appendReviewField = (formData, key, value) => {
  if (value == null || value === "") return;

  if (Array.isArray(value)) {
    value.forEach((item) => appendReviewField(formData, key, item));
    return;
  }

  if (isFileLike(value)) {
    formData.append(key, value);
    return;
  }

  formData.append(key, value);
};

const toReviewFormData = (payload) => {
  const formData = new FormData();

  if (payload instanceof FormData) {
    for (const [key, value] of payload.entries()) {
      const normalizedKey = key === "photos"
        ? "image"
        : key === "videos"
          ? "video"
          : key;

      // The API stores at most one image and one video per review.
      if ((normalizedKey === "image" || normalizedKey === "video")
        && formData.has(normalizedKey)) continue;
      appendReviewField(formData, normalizedKey, value);
    }
    return formData;
  }

  Object.entries(payload || {}).forEach(([key, value]) => {
    appendReviewField(formData, key, value);
  });

  return formData;
};

export const getProductReviews = (productId, params = {}) =>
  api.get(`${ENDPOINTS.reviews}/product/${productId}`, { params });
export const createReview = (payload) =>
  api.post(ENDPOINTS.reviews, toReviewFormData(payload));
export const updateReview = (reviewId, payload) =>
  api.put(`${ENDPOINTS.reviews}/${reviewId}`, toReviewFormData(payload));
export const markReviewHelpful = (reviewId) =>
  api.post(`${ENDPOINTS.reviews}/${reviewId}/helpful`);
