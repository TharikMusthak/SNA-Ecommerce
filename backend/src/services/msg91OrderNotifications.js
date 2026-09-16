import { pool as defaultPool } from "../config/db.js";
import { sendMsg91OrderSms } from "../integrations/notifications/msg91.provider.js";

export async function notifyMsg91OrderEvent({
  event,
  orderId,
  refundAmount = null,
  database = defaultPool,
}) {
  const [[order]] = await database.query(
    `SELECT o.order_code,o.customer,o.phone,u.first_name,u.last_name,u.phone AS user_phone,
            s.courier_name,s.awb_code
       FROM orders o
       LEFT JOIN users u ON u.id=o.user_id
       LEFT JOIN shipments s ON s.order_id=o.id
      WHERE o.id=? LIMIT 1`,
    [orderId],
  );
  if (!order) return { skipped: true, reason: "ORDER_NOT_FOUND" };

  const name = [order.first_name, order.last_name].filter(Boolean).join(" ") || order.customer || "Customer";
  const common = { name, order_number: order.order_code };
  let variables;
  if (event === "order_shipped") {
    if (!order.awb_code) return { skipped: true, reason: "AWB_MISSING" };
    variables = {
      ...common,
      courier: order.courier_name || "Delivery partner",
      tracking_id: String(order.awb_code),
    };
  } else if (event === "refund_completed") {
    const paise = Math.round(Number(refundAmount || 0) * 100);
    variables = {
      name,
      rupees: String(Math.floor(paise / 100)),
      paise: String(Math.abs(paise % 100)).padStart(2, "0"),
      order_number: order.order_code,
    };
  } else {
    variables = common;
  }
  return sendMsg91OrderSms({
    event,
    mobile: order.user_phone || order.phone,
    variables,
  });
}

export function safelyNotifyMsg91Order(input) {
  return notifyMsg91OrderEvent(input).catch((error) => {
    console.error("MSG91 order SMS failed:", error.code || error.message);
    return { skipped: true, reason: error.code || "SEND_FAILED" };
  });
}
