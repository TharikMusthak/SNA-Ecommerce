import bcrypt from "bcryptjs";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { env, customerAccessCookieOptions, customerRefreshCookieOptions } from "../../config/env.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { validate } from "../../middleware/validate.js";
import { profileSchema, strongPassword } from "../../validators/customer.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";
import { z } from "zod";

const router = Router();
router.use(requireCustomer);

router.get("/profile", (req, res) => ok(res, req.user));

router.put("/profile", validate(profileSchema), asyncHandler(async (req, res) => {
  try {
    await pool.query("UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?", [req.body.first_name, req.body.last_name, req.body.phone || null, req.user.id]);
    return ok(res, null, "Profile updated successfully");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return fail(res, 409, "Phone number is already registered");
    throw error;
  }
}));

const changePasswordSchema = z.object({ current_password: z.string().min(1).max(72), password: strongPassword, password_confirmation: z.string() })
  .refine((v) => v.password === v.password_confirmation, { path: ["password_confirmation"], message: "Passwords do not match" });

router.put("/change-password", validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const [[user]] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
  if (!await bcrypt.compare(req.body.current_password, user.password_hash)) return fail(res, 400, "Current password is incorrect");
  const hash = await bcrypt.hash(req.body.password, env.bcryptRounds);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [hash, req.user.id]);
    await connection.query("UPDATE user_refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE user_id = ?", [req.user.id]);
    await connection.commit();
    res.clearCookie(env.customerAccessCookie, { ...customerAccessCookieOptions(), maxAge: undefined });
    res.clearCookie(env.customerRefreshCookie, { ...customerRefreshCookieOptions(), maxAge: undefined });
    return ok(res, null, "Password changed; sign in again");
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));

router.delete("/account", asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  const [[user]] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
  if (!password || !await bcrypt.compare(password, user.password_hash)) return fail(res, 400, "Password confirmation is required");
  const anonymizedEmail = `deleted-${req.user.id}-${Date.now()}@invalid.local`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE users SET first_name = 'Deleted', last_name = 'User', email = ?, phone = NULL, status = 'disabled', session_version = session_version + 1, deleted_at = UTC_TIMESTAMP() WHERE id = ?`, [anonymizedEmail, req.user.id]);
    await connection.query("DELETE FROM user_addresses WHERE user_id = ?", [req.user.id]);
    await connection.query("UPDATE user_refresh_tokens SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()) WHERE user_id = ?", [req.user.id]);
    await connection.query(`INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,ip_address) VALUES ('customer',?,'account.deleted','user',?,?)`, [req.user.id, String(req.user.id), req.ip]);
    await connection.commit();
    res.clearCookie(env.customerAccessCookie, { ...customerAccessCookieOptions(), maxAge: undefined });
    res.clearCookie(env.customerRefreshCookie, { ...customerRefreshCookieOptions(), maxAge: undefined });
    return res.status(204).end();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));

router.get("/orders", asyncHandler(async (req, res) => {
  const p=parsePagination(req.query,["id","order_code","amount","status","payment_status","created_at"],"id");
  const [[count],[rows]]=await Promise.all([pool.query("SELECT COUNT(*) total FROM orders WHERE user_id=?",[req.user.id]),pool.query(`SELECT id,order_code,amount,status,payment_status,created_at FROM orders WHERE user_id=? ORDER BY ${p.sort} ${p.order} LIMIT ? OFFSET ?`,[req.user.id,p.limit,p.offset])]);
  return paginated(res,rows,{...p,total:Number(count[0].total)});
}));

router.get("/wishlist", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT p.id,p.name,p.slug,p.price,p.sale_price,p.main_image,p.stock FROM wishlists w JOIN wishlist_items wi ON wi.wishlist_id=w.id JOIN products p ON p.id=wi.product_id WHERE w.user_id=? AND p.deleted_at IS NULL ORDER BY wi.id DESC`, [req.user.id]);
  return ok(res, rows);
}));

router.get("/addresses", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", [req.user.id]);
  return ok(res, rows);
}));

export default router;
