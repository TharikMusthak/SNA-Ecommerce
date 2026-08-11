import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = String(process.env.JWT_SECRET || "").trim();
const frontendOrigins = String(
  process.env.FRONTEND_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173",
)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizeOrigin(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";

  try {
    return new URL(candidate).origin;
  } catch {
    return candidate.replace(/\/$/, "");
  }
}

function normalizeBasePath(value) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate === "/") return "";

  const normalized = `/${candidate.replace(/^\/+|\/+$/g, "")}`;
  if (normalized.includes("?") || normalized.includes("#")) {
    throw new Error(
      "APP_BASE_PATH must be a URL path without a query or fragment",
    );
  }

  return normalized;
}

function normalizePublicUrl(value) {
  const candidate = String(value || "")
    .trim()
    .replace(/\/+$/, "");
  if (!candidate) return "";

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("PUBLIC_API_URL must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash) {
    throw new Error(
      "PUBLIC_API_URL must be an HTTP(S) URL without a query or fragment",
    );
  }

  return url.toString().replace(/\/$/, "");
}

if (jwtSecret.length < 64) {
  throw new Error(
    "JWT_SECRET must be configured with at least 64 random characters",
  );
}

if (frontendOrigins.length === 0) {
  throw new Error("At least one FRONTEND_URL must be configured");
}

if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production");
}

const databasePort = Number(process.env.DB_PORT || 3306);
if (
  !Number.isSafeInteger(databasePort) ||
  databasePort < 1 ||
  databasePort > 65535
) {
  throw new Error("DB_PORT must be a valid TCP port");
}

const bcryptRounds = positiveInteger(process.env.BCRYPT_ROUNDS, 12);
if (bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error("BCRYPT_ROUNDS must be between 10 and 15");
}

const paymentProvider = String(
  process.env.PAYMENT_PROVIDER || "cod",
).toLowerCase();
if (!["cod", "razorpay"].includes(paymentProvider)) {
  throw new Error("PAYMENT_PROVIDER must be cod or razorpay");
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  jwtSecret,
  jwtIssuer: "sna-cms",
  jwtAudience: "sna-admin",
  sessionCookie:
    nodeEnv === "production" ? "__Host-sna_session" : "sna_session",
  refreshCookie:
    nodeEnv === "production" ? "__Host-sna_refresh" : "sna_refresh",
  accessMinutes: positiveInteger(process.env.ACCESS_TOKEN_MINUTES, 15),
  refreshDays: positiveInteger(process.env.REFRESH_TOKEN_DAYS, 7),
  resetMinutes: positiveInteger(process.env.RESET_TOKEN_MINUTES, 30),
  frontendOrigins,
  appBasePath: normalizeBasePath(
    process.env.APP_BASE_PATH || process.env.PASSENGER_BASE_URI,
  ),
  publicApiUrl: normalizePublicUrl(process.env.PUBLIC_API_URL),
  adminResetUrl:
    process.env.ADMIN_RESET_URL ||
    `${frontendOrigins[0]}/sna/admin/reset-password`,
  customerResetUrl:
    process.env.CUSTOMER_RESET_URL || `${frontendOrigins[0]}/reset-password`,
  customerVerifyUrl:
    process.env.CUSTOMER_VERIFY_URL || `${frontendOrigins[0]}/verify-email`,
  trustProxy: process.env.TRUST_PROXY || "",
  smtp: Object.freeze({
    enabled: booleanValue(process.env.SMTP_ENABLED),
    host: String(process.env.SMTP_HOST || "").trim(),
    port: positiveInteger(process.env.SMTP_PORT, 465),
    secure: booleanValue(process.env.SMTP_SECURE, true),
    user: String(process.env.SMTP_USER || "").trim(),
    pass: String(process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ""),
    fromName: String(process.env.SMTP_FROM_NAME || "SNA").trim(),
    from: String(
      process.env.SMTP_FROM_EMAIL || process.env.MAIL_FROM || "",
    ).trim(),
    timeoutMs: positiveInteger(process.env.SMTP_REQUEST_TIMEOUT_MS, 10_000),
  }),
  customerAccessCookie:
    nodeEnv === "production" ? "__Host-sna_customer" : "sna_customer",
  customerRefreshCookie:
    nodeEnv === "production"
      ? "__Host-sna_customer_refresh"
      : "sna_customer_refresh",
  bcryptRounds,
  emailVerificationRequired:
    String(process.env.EMAIL_VERIFICATION_REQUIRED || "false") === "true",
  paymentProvider,
  onlinePaymentsEnabled: booleanValue(process.env.ONLINE_PAYMENTS_ENABLED),
  orderExpiry: Object.freeze({
    minutes: positiveInteger(process.env.ORDER_RESERVATION_EXPIRY_MINUTES, 30),
    workerEnabled: booleanValue(process.env.ORDER_EXPIRY_WORKER_ENABLED, true),
    intervalMinutes: positiveInteger(
      process.env.ORDER_EXPIRY_WORKER_INTERVAL_MINUTES,
      5,
    ),
  }),
  apiDocsEnabled: booleanValue(
    process.env.API_DOCS_ENABLED,
    nodeEnv !== "production",
  ),
  wati: Object.freeze({
    enabled: booleanValue(process.env.WATI_ENABLED),
    apiBaseUrl: String(process.env.WATI_API_BASE_URL || "")
      .trim()
      .replace(/\/$/, ""),
    tenantId: String(process.env.WATI_TENANT_ID || "").trim(),
    accessToken: String(process.env.WATI_ACCESS_TOKEN || ""),
    webhookSecret: String(process.env.WATI_WEBHOOK_SECRET || ""),
    defaultCountryCode: String(
      process.env.WATI_DEFAULT_COUNTRY_CODE || "91",
    ).replace(/\D/g, ""),
    timeoutMs: positiveInteger(process.env.WATI_REQUEST_TIMEOUT_MS, 10_000),
    maxRetries: positiveInteger(process.env.WATI_MAX_RETRIES, 3),
  }),
  razorpay: Object.freeze({
    keyId: String(process.env.RAZORPAY_KEY_ID || ""),
    keySecret: String(process.env.RAZORPAY_KEY_SECRET || ""),
    webhookSecret: String(process.env.RAZORPAY_WEBHOOK_SECRET || ""),
  }),
});

if (
  env.smtp.enabled &&
  (!env.smtp.host || !env.smtp.user || !env.smtp.pass || !env.smtp.from)
) {
  throw new Error(
    "SMTP_ENABLED requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL",
  );
}

if (env.emailVerificationRequired && !env.smtp.enabled) {
  throw new Error("EMAIL_VERIFICATION_REQUIRED requires SMTP_ENABLED=true");
}

if (env.wati.enabled && (!env.wati.apiBaseUrl || !env.wati.accessToken)) {
  throw new Error(
    "WATI_ENABLED requires WATI_API_BASE_URL and WATI_ACCESS_TOKEN",
  );
}

export function isTrustedFrontendOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (env.frontendOrigins.includes(normalized)) return true;
  if (env.isProduction) return false;

  try {
    const incoming = new URL(normalized);
    if (!loopbackHosts.has(incoming.hostname)) return false;

    return env.frontendOrigins.some((configuredOrigin) => {
      const configured = new URL(configuredOrigin);
      return (
        loopbackHosts.has(configured.hostname) &&
        configured.protocol === incoming.protocol &&
        configured.port === incoming.port
      );
    });
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
    priority: "high",
    maxAge: env.accessMinutes * 60 * 1000,
  };
}

export function clearSessionCookieOptions() {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  return options;
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
    priority: "high",
    maxAge: env.refreshDays * 24 * 60 * 60 * 1000,
  };
}

export function clearRefreshCookieOptions() {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  return options;
}

export function customerAccessCookieOptions() {
  return { ...sessionCookieOptions(), path: "/" };
}

export function customerRefreshCookieOptions() {
  // __Host- cookies are rejected by browsers unless Path is exactly "/".
  return { ...refreshCookieOptions(), path: "/" };
}
