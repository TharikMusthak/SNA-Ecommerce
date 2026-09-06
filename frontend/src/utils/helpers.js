import { API_BASE_URL } from "@config/env";
import { getPricingDisplay } from "@utils/pricing";

export { getPricingDisplay, getVariantPricingDisplay } from "@utils/pricing";

const publicApiBase = String(API_BASE_URL || "").replace(/\/api\/v1$/, "");

export function assetUrl(value, fallback = "") {
  if (!value) return fallback;
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("data:"))
    return value;
  if (value.startsWith("/uploads/")) return `${publicApiBase}${value}`;
  return value;
}

export function effectivePrice(product) {
  return getPricingDisplay(product).currentPrice;
}
