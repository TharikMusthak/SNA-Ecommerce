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
    const orderId = parsePositiveId(req.body.order_id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const reason = String(req.body.reason || "")
      .trim()
      .slice(0, 190);
    const itemIds = items.map((item) => parsePositiveId(item.order_item_id));
    if (
      !orderId ||
      !reason ||
      !items.length ||
      itemIds.some((id) => !id) ||
      new Set(itemIds).size !== itemIds.length
    )
      return fail(res, 422, "Validation failed");
    const connection = await pool.getConnection();
    let created;
    try {
      await connection.beginTransaction();
      const [[order]] = await connection.query(
        `SELECT o.id,o.order_code,o.payment_status,o.amount,
       (SELECT MAX(h.created_at) FROM order_status_history h WHERE h.order_id=o.id AND h.status='delivered') delivered_at
       FROM orders o WHERE o.id=? AND o.user_id=? AND o.status IN ('delivered','return_requested','returned','partially_refunded') FOR UPDATE`,
        [orderId, req.user.id],
      );
      if (
        !order ||
        !["paid", "partially_refunded"].includes(order.payment_status)
      ) {
        await connection.rollback();
        return fail(
          res,
          409,
          "Only paid, delivered orders are eligible for return",
        );
      }
      if (
        !order.delivered_at ||
        Date.now() - new Date(order.delivered_at).getTime() > 30 * 86_400_000
      ) {
        await connection.rollback();
        return fail(res, 409, "Return window has expired");
      }
      const code = `RET-${randomBytes(5).toString("hex").toUpperCase()}`;
      const [result] = await connection.query(
        "INSERT INTO returns(return_code,user_id,order_id,reason,comments) VALUES (?,?,?,?,?)",
        [
          code,
          req.user.id,
          orderId,
          reason,
          String(req.body.comments || "").slice(0, 5000) || null,
        ],
      );
      let total = 0;
      for (const requested of items) {
        const itemId = parsePositiveId(requested.order_item_id),
          quantity = Number(requested.quantity);
        const [[item]] = await connection.query(
          "SELECT id,quantity,total_amount FROM order_items WHERE id=? AND order_id=?",
          [itemId, orderId],
        );
        if (!item || !Number.isSafeInteger(quantity) || quantity < 1)
          throw Object.assign(new Error("Invalid return item quantity"), {
            status: 422,
          });
        const [[prior]] = await connection.query(
          `SELECT COALESCE(SUM(ri.quantity),0) quantity FROM return_items ri JOIN returns r ON r.id=ri.return_id WHERE ri.order_item_id=? AND r.status NOT IN ('cancelled','rejected')`,
          [itemId],
        );
        if (Number(prior.quantity) + quantity > Number(item.quantity))
          throw Object.assign(
            new Error(
              "Return quantity exceeds the remaining eligible quantity",
            ),
            { status: 409 },
          );
        const eligible = money(
          (Number(item.total_amount) / Number(item.quantity)) * quantity,
        );
        total += eligible;
        await connection.query(
          "INSERT INTO return_items(return_id,order_item_id,quantity,eligible_amount) VALUES (?,?,?,?)",
          [result.insertId, item.id, quantity, eligible],
        );
      }
      if (total > Number(order.amount))
        throw Object.assign(
          new Error("Return amount exceeds the paid order amount"),
          { status: 409 },
        );
      await connection.query("UPDATE returns SET refund_amount=? WHERE id=?", [
        money(total),
        result.insertId,
      ]);
      await connection.query(
        "UPDATE orders SET status='return_requested' WHERE id=?",
        [orderId],
      );
      await connection.query(
        "INSERT INTO return_status_history(return_id,to_status,note,actor_type,actor_id) VALUES (?,'requested',?,'customer',?)",
        [result.insertId, reason, req.user.id],
      );
      await connection.query(
        "INSERT INTO order_status_history(order_id,status,note,actor_type,actor_id) VALUES (?,'return_requested',?,'customer',?)",
        [orderId, reason, req.user.id],
      );
      await connection.query(
        "INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata) VALUES ('customer',?,'return.requested','return',?,?)",
        [
          req.user.id,
          String(result.insertId),
          JSON.stringify({ orderId, itemCount: items.length }),
        ],
      );
      await connection.commit();
      created = {
        id: result.insertId,
        return_code: code,
        eligible_refund: money(total),
      };
    } catch (error) {
      await connection.rollback();
      if (error.status) return fail(res, error.status, error.message);
      throw error;
    } finally {
      connection.release();
    }
    queueUserEvent({
      event: "return_requested",
      userId: req.user.id,
      entityType: "return",
      entityId: created.id,
      payload: { returnCode: created.return_code },
    }).catch(() => {});
    return ok(res, created, "Return requested", 201);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const p = parsePagination(
      req.query,
      ["id", "return_code", "status", "refund_amount", "created_at"],
      "id",
    );
    const [[count], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) total FROM returns WHERE user_id=?", [
        req.user.id,
      ]),
      pool.query(
        `SELECT id,return_code,order_id,reason,status,refund_amount,created_at FROM returns WHERE user_id=? ORDER BY ${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [req.user.id, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid return ID");
    const [[row]] = await pool.query(
      "SELECT id,return_code,order_id,reason,comments,status,refund_amount,created_at,updated_at FROM returns WHERE id=? AND user_id=?",
      [id, req.user.id],
    );
    if (!row) return fail(res, 404, "Return not found");
    const [[items], [history], [refunds]] = await Promise.all([
      pool.query(
        "SELECT ri.id,ri.order_item_id,ri.quantity,ri.accepted_quantity,ri.restocked_quantity,ri.disposition,ri.eligible_amount,oi.product_name FROM return_items ri JOIN order_items oi ON oi.id=ri.order_item_id WHERE ri.return_id=?",
        [id],
      ),
      pool.query(
        "SELECT from_status,to_status,note,actor_type,created_at FROM return_status_history WHERE return_id=? ORDER BY id",
        [id],
      ),
      pool.query(
        "SELECT refund_reference,refund_method,refunded_amount,status,processed_at,created_at FROM refund_records WHERE return_id=? ORDER BY id",
        [id],
      ),
    ]);
    return ok(res, { ...row, items, history, refunds });
  }),
);

router.put(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid return ID");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        "SELECT * FROM returns WHERE id=? AND user_id=? FOR UPDATE",
        [id, req.user.id],
      );
      if (!record || record.status !== "requested") {
        await connection.rollback();
        return fail(res, 409, "Return cannot be cancelled");
      }
      await connection.query(
        "UPDATE returns SET status='cancelled' WHERE id=?",
        [id],
      );
      await connection.query(
        "INSERT INTO return_status_history(return_id,from_status,to_status,note,actor_type,actor_id) VALUES (?,'requested','cancelled',?,'customer',?)",
        [
          id,
          String(req.body.reason || "Cancelled by customer").slice(0, 1000),
          req.user.id,
        ],
      );
      await connection.query(
        "INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id) VALUES ('customer',?,'return.cancelled','return',?)",
        [req.user.id, String(id)],
      );
      await connection.commit();
      return ok(res, null, "Return cancelled");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
export default router;
