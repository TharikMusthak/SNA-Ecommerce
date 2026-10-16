import api from "./axios";
import { ENDPOINTS } from "./endpoints";

const AUTH = ENDPOINTS.auth;

export const loginRequest = (credentials) =>
  api.post(`${AUTH}/login`, credentials);
export const registerRequest = (payload) =>
  api.post(`${AUTH}/register`, payload);
export const currentUserRequest = () => api.get(`${AUTH}/me`);
export const logoutRequest = () => api.post(`${AUTH}/logout`);
export const refreshSessionRequest = () => api.post(`${AUTH}/refresh-token`);
export const verifyEmailRequest = (token) =>
  api.post(`${AUTH}/verify-email`, { token });
export const resendVerificationRequest = (email) =>
  api.post(`${AUTH}/resend-verification`, { email });
export const forgotPasswordRequest = (email) =>
  api.post(`${AUTH}/forgot-password`, { email });
export const resetPasswordRequest = (payload) =>
  api.post(`${AUTH}/reset-password`, payload);
export const sendOtpRequest = (payload) =>
  api.post(`${AUTH}/send-otp`, payload);
export const verifyOtpRequest = (payload) =>
  api.post(`${AUTH}/verify-otp`, payload);
