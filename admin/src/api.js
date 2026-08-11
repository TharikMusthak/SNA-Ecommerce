const DEFAULT_API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://hinttechnologies.com/sna-api";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function resolveApiBase(configuredUrl) {
  const url = new URL(configuredUrl, window.location.origin);

  if (
    import.meta.env.DEV
    && LOOPBACK_HOSTS.has(url.hostname)
    && LOOPBACK_HOSTS.has(window.location.hostname)
  ) {
    url.hostname = window.location.hostname;
  }

  return url.toString().replace(/\/$/, "");
}

const BASE = resolveApiBase(import.meta.env.VITE_API_URL || DEFAULT_API_URL);

export const assetUrl = (path) =>
  /^https?:\/\//i.test(path || "") ? path : `${BASE}${path || ""}`;

let refreshPromise = null;

export async function api(path, options = {}) {
  return request(path, options, true);
}

async function request(path, options, canRefresh) {
  const isForm = options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  const controller = options.signal ? null : new AbortController();
  const timeout = controller
    ? window.setTimeout(() => controller.abort(), 20_000)
    : null;
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      credentials: "include",
      headers: {
        ...(hasBody && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Request timed out. Please try again.", { cause: error });
    throw new Error("Unable to reach the SNA server. Check your connection and API URL.", { cause: error });
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }

  if (
    res.status === 401 &&
    canRefresh &&
    ![
      "/auth/login",
      "/auth/logout",
      "/auth/refresh-token",
      "/auth/forgot-password",
      "/auth/reset-password",
    ].includes(path)
  ) {
    const refreshed = await refreshSession();
    if (refreshed) return request(path, options, false);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== "/auth/login") {
    window.dispatchEvent(new Event("sna:unauthorized"));
  }

  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function refreshSession() {
  refreshPromise ||= fetch(`${BASE}/api/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
