import { env, isTrustedFrontendOrigin } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (/^\/api\/v1\/(?:(?:payments|shipping)\/webhook\/|webhooks\/(?:wati|tracking))/.test(req.originalUrl)) {
    return next();
  }

  const origin = req.get("origin");

  if (!origin && !env.isProduction) return next();

  if (!origin || !isTrustedFrontendOrigin(origin)) {
    return res.status(403).json({ message: "Untrusted request origin" });
  }

  next();
}
