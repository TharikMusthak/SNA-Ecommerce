import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getBanners = (params = {}) =>
  api.get(ENDPOINTS.banners, { params });
