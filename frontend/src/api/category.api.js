import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getCategories = (params = {}) =>
  api.get(`${ENDPOINTS.products}/categories`, { params });
