import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { sendContactFormNotificationEmail } from "../../services/email.js";
import { fail, ok } from "../../utils/apiResponse.js";

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim().slice(0, 190);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 190);
    const phone = String(req.body.phone || "").trim().slice(0, 40);
    const subject = String(req.body.subject || "").trim().slice(0, 190);
    const message = String(req.body.message || "").trim().slice(0, 10000);
    if (!name || !email || !subject || !message)
      return fail(res, 422, "Name, email, subject, and message are required");
    if (!EMAIL_REGEX.test(email))
      return fail(res, 422, "A valid email address is required");

    const code = `TKT-${randomBytes(5).toString("hex").toUpperCase()}`;
    let ticketId;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [ticket] = await connection.query(
        `INSERT INTO support_tickets
          (ticket_code,user_id,contact_name,contact_email,contact_phone,subject,category,priority)
         VALUES (?,NULL,?,?,?,?,?,'normal')`,
        [code, name, email, phone || null, subject, subject],
      );
      ticketId = ticket.insertId;
      await connection.query(
        "INSERT INTO support_ticket_messages(ticket_id,sender_type,sender_id,message) VALUES (?,'customer',NULL,?)",
        [ticketId, message],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    try {
      await sendContactFormNotificationEmail({
        name,
        email,
        phone,
        subject,
        message,
        ticketCode: code,
      });
    } catch (error) {
      console.error("Failed to send contact form notification email:", error);
    }

    return ok(res, { id: ticketId, ticket_code: code }, "Message received", 201);
  }),
);

export default router;
