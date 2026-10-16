import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../src/config/db.js";
import {
  cleanText,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "../src/security/validation.js";

dotenv.config();

const name = cleanText(process.env.ADMIN_NAME, 100);
const email = normalizeEmail(process.env.ADMIN_EMAIL);
const password = String(process.env.ADMIN_PASSWORD || "");
const passwordCheck = validatePassword(password);

if (!name || !isValidEmail(email) || !passwordCheck.valid) {
  throw new Error(
    `ADMIN_NAME, a valid ADMIN_EMAIL and secure ADMIN_PASSWORD are required. ${passwordCheck.message}`,
  );
}

try {
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO admins(name, email, password_hash, role, status)
     VALUES (?, ?, ?, 'Super Admin', 'Active')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = 'Super Admin',
       status = 'Active',
       session_version = session_version + 1`,
    [name, email, hash],
  );
  console.log(`Super Admin ready: ${email}`);
} finally {
  await pool.end();
}
