import { pool } from "../config/db.js";

const ORDER_COLUMNS = `
  o.id,o.order_code,o.customer,o.phone,o.product,o.amount,o.stage,
  o.user_id,o.address_id,o.status,o.payment_status,o.subtotal,o.tax_amount,
  o.shipping_amount,o.discount_amount,o.currency,o.shipping_address_json,
  o.reservation_expires_at,o.reservation_released_at,o.expired_at,
  o.shipping_provider,o.delivery_pincode,o.estimated_delivery_date,
  o.actual_shipping_cost,o.created_at,o.updated_at`;

export async function findOrderDetails({
  orderId,
  userId = null,
  includeInternal = false,
  database = pool,
}) {
  const ownership = userId ? " AND o.user_id=?" : "";
  const params = userId ? [orderId, userId] : [orderId];
  const [[order]] = await database.query(
    `SELECT ${ORDER_COLUMNS},
            u.first_name AS user_first_name,u.last_name AS user_last_name,
            u.email AS user_email,u.phone AS user_phone,u.status AS user_status,
            u.email_verified_at
     FROM orders o
     LEFT JOIN users u ON u.id=o.user_id
     WHERE o.id=?${ownership}
     LIMIT 1`,
    params,
  );
  if (!order) return null;

  const paymentColumns = includeInternal
    ? "id,provider,provider_order_id,provider_payment_id,amount_minor,currency,status,created_at,updated_at"
    : "id,provider,amount_minor,currency,status,created_at,updated_at";
  const historyColumns = includeInternal
    ? "id,status,note,actor_type,actor_id,created_at"
    : "id,status,note,created_at";
  const returnColumns = includeInternal
    ? "id,return_code,reason,comments,status,refund_amount,admin_notes,completed_at,created_at,updated_at"
    : "id,return_code,reason,comments,status,refund_amount,completed_at,created_at,updated_at";

  const [[items], [statusHistory], [payments], [couponRows], [shipmentRows], [returnRows]] =
    await Promise.all([
      database.query(
        `SELECT oi.id,oi.product_id,oi.variant_id,oi.product_name,oi.sku,
                oi.unit_price,oi.quantity,oi.tax_amount,oi.total_amount,oi.created_at,
                p.slug AS product_slug,p.main_image AS product_image,
                v.brand AS variant_brand,v.color AS variant_color,v.size AS variant_size
         FROM order_items oi
         LEFT JOIN products p ON p.id=oi.product_id
         LEFT JOIN product_variants v ON v.id=oi.variant_id
         WHERE oi.order_id=? ORDER BY oi.id`,
        [orderId],
      ),
      database.query(
        `SELECT ${historyColumns} FROM order_status_history WHERE order_id=? ORDER BY id`,
        [orderId],
      ),
      database.query(
        `SELECT ${paymentColumns} FROM payments WHERE order_id=? ORDER BY id`,
        [orderId],
      ),
      database.query(
        `SELECT c.id,c.code,c.discount_type,c.discount_value,
                cu.discount_amount,cu.created_at AS applied_at
         FROM coupon_usage cu JOIN coupons c ON c.id=cu.coupon_id
         WHERE cu.order_id=? ORDER BY cu.id DESC LIMIT 1`,
        [orderId],
      ),
      database.query(
        `SELECT id,order_id,provider,provider_order_id,provider_shipment_id,
                courier_id,courier_name,awb_code,pickup_location,shipping_charge,
                actual_shipping_cost,weight,length,width,height,status,tracking_url,
                estimated_delivery_at,picked_up_at,shipped_at,delivered_at,
                cancelled_at,created_at,updated_at
         FROM shipments WHERE order_id=? LIMIT 1`,
        [orderId],
      ),
      database.query(
        `SELECT ${returnColumns} FROM returns WHERE order_id=? ORDER BY id DESC`,
        [orderId],
      ),
    ]);

  const shipment = shipmentRows[0]
    ? await shipmentDetails(database, shipmentRows[0], includeInternal)
    : null;
  const returns = await returnDetails(
    database,
    returnRows,
    includeInternal,
  );
  return formatOrder({
    order,
    items,
    statusHistory,
    payments,
    coupon: couponRows[0] || null,
    shipment,
    returns,
    includeInternal,
  });
}

export async function findAdminOrdersDetails(orderIds, database = pool) {
  const ids = [...new Set(orderIds.map(Number).filter(Number.isSafeInteger))];
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [[orders], [items], [statusHistory], [payments], [coupons], [shipments], [returnRows]] =
    await Promise.all([
      database.query(
        `SELECT ${ORDER_COLUMNS},
                u.first_name AS user_first_name,u.last_name AS user_last_name,
                u.email AS user_email,u.phone AS user_phone,u.status AS user_status,
                u.email_verified_at
         FROM orders o LEFT JOIN users u ON u.id=o.user_id
         WHERE o.id IN (${placeholders})`,
        ids,
      ),
      database.query(
        `SELECT oi.order_id,oi.id,oi.product_id,oi.variant_id,oi.product_name,oi.sku,
                oi.unit_price,oi.quantity,oi.tax_amount,oi.total_amount,oi.created_at,
                p.slug AS product_slug,p.main_image AS product_image,
                v.brand AS variant_brand,v.color AS variant_color,v.size AS variant_size
         FROM order_items oi
         LEFT JOIN products p ON p.id=oi.product_id
         LEFT JOIN product_variants v ON v.id=oi.variant_id
         WHERE oi.order_id IN (${placeholders}) ORDER BY oi.id`,
        ids,
      ),
      database.query(
        `SELECT order_id,id,status,note,actor_type,actor_id,created_at
         FROM order_status_history WHERE order_id IN (${placeholders}) ORDER BY id`,
        ids,
      ),
      database.query(
        `SELECT order_id,id,provider,provider_order_id,provider_payment_id,
                amount_minor,currency,status,created_at,updated_at
         FROM payments WHERE order_id IN (${placeholders}) ORDER BY id`,
        ids,
      ),
      database.query(
        `SELECT cu.order_id,c.id,c.code,c.discount_type,c.discount_value,
                cu.discount_amount,cu.created_at AS applied_at
         FROM coupon_usage cu JOIN coupons c ON c.id=cu.coupon_id
         WHERE cu.order_id IN (${placeholders}) ORDER BY cu.id DESC`,
        ids,
      ),
      database.query(
        `SELECT id,order_id,provider,provider_order_id,provider_shipment_id,
                courier_id,courier_name,awb_code,pickup_location,shipping_charge,
                actual_shipping_cost,weight,length,width,height,status,tracking_url,
                estimated_delivery_at,picked_up_at,shipped_at,delivered_at,
                cancelled_at,created_at,updated_at
         FROM shipments WHERE order_id IN (${placeholders})`,
        ids,
      ),
      database.query(
        `SELECT order_id,id,return_code,reason,comments,status,refund_amount,
                admin_notes,completed_at,created_at,updated_at
         FROM returns WHERE order_id IN (${placeholders}) ORDER BY id DESC`,
        ids,
      ),
    ]);

  const shipmentIds = shipments.map((shipment) => shipment.id);
  const [shipmentTimeline] = shipmentIds.length
    ? await database.query(
        `SELECT shipment_id,id,status,description,location,event_time AS timestamp
         FROM shipment_events
         WHERE shipment_id IN (${shipmentIds.map(() => "?").join(",")})
         ORDER BY event_time,id`,
        shipmentIds,
      )
    : [[]];
  const returns = await returnDetails(database, returnRows, true);
  const byId = new Map(orders.map((order) => [Number(order.id), order]));

  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((order) => {
      const shipmentRecord = shipments.find(
        (entry) => Number(entry.order_id) === Number(order.id),
      );
      const shipment = shipmentRecord
        ? sanitizeShipment(
            shipmentRecord,
            shipmentTimeline.filter(
              (event) => Number(event.shipment_id) === Number(shipmentRecord.id),
            ),
            true,
          )
        : null;
      return formatOrder({
        order,
        items: items.filter(
          (item) => Number(item.order_id) === Number(order.id),
        ),
        statusHistory: statusHistory.filter(
          (entry) => Number(entry.order_id) === Number(order.id),
        ),
        payments: payments.filter(
          (payment) => Number(payment.order_id) === Number(order.id),
        ),
        coupon:
          coupons.find(
            (coupon) => Number(coupon.order_id) === Number(order.id),
          ) || null,
        shipment,
        returns: returns.filter(
          (record) => Number(record.order_id) === Number(order.id),
        ),
        includeInternal: true,
      });
    });
}

function formatOrder({
  order,
  items,
  statusHistory,
  payments,
  coupon,
  shipment,
  returns,
  includeInternal,
}) {
  const recordedItemCount = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
  const shippingAddress = parseJson(order.shipping_address_json);
  const customerDetails = {
    id: order.user_id,
    first_name: order.user_first_name,
    last_name: order.user_last_name,
    name:
      [order.user_first_name, order.user_last_name].filter(Boolean).join(" ") ||
      order.customer,
    email: order.user_email,
    phone: order.user_phone || order.phone,
    ...(includeInternal
      ? {
          status: order.user_status,
          email_verified_at: order.email_verified_at,
        }
      : {}),
  };

  delete order.user_first_name;
  delete order.user_last_name;
  delete order.user_email;
  delete order.user_phone;
  delete order.user_status;
  delete order.email_verified_at;

  const normalizedPayments = payments.map((payment) => ({
    ...payment,
    amount: Number(payment.amount_minor) / 100,
  }));

  return {
    ...order,
    order_number: order.order_code,
    customer_details: customerDetails,
    shipping_address: shippingAddress,
    summary: {
      subtotal: money(order.subtotal),
      tax: money(order.tax_amount),
      shipping: money(order.shipping_amount),
      discount: money(order.discount_amount),
      total: money(order.amount),
      currency: order.currency,
    },
    items,
    item_count: recordedItemCount || legacyItemCount(order.product),
    history: statusHistory,
    status_history: statusHistory,
    payments: normalizedPayments,
    payment: normalizedPayments[0] || null,
    coupon,
    shipment,
    returns,
    actions: {
      can_cancel: ["pending", "confirmed"].includes(order.status),
      can_return: order.status === "delivered",
      can_reorder: items.length > 0,
    },
  };
}

function legacyItemCount(productSummary) {
  const value = String(productSummary || "").trim();
  if (!value) return 0;
  const match = value.match(/^(\d+)\s+items?$/i);
  return match ? Number(match[1]) : 1;
}

async function shipmentDetails(database, shipment, includeInternal) {
  const [timeline] = await database.query(
    `SELECT id,status,description,location,event_time AS timestamp
     FROM shipment_events WHERE shipment_id=? ORDER BY event_time,id`,
    [shipment.id],
  );
  return sanitizeShipment(shipment, timeline, includeInternal);
}

function sanitizeShipment(shipment, timeline, includeInternal) {
  if (includeInternal) return { ...shipment, timeline };
  const {
    provider_order_id: _providerOrderId,
    provider_shipment_id: _providerShipmentId,
    courier_id: _courierId,
    pickup_location: _pickupLocation,
    actual_shipping_cost: _actualShippingCost,
    ...publicShipment
  } = shipment;
  return { ...publicShipment, timeline };
}

async function returnDetails(database, records, includeInternal) {
  if (!records.length) return [];
  const ids = records.map((record) => record.id);
  const placeholders = ids.map(() => "?").join(",");
  const historyColumns = includeInternal
    ? "id,return_id,from_status,to_status,note,actor_type,actor_id,created_at"
    : "id,return_id,from_status,to_status,created_at";
  const [[items], [history], [refunds]] = await Promise.all([
    database.query(
      `SELECT ri.id,ri.return_id,ri.order_item_id,ri.quantity,
              ri.eligible_amount,ri.accepted_quantity,ri.restocked_quantity,
              ri.disposition,oi.product_name,oi.sku
       FROM return_items ri JOIN order_items oi ON oi.id=ri.order_item_id
       WHERE ri.return_id IN (${placeholders}) ORDER BY ri.id`,
      ids,
    ),
    database.query(
      `SELECT ${historyColumns} FROM return_status_history
       WHERE return_id IN (${placeholders}) ORDER BY id`,
      ids,
    ),
    database.query(
      `SELECT id,return_id,refund_reference,refund_method,eligible_amount,
              refunded_amount,status,processed_at,created_at
       FROM refund_records WHERE return_id IN (${placeholders}) ORDER BY id`,
      ids,
    ),
  ]);
  return records.map((record) => ({
    ...record,
    items: items.filter((item) => Number(item.return_id) === Number(record.id)),
    history: history.filter(
      (entry) => Number(entry.return_id) === Number(record.id),
    ),
    refunds: refunds.filter(
      (refund) => Number(refund.return_id) === Number(record.id),
    ),
  }));
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function money(value) {
  const number = Number(value || 0);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
