import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import {
  clearRefreshCookieOptions,
  clearSessionCookieOptions,
  env,
} from "../config/env.js";
import { requireAdmin, requireSuperAdmin } from "../middleware/auth.js";
import {
  cleanText,
  isAllowed,
  isValidEmail,
  normalizeEmail,
  parsePositiveId,
  ROLES,
  USER_STATUSES,
  validatePassword,
} from "../security/validation.js";

const router = Router();
router.use(requireAdmin);

router.put("/change-password", async (req, res) => {
  const currentPassword = String(req.body.current_password || "");
  const newPassword = String(req.body.new_password || "");
  const passwordCheck = validatePassword(newPassword);

  if (!currentPassword || !passwordCheck.valid) {
    return res.status(400).json({
      message: currentPassword
        ? passwordCheck.message
        : "Current password is required",
    });
  }

  const [[admin]] = await pool.query(
    "SELECT password_hash FROM admins WHERE id = ? LIMIT 1",
    [req.admin.id],
  );
  const matches =
    admin &&
    (await bcrypt.compare(currentPassword, admin.password_hash));

  if (!matches) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE admins
       SET password_hash = ?, session_version = session_version + 1
       WHERE id = ?`,
      [passwordHash, req.admin.id],
    );
    await connection.query(
      `UPDATE admin_refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE admin_id = ?`,
      [req.admin.id],
    );
    await connection.commit();

    res.clearCookie(env.sessionCookie, clearSessionCookieOptions());
    res.clearCookie(env.refreshCookie, clearRefreshCookieOptions());
    res.json({
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.use(requireSuperAdmin);

router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, status, created_at
     FROM admins
     ORDER BY id DESC`,
  );
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid user ID" });

  const [[admin]] = await pool.query(
    `SELECT id, name, email, role, status, created_at
     FROM admins
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  if (!admin) return res.status(404).json({ message: "User not found" });
  res.json(admin);
});

router.post("/", async (req, res) => {
  const name = cleanText(req.body.name, 100);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const role = req.body.role || "Product Manager";
  const status = req.body.status || "Active";
  const passwordCheck = validatePassword(password);

  if (!name || !isValidEmail(email)) {
    return res.status(400).json({ message: "Valid name and email required" });
  }
  if (!isAllowed(role, ROLES) || !isAllowed(status, USER_STATUSES)) {
    return res.status(400).json({ message: "Invalid role or status" });
  }
  if (!passwordCheck.valid) {
    return res.status(400).json({ message: passwordCheck.message });
  }

  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    `INSERT INTO admins(name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, hash, role, status],
  );
  res.status(201).json({ id: result.insertId });
});

router.put("/:id/status", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const status = req.body.status;

  if (!id || !isAllowed(status, USER_STATUSES)) {
    return res.status(400).json({
      message: id ? "Invalid user status" : "Invalid user ID",
    });
  }
  if (req.admin.id === id && status !== "Active") {
    return res.status(400).json({
      message: "You cannot disable your own account",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[target]] = await connection.query(
      "SELECT id, role, status FROM admins WHERE id = ? FOR UPDATE",
      [id],
    );

    if (!target) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (
      target.role === "Super Admin" &&
      target.status === "Active" &&
      status !== "Active"
    ) {
      const [activeSuperAdmins] = await connection.query(
        `SELECT id FROM admins
         WHERE role = 'Super Admin' AND status = 'Active'
         FOR UPDATE`,
      );

      if (activeSuperAdmins.length <= 1) {
        await connection.rollback();
        return res.status(400).json({
          message: "At least one active Super Admin is required",
        });
      }
    }

    await connection.query(
      `UPDATE admins
       SET status = ?,
           session_version = session_version + ?
       WHERE id = ?`,
      [status, target.status === status ? 0 : 1, id],
    );
    if (status === "Disabled") {
      await connection.query(
        `UPDATE admin_refresh_tokens
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE admin_id = ?`,
        [id],
      );
    }
    await connection.commit();
    res.json({ message: "User status updated" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.put("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const name = cleanText(req.body.name, 100);
  const email = normalizeEmail(req.body.email);
  const role = req.body.role;
  const status = req.body.status;
  const password = String(req.body.password || "");

  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  if (!name || !isValidEmail(email)) {
    return res.status(400).json({ message: "Valid name and email required" });
  }
  if (!isAllowed(role, ROLES) || !isAllowed(status, USER_STATUSES)) {
    return res.status(400).json({ message: "Invalid role or status" });
  }
  if (password) {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[target]] = await connection.query(
      `SELECT id, role, status
       FROM admins
       WHERE id = ?
       FOR UPDATE`,
      [id],
    );

    if (!target) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (
      req.admin.id === id &&
      (role !== req.admin.role || status !== "Active")
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: "You cannot change your own role or disable your own account",
      });
    }

    const removingActiveSuperAdmin =
      target.role === "Super Admin" &&
      target.status === "Active" &&
      (role !== "Super Admin" || status !== "Active");

    if (removingActiveSuperAdmin) {
      const [activeSuperAdmins] = await connection.query(
        `SELECT id
         FROM admins
         WHERE role = 'Super Admin' AND status = 'Active'
         FOR UPDATE`,
      );

      if (activeSuperAdmins.length <= 1) {
        await connection.rollback();
        return res.status(400).json({
          message: "At least one active Super Admin is required",
        });
      }
    }

    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await connection.query(
        `UPDATE admins
         SET name = ?, email = ?, role = ?, status = ?, password_hash = ?,
             session_version = session_version + 1
         WHERE id = ?`,
        [name, email, role, status, hash, id],
      );
      await connection.query(
        `UPDATE admin_refresh_tokens
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE admin_id = ?`,
        [id],
      );
    } else {
      const permissionsChanged =
        target.role !== role || target.status !== status;
      await connection.query(
        `UPDATE admins
         SET name = ?, email = ?, role = ?, status = ?,
             session_version = session_version + ?
         WHERE id = ?`,
        [name, email, role, status, permissionsChanged ? 1 : 0, id],
      );
      if (permissionsChanged) {
        await connection.query(
          `UPDATE admin_refresh_tokens
           SET revoked_at = COALESCE(revoked_at, NOW())
           WHERE admin_id = ?`,
          [id],
        );
      }
    }

    await connection.commit();
    res.json({ message: "User updated" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.delete("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);

  if (!id) return res.status(400).json({ message: "Invalid user ID" });
  if (req.admin.id === id) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[target]] = await connection.query(
      `SELECT id, role, status
       FROM admins
       WHERE id = ?
       FOR UPDATE`,
      [id],
    );

    if (!target) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (target.role === "Super Admin" && target.status === "Active") {
      const [activeSuperAdmins] = await connection.query(
        `SELECT id
         FROM admins
         WHERE role = 'Super Admin' AND status = 'Active'
         FOR UPDATE`,
      );

      if (activeSuperAdmins.length <= 1) {
        await connection.rollback();
        return res.status(400).json({
          message: "At least one active Super Admin is required",
        });
      }
    }

    await connection.query("DELETE FROM admins WHERE id = ?", [id]);
    await connection.commit();
    res.json({ message: "User deleted" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export default router;
