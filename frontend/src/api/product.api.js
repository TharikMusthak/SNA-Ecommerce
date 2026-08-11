import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getProducts = (params = {}) =>
  api.get(ENDPOINTS.products, { params });
export const getFeaturedProducts = (params = {}) =>
  api.get(`${ENDPOINTS.products}/featured`, { params });
export const getNewArrivals = (params = {}) =>
  api.get(`${ENDPOINTS.products}/new-arrivals`, { params });
export const getProduct = (identifier) => {
  const value = String(identifier);
  const path = /^\d+$/.test(value)
    ? `${ENDPOINTS.products}/${value}`
    : `${ENDPOINTS.products}/slug/${encodeURIComponent(value)}`;
  return api.get(path);
};
export const getRelatedProducts = (productId) =>
  api.get(`${ENDPOINTS.products}/${productId}/related`);
