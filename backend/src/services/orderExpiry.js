import { pool as defaultPool } from "../config/db.js";
import { env } from "../config/env.js";

export async function expireOrderReservations({
  pool = defaultPool,
  limit = 100,
  now = new Date(),
  beforeCommit,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [candidates] = await pool.query(
    `SELECT o.id
       FROM orders o
       JOIN payments p ON p.order_id=o.id
      WHERE o.status='pending'
        AND o.payment_status IN ('pending','authorized')
        AND p.provider<>'cod'
        AND o.reservation_expires_at IS NOT NULL
        AND o.reservation_expires_at<=?
        AND o.reservation_released_at IS NULL
      ORDER BY o.reservation_expires_at, o.id
      LIMIT ?`,
    [now, safeLimit],
  );

  const result = { examined: candidates.length, expired: 0, skipped: 0, failed: 0, failures: [] };
  for (const candidate of candidates) {
    try {
      const expired = await expireOne(candidate.id, { pool, now, beforeCommit });
      if (expired) result.expired += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({ orderId: candidate.id, code: error.code || "EXPIRY_FAILED" });
      console.error(`Order reservation expiry failed for order ${candidate.id}:`, error.message);
    }
  }
  return result;
}

async function expireOne(orderId, { pool, now, beforeCommit }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[order]] = await connection.query(
      `SELECT o.id,o.order_code,o.status,o.payment_status,o.reservation_expires_at,
              o.reservation_released_at,p.provider
         FROM orders o JOIN payments p ON p.order_id=o.id
        WHERE o.id=? FOR UPDATE`,
      [orderId],
    );
    const eligible = order
      && order.status === "pending"
      && ["pending", "authorized"].includes(order.payment_status)
      && order.provider !== "cod"
      && order.reservation_expires_at
      && new Date(order.reservation_expires_at) <= now
      && !order.reservation_released_at;
    if (!eligible) {
      await connection.rollback();
      return false;
    }

    const [items] = await connection.query(
      "SELECT product_id,variant_id,quantity FROM order_items WHERE order_id=?",
      [order.id],
    );
    for (const item of items) {
      if (item.variant_id) {
        const [[stock]] = await connection.query("SELECT stock FROM product_variants WHERE id=? FOR UPDATE", [item.variant_id]);
        if (!stock) continue;
        await connection.query("UPDATE product_variants SET stock=stock+? WHERE id=?", [item.quantity, item.variant_id]);
        await recordInventory(connection, item, Number(stock.stock), "ReservationExpiry", order);
      } else {
        const [[stock]] = await connection.query("SELECT stock FROM products WHERE id=? FOR UPDATE", [item.product_id]);
        if (!stock) continue;
        await connection.query("UPDATE products SET stock=stock+? WHERE id=?", [item.quantity, item.product_id]);
        await recordInventory(connection, item, Number(stock.stock), "ReservationExpiry", order);
      }
    }
    const [update] = await connection.query(
      `UPDATE orders
          SET status='failed',payment_status='failed',reservation_released_at=?,expired_at=?
        WHERE id=? AND status='pending' AND reservation_released_at IS NULL`,
      [now, now, order.id],
    );
    if (!update.affectedRows) {
      await connection.rollback();
      return false;
    }
    await connection.query("UPDATE payments SET status='failed' WHERE order_id=? AND status<>'paid'", [order.id]);
    await connection.query(
      `INSERT INTO order_status_history(order_id,status,note,actor_type)
       VALUES (?,'failed','Online-payment reservation expired; stock released','system')`,
      [order.id],
    );
    await connection.query(
      `INSERT INTO audit_logs(actor_type,action,entity_type,entity_id,metadata)
       VALUES ('system','order.reservation_expired','order',?,?)`,
      [String(order.id), JSON.stringify({ orderCode: order.order_code, stockReleased: true })],
    );
    if (beforeCommit) await beforeCommit({ connection, order });
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordInventory(connection, item, previousStock, action, order) {
  await connection.query(
    `INSERT INTO inventory_history
      (product_id,variant_id,admin_id,action,quantity_change,previous_stock,new_stock,reference_type,reference_id,note)
     VALUES (?,?,NULL,?,?,?,?, 'order',?,?)`,
    [item.product_id, item.variant_id || null, action, Number(item.quantity), previousStock, previousStock + Number(item.quantity), order.id, `Expired reservation ${order.order_code}`],
  );
}

export function reservationExpiryDate(from = new Date()) {
  return new Date(from.getTime() + env.orderExpiry.minutes * 60_000);
}
