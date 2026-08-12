import { API_BASE_URL } from "@config/env";

const publicApiBase = API_BASE_URL.replace(/\/api\/v1$/, "");

export function assetUrl(value, fallback = "") {
  if (!value) return fallback;
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("data:"))
    return value;
  if (value.startsWith("/uploads/")) return `${publicApiBase}${value}`;
  return value;
}

export function effectivePrice(product) {
  return Number(
    product?.effective_price ?? product?.sale_price ?? product?.price ?? 0,
  );
}
