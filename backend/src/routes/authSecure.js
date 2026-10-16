import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { pool } from "../config/db.js";
import {
  clearRefreshCookieOptions,
  clearSessionCookieOptions,
  env,
  refreshCookieOptions,
  sessionCookieOptions,
} from "../config/env.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  isValidEmail,
  MAX_PASSWORD_BYTES,
  normalizeEmail,
  validatePassword,
} from "../security/validation.js";
import {
  createAccessToken,
  createOpaqueToken,
  hashOpaqueToken,
  storeRefreshToken,
} from "../services/authTokens.js";
import { sendPasswordResetEmail } from "../services/email.js";

const router = Router();
const DUMMY_PASSWORD_HASH =
  "$2b$12$7gSxJVTlvzECNzfNEcVvYe45EvRaK84YjZ5Ggt46f1D.puW2u4hW.";
const GENERIC_RESET_MESSAGE =
  "If that active admin account exists, a reset link has been sent.";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Try again after 15 minutes.",
  },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many password reset attempts. Try again later.",
  },
});

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/login", loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const passwordBytes = Buffer.byteLength(password, "utf8");

  if (
    !isValidEmail(email) ||
    passwordBytes === 0 ||
    passwordBytes > MAX_PASSWORD_BYTES
  ) {
    const dummyPassword = Buffer.from(password, "utf8")
      .subarray(0, MAX_PASSWORD_BYTES)
      .toString("utf8");
    await bcrypt.compare(dummyPassword, DUMMY_PASSWORD_HASH);
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, role, session_version
     FROM admins
     WHERE email = ? AND status = 'Active'
     LIMIT 1`,
    [email],
  );
  const admin = rows[0];
  const passwordMatches = await bcrypt.compare(
    password,
    admin?.password_hash || DUMMY_PASSWORD_HASH,
  );

  if (!admin || !passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const refreshToken = await storeRefreshToken(
    pool,
    admin.id,
    Number(admin.session_version),
  );
  setAuthCookies(res, admin, refreshToken);
  res.json({ admin: publicAdmin(admin) });
});

router.post("/refresh-token", async (req, res) => {
  const presentedToken = req.cookies?.[env.refreshCookie];
  if (!presentedToken) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Refresh token required" });
  }

  const tokenHash = hashOpaqueToken(presentedToken);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[record]] = await connection.query(
      `SELECT
         t.id AS refresh_id,
         t.session_version AS token_session_version,
         t.expires_at,
         t.revoked_at,
         a.id, a.name, a.email, a.role, a.status, a.session_version
       FROM admin_refresh_tokens t
       JOIN admins a ON a.id = t.admin_id
       WHERE t.token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );

    const invalid =
      !record ||
      record.revoked_at ||
      record.status !== "Active" ||
      new Date(record.expires_at).getTime() <= Date.now() ||
      Number(record.token_session_version) !==
        Number(record.session_version);

    if (invalid) {
      await connection.rollback();
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    await connection.query(
      "UPDATE admin_refresh_tokens SET revoked_at = NOW() WHERE id = ?",
      [record.refresh_id],
    );
    const nextRefreshToken = await storeRefreshToken(
      connection,
      record.id,
      Number(record.session_version),
    );
    await connection.commit();

    setAuthCookies(res, record, nextRefreshToken);
    res.json({ admin: publicAdmin(record) });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.[env.refreshCookie];

  if (refreshToken) {
    await pool.query(
      `UPDATE admin_refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE token_hash = ?`,
      [hashOpaqueToken(refreshToken)],
    );
  }

  clearAuthCookies(res);
  res.status(204).end();
});

router.post("/forgot-password", resetLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) {
    return res.json({ message: GENERIC_RESET_MESSAGE });
  }

  const [[admin]] = await pool.query(
    `SELECT id, name, email
     FROM admins
     WHERE email = ? AND status = 'Active'
     LIMIT 1`,
    [email],
  );

  if (!admin) {
    return res.json({ message: GENERIC_RESET_MESSAGE });
  }

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE password_reset_tokens
       SET used_at = COALESCE(used_at, NOW())
       WHERE admin_id = ? AND used_at IS NULL`,
      [admin.id],
    );
    await connection.query(
      `INSERT INTO password_reset_tokens
        (admin_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [admin.id, tokenHash, env.resetMinutes],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await sendPasswordResetEmail({
      email: admin.email,
      name: admin.name,
      token,
    });
  } catch (error) {
    console.error("Password reset email failed:", error.message);
  }

  res.json({ message: GENERIC_RESET_MESSAGE });
});

router.post("/reset-password", resetLimiter, async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  const passwordCheck = validatePassword(password);

  if (!token || !passwordCheck.valid) {
    return res.status(400).json({
      message: passwordCheck.valid
        ? "Reset token is required"
        : passwordCheck.message,
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[reset]] = await connection.query(
      `SELECT id, admin_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [hashOpaqueToken(token)],
    );

    if (
      !reset ||
      reset.used_at ||
      new Date(reset.expires_at).getTime() <= Date.now()
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: "Reset link is invalid or expired",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await connection.query(
      `UPDATE admins
       SET password_hash = ?, session_version = session_version + 1
       WHERE id = ? AND status = 'Active'`,
      [passwordHash, reset.admin_id],
    );
    await connection.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
      [reset.id],
    );
    await connection.query(
      "UPDATE admin_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE admin_id = ?",
      [reset.admin_id],
    );
    await connection.commit();

    clearAuthCookies(res);
    res.json({
      message: "Password reset successfully. Please login again.",
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

function publicAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

function setAuthCookies(res, admin, refreshToken) {
  res.cookie(
    env.sessionCookie,
    createAccessToken(admin),
    sessionCookieOptions(),
  );
  res.cookie(
    env.refreshCookie,
    refreshToken,
    refreshCookieOptions(),
  );
}

function clearAuthCookies(res) {
  res.clearCookie(env.sessionCookie, clearSessionCookieOptions());
  res.clearCookie(env.refreshCookie, clearRefreshCookieOptions());
}

export default router;
