const configuredApiUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_BASE_URL = (
  configuredApiUrl ||
  "https://sna-ecommerce.vercel.app/api/v1"
).replace(/\/$/, "");

export const API_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS || 30000,
);
