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

export function getRelativeTime(dateValue) {
  if (!dateValue) return "Recently";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) {
    return "1 min ago";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "min" : "mins"} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
}


export function formatAmazonReviewDate(dateValue, locationValue = "") {
  const country = locationValue || "India";
  if (!dateValue) return `Reviewed in ${country} recently`;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return `Reviewed in ${country} recently`;

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return `Reviewed in ${country} on ${formattedDate}`;
}

