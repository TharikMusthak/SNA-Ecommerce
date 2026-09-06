import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { allowRoles, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";
import {
  findAdminOrdersDetails,
  findOrderDetails,
} from "../../services/orderDetails.js";
import { queueUserEvent } from "../../integrations/notifications/notification.service.js";
import { reviewFileUrl, reviewUpload } from "../../middleware/reviewUpload.js";
import { deleteUploadedFiles, uploadedFiles } from "../../middleware/uploadSecurity.js";
import { safelyDeleteUpload, safelyDeleteUploads } from "../../services/uploadFiles.js";
import { shiprocketRequest } from "../../integrations/shipping/shiprocket.js";
import {
  getOrderStatusLabels,
  ORDER_STATUS_DEFAULT_LABELS,
  ORDER_STATUS_KEYS,
} from "../../services/orderStatusLabels.js";

const router = Router();
const productRoles = allowRoles("Super Admin", "Product Manager");
const orderRoles = allowRoles("Super Admin", "Order Manager");
router.use(requireAdmin);

router.get(
  "/order-status-labels",
  orderRoles,
  asyncHandler(async (_req, res) => {
    return ok(res, {
      labels: await getOrderStatusLabels(),
      defaults: ORDER_STATUS_DEFAULT_LABELS,
      statuses: ORDER_STATUS_KEYS,
    });
  }),
);

router.put(
  "/order-status-labels",
  orderRoles,
  asyncHandler(async (req, res) => {
    const submitted = req.body?.labels;
    if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
      return fail(res, 422, "Status labels are required");
    }
    const labels = {};
    for (const status of ORDER_STATUS_KEYS) {
      const label = String(submitted[status] || "").trim();
      if (!label || label.length > 120) {
        return fail(res, 422, `${ORDER_STATUS_DEFAULT_LABELS[status]} label must contain 1-120 characters`);
      }
      labels[status] = label;
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const status of ORDER_STATUS_KEYS) {
        await connection.query(
          `INSERT INTO frontend_order_status_labels(status_key,display_label,updated_by)
           VALUES (?,?,?)
           ON DUPLICATE KEY UPDATE display_label=VALUES(display_label),updated_by=VALUES(updated_by)`,
          [status, labels[status], req.admin.id],
        );
      }
      await connection.commit();
      return ok(res, { labels }, "Frontend order status labels updated");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/uploads/product-video-token",
  productRoles,
  asyncHandler(async (req, res) => {
    const token = jwt.sign(
      { scope: "product-video-upload" },
      env.jwtSecret,
      {
        algorithm: "HS256",
        issuer: env.jwtIssuer,
        audience: "sna-product-video-upload",
        subject: String(req.admin.id),
        expiresIn: "5m",
      },
    );
    return ok(res, { token });
  }),
);

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
        "SELECT id,full_name,phone,address_line_1,address_line_2,city,state,country,postal_code,address_type,is_default,pincode_serviceable,cod_available,pincode_verified_at FROM user_addresses WHERE user_id=? ORDER BY is_default DESC,id DESC",
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
        `SELECT r.id,r.product_id,r.user_id,r.rating,r.title,r.review_text,r.image_url,r.video_url,r.is_verified_purchase,r.status,r.helpful_count,r.created_at,p.name product_name,u.email customer_email,u.phone customer_phone,CONCAT(u.first_name,' ',u.last_name) customer FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ${clause} ORDER BY r.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
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
      `SELECT r.id,r.product_id,r.user_id,r.order_item_id,r.rating,r.title,r.review_text,r.image_url,r.video_url,r.is_verified_purchase,r.status,r.helpful_count,r.created_at,p.name product_name,u.email customer_email,u.phone customer_phone,CONCAT(u.first_name,' ',u.last_name) customer FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id WHERE r.id=?`,
      [id],
    );
    return row ? ok(res, row) : fail(res, 404, "Review not found");
  }),
);
router.post(
  "/reviews",
  productRoles,
  ...reviewUpload,
  asyncHandler(async (req, res) => {
    const files = uploadedFiles(req);
    const input = adminReviewInput(req.body);
    if (input.error) {
      await deleteUploadedFiles(files);
      return fail(res, 422, input.error);
    }
    const [[user], [product]] = await Promise.all([
      pool.query("SELECT id FROM users WHERE id=? AND deleted_at IS NULL", [input.userId]),
      pool.query("SELECT id FROM products WHERE id=?", [input.productId]),
    ]);
    if (!user[0] || !product[0]) {
      await deleteUploadedFiles(files);
      return fail(res, 422, "Selected customer or product was not found");
    }
    try {
      const [result] = await pool.query(
        "INSERT INTO reviews(user_id,product_id,rating,title,review_text,image_url,video_url,is_verified_purchase,status) VALUES (?,?,?,?,?,?,?,?,?)",
        [input.userId, input.productId, input.rating, input.title, input.reviewText, reviewFileUrl(req.files?.image?.[0]), reviewFileUrl(req.files?.video?.[0]), input.verified, input.status],
      );
      await logAudit(req.admin, "review.created", "review", result.insertId);
      return ok(res, { id: result.insertId }, "Review created", 201);
    } catch (error) {
      await deleteUploadedFiles(files);
      if (error.code === "ER_DUP_ENTRY") return fail(res, 409, "This customer already reviewed the selected product");
      throw error;
    }
  }),
);
router.put(
  "/reviews/:id",
  productRoles,
  ...reviewUpload,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const files = uploadedFiles(req);
    const input = adminReviewInput(req.body);
    if (!id || input.error) {
      await deleteUploadedFiles(files);
      return fail(res, 422, input.error || "Invalid review ID");
    }
    const [[existing]] = await pool.query("SELECT image_url,video_url FROM reviews WHERE id=?", [id]);
    if (!existing) {
      await deleteUploadedFiles(files);
      return fail(res, 404, "Review not found");
    }
    const imageUrl = reviewFileUrl(req.files?.image?.[0]) || (req.body.remove_image === "1" ? null : existing.image_url);
    const videoUrl = reviewFileUrl(req.files?.video?.[0]) || (req.body.remove_video === "1" ? null : existing.video_url);
    try {
      await pool.query("UPDATE reviews SET user_id=?,product_id=?,rating=?,title=?,review_text=?,image_url=?,video_url=?,is_verified_purchase=?,status=? WHERE id=?", [input.userId, input.productId, input.rating, input.title, input.reviewText, imageUrl, videoUrl, input.verified, input.status, id]);
    } catch (error) {
      await deleteUploadedFiles(files);
      if (error.code === "ER_DUP_ENTRY") return fail(res, 409, "This customer already reviewed the selected product");
      throw error;
    }
    if (existing.image_url !== imageUrl) await safelyDeleteUpload(existing.image_url, "reviews");
    if (existing.video_url !== videoUrl) await safelyDeleteUpload(existing.video_url, "reviews");
    await logAudit(req.admin, "review.updated", "review", id);
    return ok(res, null, "Review updated");
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
    const [[review]] = await pool.query("SELECT image_url,video_url FROM reviews WHERE id=?", [id]);
    if (!review) return fail(res, 404, "Review not found");
    await pool.query("DELETE FROM reviews WHERE id=?", [id]);
    await safelyDeleteUploads([review.image_url, review.video_url], "reviews");
    await logAudit(req.admin, "review.deleted", "review", id);
    return res.status(204).end();
  }),
);

function adminReviewInput(body) {
  const userId = parsePositiveId(body.user_id);
  const productId = parsePositiveId(body.product_id);
  const rating = Number(body.rating);
  const title = String(body.title || "").trim().slice(0, 190) || null;
  const reviewText = String(body.review_text || "").trim().slice(0, 5000);
  const status = ["pending", "approved", "rejected", "hidden"].includes(body.status) ? body.status : null;
  if (!userId || !productId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !reviewText || !status) {
    return { error: "Customer, product, rating, review text, and status are required" };
  }
  return { userId, productId, rating, title, reviewText, status, verified: ["1", "true", "on"].includes(String(body.is_verified_purchase).toLowerCase()) };
}

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
  "/shipping/pickup-locations",
  allowRoles("Super Admin"),
  asyncHandler(async (_req, res) => {
    if (!shiprocketConfigured()) return fail(res, 409, "Configure Shiprocket credentials first");
    return ok(res, await shiprocketPickupLocations());
  }),
);

router.get(
  "/shipping/settings",
  allowRoles("Super Admin"),
  asyncHandler(async (_req, res) => {
    await pool.query("INSERT IGNORE INTO shipping_settings(id) VALUES (1)");
    const [[settings]] = await pool.query(
      `SELECT provider_enabled,pickup_location,pickup_pincode,
              default_weight_grams,default_length_cm,default_width_cm,
              default_height_cm,free_shipping_threshold,pincode_cache_minutes,
              default_courier_strategy,allow_cod,require_serviceable_address,
              updated_at
         FROM shipping_settings
        WHERE id=1`,
    );
    return ok(res, {
      ...settings,
      provider_enabled: Boolean(settings.provider_enabled),
      allow_cod: Boolean(settings.allow_cod),
      require_serviceable_address: Boolean(settings.require_serviceable_address),
      pickupLocation: settings.pickup_location || "",
      pickupPincode: settings.pickup_pincode || "",
      defaultWeight: Number(settings.default_weight_grams || 500),
      defaultDimensions: {
        length: Number(settings.default_length_cm || 10),
        width: Number(settings.default_width_cm || 10),
        height: Number(settings.default_height_cm || 10),
      },
      shiprocketConfigured: shiprocketConfigured(),
    });
  }),
);

router.put(
  "/shipping/settings",
  allowRoles("Super Admin"),
  asyncHandler(async (req, res) => {
    const input = shippingSettingsInput(req.body);
    if (input.error) return fail(res, 422, input.error);
    if (input.value.providerEnabled && !shiprocketConfigured()) {
      return fail(res, 409, "Configure Shiprocket credentials before enabling the provider");
    }
    const value = input.value;
    if (value.providerEnabled) {
      const locations = await shiprocketPickupLocations();
      const selected = locations.find((location) => location.pickup_location === value.pickupLocation);
      if (!selected) return fail(res, 422, "Select a pickup location returned by Shiprocket");
      value.pickupPincode = selected.pin_code;
    }
    await pool.query(
      `INSERT INTO shipping_settings
        (id,provider_enabled,pickup_location,pickup_pincode,
         default_weight_grams,default_length_cm,default_width_cm,
         default_height_cm,free_shipping_threshold,pincode_cache_minutes,
         default_courier_strategy,allow_cod,require_serviceable_address,updated_by)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         provider_enabled=VALUES(provider_enabled),
         pickup_location=VALUES(pickup_location),pickup_pincode=VALUES(pickup_pincode),
         default_weight_grams=VALUES(default_weight_grams),
         default_length_cm=VALUES(default_length_cm),
         default_width_cm=VALUES(default_width_cm),
         default_height_cm=VALUES(default_height_cm),
         free_shipping_threshold=VALUES(free_shipping_threshold),
         pincode_cache_minutes=VALUES(pincode_cache_minutes),
         default_courier_strategy=VALUES(default_courier_strategy),
         allow_cod=VALUES(allow_cod),
         require_serviceable_address=VALUES(require_serviceable_address),
         updated_by=VALUES(updated_by)`,
      [
        value.providerEnabled,
        value.pickupLocation,
        value.pickupPincode,
        value.defaultWeight,
        value.length,
        value.width,
        value.height,
        value.freeShippingThreshold,
        value.cacheMinutes,
        value.courierStrategy,
        value.allowCod,
        value.requireServiceable,
        req.admin.id,
      ],
    );
    return ok(res, null, "Shipping settings updated");
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
      where = [
        "(o.payment_status='paid' OR EXISTS (SELECT 1 FROM payments valid_payment WHERE valid_payment.order_id=o.id AND valid_payment.provider='cod'))",
      ],
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
    if (req.query.payment_status) {
      where.push("o.payment_status=?");
      params.push(String(req.query.payment_status).slice(0, 40));
    }
    if (req.query.scope === "current") {
      where.push(
        "o.status NOT IN ('delivered','cancelled','returned','refunded','failed')",
      );
    } else if (req.query.scope === "unpaid") {
      where.push("o.payment_status NOT IN ('paid','refunded')");
    }
    if (validDate(req.query.from)) {
      where.push("o.created_at>=?");
      params.push(`${req.query.from} 00:00:00`);
    }
    if (validDate(req.query.to)) {
      where.push("o.created_at<DATE_ADD(?,INTERVAL 1 DAY)");
      params.push(req.query.to);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const connection = await pool.getConnection();
    try {
      const [[count], [orderIds]] = await Promise.all([
        connection.query(`SELECT COUNT(*) total FROM orders o ${clause}`, params),
        connection.query(
          `SELECT o.id FROM orders o ${clause} ORDER BY o.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
          [...params, p.limit, p.offset],
        ),
      ]);
      const rows = await findAdminOrdersDetails(
        orderIds.map((order) => order.id),
        connection,
      );
      return paginated(res, rows, { ...p, total: Number(count[0].total) });
    } finally {
      connection.release();
    }
  }),
);
router.get(
  "/orders/:id",
  orderRoles,
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid order ID");
    const connection = await pool.getConnection();
    let order;
    try {
      order = await findOrderDetails({
        orderId: id,
        includeInternal: true,
        database: connection,
      });
    } finally {
      connection.release();
    }
    if (!order) return fail(res, 404, "Order not found");
    return ok(res, order);
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
function shiprocketConfigured() {
  return Boolean(
    String(process.env.SHIPROCKET_TOKEN || "").trim() ||
      (String(process.env.SHIPROCKET_EMAIL || "").trim() &&
        String(process.env.SHIPROCKET_PASSWORD || "").trim()),
  );
}
async function shiprocketPickupLocations() {
  const result = await shiprocketRequest("/settings/company/pickup");
  const addresses = result?.data?.shipping_address || [];
  return addresses
    .map((address) => ({
      id: Number(address.id) || null,
      pickup_location: String(address.pickup_location || "").trim(),
      pin_code: String(address.pin_code || "").replace(/\D/g, ""),
      city: String(address.city || "").trim(),
      state: String(address.state || "").trim(),
      address: [address.address, address.address_2].filter(Boolean).join(", "),
    }))
    .filter((address) => address.pickup_location && /^\d{6}$/.test(address.pin_code));
}
function shippingSettingsInput(body) {
  const value = {
    providerEnabled: Boolean(body.provider_enabled),
    pickupLocation: String(body.pickup_location || "").trim().slice(0, 190) || null,
    pickupPincode: String(body.pickup_pincode || "").trim(),
    defaultWeight: Number(body.default_weight_grams),
    length: Number(body.default_length_cm),
    width: Number(body.default_width_cm),
    height: Number(body.default_height_cm),
    freeShippingThreshold: Number(body.free_shipping_threshold || 0),
    cacheMinutes: Number(body.pincode_cache_minutes),
    courierStrategy: body.default_courier_strategy,
    allowCod: Boolean(body.allow_cod),
    requireServiceable: Boolean(body.require_serviceable_address),
  };
  if (value.pickupPincode && !/^\d{6}$/.test(value.pickupPincode)) {
    return { error: "Pickup pincode must contain exactly 6 digits" };
  }
  if (!Number.isSafeInteger(value.defaultWeight) || value.defaultWeight < 1) {
    return { error: "Default package weight must be a positive whole number" };
  }
  if (![value.length, value.width, value.height].every((number) => Number.isFinite(number) && number > 0)) {
    return { error: "Package length, width and height must be positive numbers" };
  }
  if (!Number.isFinite(value.freeShippingThreshold) || value.freeShippingThreshold < 0) {
    return { error: "Free shipping threshold must be zero or more" };
  }
  if (!Number.isSafeInteger(value.cacheMinutes) || value.cacheMinutes < 5 || value.cacheMinutes > 10080) {
    return { error: "Pincode cache must be between 5 and 10080 minutes" };
  }
  if (!["cheapest", "fastest"].includes(value.courierStrategy)) {
    return { error: "Invalid courier strategy" };
  }
  return { value };
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
