const configuredApiUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_BASE_URL = (
  configuredApiUrl ||
  "https://sna-ecommerce-api.vercel.app/api/v1"
).replace(/\/$/, "");

export const API_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS || 30000,
);

export const MEDIA_BASE_URL = String(
  import.meta.env.VITE_MEDIA_URL ||
    "https://p0xgamfc5xxx22ep.public.blob.vercel-storage.com",
).replace(/\/+$/, "");
