import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { fail } from "../utils/apiResponse.js";

async function authenticatedCustomer(req) {
  const token = req.cookies?.[env.customerAccessCookie];
  if (!token) return null;

  const payload = jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"], issuer: env.jwtIssuer, audience: "sna-customer",
  });
  if (payload.typ !== "customer") return null;
  const id = Number(payload.sub);
  const [[user]] = await pool.query(
    `SELECT id, first_name, last_name, email, phone, status, email_verified_at,
            session_version, referral_code
     FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id],
  );
  if (!user || user.status !== "active" || Number(payload.sv) !== Number(user.session_version)) {
    return null;
  }
  return user;
}

export async function requireCustomer(req, res, next) {
  try {
    req.user = await authenticatedCustomer(req);
    if (!req.user) return fail(res, 401, "Authentication required");
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error?.name)) {
      return fail(res, 401, "Session expired");
    }
    next(error);
  }
}

export async function optionalCustomer(req, _res, next) {
  try {
    req.user = await authenticatedCustomer(req);
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error?.name)) {
      req.user = null;
      return next();
    }
    next(error);
  }
}
