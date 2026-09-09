
import api from "./axios";
import { ENDPOINTS } from "./endpoints";
import { upload } from "@vercel/blob/client";
import { API_BASE_URL } from "@config/env";

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
export const createReview = async (payload) =>
  api.post(ENDPOINTS.reviews, await prepareReviewPayload(payload));
export const updateReview = async (reviewId, payload) =>
  api.put(`${ENDPOINTS.reviews}/${reviewId}`, await prepareReviewPayload(payload));
export const markReviewHelpful = (reviewId) =>
  api.post(`${ENDPOINTS.reviews}/${reviewId}/helpful`);
export const deleteReview = (reviewId) =>
  api.delete(`${ENDPOINTS.reviews}/${reviewId}`);

async function prepareReviewPayload(payload) {
  const formData = toReviewFormData(payload);
  const media = [
    ["image", "image_blob_url"],
    ["video", "video_blob_url"],
  ];
  const files = media.filter(([field]) => formData.get(field) instanceof File && formData.get(field).size > 0);
  if (!files.length) return formData;

  const { data } = await api.post(`${ENDPOINTS.reviews}/media-upload-token`);
  const authorization = `Bearer ${data.data.token}`;
  for (const [field, urlField] of files) {
    const file = formData.get(field);
    const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || field;
    const blob = await upload(`reviews/${Date.now()}-${safeName}`, file, {
      access: "public",
      contentType: file.type,
      handleUploadUrl: `${API_BASE_URL}/webhooks/blob-review-media`,
      headers: { Authorization: authorization },
      multipart: file.size > 4 * 1024 * 1024,
    });
    formData.delete(field);
    formData.set(urlField, blob.url);
  }
  return formData;
}
