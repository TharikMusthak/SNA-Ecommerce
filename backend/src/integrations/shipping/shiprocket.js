import { env } from "../../config/env.js";

const API = "https://apiv2.shiprocket.in/v1/external";
let cachedToken = "";
let tokenExpiresAt = 0;

async function token() {
  if (env.shiprocket.token) return env.shiprocket.token;
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  if (!env.shiprocket.email || !env.shiprocket.password) {
    throw Object.assign(new Error("Shiprocket credentials are not configured"), { status: 503 });
  }
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.shiprocket.email, password: env.shiprocket.password }),
    signal: AbortSignal.timeout(env.shiprocket.timeoutMs),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) {
    throw Object.assign(new Error(body.message || "Shiprocket authentication failed"), { status: 502 });
  }
  cachedToken = body.token;
  tokenExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

export async function getShiprocketRates(params, retry = true) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${API}/courier/serviceability/?${query}`, {
    headers: { Authorization: `Bearer ${await token()}` },
    signal: AbortSignal.timeout(env.shiprocket.timeoutMs),
  });
  if (response.status === 401 && retry && !env.shiprocket.token) {
    cachedToken = "";
    tokenExpiresAt = 0;
    return getShiprocketRates(params, false);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body.message || "Shiprocket rate request failed"), { status: 502 });
  }
  return body?.data?.available_courier_companies || [];
}
