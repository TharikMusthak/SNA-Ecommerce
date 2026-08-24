import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { parsePositiveId } from "../../security/validation.js";
import { getCart } from "../../services/cart.js";
import { validateShippingQuote } from "../../services/shippingQuotes.js";
import { reservationExpiryDate } from "../../services/orderExpiry.js";
import { env } from "../../config/env.js";
import { queueUserEvent } from "../../integrations/notifications/notification.service.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";

const router = Router();
router.use(requireCustomer);
const orderCode = () =>
  `SNA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;

router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const addressId = parsePositiveId(req.body.address_id);
    const paymentMethod = String(
      req.body.payment_method || "cod",
    ).toLowerCase();
    const shippingQuoteId = parsePositiveId(req.body.shipping_quote_id);
    const idempotencyKey = String(req.get("idempotency-key") || "").trim();
    if (
      !addressId ||
      !shippingQuoteId ||
      !["cod", "razorpay"].includes(paymentMethod) ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 190
    )
      return fail(res, 422, "Validation failed", {
        checkout: [
          "A valid address, shipping quote, payment method, and Idempotency-Key (8-190 characters) are required",
        ],
      });
    if (paymentMethod !== "cod" && !env.onlinePaymentsEnabled)
      return fail(res, 503, "Online payments are currently unavailable", {
        code: "ONLINE_PAYMENTS_DISABLED",
      });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[previous]] = await connection.query(
        "SELECT id,order_code,amount,status,payment_status FROM orders WHERE user_id=? AND checkout_idempotency_key=? LIMIT 1 FOR UPDATE",
        [req.user.id, idempotencyKey],
      );
      if (previous) {
        const [[payment]] = await connection.query(
          "SELECT id,provider FROM payments WHERE order_id=? LIMIT 1",
          [previous.id],
        );
        await connection.rollback();
        return ok(
          res,
          {
            id: previous.id,
            order_number: previous.order_code,
            payment_id: payment?.id || null,
            payment_method: payment?.provider || null,
            replayed: true,
          },
          "Order already created",
        );
      }
      const [[address]] = await connection.query(
        "SELECT * FROM user_addresses WHERE id=? AND user_id=? FOR UPDATE",
        [addressId, req.user.id],
      );
      if (!address) {
        await connection.rollback();
        return fail(res, 404, "Delivery address not found");
      }
      const cart = await getCart(connection, req.user.id, { lock: true });
      if (!cart.items.length) {
        await connection.rollback();
        return fail(res, 409, "Cart is empty");
      }
      if (cart.invalid_coupon) {
        await connection.rollback();
        return fail(
          res,
          409,
          "The applied coupon is no longer valid; remove it before checkout",
        );
      }
      for (const item of cart.items) {
        if (Number(item.quantity) > Number(item.available_stock)) {
          await connection.rollback();
          return fail(res, 409, `${item.name} does not have enough stock`);
        }
      }
      const shippingQuote = await validateShippingQuote(connection, {
        quoteId: shippingQuoteId, userId: req.user.id, address, paymentMethod, cart,
      });
      const finalSummary = shippingQuote.summary;
      const code = orderCode();
      const displayProduct =
        cart.items.length === 1
          ? cart.items[0].name
          : `${cart.items.length} items`;
      const customer = `${req.user.first_name} ${req.user.last_name}`.trim();
      const [result] = await connection.query(
        `INSERT INTO orders (order_code,checkout_idempotency_key,customer,phone,product,amount,stage,user_id,address_id,status,payment_status,subtotal,tax_amount,shipping_amount,discount_amount,currency,shipping_address_json,reservation_expires_at) VALUES (?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          code,
          idempotencyKey,
          customer,
          address.phone,
          displayProduct,
          finalSummary.total,
          req.user.id,
          address.id,
          "pending",
          "pending",
          cart.summary.subtotal,
          cart.summary.tax,
          finalSummary.shipping,
          cart.summary.discount,
          "INR",
          JSON.stringify(address),
          paymentMethod === "cod" ? null : reservationExpiryDate(),
        ],
      );
      for (const item of cart.items) {
        await connection.query(
          `INSERT INTO order_items(order_id,product_id,variant_id,product_name,sku,unit_price,quantity,tax_amount,total_amount) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            result.insertId,
            item.product_id,
            item.variant_id,
            item.name,
            item.sku || null,
            item.unit_price,
            item.quantity,
            item.tax_amount,
            item.line_total,
          ],
        );
        if (item.variant_id) {
          const [stock] = await connection.query(
            "UPDATE product_variants SET stock=stock-? WHERE id=? AND stock>=?",
            [item.quantity, item.variant_id, item.quantity],
          );
          if (!stock.affectedRows)
            throw Object.assign(new Error("Stock changed during checkout"), {
              status: 409,
            });
        } else {
          const [[before]] = await connection.query(
            "SELECT stock FROM products WHERE id=? FOR UPDATE",
            [item.product_id],
          );
          const [stock] = await connection.query(
            "UPDATE products SET stock=stock-? WHERE id=? AND stock>=?",
            [item.quantity, item.product_id, item.quantity],
          );
          if (!stock.affectedRows)
            throw Object.assign(new Error("Stock changed during checkout"), {
              status: 409,
            });
          await connection.query(
            `INSERT INTO inventory_history(product_id,admin_id,action,quantity_change,previous_stock,new_stock,note) VALUES (?,NULL,'Sale',?,?,?,?)`,
            [
              item.product_id,
              -Number(item.quantity),
              Number(before.stock),
              Number(before.stock) - Number(item.quantity),
              `Order ${code}`,
            ],
          );
        }
      }
      const [payment] = await connection.query(
        `INSERT INTO payments(order_id,provider,amount_minor,currency,status,idempotency_key) VALUES (?,?,?,?, 'created',?)`,
        [
          result.insertId,
          paymentMethod,
          Math.round(finalSummary.total * 100),
          "INR",
          `checkout:${req.user.id}:${idempotencyKey}`.slice(0, 190),
        ],
      );
      if (cart.coupon_id)
        await connection.query(
          "INSERT INTO coupon_usage(coupon_id,user_id,order_id,discount_amount) VALUES (?,?,?,?)",
          [cart.coupon_id, req.user.id, result.insertId, cart.summary.discount],
        );
      await connection.query(
        `INSERT INTO order_status_history(order_id,status,note,actor_type,actor_id) VALUES (?,'pending','Order created','customer',?)`,
        [result.insertId, req.user.id],
      );
      await connection.query("DELETE FROM cart_items WHERE cart_id=?", [
        cart.id,
      ]);
      await connection.commit();
      await queueUserEvent({ userId:req.user.id,event:"order_created",entityType:"order",entityId:result.insertId,payload:{ orderNumber:code,total:finalSummary.total,paymentMethod } }).catch(() => []);
      return ok(
        res,
        {
          id: result.insertId,
          order_number: code,
          payment_id: payment.insertId,
          payment_method: paymentMethod,
          summary: finalSummary,
        },
        "Order created successfully",
        201,
      );
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        const [[existing]] = await pool.query(
          "SELECT id,order_code FROM orders WHERE user_id=? AND checkout_idempotency_key=? LIMIT 1",
          [req.user.id, idempotencyKey],
        );
        if (existing)
          return ok(
            res,
            {
              id: existing.id,
              order_number: existing.order_code,
              replayed: true,
            },
            "Order already created",
          );
        return fail(res, 409, "Duplicate checkout request");
      }
      if (error.status === 409) return fail(res, 409, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1),
      limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const where = [
      "o.user_id=?",
      "(o.payment_status='paid' OR EXISTS (SELECT 1 FROM payments valid_payment WHERE valid_payment.order_id=o.id AND valid_payment.provider='cod'))",
    ];
    const params = [req.user.id];
    if (req.query.scope === "current") where.push("o.status NOT IN ('delivered','cancelled','returned','refunded','failed')");
    if (req.query.scope === "unpaid") where.push("o.payment_status<>'paid' AND EXISTS (SELECT 1 FROM payments cod_payment WHERE cod_payment.order_id=o.id AND cod_payment.provider='cod')");
    const clause = `WHERE ${where.join(" AND ")}`;
    const [[counts], [rowsResult]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM orders o ${clause}`, params),
      pool.query(
        `SELECT o.id,o.order_code,o.amount,o.status,o.payment_status,o.currency,o.shipping_address_json,o.created_at,
                (SELECT provider FROM payments payment_method WHERE payment_method.order_id=o.id ORDER BY payment_method.id DESC LIMIT 1) AS payment_method
           FROM orders o ${clause} ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, (page - 1) * limit],
      ),
    ]);
    const orderIds = rowsResult.map((order) => order.id);
    if (orderIds.length) {
      const placeholders = orderIds.map(() => "?").join(",");
      const [items] = await pool.query(
        `SELECT oi.id,oi.order_id,oi.product_id,oi.product_name,oi.sku,oi.unit_price,oi.quantity,oi.total_amount,p.main_image AS product_image
           FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id
          WHERE oi.order_id IN (${placeholders}) ORDER BY oi.id`,
        orderIds,
      );
      for (const order of rowsResult) order.items = items.filter((item) => Number(item.order_id) === Number(order.id));
    }
    return paginated(res, rowsResult, {
      page,
      limit,
      total: Number(counts[0].total),
    });
  }),
);
router.get(
  "/:id/invoice",
  asyncHandler((req, res) => getOrder(req, res, true)),
);
router.get(
  "/:id/tracking",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid order ID");
    const [[order]] = await pool.query(
      "SELECT id,order_code,status,updated_at FROM orders WHERE id=? AND user_id=?",
      [id, req.user.id],
    );
    if (!order) return fail(res, 404, "Order not found");
    const [history] = await pool.query(
      "SELECT status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY id",
      [id],
    );
    return ok(res, {
      order_number: order.order_code,
      current_status: order.status,
      history,
    });
  }),
);
router.put(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid order ID");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[order]] = await connection.query(
        "SELECT * FROM orders WHERE id=? AND user_id=? FOR UPDATE",
        [id, req.user.id],
      );
      if (!order) {
        await connection.rollback();
        return fail(res, 404, "Order not found");
      }
      if (!["pending", "confirmed"].includes(order.status)) {
        await connection.rollback();
        return fail(res, 409, "This order can no longer be cancelled");
      }
      const [items] = await connection.query(
        "SELECT product_id,variant_id,quantity FROM order_items WHERE order_id=?",
        [id],
      );
      for (const item of items) {
        if (item.variant_id)
          await connection.query(
            "UPDATE product_variants SET stock=stock+? WHERE id=?",
            [item.quantity, item.variant_id],
          );
        else
          await connection.query(
            "UPDATE products SET stock=stock+? WHERE id=?",
            [item.quantity, item.product_id],
          );
      }
      await connection.query(
        "UPDATE orders SET status='cancelled' WHERE id=?",
        [id],
      );
      await connection.query(
        `INSERT INTO order_status_history(order_id,status,note,actor_type,actor_id) VALUES (?,'cancelled',?,'customer',?)`,
        [
          id,
          String(req.body.reason || "Cancelled by customer").slice(0, 500),
          req.user.id,
        ],
      );
      await connection.commit();
      await queueUserEvent({ userId:req.user.id,event:"order_cancelled",entityType:"order",entityId:id,payload:{ orderNumber:order.order_code } }).catch(() => []);
      return ok(res, null, "Order cancelled successfully");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);
router.post(
  "/:id/reorder",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid order ID");
    const [items] = await pool.query(
      "SELECT oi.product_id,oi.variant_id,oi.quantity FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.id=? AND o.user_id=?",
      [id, req.user.id],
    );
    if (!items.length) return fail(res, 404, "Order not found");
    const [[cart]] = await pool.query("SELECT id FROM carts WHERE user_id=?", [
      req.user.id,
    ]);
    if (!cart)
      await pool.query("INSERT INTO carts(user_id) VALUES (?)", [req.user.id]);
    const [[target]] = await pool.query(
      "SELECT id FROM carts WHERE user_id=?",
      [req.user.id],
    );
    for (const item of items) {
      const [[available]] = await pool.query(
        `SELECT COALESCE(v.stock,p.stock) AS stock FROM products p LEFT JOIN product_variants v ON v.id=? WHERE p.id=? AND p.status='Active' AND p.deleted_at IS NULL`,
        [item.variant_id, item.product_id],
      );
      if (!available || Number(available.stock) < 1) continue;
      const quantity = Math.min(Number(item.quantity), Number(available.stock));
      const [[existing]] = await pool.query(
        "SELECT id FROM cart_items WHERE cart_id=? AND product_id=? AND variant_id <=> ?",
        [target.id, item.product_id, item.variant_id],
      );
      if (existing)
        await pool.query(
          "UPDATE cart_items SET quantity=LEAST(quantity+?,?) WHERE id=?",
          [quantity, Number(available.stock), existing.id],
        );
      else
        await pool.query(
          "INSERT INTO cart_items(cart_id,product_id,variant_id,quantity) VALUES (?,?,?,?)",
          [target.id, item.product_id, item.variant_id, quantity],
        );
    }
    return ok(res, null, "Available items were added to your cart");
  }),
);
router.get(
  "/:id",
  asyncHandler((req, res) => getOrder(req, res, false)),
);
async function getOrder(req, res, invoice) {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid order ID");
  const [[order]] = await pool.query(
    "SELECT * FROM orders WHERE id=? AND user_id=?",
    [id, req.user.id],
  );
  if (!order) return fail(res, 404, "Order not found");
  const [[items], [history], [payments]] = await Promise.all([
    pool.query(
      "SELECT id,product_id,variant_id,product_name,sku,unit_price,quantity,tax_amount,total_amount FROM order_items WHERE order_id=?",
      [id],
    ),
    pool.query(
      "SELECT status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY id",
      [id],
    ),
    pool.query(
      "SELECT id,provider,amount_minor,currency,status,created_at FROM payments WHERE order_id=?",
      [id],
    ),
  ]);
  return ok(res, {
    ...order,
    items,
    history,
    payments,
    document_type: invoice ? "invoice" : undefined,
  });
}
export default router;
