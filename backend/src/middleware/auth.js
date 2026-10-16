import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

export async function requireAdmin(req, res, next) {
  const token = req.cookies?.[env.sessionCookie];

  if (!token) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
    const adminId = Number(payload.sub);

    if (!Number.isSafeInteger(adminId) || adminId <= 0) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const [[admin]] = await pool.query(
      `SELECT id, name, email, role, status, session_version
       FROM admins
       WHERE id = ? AND status = 'Active'
       LIMIT 1`,
      [adminId],
    );

    if (!admin) {
      return res.status(401).json({
        message: "Account disabled or deleted",
      });
    }

    if (
      !Number.isSafeInteger(Number(payload.sv)) ||
      Number(payload.sv) !== Number(admin.session_version)
    ) {
      return res.status(401).json({
        message: "Session revoked. Please login again.",
      });
    }

    req.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    };
    next();
  } catch (error) {
    if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "TokenExpiredError" ||
      error?.name === "NotBeforeError"
    ) {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again." });
    }

    next(error);
  }
}

export function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== "Super Admin") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin?.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
}
