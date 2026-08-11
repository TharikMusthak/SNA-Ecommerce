import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { fail } from "../utils/apiResponse.js";

export async function requireCustomer(req, res, next) {
  const token = req.cookies?.[env.customerAccessCookie];
  if (!token) return fail(res, 401, "Authentication required");

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"], issuer: env.jwtIssuer, audience: "sna-customer",
    });
    if (payload.typ !== "customer") return fail(res, 401, "Invalid session");
    const id = Number(payload.sub);
    const [[user]] = await pool.query(
      `SELECT id, first_name, last_name, email, phone, status, email_verified_at,
              session_version, referral_code
       FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id],
    );
    if (!user || user.status !== "active" || Number(payload.sv) !== Number(user.session_version)) {
      return fail(res, 401, "Session revoked or account unavailable");
    }
    req.user = user;
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error?.name)) {
      return fail(res, 401, "Session expired");
    }
    next(error);
  }
}
