import axios from "axios";

import { API_BASE_URL, API_TIMEOUT_MS } from "@config/env";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

let refreshPromise = null;

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const path = String(request?.url || "");
    const isAuthRequest = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh-token",
      "/auth/forgot-password",
      "/auth/reset-password",
    ].some((endpoint) => path.endsWith(endpoint));

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    request._retry = true;
    refreshPromise ||= refreshClient
      .post("/auth/refresh-token")
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });

    if (await refreshPromise) return api(request);

    window.dispatchEvent(new Event("sna:unauthorized"));
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error, fallback = "Something went wrong") {
  const errors = error?.response?.data?.errors;
  const firstValidationMessage =
    errors && Object.values(errors).flat().find(Boolean);
  return (
    firstValidationMessage ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default api;
