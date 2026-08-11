import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { pool } from "../../config/db.js";
import {
  env,
  customerAccessCookieOptions,
  customerRefreshCookieOptions,
} from "../../config/env.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { validate } from "../../middleware/validate.js";
import {
  createCustomerAccessToken,
  createCustomerRefreshToken,
  hashToken,
} from "../../services/customerTokens.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  tokenSchema,
} from "../../validators/customer.js";
import { fail, ok } from "../../utils/apiResponse.js";
import { sendCustomerAuthEmail, sendOtpEmail } from "../../services/email.js";
import { queueUserEvent } from "../../integrations/notifications/notification.service.js";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const metadata = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });
const publicUser = (user) => ({
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  phone: user.phone,
  status: user.status,
  email_verified_at: user.email_verified_at,
  referral_code: user.referral_code,
});

router.post(
  "/register",
  limiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const input = req.body;
    const duplicateParameters = input.phone
      ? [input.email, input.phone]
      : [input.email];
    const [[duplicate]] = await pool.query(
      `SELECT id FROM users
       WHERE email = ?${input.phone ? " OR phone = ?" : ""}
       LIMIT 1`,
      duplicateParameters,
    );
    if (duplicate)
      return fail(res, 409, "Email or phone is already registered");

    const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
    const referralCode = randomBytes(8).toString("hex").toUpperCase();
    const verificationToken = randomBytes(48).toString("base64url");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let referredBy = null;
      if (input.referral_code) {
        const [[referrer]] = await connection.query(
          "SELECT id FROM users WHERE referral_code = ? AND status = 'active' LIMIT 1",
          [input.referral_code.toUpperCase()],
        );
        if (!referrer) {
          await connection.rollback();
          return fail(res, 422, "Validation failed", {
            referral_code: ["Referral code is invalid"],
          });
        }
        referredBy = referrer.id;
      }
      const [result] = await connection.query(
        `INSERT INTO users (first_name,last_name,email,phone,password_hash,status,email_verified_at,referral_code,referred_by,terms_accepted_at)
       VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP())`,
        [
          input.first_name,
          input.last_name,
          input.email,
          input.phone || null,
          passwordHash,
          env.emailVerificationRequired ? "pending_verification" : "active",
          env.emailVerificationRequired ? null : new Date(),
          referralCode,
          referredBy,
        ],
      );
      if (env.emailVerificationRequired) {
        await connection.query(
          `INSERT INTO user_email_verifications (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
          [result.insertId, hashToken(verificationToken)],
        );
      }
      await queueUserEvent({
        userId: result.insertId,
        event: "customer_registered",
        entityType: "user",
        entityId: result.insertId,
        payload: { firstName: input.first_name },
      }).catch(() => []);
      await connection.commit();
      if (env.emailVerificationRequired) {
        await sendCustomerAuthEmail({
          email: input.email,
          name: input.first_name,
          token: verificationToken,
          type: "verification",
        });
      }
      const data = {
        id: result.insertId,
        email_verification_required: env.emailVerificationRequired,
      };
      if (!env.isProduction && env.emailVerificationRequired)
        data.development_verification_token = verificationToken;
      return ok(res, data, "Account created successfully", 201);
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY")
        return fail(res, 409, "Email or phone is already registered");
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/login",
  limiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const login = req.body.login
      .toLowerCase()
      .replace(/^\+91(?=[6-9]\d{9}$)/, "");
    const [[user]] = await pool.query(
      `SELECT * FROM users WHERE (email = ? OR phone = ?) AND deleted_at IS NULL LIMIT 1`,
      [login, login],
    );
    const passwordValid = user
      ? await bcrypt.compare(req.body.password, user.password_hash)
      : false;
    if (!user || !passwordValid) {
      if (user)
        await pool.query(
          `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = IF(failed_login_attempts + 1 >= 5, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), locked_until) WHERE id = ?`,
          [user.id],
        );
      return fail(res, 401, "Invalid login or password");
    }
    if (user.locked_until && new Date(user.locked_until) > new Date())
      return fail(res, 429, "Account is temporarily locked");
    if (user.status === "pending_verification")
      return fail(res, 403, "Verify your account before signing in");
    if (user.status !== "active")
      return fail(res, 403, "Account is unavailable");
    const refreshToken = await createCustomerRefreshToken(
      pool,
      user.id,
      user.session_version,
      metadata(req),
    );
    await pool.query(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = ?",
      [user.id],
    );
    res.cookie(
      env.customerAccessCookie,
      createCustomerAccessToken(user),
      customerAccessCookieOptions(),
    );
    res.cookie(
      env.customerRefreshCookie,
      refreshToken,
      customerRefreshCookieOptions(),
    );
    return ok(res, publicUser(user), "Signed in successfully");
  }),
);

router.post(
  "/refresh-token",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[env.customerRefreshCookie];
    if (!token) return fail(res, 401, "Refresh token required");
    const tokenHash = hashToken(token);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[stored]] = await connection.query(
        `SELECT * FROM user_refresh_tokens WHERE token_hash = ? FOR UPDATE`,
        [tokenHash],
      );
      if (!stored) {
        await connection.rollback();
        return fail(res, 401, "Invalid refresh token");
      }
      if (stored.revoked_at) {
        await connection.query(
          "UPDATE users SET session_version = session_version + 1 WHERE id = ?",
          [stored.user_id],
        );
        await connection.query(
          "UPDATE user_refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE user_id = ?",
          [stored.user_id],
        );
        await connection.commit();
        return fail(
          res,
          401,
          "Refresh token reuse detected; all sessions revoked",
        );
      }
      if (new Date(stored.expires_at) <= new Date()) {
        await connection.rollback();
        return fail(res, 401, "Refresh token expired");
      }
      const [[user]] = await connection.query(
        "SELECT * FROM users WHERE id = ? AND status = 'active' AND deleted_at IS NULL FOR UPDATE",
        [stored.user_id],
      );
      if (
        !user ||
        Number(user.session_version) !== Number(stored.session_version)
      ) {
        await connection.rollback();
        return fail(res, 401, "Session revoked");
      }
      const nextToken = await createCustomerRefreshToken(
        connection,
        user.id,
        user.session_version,
        metadata(req),
      );
      await connection.query(
        "UPDATE user_refresh_tokens SET revoked_at = UTC_TIMESTAMP(), replaced_by_hash = ? WHERE id = ?",
        [hashToken(nextToken), stored.id],
      );
      await connection.commit();
      res.cookie(
        env.customerAccessCookie,
        createCustomerAccessToken(user),
        customerAccessCookieOptions(),
      );
      res.cookie(
        env.customerRefreshCookie,
        nextToken,
        customerRefreshCookieOptions(),
      );
      return ok(res, null, "Session refreshed");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[env.customerRefreshCookie];
    if (token)
      await pool.query(
        "UPDATE user_refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE token_hash = ?",
        [hashToken(token)],
      );
    res.clearCookie(env.customerAccessCookie, {
      ...customerAccessCookieOptions(),
      maxAge: undefined,
    });
    res.clearCookie(env.customerRefreshCookie, {
      ...customerRefreshCookieOptions(),
      maxAge: undefined,
    });
    return res.status(204).end();
  }),
);

router.get("/me", requireCustomer, (req, res) => ok(res, publicUser(req.user)));

router.post(
  "/verify-email",
  limiter,
  validate(tokenSchema),
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        `SELECT verification.*, user.status AS user_status
         FROM user_email_verifications AS verification
         JOIN users AS user ON user.id = verification.user_id
         WHERE verification.token_hash = ?
         FOR UPDATE`,
        [hashToken(req.body.token)],
      );
      if (!record || new Date(record.expires_at) <= new Date()) {
        await connection.rollback();
        return fail(res, 400, "Verification token is invalid or expired");
      }
      if (record.used_at) {
        await connection.rollback();
        if (record.user_status === "active")
          return ok(res, null, "Email already verified");
        return fail(res, 400, "Verification token has already been used");
      }
      await connection.query(
        "UPDATE user_email_verifications SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL",
        [record.user_id],
      );
      await connection.query(
        "UPDATE users SET email_verified_at = UTC_TIMESTAMP(), status = 'active' WHERE id = ?",
        [record.user_id],
      );
      await connection.commit();
      return ok(res, null, "Email verified successfully");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/resend-verification",
  limiter,
  validate(resendVerificationSchema),
  asyncHandler(async (req, res) => {
    const responseMessage =
      "If the account is awaiting verification, a new email has been sent";
    const [[user]] = await pool.query(
      `SELECT id, first_name, email, status
       FROM users
       WHERE email = ? AND deleted_at IS NULL
       LIMIT 1`,
      [req.body.email],
    );
    if (!user || user.status !== "pending_verification")
      return ok(res, null, responseMessage);

    const verificationToken = randomBytes(48).toString("base64url");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "UPDATE user_email_verifications SET used_at = COALESCE(used_at, UTC_TIMESTAMP()) WHERE user_id = ? AND used_at IS NULL",
        [user.id],
      );
      await connection.query(
        `INSERT INTO user_email_verifications (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
        [user.id, hashToken(verificationToken)],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await sendCustomerAuthEmail({
      email: user.email,
      name: user.first_name,
      token: verificationToken,
      type: "verification",
    });
    return ok(res, null, responseMessage);
  }),
);

router.post(
  "/forgot-password",
  limiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const [[user]] = await pool.query(
      "SELECT id,first_name,email FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1",
      [req.body.email],
    );
    let resetToken;
    if (user) {
      resetToken = randomBytes(48).toString("base64url");
      await pool.query(
        "UPDATE user_password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL",
        [user.id],
      );
      await pool.query(
        `INSERT INTO user_password_reset_tokens (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
        [user.id, hashToken(resetToken), env.resetMinutes],
      );
      await sendCustomerAuthEmail({
        email: user.email,
        name: user.first_name,
        token: resetToken,
        type: "reset",
      });
      await queueUserEvent({
        userId: user.id,
        event: "password_reset_requested",
        entityType: "user",
        entityId: user.id,
        payload: {},
      }).catch(() => []);
    }
    const data =
      !env.isProduction && resetToken
        ? { development_reset_token: resetToken }
        : null;
    return ok(
      res,
      data,
      "If the account exists, password reset instructions have been generated",
    );
  }),
);

router.post(
  "/reset-password",
  limiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        `SELECT * FROM user_password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() FOR UPDATE`,
        [hashToken(req.body.token)],
      );
      if (!record) {
        await connection.rollback();
        return fail(res, 400, "Reset token is invalid or expired");
      }
      const passwordHash = await bcrypt.hash(
        req.body.password,
        env.bcryptRounds,
      );
      await connection.query(
        "UPDATE users SET password_hash = ?, session_version = session_version + 1, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
        [passwordHash, record.user_id],
      );
      await connection.query(
        "UPDATE user_password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?",
        [record.id],
      );
      await connection.query(
        "UPDATE user_refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE user_id = ?",
        [record.user_id],
      );
      await connection.commit();
      return ok(res, null, "Password reset successfully");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/send-otp",
  limiter,
  asyncHandler(async (req, res) => {
    const destination = String(req.body.destination || "")
      .trim()
      .toLowerCase();
    const purpose = [
      "login",
      "verify_email",
      "verify_phone",
      "password_reset",
      "delete_account",
    ].includes(req.body.purpose)
      ? req.body.purpose
      : null;
    const validDestination =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination) ||
      /^(?:\+91)?[6-9]\d{9}$/.test(destination);
    if (!validDestination || !purpose)
      return fail(res, 422, "Validation failed", {
        destination: [
          "A valid email or Indian mobile number and purpose are required",
        ],
      });
    const otp = String(randomInt(100000, 1000000));
    const [[user]] = await pool.query(
      "SELECT id,email FROM users WHERE (email = ? OR phone = ?) AND deleted_at IS NULL LIMIT 1",
      [destination, destination],
    );
    if (user) {
      await pool.query(
        "UPDATE user_otps SET used_at=UTC_TIMESTAMP() WHERE destination=? AND purpose=? AND used_at IS NULL",
        [destination, purpose],
      );
      await pool.query(
        `INSERT INTO user_otps (user_id,destination,purpose,otp_hash,expires_at) VALUES (?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
        [user.id, destination, purpose, hashToken(otp)],
      );
      if (destination.includes("@"))
        await sendOtpEmail({ email: destination, otp, purpose });
      await queueUserEvent({
        userId: user.id,
        event: "otp_requested",
        entityType: "user",
        entityId: user.id,
        payload: { purpose },
      }).catch(() => []);
    }
    return ok(
      res,
      !env.isProduction && user ? { development_otp: otp } : null,
      "If the destination is eligible, an OTP has been generated",
    );
  }),
);

router.post(
  "/verify-otp",
  limiter,
  asyncHandler(async (req, res) => {
    const destination = String(req.body.destination || "")
      .trim()
      .toLowerCase();
    const purpose = String(req.body.purpose || "");
    const otp = String(req.body.otp || "");
    if (!/^\d{6}$/.test(otp))
      return fail(res, 400, "OTP is invalid or expired");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        `SELECT * FROM user_otps WHERE destination = ? AND purpose = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [destination, purpose],
      );
      const candidateHash = hashToken(otp);
      const valid =
        record &&
        record.attempts < 5 &&
        safeHashEqual(candidateHash, record.otp_hash);
      if (!valid) {
        if (record)
          await connection.query(
            "UPDATE user_otps SET attempts = attempts + 1 WHERE id = ?",
            [record.id],
          );
        await connection.commit();
        return fail(res, 400, "OTP is invalid or expired");
      }
      await connection.query(
        "UPDATE user_otps SET used_at = UTC_TIMESTAMP() WHERE id = ?",
        [record.id],
      );
      if (purpose === "verify_email" && record.user_id)
        await connection.query(
          "UPDATE users SET email_verified_at = UTC_TIMESTAMP(), status = 'active' WHERE id = ?",
          [record.user_id],
        );
      if (purpose === "verify_phone" && record.user_id)
        await connection.query(
          "UPDATE users SET phone_verified_at = UTC_TIMESTAMP() WHERE id = ?",
          [record.user_id],
        );
      await connection.commit();
      return ok(res, { verified: true }, "OTP verified successfully");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

function safeHashEqual(left, right) {
  const a = Buffer.from(String(left), "hex");
  const b = Buffer.from(String(right), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export default router;
