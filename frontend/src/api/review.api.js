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

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (key === "photos" || key === "videos") {
      appendReviewField(formData, key, value);
      return;
    }

    if (key === "media") {
      if (value?.photos) appendReviewField(formData, "photos", value.photos);
      if (value?.videos) appendReviewField(formData, "videos", value.videos);
      return;
    }

    appendReviewField(formData, key, value);
  });

  return formData;
};

export const getProductReviews = (productId, params = {}) =>
  api.get(`${ENDPOINTS.reviews}/product/${productId}`, { params });
export const createReview = (payload) =>
  api.post(ENDPOINTS.reviews, toReviewFormData(payload), {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateReview = (reviewId, payload) =>
  api.put(`${ENDPOINTS.reviews}/${reviewId}`, toReviewFormData(payload), {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const markReviewHelpful = (reviewId) =>
  api.post(`${ENDPOINTS.reviews}/${reviewId}/helpful`);
