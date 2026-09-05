import {
  currentUserRequest,
  loginRequest,
  logoutRequest,
  refreshSessionRequest,
  registerRequest,
  verifyEmailRequest,
  resendVerificationRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
} from "@api/auth.api";

export const loginUser = async ({ login, email, password }) => {
  const response = await loginRequest({ login: login || email, password });
  return response.data.data;
};

export const registerUser = async (payload) => {
  const response = await registerRequest(payload);
  return response.data.data;
};

export const getProfile = async () => {
  const response = await currentUserRequest();
  return response.data.data;
};

export const logoutUser = async () => {
  await logoutRequest();
};

export const refreshToken = async () => {
  const response = await refreshSessionRequest();
  return response.data.data;
};

export const verifyEmail = async (token) => {
  const response = await verifyEmailRequest(token);
  return response.data;
};

export const resendVerificationEmail = async (email) => {
  const response = await resendVerificationRequest(email);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await forgotPasswordRequest(email);
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await resetPasswordRequest(payload);
  return response.data;
};

