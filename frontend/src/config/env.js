const configuredApiUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_BASE_URL = (
  configuredApiUrl ||
  (import.meta.env.DEV
    ? "http://localhost:5000/api/v1"
    : "https://sna-ecommerce-api.vercel.app/api/v1")
).replace(/\/$/, "");

export const API_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS || 30000,
);