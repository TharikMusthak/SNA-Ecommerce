import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { fail, ok } from "../../utils/apiResponse.js";

const router = Router();
router.post("/wati", asyncHandler(async (req, res) => {
  if (!env.wati.webhookSecret) return fail(res, 503, "WATI webhook is not configured");
  if (!Buffer.isBuffer(req.rawBody)) return fail(res, 400, "Raw webhook body unavailable");
  const supplied = String(req.get("x-wati-signature") || "").replace(/^sha256=/, "");
  const expected = createHmac("sha256", env.wati.webhookSecret).update(req.rawBody).digest("hex");
  if (!safeEqual(supplied, expected)) return fail(res, 401, "Invalid webhook signature");
  const eventType = String(req.body?.eventType || "").slice(0, 80);
  const externalEventId = String(req.body?.id || req.body?.localMessageId || "").slice(0, 190);
  const messageId = String(req.body?.whatsappMessageId || req.body?.localMessageId || "").slice(0, 190);
  if (!eventType || !externalEventId || !messageId) return fail(res, 400, "Invalid WATI webhook payload");
  const status = webhookStatus(req.body);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    try {
      await connection.query(
        "INSERT INTO notification_webhook_events(provider,external_event_id,event_type,payload_hash) VALUES ('wati',?,?,?)",
        [externalEventId, eventType, createHash("sha256").update(req.rawBody).digest("hex")],
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") { await connection.rollback(); return ok(res, null, "Webhook already processed"); }
      throw error;
    }
    await connection.query(
      `UPDATE notification_deliveries SET status=?,last_error_code=?,
       delivered_at=IF(?='delivered',COALESCE(delivered_at,UTC_TIMESTAMP()),delivered_at),
       read_at=IF(?='read',COALESCE(read_at,UTC_TIMESTAMP()),read_at)
       WHERE provider_message_id=?`,
      [status, status === "failed" ? String(req.body?.failedCode || "WATI_DELIVERY_FAILED").slice(0, 120) : null, status, status, messageId],
    );
    await connection.commit();
    return ok(res, null, "Webhook processed");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}));

function webhookStatus(body) {
  const value = `${body?.eventType || ""} ${body?.statusString || ""}`.toLowerCase();
  if (value.includes("read")) return "read";
  if (value.includes("deliver")) return "delivered";
  if (value.includes("fail")) return "failed";
  return "sent";
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default router;
