import { Router } from "express";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { validate } from "../../middleware/validate.js";
import { addressSchema } from "../../validators/customer.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok } from "../../utils/apiResponse.js";

const router = Router();
router.use(requireCustomer);

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", [req.user.id]);
  return ok(res, rows);
}));

router.post("/", validate(addressSchema), asyncHandler(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?", [req.user.id]);
    const value = req.body;
    const makeDefault = value.is_default || Number(count.total) === 0;
    if (makeDefault) await connection.query("UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?", [req.user.id]);
    const [result] = await connection.query(`INSERT INTO user_addresses (user_id,full_name,phone,address_line_1,address_line_2,landmark,city,district,state,country,postal_code,address_type,is_default) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [req.user.id,value.full_name,value.phone,value.address_line_1,value.address_line_2 || null,value.landmark || null,value.city,value.district || null,value.state,value.country,value.postal_code,value.address_type,makeDefault]);
    await connection.commit();
    return ok(res, { id: result.insertId }, "Address created successfully", 201);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));

router.put("/:id", validate(addressSchema), asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid address ID");
  const value = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[existing]] = await connection.query("SELECT id FROM user_addresses WHERE id = ? AND user_id = ? FOR UPDATE", [id, req.user.id]);
    if (!existing) { await connection.rollback(); return fail(res, 404, "Address not found"); }
    if (value.is_default) await connection.query("UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?", [req.user.id]);
    await connection.query(`UPDATE user_addresses SET full_name=?,phone=?,address_line_1=?,address_line_2=?,landmark=?,city=?,district=?,state=?,country=?,postal_code=?,address_type=?,is_default=? WHERE id=? AND user_id=?`, [value.full_name,value.phone,value.address_line_1,value.address_line_2 || null,value.landmark || null,value.city,value.district || null,value.state,value.country,value.postal_code,value.address_type,value.is_default,id,req.user.id]);
    await connection.commit();
    return ok(res, null, "Address updated successfully");
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));

router.put("/:id/default", asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid address ID");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[address]] = await connection.query("SELECT id FROM user_addresses WHERE id=? AND user_id=? FOR UPDATE", [id, req.user.id]);
    if (!address) { await connection.rollback(); return fail(res, 404, "Address not found"); }
    await connection.query("UPDATE user_addresses SET is_default = (id = ?) WHERE user_id = ?", [id, req.user.id]);
    await connection.commit();
    return ok(res, null, "Default address updated");
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid address ID");
  const [result] = await pool.query("DELETE FROM user_addresses WHERE id = ? AND user_id = ?", [id, req.user.id]);
  if (!result.affectedRows) return fail(res, 404, "Address not found");
  return res.status(204).end();
}));

export default router;
