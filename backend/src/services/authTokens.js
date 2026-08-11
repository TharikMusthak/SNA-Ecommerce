import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createAccessToken(admin) {
  return jwt.sign(
    { sv: Number(admin.session_version) },
    env.jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: `${env.accessMinutes}m`,
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      subject: String(admin.id),
    },
  );
}

export function createOpaqueToken() {
  return randomBytes(48).toString("base64url");
}

export function hashOpaqueToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export async function storeRefreshToken(
  queryable,
  adminId,
  sessionVersion,
) {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);

  await queryable.query(
    `INSERT INTO admin_refresh_tokens
      (admin_id, token_hash, session_version, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [adminId, tokenHash, sessionVersion, env.refreshDays],
  );

  return token;
}
