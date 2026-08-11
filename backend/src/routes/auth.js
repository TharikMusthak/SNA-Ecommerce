import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const [rows] = await pool.query("SELECT id,name,email,password_hash,role FROM admins WHERE email=? AND status='Active' LIMIT 1", [email]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(String(req.body.password || ""), admin.password_hash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: admin.id, name: admin.name, email: admin.email, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

router.get("/me", requireAdmin, (req, res) => res.json({ admin: req.admin }));
router.post("/logout", requireAdmin, (_req, res) => res.json({ message: "Logged out" }));

export default router;
