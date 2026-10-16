import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { queueUserEvent } from "../../integrations/notifications/notification.service.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";
const router = Router();
router.use(requireCustomer);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const subject = String(req.body.subject || "")
        .trim()
        .slice(0, 190),
      message = String(req.body.message || "")
        .trim()
        .slice(0, 10000),
      priority = ["low", "normal", "high", "urgent"].includes(req.body.priority)
        ? req.body.priority
        : "normal";
    if (!subject || !message)
      return fail(res, 422, "Subject and message are required");
    const connection = await pool.getConnection();
    let created;
    try {
      await connection.beginTransaction();
      const code = `TKT-${randomBytes(5).toString("hex").toUpperCase()}`;
      const [result] = await connection.query(
        "INSERT INTO support_tickets(ticket_code,user_id,subject,category,priority) VALUES (?,?,?,?,?)",
        [
          code,
          req.user.id,
          subject,
          String(req.body.category || "").slice(0, 80) || null,
          priority,
        ],
      );
      await connection.query(
        "INSERT INTO support_ticket_messages(ticket_id,sender_type,sender_id,message) VALUES (?,'customer',?,?)",
        [result.insertId, req.user.id, message],
      );
      await connection.commit();
      created = { id: result.insertId, ticket_code: code };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    queueUserEvent({
      event: "ticket_created",
      userId: req.user.id,
      entityType: "ticket",
      entityId: created.id,
      payload: { ticketCode: created.ticket_code },
    }).catch(() => {});
    return ok(res, created, "Support ticket created", 201);
  }),
);
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        ["id", "ticket_code", "status", "priority", "created_at", "updated_at"],
        "id",
      ),
      where = ["user_id=?"],
      params = [req.user.id];
    if (
      [
        "open",
        "in_progress",
        "waiting_for_customer",
        "resolved",
        "closed",
      ].includes(req.query.status)
    ) {
      where.push("status=?");
      params.push(req.query.status);
    }
    if (p.search) {
      where.push("(ticket_code LIKE ? OR subject LIKE ?)");
      params.push(`%${p.search}%`, `%${p.search}%`);
    }
    const clause = where.join(" AND ");
    const [[count], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) total FROM support_tickets WHERE ${clause}`,
        params,
      ),
      pool.query(
        `SELECT id,ticket_code,subject,category,status,priority,created_at,updated_at FROM support_tickets WHERE ${clause} ORDER BY ${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid ticket ID");
    const [[ticket]] = await pool.query(
      "SELECT id,ticket_code,subject,category,status,priority,created_at,updated_at FROM support_tickets WHERE id=? AND user_id=?",
      [id, req.user.id],
    );
    if (!ticket) return fail(res, 404, "Ticket not found");
    const [messages] = await pool.query(
      "SELECT id,sender_type,message,created_at FROM support_ticket_messages WHERE ticket_id=? ORDER BY id",
      [id],
    );
    return ok(res, { ...ticket, messages });
  }),
);
router.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      message = String(req.body.message || "")
        .trim()
        .slice(0, 10000);
    if (!id || !message)
      return fail(res, 422, "A valid ticket and message are required");
    const [result] = await pool.query(
      `INSERT INTO support_ticket_messages(ticket_id,sender_type,sender_id,message) SELECT id,'customer',?,? FROM support_tickets WHERE id=? AND user_id=? AND status<>'closed'`,
      [req.user.id, message, id, req.user.id],
    );
    if (!result.affectedRows) return fail(res, 404, "Open ticket not found");
    await pool.query("UPDATE support_tickets SET status='open' WHERE id=?", [
      id,
    ]);
    return ok(res, { id: result.insertId }, "Message sent", 201);
  }),
);
router.put(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid ticket ID");
    const [result] = await pool.query(
      "UPDATE support_tickets SET status='closed' WHERE id=? AND user_id=?",
      [id, req.user.id],
    );
    if (!result.affectedRows) return fail(res, 404, "Ticket not found");
    return ok(res, null, "Ticket closed");
  }),
);
export default router;
