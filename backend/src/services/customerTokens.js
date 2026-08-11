import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const hashToken = (value) =>
  createHash("sha256").update(String(value)).digest("hex");

export function createCustomerAccessToken(user) {
  return jwt.sign({ sv: Number(user.session_version), typ: "customer" }, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: `${env.accessMinutes}m`,
    issuer: env.jwtIssuer,
    audience: "sna-customer",
    subject: String(user.id),
  });
}

export async function createCustomerRefreshToken(queryable, userId, sessionVersion, metadata = {}) {
  const token = randomBytes(48).toString("base64url");
  await queryable.query(
    `INSERT INTO user_refresh_tokens
      (user_id, token_hash, session_version, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY), ?, ?)`,
    [userId, hashToken(token), sessionVersion, env.refreshDays, metadata.ip || null, String(metadata.userAgent || "").slice(0, 500) || null],
  );
  return token;
}
