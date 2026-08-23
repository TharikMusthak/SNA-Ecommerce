import { createHash } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { allowRoles, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { shiprocketConfigured, shiprocketRequest } from "../../integrations/shipping/shiprocket.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";

const router = Router();
router.use(requireAdmin, allowRoles("Super Admin", "Order Manager"));

router.get("/dispatch", asyncHandler(async (req, res) => {
  const p = parsePagination(req.query, ["created_at", "amount", "status"], "created_at");
  const where = ["(o.status IN ('packed','ready_to_dispatch','shipped','out_for_delivery','delivered') OR s.id IS NOT NULL)"];
  const params = [];
  if (p.search) { where.push("(o.order_code LIKE ? OR o.customer LIKE ? OR o.phone LIKE ? OR s.awb_code LIKE ? OR s.courier_name LIKE ? OR o.delivery_pincode LIKE ?)"); params.push(...Array(6).fill(`%${p.search}%`)); }
  if (req.query.status) { where.push("COALESCE(s.status,'ready_to_dispatch')=?"); params.push(req.query.status); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "")) { where.push("o.created_at>=?"); params.push(req.query.from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "")) { where.push("o.created_at<DATE_ADD(?,INTERVAL 1 DAY)"); params.push(req.query.to); }
  const clause = `WHERE ${where.join(" AND ")}`;
  const sort = p.sort === "status" ? "COALESCE(s.status,'ready_to_dispatch')" : `o.${p.sort}`;
  const [[count], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) total FROM orders o LEFT JOIN shipments s ON s.order_id=o.id ${clause}`, params),
    pool.query(`SELECT o.id order_id,o.order_code,o.customer,o.phone,o.amount,o.payment_status,o.shipping_amount,o.shipping_address_json,o.delivery_pincode,o.created_at,COALESCE(s.status,'ready_to_dispatch') shipment_status,s.id shipment_id,s.courier_name,s.awb_code FROM orders o LEFT JOIN shipments s ON s.order_id=o.id ${clause} ORDER BY ${sort} ${p.order} LIMIT ? OFFSET ?`, [...params, p.limit, p.offset]),
  ]);
  return paginated(res, rows, { ...p, total: Number(count[0].total) });
}));

router.get("/dispatch/:orderId", asyncHandler(async (req, res) => {
  const orderId = parsePositiveId(req.params.orderId);
  if (!orderId) return fail(res, 400, "Invalid order ID");
  const [[order]] = await pool.query("SELECT * FROM orders WHERE id=?", [orderId]);
  if (!order) return fail(res, 404, "Order not found");
  const [[shipment]] = await pool.query("SELECT * FROM shipments WHERE order_id=? LIMIT 1", [orderId]);
  const [timeline] = shipment ? await pool.query("SELECT id,status,description,location,event_time,created_at FROM shipment_events WHERE shipment_id=? ORDER BY event_time,id", [shipment.id]) : [[]];
  const address = parseJson(order.shipping_address_json);
  order.delivery_address = [address.address_line_1, address.address_line_2, address.city, address.state, address.postal_code].filter(Boolean).join(", ");
  order.delivery_pincode ||= address.postal_code || null;
  return ok(res, { order, shipment: shipment || null, tracking: { timeline }, shiprocketEnabled: shiprocketConfigured() });
}));

router.post("/shipments", asyncHandler(async (req, res) => {
  const orderId = parsePositiveId(req.body.order_id);
  if (!orderId) return fail(res, 422, "A valid order ID is required");
  const [[existing]] = await pool.query("SELECT id FROM shipments WHERE order_id=?", [orderId]);
  if (existing) return fail(res, 409, "A shipment already exists for this order");
  const [orderResult, itemsResult, settingsResult, userResult] = await Promise.all([
    pool.query("SELECT * FROM orders WHERE id=?", [orderId]),
    pool.query("SELECT product_name,sku,unit_price,quantity FROM order_items WHERE order_id=?", [orderId]),
    pool.query("SELECT * FROM shipping_settings WHERE id=1", []),
    pool.query("SELECT email FROM users WHERE id=(SELECT user_id FROM orders WHERE id=?)", [orderId]),
  ]);
  const order = orderResult[0][0];
  const items = itemsResult[0];
  const settingsRows = settingsResult[0];
  const userRows = userResult[0];
  if (!order) return fail(res, 404, "Order not found");
  if (!['packed','ready_to_dispatch'].includes(order.status)) return fail(res, 409, "Pack the order before creating its shipment");
  const settings = settingsRows[0];
  const address = parseJson(order.shipping_address_json);
  const paymentMethod = String((await pool.query("SELECT provider FROM payments WHERE order_id=? ORDER BY id DESC LIMIT 1", [orderId]))[0][0]?.provider || "cod").toLowerCase();
  const nameParts = String(address.full_name || order.customer || "Customer").trim().split(/\s+/);
  const provider = await shiprocketRequest("/orders/create/adhoc", { method: "POST", body: {
    order_id: order.order_code, order_date: new Date(order.created_at).toISOString().slice(0, 16).replace("T", " "), pickup_location: settings.pickup_location,
    billing_customer_name: nameParts.shift() || "Customer", billing_last_name: nameParts.join(" "), billing_address: address.address_line_1, billing_address_2: address.address_line_2 || "",
    billing_city: address.city, billing_pincode: String(address.postal_code), billing_state: address.state, billing_country: address.country || "India", billing_email: userRows[0]?.email || "", billing_phone: address.phone || order.phone,
    shipping_is_billing: true, order_items: items.map((item) => ({ name: item.product_name, sku: item.sku || `SNA-${order.id}`, units: Number(item.quantity), selling_price: Number(item.unit_price) })),
    payment_method: paymentMethod === "cod" ? "COD" : "Prepaid", sub_total: Number(order.subtotal),
    length: Number(settings.default_length_cm || 10), breadth: Number(settings.default_width_cm || 10), height: Number(settings.default_height_cm || 10), weight: Number(settings.default_weight_grams || 500) * items.reduce((sum, item) => sum + Number(item.quantity), 0) / 1000,
  }});
  const [result] = await pool.query(`INSERT INTO shipments(order_id,provider,provider_order_id,provider_shipment_id,pickup_location,shipping_charge,weight,length,width,height,status) VALUES (?,?,?,?,?,?,?,?,?,?,'shipment_created')`, [order.id,"shiprocket",provider.order_id,provider.shipment_id,settings.pickup_location,order.shipping_amount || 0,Number(settings.default_weight_grams || 500) * items.reduce((sum, item) => sum + Number(item.quantity), 0) / 1000,settings.default_length_cm || 10,settings.default_width_cm || 10,settings.default_height_cm || 10]);
  await addEvent(result.insertId, "shipment_created", "Shipment created in Shiprocket");
  return ok(res, { id: result.insertId, provider_order_id: provider.order_id, provider_shipment_id: provider.shipment_id }, "Shipment created", 201);
}));

router.post("/shipments/:id/assign-courier", asyncHandler(async (req, res) => {
  const shipment = await getShipment(req.params.id, res); if (!shipment) return;
  const result = await shiprocketRequest("/courier/assign/awb", { method: "POST", body: { shipment_id: Number(shipment.provider_shipment_id) } });
  const data = result.response?.data || result.data || result;
  if (!data.awb_code) return fail(res, 502, result.response?.data?.awb_assign_error || "Shiprocket did not assign an AWB");
  await pool.query("UPDATE shipments SET courier_id=?,courier_name=?,awb_code=?,status='shipment_created' WHERE id=?", [data.courier_company_id || null,data.courier_name || null,data.awb_code,shipment.id]);
  await addEvent(shipment.id, "awb_assigned", `AWB ${data.awb_code} assigned`);
  return ok(res, data, "Courier and AWB assigned");
}));

router.post("/shipments/:id/schedule-pickup", asyncHandler(async (req, res) => {
  const shipment = await getShipment(req.params.id, res); if (!shipment) return;
  const result = await shiprocketRequest("/courier/generate/pickup", { method: "POST", body: { shipment_id: [Number(shipment.provider_shipment_id)] } });
  await pool.query("UPDATE shipments SET status='pickup_scheduled' WHERE id=?", [shipment.id]);
  await addEvent(shipment.id, "pickup_scheduled", result.response?.pickup_scheduled_date ? `Pickup scheduled for ${result.response.pickup_scheduled_date}` : "Pickup scheduled");
  return ok(res, result, "Pickup scheduled");
}));

router.post("/shipments/:id/refresh", asyncHandler(async (req, res) => {
  const shipment = await getShipment(req.params.id, res); if (!shipment) return;
  const result = await shiprocketRequest(`/courier/track/shipment/${encodeURIComponent(shipment.provider_shipment_id)}`);
  const tracking = result.tracking_data || result;
  for (const event of tracking.shipment_track_activities || []) await addEvent(shipment.id, normalizeStatus(event['sr-status-label'] || event.activity), event.activity, event.location, event.date);
  const status = normalizeStatus(tracking.shipment_status || tracking.track_status);
  if (allowedStatuses.has(status)) await pool.query("UPDATE shipments SET status=?,tracking_url=COALESCE(?,tracking_url) WHERE id=?", [status,tracking.track_url || null,shipment.id]);
  return ok(res, tracking, "Tracking refreshed");
}));

router.post("/shipments/:id/cancel", asyncHandler(async (req, res) => {
  const shipment = await getShipment(req.params.id, res); if (!shipment) return;
  await shiprocketRequest("/orders/cancel", { method: "POST", body: { ids: [Number(shipment.provider_order_id)] } });
  await pool.query("UPDATE shipments SET status='cancelled',cancelled_at=UTC_TIMESTAMP() WHERE id=?", [shipment.id]);
  await addEvent(shipment.id, "cancelled", "Shipment cancelled in Shiprocket");
  return ok(res, null, "Shipment cancelled");
}));

const allowedStatuses = new Set(['shipment_created','pickup_scheduled','picked_up','in_transit','out_for_delivery','delivered','delivery_failed','rto_initiated','rto_in_transit','rto_delivered','cancelled']);
function normalizeStatus(value) { const text = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""); if (text.includes("out_for_delivery")) return "out_for_delivery"; if (text.includes("delivered")) return text.includes("rto") ? "rto_delivered" : "delivered"; if (text.includes("transit")) return text.includes("rto") ? "rto_in_transit" : "in_transit"; if (text.includes("pickup")) return "picked_up"; return allowedStatuses.has(text) ? text : "shipment_created"; }
function parseJson(value) { try { return typeof value === "string" ? JSON.parse(value) : value || {}; } catch { return {}; } }
async function getShipment(value, res) { const id=parsePositiveId(value); if (!id) { fail(res,400,"Invalid shipment ID"); return null; } const [[row]]=await pool.query("SELECT * FROM shipments WHERE id=?",[id]); if (!row) { fail(res,404,"Shipment not found"); return null; } return row; }
async function addEvent(shipmentId,status,description=null,location=null,eventTime=null) { const key=createHash("sha256").update(`${shipmentId}|${status}|${description}|${eventTime || ""}`).digest("hex"); await pool.query("INSERT IGNORE INTO shipment_events(shipment_id,provider_event_id,status,description,location,event_time,raw_event_reference) VALUES (?,?,?,?,?,COALESCE(?,UTC_TIMESTAMP()),?)",[shipmentId,key,status,String(description || "").slice(0,500)||null,String(location || "").slice(0,190)||null,eventTime,key]); }

export default router;
