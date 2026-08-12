import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const updateProfileRequest = (payload) =>
  api.put(`${ENDPOINTS.users}/profile`, payload);
export const changePasswordRequest = (payload) =>
  api.put(`${ENDPOINTS.users}/change-password`, payload);
