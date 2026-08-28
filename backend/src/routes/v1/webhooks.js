import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { fail, ok } from "../../utils/apiResponse.js";

const router = Router();
router.post("/tracking", asyncHandler(async (req, res) => {
  if (!env.shiprocket.webhookToken) return fail(res, 503, "Tracking webhook is not configured");
  if (!safeEqual(String(req.get("x-api-key") || ""), env.shiprocket.webhookToken)) {
    return fail(res, 401, "Invalid webhook token");
  }
  const awb = String(req.body?.awb || req.body?.awb_code || "").trim().slice(0, 120);
  if (!awb) return fail(res, 400, "AWB is required");
  const [[shipment]] = await pool.query("SELECT id,order_id,status FROM shipments WHERE awb_code=? LIMIT 1", [awb]);
  if (!shipment) return ok(res, null, "Webhook accepted");
  const providerStatus = req.body?.shipment_status || req.body?.current_status || req.body?.status;
  const status = shipmentStatus(providerStatus, req.body?.shipment_status_id || req.body?.current_status_id);
  const courier = String(req.body?.courier_name || "").trim().slice(0, 190) || null;
  const location = String(req.body?.location || req.body?.current_location || "").trim().slice(0, 190) || null;
  const description = String(req.body?.current_status || req.body?.shipment_status || status).trim().slice(0, 500);
  const eventTime = webhookDate(req.body?.updated_time || req.body?.event_time || req.body?.timestamp);
  const providerEventId = createHash("sha256").update(`${awb}|${status}|${description}|${location || ""}|${eventTime || ""}`).digest("hex");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE shipments SET status=?,courier_name=COALESCE(?,courier_name),
       delivered_at=IF(?='delivered',COALESCE(delivered_at,UTC_TIMESTAMP()),delivered_at)
       WHERE id=?`,
      [status, courier, status, shipment.id],
    );
    await connection.query(
      `INSERT IGNORE INTO shipment_events
       (shipment_id,provider_event_id,status,description,location,event_time,raw_event_reference)
       VALUES (?,?,?,?,?,COALESCE(?,UTC_TIMESTAMP()),?)`,
      [shipment.id, providerEventId, status, description, location, eventTime, providerEventId],
    );
    const orderStatus = customerOrderStatus(status);
    if (orderStatus) await connection.query("UPDATE orders SET status=? WHERE id=? AND status NOT IN ('cancelled','returned','refunded')", [orderStatus, shipment.order_id]);
    await connection.commit();
    return ok(res, null, "Webhook processed");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}));

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

function shipmentStatus(value, statusId) {
  const byId = { 3: "pickup_scheduled", 6: "in_transit", 7: "delivered", 8: "cancelled", 9: "rto_initiated", 10: "rto_delivered", 17: "out_for_delivery", 18: "in_transit", 19: "picked_up", 21: "delivery_failed", 42: "picked_up", 46: "rto_in_transit" };
  if (byId[Number(statusId)]) return byId[Number(statusId)];
  const text = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (text.includes("rto") && text.includes("delivered")) return "rto_delivered";
  if (text.includes("rto") && text.includes("transit")) return "rto_in_transit";
  if (text.includes("rto")) return "rto_initiated";
  if (text.includes("out_for_delivery")) return "out_for_delivery";
  if (text.includes("undeliver") || text.includes("failed")) return "delivery_failed";
  if (text.includes("deliver")) return "delivered";
  if (text.includes("cancel")) return "cancelled";
  if (text.includes("picked_up") || text.includes("out_for_pickup")) return "picked_up";
  if (text.includes("pickup")) return "pickup_scheduled";
  if (text.includes("transit") || text.includes("shipped")) return "in_transit";
  return "shipment_created";
}

function customerOrderStatus(status) {
  if (status === "delivered") return "delivered";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (["picked_up", "in_transit"].includes(status)) return "shipped";
  if (status === "cancelled") return "cancelled";
  return null;
}

function webhookDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace("T", " ");
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default router;
