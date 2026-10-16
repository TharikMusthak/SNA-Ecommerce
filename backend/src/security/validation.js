export const ROLES = Object.freeze([
  "Super Admin",
  "Product Manager",
  "Order Manager",
]);

export const USER_STATUSES = Object.freeze(["Active", "Disabled"]);
export const MAX_PASSWORD_BYTES = 72;

export function cleanText(value, maxLength = 255) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function normalizeEmail(value) {
  return cleanText(value, 190).toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function validatePassword(value) {
  const password = String(value ?? "");
  const errors = [];

  if (password.length < 12) errors.push("at least 12 characters");
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    errors.push(`at most ${MAX_PASSWORD_BYTES} UTF-8 bytes`);
  }
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/\d/.test(password)) errors.push("one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("one special character");

  return {
    valid: errors.length === 0,
    message:
      errors.length === 0
        ? ""
        : `Password must contain ${errors.join(", ")}`,
  };
}

export function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function isAllowed(value, allowed) {
  return allowed.includes(value);
}
