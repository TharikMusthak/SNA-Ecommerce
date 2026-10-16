import { env } from "../config/env.js";

export function publicAssetUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/uploads/")) {
    return value;
  }

  if (env.publicMediaUrl) {
    return `${env.publicMediaUrl}${value.slice("/uploads".length)}`;
  }

  if (!env.publicApiUrl) return value;

  return `${env.publicApiUrl}${value}`;
}

export function publicAssetUrls(value) {
  if (typeof value === "string") return publicAssetUrl(value);
  if (Array.isArray(value)) return value.map(publicAssetUrls);
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, publicAssetUrls(entry)]),
  );
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
