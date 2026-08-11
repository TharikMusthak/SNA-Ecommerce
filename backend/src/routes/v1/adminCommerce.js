import { Router } from "express";
import { pool } from "../../config/db.js";
import { allowRoles, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";
import { queueUserEvent } from "../../integrations/notifications/notification.service.js";

const router = Router();
const productRoles = allowRoles("Super Admin", "Product Manager");
const orderRoles = allowRoles("Super Admin", "Order Manager");
router.use(requireAdmin);

router.get(
  "/customers",
  orderRoles,
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        ["id", "first_name", "email", "status", "created_at", "last_login_at"],
        "id",
      ),
      where = [],
      params = [];
    if (p.search) {
      where.push(
        "(email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)",
      );
      params.push(...Array(4).fill(`%${p.search}%`));
    }
    if (
      ["pending_verification", "active", "locked", "disabled"].includes(
        req.query.status,
      )
    ) {
      where.push("status=?");
      params.push(req.query.status);
    }
    if (req.query.verified === "true")
      where.push("email_verified_at IS NOT NULL");
    if (req.query.verified === "false") where.push("email_verified_at IS NULL");
    if (validDate(req.query.from)) {
      where.push("created_at>=?");
      params.push(req.query.from);
    }
    if (validDate(req.query.to)) {
      where.push("created_at<DATE_ADD(?,INTERVAL 1 DAY)");
      params.push(req.query.to);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM users ${clause}`, params),
      pool.query(
        `SELECT id,first_name,last_name,email,phone,status,email_verified_at,phone_verified_at,last_login_at,created_at,deleted_at,(deleted_at IS NOT NULL) anonymized FROM users ${clause} ORDER BY ${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);

router.get(
  "/customers/:id",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid customer ID");
    const [[user]] = await pool.query(
      "SELECT id,first_name,last_name,email,phone,status,email_verified_at,phone_verified_at,last_login_at,created_at,deleted_at,(deleted_at IS NOT NULL) anonymized FROM users WHERE id=?",
      [id],
    );
    if (!user) return fail(res, 404, "Customer not found");
    const [[addresses], [orders], [returns], [tickets]] = await Promise.all([
      pool.query(
        "SELECT id,full_name,phone,address_line_1,address_line_2,city,state,country,postal_code,address_type,is_default FROM user_addresses WHERE user_id=? ORDER BY is_default DESC,id DESC",
        [id],
      ),
      pool.query(
        "SELECT id,order_code,amount,status,payment_status,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100",
        [id],
      ),
      pool.query(
        "SELECT id,return_code,order_id,status,refund_amount,created_at FROM returns WHERE user_id=? ORDER BY id DESC LIMIT 100",
        [id],
      ),
      pool.query(
        "SELECT id,ticket_code,subject,status,priority,created_at FROM support_tickets WHERE user_id=? ORDER BY id DESC LIMIT 100",
        [id],
      ),
    ]);
    return ok(res, { ...user, addresses, orders, returns, tickets });
  }),
);

router.put(
  "/customers/:id/status",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      status = ["active", "disabled"].includes(req.body.status)
        ? req.body.status
        : null;
    if (!id || !status) return fail(res, 422, "Invalid customer status");
    const [result] = await pool.query(
      "UPDATE users SET status=?,session_version=session_version+IF(?='disabled',1,0) WHERE id=? AND deleted_at IS NULL",
      [status, status, id],
    );
    if (!result.affectedRows) return fail(res, 404, "Customer not found");
    await logAudit(req.admin, "customer.status_changed", "customer", id, {
      status,
    });
    return ok(res, null, "Customer status updated");
  }),
);

router.get(
  "/reviews",
  productRoles,
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        ["id", "rating", "status", "created_at", "helpful_count"],
        "id",
      ),
      where = [],
      params = [];
    if (p.search) {
      where.push(
        "(r.title LIKE ? OR r.review_text LIKE ? OR p.name LIKE ? OR u.email LIKE ?)",
      );
      params.push(...Array(4).fill(`%${p.search}%`));
    }
    if (
      ["pending", "approved", "rejected", "hidden"].includes(req.query.status)
    ) {
      where.push("r.status=?");
      params.push(req.query.status);
    }
    if (Number(req.query.rating) >= 1 && Number(req.query.rating) <= 5) {
      where.push("r.rating=?");
      params.push(Number(req.query.rating));
    }
    if (parsePositiveId(req.query.product_id)) {
      where.push("r.product_id=?");
      params.push(Number(req.query.product_id));
    }
    if (parsePositiveId(req.query.customer_id)) {
      where.push("r.user_id=?");
      params.push(Number(req.query.customer_id));
    }
    if (validDate(req.query.from)) {
      where.push("r.created_at>=?");
      params.push(req.query.from);
    }
    if (validDate(req.query.to)) {
      where.push("r.created_at<DATE_ADD(?,INTERVAL 1 DAY)");
      params.push(req.query.to);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) total FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ${clause}`,
        params,
      ),
      pool.query(
        `SELECT r.id,r.product_id,r.user_id,r.rating,r.title,r.review_text,r.is_verified_purchase,r.status,r.helpful_count,r.created_at,p.name product_name,u.email customer_email,CONCAT(u.first_name,' ',u.last_name) customer FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ${clause} ORDER BY r.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);
router.get(
  "/reviews/:id",
  productRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid review ID");
    const [[row]] = await pool.query(
      `SELECT r.id,r.product_id,r.user_id,r.order_item_id,r.rating,r.title,r.review_text,r.is_verified_purchase,r.status,r.helpful_count,r.created_at,p.name product_name,u.email customer_email FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id WHERE r.id=?`,
      [id],
    );
    return row ? ok(res, row) : fail(res, 404, "Review not found");
  }),
);
router.put(
  "/reviews/:id/status",
  productRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      status = ["pending", "approved", "rejected", "hidden"].includes(
        req.body.status,
      )
        ? req.body.status
        : null;
    if (!id || !status) return fail(res, 422, "Invalid review status");
    const [result] = await pool.query(
      "UPDATE reviews SET status=? WHERE id=?",
      [status, id],
    );
    if (!result.affectedRows) return fail(res, 404, "Review not found");
    await logAudit(req.admin, "review.status_changed", "review", id, {
      status,
    });
    return ok(res, null, "Review status updated");
  }),
);
router.delete(
  "/reviews/:id",
  productRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid review ID");
    const [result] = await pool.query("DELETE FROM reviews WHERE id=?", [id]);
    if (!result.affectedRows) return fail(res, 404, "Review not found");
    await logAudit(req.admin, "review.deleted", "review", id);
    return res.status(204).end();
  }),
);

router.get(
  "/tickets",
  orderRoles,
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        ["id", "ticket_code", "status", "priority", "created_at", "updated_at"],
        "id",
      ),
      where = [],
      params = [];
    if (p.search) {
      where.push(
        "(t.ticket_code LIKE ? OR t.subject LIKE ? OR u.email LIKE ?)",
      );
      params.push(...Array(3).fill(`%${p.search}%`));
    }
    if (
      [
        "open",
        "in_progress",
        "waiting_for_customer",
        "resolved",
        "closed",
      ].includes(req.query.status)
    ) {
      where.push("t.status=?");
      params.push(req.query.status);
    }
    if (["low", "normal", "high", "urgent"].includes(req.query.priority)) {
      where.push("t.priority=?");
      params.push(req.query.priority);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) total FROM support_tickets t JOIN users u ON u.id=t.user_id ${clause}`,
        params,
      ),
      pool.query(
        `SELECT t.id,t.ticket_code,t.user_id,t.subject,t.category,t.status,t.priority,t.assigned_admin_id,t.created_at,t.updated_at,u.email,CONCAT(u.first_name,' ',u.last_name) customer FROM support_tickets t JOIN users u ON u.id=t.user_id ${clause} ORDER BY t.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);
router.get(
  "/tickets/:id",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid ticket ID");
    const [[ticket]] = await pool.query(
      "SELECT t.*,u.email,u.phone,CONCAT(u.first_name,' ',u.last_name) customer FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.id=?",
      [id],
    );
    if (!ticket) return fail(res, 404, "Ticket not found");
    const [messages] = await pool.query(
      "SELECT id,sender_type,sender_id,message,created_at FROM support_ticket_messages WHERE ticket_id=? ORDER BY id",
      [id],
    );
    return ok(res, { ...ticket, messages });
  }),
);
router.put(
  "/tickets/:id/status",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      status = [
        "open",
        "in_progress",
        "waiting_for_customer",
        "resolved",
        "closed",
      ].includes(req.body.status)
        ? req.body.status
        : null,
      priority = ["low", "normal", "high", "urgent"].includes(req.body.priority)
        ? req.body.priority
        : null;
    if (!id || (!status && !priority))
      return fail(res, 422, "A valid status or priority is required");
    const [result] = await pool.query(
      "UPDATE support_tickets SET status=COALESCE(?,status),priority=COALESCE(?,priority) WHERE id=?",
      [status, priority, id],
    );
    if (!result.affectedRows) return fail(res, 404, "Ticket not found");
    await logAudit(req.admin, "ticket.updated", "support_ticket", id, {
      status,
      priority,
    });
    return ok(res, null, "Ticket updated");
  }),
);
router.put(
  "/tickets/:id/assign",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      adminId = parsePositiveId(req.body.admin_id);
    if (!id || !adminId)
      return fail(res, 422, "Valid ticket and admin IDs are required");
    const [result] = await pool.query(
      "UPDATE support_tickets SET assigned_admin_id=? WHERE id=?",
      [adminId, id],
    );
    if (!result.affectedRows) return fail(res, 404, "Ticket not found");
    await logAudit(req.admin, "ticket.assigned", "support_ticket", id, {
      adminId,
    });
    return ok(res, null, "Ticket assigned");
  }),
);
router.post(
  "/tickets/:id/messages",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      message = String(req.body.message || "")
        .trim()
        .slice(0, 10000);
    if (!id || !message) return fail(res, 422, "Message is required");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[ticket]] = await connection.query(
        "SELECT * FROM support_tickets WHERE id=? FOR UPDATE",
        [id],
      );
      if (!ticket || ticket.status === "closed") {
        await connection.rollback();
        return fail(res, 409, "Open ticket not found");
      }
      const [result] = await connection.query(
        "INSERT INTO support_ticket_messages(ticket_id,sender_type,sender_id,message) VALUES (?,'admin',?,?)",
        [id, req.admin.id, message],
      );
      await connection.query(
        "UPDATE support_tickets SET status='waiting_for_customer',assigned_admin_id=COALESCE(assigned_admin_id,?) WHERE id=?",
        [req.admin.id, id],
      );
      await connection.query(
        "INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id) VALUES ('admin',?,'ticket.replied','support_ticket',?)",
        [req.admin.id, String(id)],
      );
      await connection.commit();
      await queueUserEvent({ userId:ticket.user_id,event:"ticket_replied",entityType:"ticket",entityId:id,payload:{ ticketCode:ticket.ticket_code } }).catch(() => []);
      return ok(res, { id: result.insertId }, "Reply sent", 201);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/coupons",
  productRoles,
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        [
          "id",
          "code",
          "discount_value",
          "status",
          "starts_at",
          "ends_at",
          "created_at",
        ],
        "id",
      ),
      where = [],
      params = [];
    if (p.search) {
      where.push("c.code LIKE ?");
      params.push(`%${p.search}%`);
    }
    if (["active", "inactive"].includes(req.query.status)) {
      where.push("c.status=?");
      params.push(req.query.status);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM coupons c ${clause}`, params),
      pool.query(
        `SELECT c.*,COUNT(cu.id) usage_count,COALESCE(SUM(cu.discount_amount),0) discount_total FROM coupons c LEFT JOIN coupon_usage cu ON cu.coupon_id=c.id ${clause} GROUP BY c.id ORDER BY c.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);
router.get(
  "/coupons/:id",
  productRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid coupon ID");
    const [[row]] = await pool.query(
      "SELECT c.*,COUNT(cu.id) usage_count,COALESCE(SUM(cu.discount_amount),0) discount_total FROM coupons c LEFT JOIN coupon_usage cu ON cu.coupon_id=c.id WHERE c.id=? GROUP BY c.id",
      [id],
    );
    return row ? ok(res, row) : fail(res, 404, "Coupon not found");
  }),
);
router.post(
  "/coupons",
  productRoles,
  asyncHandler(async (req, res) => saveCoupon(req, res)),
);
router.put(
  "/coupons/:id",
  productRoles,
  asyncHandler(async (req, res) =>
    saveCoupon(req, res, parsePositiveId(req.params.id)),
  ),
);
router.put(
  "/coupons/:id/status",
  productRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      status = ["active", "inactive"].includes(req.body.status)
        ? req.body.status
        : null;
    if (!id || !status) return fail(res, 422, "Invalid coupon status");
    const [result] = await pool.query(
      "UPDATE coupons SET status=? WHERE id=?",
      [status, id],
    );
    if (!result.affectedRows) return fail(res, 404, "Coupon not found");
    await logAudit(req.admin, "coupon.status_changed", "coupon", id, {
      status,
    });
    return ok(res, null, "Coupon status updated");
  }),
);
router.delete(
  "/coupons/:id",
  productRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid coupon ID");
    try {
      const [result] = await pool.query("DELETE FROM coupons WHERE id=?", [id]);
      if (!result.affectedRows) return fail(res, 404, "Coupon not found");
      await logAudit(req.admin, "coupon.deleted", "coupon", id);
      return res.status(204).end();
    } catch (error) {
      if (error.code?.startsWith("ER_ROW_IS_REFERENCED"))
        return fail(
          res,
          409,
          "Used coupons cannot be deleted; deactivate instead",
        );
      throw error;
    }
  }),
);

router.get(
  "/orders",
  orderRoles,
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        [
          "id",
          "order_code",
          "amount",
          "status",
          "payment_status",
          "created_at",
        ],
        "id",
      ),
      where = [],
      params = [];
    if (p.search) {
      where.push(
        "(o.order_code LIKE ? OR o.customer LIKE ? OR o.phone LIKE ?)",
      );
      params.push(...Array(3).fill(`%${p.search}%`));
    }
    if (req.query.status) {
      where.push("o.status=?");
      params.push(String(req.query.status).slice(0, 40));
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM orders o ${clause}`, params),
      pool.query(
        `SELECT o.id,o.order_code,o.customer,o.phone,o.amount,o.status,o.payment_status,o.created_at,p.provider payment_method FROM orders o LEFT JOIN payments p ON p.order_id=o.id ${clause} ORDER BY o.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);
router.get(
  "/orders/:id",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid order ID");
    const [[order]] = await pool.query("SELECT * FROM orders WHERE id=?", [id]);
    if (!order) return fail(res, 404, "Order not found");
    const [[items], [history], [payments]] = await Promise.all([
      pool.query("SELECT * FROM order_items WHERE order_id=?", [id]),
      pool.query(
        "SELECT * FROM order_status_history WHERE order_id=? ORDER BY id",
        [id],
      ),
      pool.query(
        "SELECT id,provider,amount_minor,currency,status,created_at FROM payments WHERE order_id=?",
        [id],
      ),
    ]);
    return ok(res, { ...order, items, history, payments });
  }),
);

router.get(
  "/notifications",
  allowRoles("Super Admin"),
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        ["id", "channel", "event", "status", "attempt_count", "created_at"],
        "id",
      ),
      where = [],
      params = [];
    if (p.search) {
      where.push("(recipient LIKE ? OR event LIKE ? OR entity_id LIKE ?)");
      params.push(...Array(3).fill(`%${p.search}%`));
    }
    if (
      [
        "queued",
        "sending",
        "sent",
        "delivered",
        "read",
        "failed",
        "retrying",
        "skipped",
      ].includes(req.query.status)
    ) {
      where.push("status=?");
      params.push(req.query.status);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) total FROM notification_deliveries ${clause}`,
        params,
      ),
      pool.query(
        `SELECT id,user_id,channel,event,recipient,template_name,entity_type,entity_id,status,attempt_count,last_error_code,sent_at,delivered_at,read_at,created_at FROM notification_deliveries ${clause} ORDER BY ${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);
router.get(
  "/audit-logs",
  allowRoles("Super Admin"),
  asyncHandler(async (req, res) => {
    const p = parsePagination(
        req.query,
        ["id", "actor_type", "action", "entity_type", "created_at"],
        "id",
      ),
      params = [],
      where = [];
    if (p.search) {
      where.push("(action LIKE ? OR entity_type LIKE ? OR entity_id LIKE ?)");
      params.push(...Array(3).fill(`%${p.search}%`));
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM audit_logs ${clause}`, params),
      pool.query(
        `SELECT id,actor_type,actor_id,action,entity_type,entity_id,metadata,ip_address,created_at FROM audit_logs ${clause} ORDER BY ${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);

async function saveCoupon(req, res, id = null) {
  const code = String(req.body.code || "")
      .trim()
      .toUpperCase()
      .slice(0, 80),
    type = ["percentage", "fixed", "free_shipping"].includes(
      req.body.discount_type,
    )
      ? req.body.discount_type
      : null,
    value = Number(req.body.discount_value || 0),
    starts = req.body.starts_at || null,
    ends = req.body.ends_at || null;
  if (
    !code ||
    !type ||
    !Number.isFinite(value) ||
    value < 0 ||
    (type === "percentage" && value > 100) ||
    (starts && ends && new Date(starts) >= new Date(ends))
  )
    return fail(res, 422, "Invalid coupon values");
  const values = [
    code,
    type,
    value,
    Number(req.body.minimum_order_value || 0),
    req.body.maximum_discount == null
      ? null
      : Number(req.body.maximum_discount),
    starts,
    ends,
    positive(req.body.per_user_limit),
    positive(req.body.total_usage_limit),
    Boolean(req.body.first_order_only),
    req.body.status === "inactive" ? "inactive" : "active",
    jsonIds(req.body.product_ids),
    jsonIds(req.body.category_ids),
  ];
  try {
    let result;
    if (id) {
      [result] = await pool.query(
        `UPDATE coupons SET code=?,discount_type=?,discount_value=?,minimum_order_value=?,maximum_discount=?,starts_at=?,ends_at=?,per_user_limit=?,total_usage_limit=?,first_order_only=?,status=?,product_restrictions=?,category_restrictions=? WHERE id=?`,
        [...values, id],
      );
      if (!result.affectedRows) return fail(res, 404, "Coupon not found");
    } else {
      [result] = await pool.query(
        `INSERT INTO coupons(code,discount_type,discount_value,minimum_order_value,maximum_discount,starts_at,ends_at,per_user_limit,total_usage_limit,first_order_only,status,product_restrictions,category_restrictions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        values,
      );
    }
    const couponId = id || result.insertId;
    await logAudit(
      req.admin,
      id ? "coupon.updated" : "coupon.created",
      "coupon",
      couponId,
    );
    return ok(
      res,
      { id: couponId },
      id ? "Coupon updated" : "Coupon created",
      id ? 200 : 201,
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return fail(res, 409, "Coupon code already exists");
    throw error;
  }
}
async function logAudit(admin, action, entityType, entityId, metadata = null) {
  await pool.query(
    "INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata) VALUES ('admin',?,?,?,?,?)",
    [
      admin.id,
      action,
      entityType,
      String(entityId),
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}
function positive(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function jsonIds(value) {
  if (!Array.isArray(value)) return null;
  return JSON.stringify([
    ...new Set(value.map(Number).filter(Number.isSafeInteger)),
  ]);
}
export default router;
