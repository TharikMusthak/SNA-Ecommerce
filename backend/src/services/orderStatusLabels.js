import { pool } from "../config/db.js";

export const ORDER_STATUS_DEFAULT_LABELS = Object.freeze({
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
});

export const ORDER_STATUS_KEYS = Object.freeze(
  Object.keys(ORDER_STATUS_DEFAULT_LABELS),
);

export async function getOrderStatusLabels(database = pool) {
  const labels = { ...ORDER_STATUS_DEFAULT_LABELS };
  let rows;
  try {
    [rows] = await database.query(
      `SELECT status_key, display_label
         FROM frontend_order_status_labels
        WHERE status_key IN (${ORDER_STATUS_KEYS.map(() => "?").join(",")})`,
      ORDER_STATUS_KEYS,
    );
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") return labels;
    throw error;
  }
  for (const row of rows) labels[row.status_key] = row.display_label;
  return labels;
}
