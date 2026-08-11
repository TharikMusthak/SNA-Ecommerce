import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { allowRoles, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { queueUserEvent } from "../../integrations/notifications/notification.service.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";

const router = Router();
const orderManagers = allowRoles("Super Admin", "Order Manager");
const transitions = Object.freeze({
  requested: ["approved", "rejected", "cancelled"],
  approved: ["pickup_scheduled", "received", "inspection_pending", "cancelled"],
  pickup_scheduled: ["picked_up", "cancelled"],
  picked_up: ["received"],
  received: ["inspection_pending"],
  inspection_pending: ["inspection_passed", "inspection_failed"],
  inspection_passed: ["refund_pending", "completed"],
  inspection_failed: ["completed"],
  refund_pending: ["partially_refunded", "refunded"],
  partially_refunded: ["refund_pending", "refunded", "completed"],
  refunded: ["completed"],
  rejected: [],
  completed: [],
  cancelled: [],
});

router.use(requireAdmin, orderManagers);

router.get(
  "/returns",
  asyncHandler(async (req, res) => {
    const p = parsePagination(
      req.query,
      ["id", "return_code", "status", "refund_amount", "created_at"],
      "id",
    );
    const where = ["1=1"],
      params = [];
    if (p.search) {
      where.push(
        "(r.return_code LIKE ? OR o.order_code LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name,' ',u.last_name) LIKE ?)",
      );
      params.push(...Array(4).fill(`%${p.search}%`));
    }
    if (transitions[req.query.status]) {
      where.push("r.status=?");
      params.push(req.query.status);
    }
    const sqlWhere = where.join(" AND ");
    const [[count], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) total FROM returns r JOIN orders o ON o.id=r.order_id JOIN users u ON u.id=r.user_id WHERE ${sqlWhere}`,
        params,
      ),
      pool.query(
        `SELECT r.id,r.return_code,r.order_id,r.reason,r.status,r.refund_amount,r.created_at,o.order_code,u.email,CONCAT(u.first_name,' ',u.last_name) customer FROM returns r JOIN orders o ON o.id=r.order_id JOIN users u ON u.id=r.user_id WHERE ${sqlWhere} ORDER BY r.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);

router.get(
  "/returns/:id",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid return ID");
    const data = await returnDetails(pool, id);
    if (!data) return fail(res, 404, "Return not found");
    return ok(res, data);
  }),
);

router.put(
  "/returns/:id/approve",
  asyncHandler((req, res) => transition(req, res, "approved")),
);
router.put(
  "/returns/:id/reject",
  asyncHandler((req, res) => transition(req, res, "rejected")),
);
router.put(
  "/returns/:id/status",
  asyncHandler(async (req, res) => {
    const next = String(req.body.status || "");
    if (!transitions[next]) return fail(res, 422, "Invalid return status");
    return transition(req, res, next);
  }),
);

router.post(
  "/returns/:id/inspection",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      result = ["passed", "failed", "partial"].includes(req.body.result)
        ? req.body.result
        : null;
    const key = idempotencyKey(req);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!id || !result || !key)
      return fail(res, 422, "A valid result and Idempotency-Key are required");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        "SELECT * FROM returns WHERE id=? FOR UPDATE",
        [id],
      );
      if (!record) {
        await connection.rollback();
        return fail(res, 404, "Return not found");
      }
      if (!["received", "inspection_pending"].includes(record.status)) {
        await connection.rollback();
        return fail(res, 409, "Return is not ready for inspection");
      }
      for (const input of items) {
        const itemId = parsePositiveId(input.return_item_id),
          accepted = Number(input.accepted_quantity);
        if (!itemId || !Number.isSafeInteger(accepted) || accepted < 0) {
          await connection.rollback();
          return fail(res, 422, "Invalid inspection item quantity");
        }
        const [updated] = await connection.query(
          "UPDATE return_items SET accepted_quantity=? WHERE id=? AND return_id=? AND quantity>=?",
          [accepted, itemId, id, accepted],
        );
        if (!updated.affectedRows) {
          await connection.rollback();
          return fail(
            res,
            422,
            "Inspection quantity exceeds the return quantity",
          );
        }
      }
      if (!items.length)
        await connection.query(
          "UPDATE return_items SET accepted_quantity=IF(?='failed',0,quantity) WHERE return_id=?",
          [result, id],
        );
      const next =
        result === "failed" ? "inspection_failed" : "inspection_passed";
      await connection.query(
        "INSERT INTO return_inspections(return_id,result,notes,inspected_by,idempotency_key) VALUES (?,?,?,?,?)",
        [id, result, text(req.body.notes, 5000), req.admin.id, key],
      );
      await setReturnStatus(
        connection,
        record,
        next,
        req.admin,
        req.body.notes,
      );
      await audit(connection, req.admin, "return.inspected", "return", id, {
        result,
      });
      await connection.commit();
      safeNotify({
        event: "inspection_completed",
        userId: record.user_id,
        entityType: "return",
        entityId: id,
        payload: { returnCode: record.return_code, result },
      });
      return ok(res, { status: next }, "Inspection recorded", 201);
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY")
        return fail(res, 409, "Inspection request already processed");
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/returns/:id/restock",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      key = idempotencyKey(req),
      items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!id || !key || !items.length)
      return fail(res, 422, "Items and Idempotency-Key are required");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        "SELECT * FROM returns WHERE id=? FOR UPDATE",
        [id],
      );
      if (!record) {
        await connection.rollback();
        return fail(res, 404, "Return not found");
      }
      if (
        ![
          "inspection_passed",
          "refund_pending",
          "partially_refunded",
          "refunded",
          "completed",
        ].includes(record.status)
      ) {
        await connection.rollback();
        return fail(res, 409, "Return has not passed inspection");
      }
      for (const input of items) {
        const itemId = parsePositiveId(input.return_item_id),
          quantity = Number(input.quantity);
        const disposition = [
          "restocked",
          "damaged",
          "expired",
          "quality_rejected",
          "no_restock",
        ].includes(input.disposition)
          ? input.disposition
          : null;
        if (
          !itemId ||
          !Number.isSafeInteger(quantity) ||
          quantity < 1 ||
          !disposition
        ) {
          await connection.rollback();
          return fail(res, 422, "Invalid restock item");
        }
        const [[item]] = await connection.query(
          `SELECT ri.*,oi.product_id,oi.variant_id FROM return_items ri JOIN order_items oi ON oi.id=ri.order_item_id WHERE ri.id=? AND ri.return_id=? FOR UPDATE`,
          [itemId, id],
        );
        if (
          !item ||
          Number(item.restocked_quantity) + quantity >
            Number(item.accepted_quantity)
        ) {
          await connection.rollback();
          return fail(
            res,
            409,
            "Quantity exceeds the accepted unprocessed quantity",
          );
        }
        if (disposition === "restocked")
          await restoreStock(
            connection,
            item,
            quantity,
            req.admin,
            id,
            record.return_code,
          );
        await connection.query(
          "INSERT INTO return_restock_actions(return_id,return_item_id,quantity,disposition,processed_by,idempotency_key) VALUES (?,?,?,?,?,?)",
          [
            id,
            item.id,
            quantity,
            disposition,
            req.admin.id,
            `${key}:${item.id}`.slice(0, 190),
          ],
        );
        await connection.query(
          "UPDATE return_items SET restocked_quantity=restocked_quantity+?,disposition=? WHERE id=?",
          [quantity, disposition, item.id],
        );
      }
      await audit(
        connection,
        req.admin,
        "return.items_dispositioned",
        "return",
        id,
        { itemCount: items.length },
      );
      await connection.commit();
      return ok(res, null, "Return inventory disposition recorded", 201);
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY")
        return fail(res, 409, "Restock request already processed");
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/returns/:id/refund-record",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      key = idempotencyKey(req),
      amount = Number(req.body.refunded_amount);
    const method = [
      "cod_manual",
      "bank_transfer",
      "upi_manual",
      "store_credit",
      "external_pending",
    ].includes(req.body.refund_method)
      ? req.body.refund_method
      : null;
    if (!id || !key || !method || !Number.isFinite(amount) || amount <= 0)
      return fail(
        res,
        422,
        "Valid refund details and Idempotency-Key are required",
      );
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        `SELECT r.*,o.payment_status FROM returns r JOIN orders o ON o.id=r.order_id WHERE r.id=? FOR UPDATE`,
        [id],
      );
      if (!record) {
        await connection.rollback();
        return fail(res, 404, "Return not found");
      }
      if (
        record.payment_status !== "paid" &&
        !["partially_refunded", "refunded"].includes(record.payment_status)
      ) {
        await connection.rollback();
        return fail(res, 409, "Unpaid orders cannot be refunded");
      }
      if (
        ![
          "inspection_passed",
          "refund_pending",
          "partially_refunded",
          "refunded",
        ].includes(record.status)
      ) {
        await connection.rollback();
        return fail(res, 409, "Return is not eligible for refund recording");
      }
      const [[eligible]] = await connection.query(
        "SELECT COALESCE(SUM(eligible_amount*accepted_quantity/NULLIF(quantity,0)),0) amount FROM return_items WHERE return_id=?",
        [id],
      );
      const [[prior]] = await connection.query(
        "SELECT COALESCE(SUM(refunded_amount),0) amount FROM refund_records WHERE return_id=? AND status NOT IN ('failed','cancelled')",
        [id],
      );
      const remaining = money(Number(eligible.amount) - Number(prior.amount));
      if (amount > remaining) {
        await connection.rollback();
        return fail(res, 409, "Refund exceeds the remaining eligible amount");
      }
      const reference =
        text(req.body.refund_reference, 190) ||
        `RFD-${randomBytes(6).toString("hex").toUpperCase()}`;
      const status = [
        "pending",
        "approved",
        "processing",
        "completed",
      ].includes(req.body.status)
        ? req.body.status
        : "pending";
      const [created] = await connection.query(
        `INSERT INTO refund_records(return_id,order_id,user_id,refund_reference,refund_method,eligible_amount,refunded_amount,status,notes,processed_by,processed_at,external_provider_reference,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,IF(?='completed',UTC_TIMESTAMP(),NULL),?,?)`,
        [
          id,
          record.order_id,
          record.user_id,
          reference,
          method,
          Number(eligible.amount),
          amount,
          status,
          text(req.body.notes, 5000),
          req.admin.id,
          status,
          text(req.body.external_provider_reference, 190),
          key,
        ],
      );
      const returnStatus = "refund_pending";
      if (
        record.status !== returnStatus &&
        transitions[record.status]?.includes(returnStatus)
      )
        await setReturnStatus(
          connection,
          record,
          returnStatus,
          req.admin,
          "Internal refund record created",
        );
      if (status === "completed") await reconcileRefundStatus(connection, id, req.admin);
      await audit(
        connection,
        req.admin,
        "refund.created",
        "refund_record",
        created.insertId,
        { returnId: id, amount, method, status },
      );
      await connection.commit();
      safeNotify({
        event: status === "completed" ? "refund_completed" : "refund_initiated",
        userId: record.user_id,
        entityType: "refund",
        entityId: created.insertId,
        payload: { returnCode: record.return_code, amount },
      });
      return ok(
        res,
        {
          id: created.insertId,
          refund_reference: reference,
          remaining_eligible: money(remaining - amount),
        },
        "Refund record created",
        201,
      );
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY")
        return fail(res, 409, "Refund request already processed");
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/refunds",
  asyncHandler(async (req, res) => {
    const p = parsePagination(
      req.query,
      ["id", "refund_reference", "refunded_amount", "status", "created_at"],
      "id",
    );
    const where = [],
      params = [];
    if (p.search) {
      where.push(
        "(rr.refund_reference LIKE ? OR r.return_code LIKE ? OR o.order_code LIKE ?)",
      );
      params.push(...Array(3).fill(`%${p.search}%`));
    }
    if (
      [
        "pending",
        "approved",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ].includes(req.query.status)
    ) {
      where.push("rr.status=?");
      params.push(req.query.status);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) total FROM refund_records rr JOIN returns r ON r.id=rr.return_id JOIN orders o ON o.id=rr.order_id ${clause}`,
        params,
      ),
      pool.query(
        `SELECT rr.*,r.return_code,o.order_code FROM refund_records rr JOIN returns r ON r.id=rr.return_id JOIN orders o ON o.id=rr.order_id ${clause} ORDER BY rr.${p.sort} ${p.order} LIMIT ? OFFSET ?`,
        [...params, p.limit, p.offset],
      ),
    ]);
    return paginated(res, rows, { ...p, total: Number(count[0].total) });
  }),
);

router.get(
  "/refunds/:id",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid refund ID");
    const [[record]] = await pool.query(
      `SELECT rr.*,r.return_code,o.order_code,u.email FROM refund_records rr JOIN returns r ON r.id=rr.return_id JOIN orders o ON o.id=rr.order_id JOIN users u ON u.id=rr.user_id WHERE rr.id=?`,
      [id],
    );
    return record ? ok(res, record) : fail(res, 404, "Refund record not found");
  }),
);

router.put(
  "/refunds/:id/status",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id),
      next = String(req.body.status || "");
    const allowed = {
      pending: ["approved", "cancelled"],
      approved: ["processing", "completed", "cancelled"],
      processing: ["completed", "failed"],
      failed: ["processing", "cancelled"],
      completed: [],
      cancelled: [],
    };
    if (!id || !allowed[next]) return fail(res, 422, "Invalid refund status");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[record]] = await connection.query(
        "SELECT * FROM refund_records WHERE id=? FOR UPDATE",
        [id],
      );
      if (!record) {
        await connection.rollback();
        return fail(res, 404, "Refund record not found");
      }
      if (!allowed[record.status]?.includes(next)) {
        await connection.rollback();
        return fail(
          res,
          409,
          `Cannot transition refund from ${record.status} to ${next}`,
        );
      }
      await connection.query(
        "UPDATE refund_records SET status=?,processed_at=IF(?='completed',UTC_TIMESTAMP(),processed_at),notes=COALESCE(?,notes) WHERE id=?",
        [next, next, text(req.body.notes, 5000), id],
      );
      if (next === "completed")
        await reconcileRefundStatus(connection, record.return_id, req.admin);
      await audit(
        connection,
        req.admin,
        "refund.status_changed",
        "refund_record",
        id,
        { from: record.status, to: next },
      );
      await connection.commit();
      if (next === "completed")
        safeNotify({
          event: "refund_completed",
          userId: record.user_id,
          entityType: "refund",
          entityId: id,
          payload: { amount: record.refunded_amount },
        });
      return ok(res, { status: next }, "Refund status updated");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

async function transition(req, res, next) {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid return ID");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[record]] = await connection.query(
      "SELECT * FROM returns WHERE id=? FOR UPDATE",
      [id],
    );
    if (!record) {
      await connection.rollback();
      return fail(res, 404, "Return not found");
    }
    if (!transitions[record.status]?.includes(next)) {
      await connection.rollback();
      return fail(
        res,
        409,
        `Cannot transition return from ${record.status} to ${next}`,
      );
    }
    await setReturnStatus(connection, record, next, req.admin, req.body.notes);
    await audit(connection, req.admin, `return.${next}`, "return", id, {
      from: record.status,
    });
    await connection.commit();
    const event = {
      approved: "return_approved",
      rejected: "return_rejected",
      pickup_scheduled: "pickup_scheduled",
      received: "return_received",
    }[next];
    if (event)
      safeNotify({
        event,
        userId: record.user_id,
        entityType: "return",
        entityId: id,
        payload: { returnCode: record.return_code },
      });
    return ok(res, { status: next }, "Return status updated");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setReturnStatus(connection, record, next, admin, note) {
  await connection.query(
    "UPDATE returns SET status=?,admin_notes=COALESCE(?,admin_notes),completed_at=IF(?='completed',UTC_TIMESTAMP(),completed_at) WHERE id=?",
    [next, text(note, 5000), next, record.id],
  );
  await connection.query(
    "INSERT INTO return_status_history(return_id,from_status,to_status,note,actor_type,actor_id) VALUES (?,?,?,?, 'admin',?)",
    [record.id, record.status, next, text(note, 1000), admin.id],
  );
}

async function restoreStock(
  connection,
  item,
  quantity,
  admin,
  returnId,
  returnCode,
) {
  const table = item.variant_id ? "product_variants" : "products",
    id = item.variant_id || item.product_id;
  const [[stock]] = await connection.query(
    `SELECT stock FROM ${table} WHERE id=? FOR UPDATE`,
    [id],
  );
  if (!stock)
    throw Object.assign(new Error("Inventory record not found"), {
      status: 409,
    });
  await connection.query(`UPDATE ${table} SET stock=stock+? WHERE id=?`, [
    quantity,
    id,
  ]);
  await connection.query(
    `INSERT INTO inventory_history(product_id,variant_id,admin_id,action,quantity_change,previous_stock,new_stock,reference_type,reference_id,note) VALUES (?,?,?,'ReturnRestock',?,?,?,?,?,?)`,
    [
      item.product_id,
      item.variant_id || null,
      admin.id,
      quantity,
      Number(stock.stock),
      Number(stock.stock) + quantity,
      "return",
      returnId,
      `Return ${returnCode}`,
    ],
  );
}

async function reconcileRefundStatus(connection, returnId, admin) {
  const [[record]] = await connection.query(
    "SELECT * FROM returns WHERE id=? FOR UPDATE",
    [returnId],
  );
  const [[eligible]] = await connection.query(
    "SELECT COALESCE(SUM(eligible_amount*accepted_quantity/NULLIF(quantity,0)),0) amount FROM return_items WHERE return_id=?",
    [returnId],
  );
  const [[paid]] = await connection.query(
    "SELECT COALESCE(SUM(refunded_amount),0) amount FROM refund_records WHERE return_id=? AND status='completed'",
    [returnId],
  );
  const [[order]] = await connection.query("SELECT amount FROM orders WHERE id=? FOR UPDATE", [record.order_id]);
  const [[orderPaid]] = await connection.query("SELECT COALESCE(SUM(refunded_amount),0) amount FROM refund_records WHERE order_id=? AND status='completed'", [record.order_id]);
  const next =
    Number(paid.amount) >= Number(eligible.amount)
      ? "refunded"
      : "partially_refunded";
  if (transitions[record.status]?.includes(next))
    await setReturnStatus(
      connection,
      record,
      next,
      admin,
      "Refund ledger reconciled",
    );
  await connection.query(
    "UPDATE orders SET payment_status=?,status=? WHERE id=?",
    [
      Number(orderPaid.amount) >= Number(order.amount) ? "refunded" : "partially_refunded",
      Number(orderPaid.amount) >= Number(order.amount) ? "refunded" : "partially_refunded",
      record.order_id,
    ],
  );
}

async function returnDetails(db, id) {
  const [[record]] = await db.query(
    `SELECT r.*,o.order_code,o.payment_status,u.email,u.phone,CONCAT(u.first_name,' ',u.last_name) customer FROM returns r JOIN orders o ON o.id=r.order_id JOIN users u ON u.id=r.user_id WHERE r.id=?`,
    [id],
  );
  if (!record) return null;
  const [[items], [history], [inspections], [restocks], [refunds]] =
    await Promise.all([
      db.query(
        `SELECT ri.*,oi.product_name,oi.sku,oi.product_id,oi.variant_id FROM return_items ri JOIN order_items oi ON oi.id=ri.order_item_id WHERE ri.return_id=?`,
        [id],
      ),
      db.query(
        "SELECT * FROM return_status_history WHERE return_id=? ORDER BY id",
        [id],
      ),
      db.query(
        "SELECT id,result,notes,inspected_by,created_at FROM return_inspections WHERE return_id=? ORDER BY id",
        [id],
      ),
      db.query(
        "SELECT id,return_item_id,quantity,disposition,processed_by,created_at FROM return_restock_actions WHERE return_id=? ORDER BY id",
        [id],
      ),
      db.query(
        "SELECT id,refund_reference,refund_method,eligible_amount,refunded_amount,status,processed_at,created_at FROM refund_records WHERE return_id=? ORDER BY id",
        [id],
      ),
    ]);
  return {
    ...record,
    items,
    history,
    inspections,
    restocks,
    refunds,
    allowed_transitions: transitions[record.status] || [],
  };
}

async function audit(
  connection,
  admin,
  action,
  entityType,
  entityId,
  metadata,
) {
  await connection.query(
    "INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata) VALUES ('admin',?,?,?,?,?)",
    [admin.id, action, entityType, String(entityId), JSON.stringify(metadata)],
  );
}
function safeNotify(input) {
  queueUserEvent(input).catch((error) =>
    console.error("Notification queue failed:", error.message),
  );
}
function idempotencyKey(req) {
  const value = String(req.get("idempotency-key") || "").trim();
  return value.length >= 8 && value.length <= 190 ? value : null;
}
function text(value, max) {
  const output = String(value || "")
    .trim()
    .slice(0, max);
  return output || null;
}
function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export default router;
