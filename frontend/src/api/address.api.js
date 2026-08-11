import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getAddresses = () => api.get(ENDPOINTS.addresses);
export const createAddress = (payload) =>
  api.post(ENDPOINTS.addresses, payload);
export const updateAddress = (addressId, payload) =>
  api.put(`${ENDPOINTS.addresses}/${addressId}`, payload);
export const setDefaultAddress = (addressId) =>
  api.put(`${ENDPOINTS.addresses}/${addressId}/default`);
export const deleteAddress = (addressId) =>
  api.delete(`${ENDPOINTS.addresses}/${addressId}`);
