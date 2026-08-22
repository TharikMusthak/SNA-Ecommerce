import { Router } from "express";
import { pool } from "../config/db.js";
import { allowRoles, requireAdmin } from "../middleware/auth.js";
import {
  cleanText,
  isAllowed,
  parsePositiveId,
} from "../security/validation.js";
import { queueUserEvent } from "../integrations/notifications/notification.service.js";

const router = Router();
const manageContent = allowRoles("Super Admin", "Product Manager");
const manageOrders = allowRoles("Super Admin", "Order Manager");
const PRODUCT_STATUSES = ["Active", "Draft"];
const FAQ_STATUSES = ["Published", "Draft"];
const PAGE_STATUSES = ["Published", "Draft"];

router.get("/public/pages/:slug", async (req, res) => {
  const slug = safeSlug(req.params.slug);
  if (!slug) return res.status(400).json({ message: "Invalid page slug" });

  const [[page]] = await pool.query(
    `SELECT slug, title, content, updated_at
     FROM cms_pages
     WHERE slug = ? AND status = 'Published'
     LIMIT 1`,
    [slug],
  );
  if (!page) return res.status(404).json({ message: "Page not found" });
  res.json(page);
});

router.use(requireAdmin);

router.get("/pages", manageContent, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, slug, title, content, status, created_at, updated_at
     FROM cms_pages
     ORDER BY title`,
  );
  res.json(rows);
});

router.get("/pages/:slug", manageContent, async (req, res) => {
  const slug = safeSlug(req.params.slug);
  if (!slug) return res.status(400).json({ message: "Invalid page slug" });

  const [[page]] = await pool.query(
    `SELECT id, slug, title, content, status, created_at, updated_at
     FROM cms_pages
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  );
  if (!page) return res.status(404).json({ message: "Page not found" });
  res.json(page);
});

router.put("/pages/:slug", manageContent, async (req, res) => {
  const slug = safeSlug(req.params.slug);
  const title = cleanText(req.body.title, 190);
  const content = cleanText(req.body.content, 50000);
  const status = req.body.status || "Published";

  if (!slug || !title || !content) {
    return res.status(400).json({
      message: "Valid page slug, title and content are required",
    });
  }
  if (!isAllowed(status, PAGE_STATUSES)) {
    return res.status(400).json({ message: "Invalid page status" });
  }

  await pool.query(
    `INSERT INTO cms_pages(slug, title, content, status)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       content = VALUES(content),
       status = VALUES(status)`,
    [slug, title, content, status],
  );
  res.json({ message: "CMS page updated", slug });
});

router.get("/dashboard", async (req, res) => {
  const dashboard = {
    products: [],
    orders: [],
    faqs: [],
    banners: [],
    variants: [],
  };

  if (req.admin.role !== "Order Manager") {
    const [[products], [faqs], [banners], [variants]] = await Promise.all([
      pool.query("SELECT * FROM products ORDER BY id DESC"),
      pool.query("SELECT * FROM faqs ORDER BY sort_order, id"),
      pool.query("SELECT * FROM banners ORDER BY sort_order, id DESC"),
      pool.query(
        `SELECT v.*, p.name AS product_name
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         ORDER BY v.id DESC`,
      ),
    ]);
    Object.assign(dashboard, { products, faqs, banners, variants });
  }

  if (req.admin.role !== "Product Manager") {
    const [orders] = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    dashboard.orders = orders;
  }

  res.json(dashboard);
});

router.get("/orders/:id/details", manageOrders, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid order ID" });

  const [[orderRows], [items], [payments]] = await Promise.all([
    pool.query("SELECT * FROM orders WHERE id=? LIMIT 1", [id]),
    pool.query(
      `SELECT oi.*,p.main_image AS product_image,p.slug AS product_slug
         FROM order_items oi
         LEFT JOIN products p ON p.id=oi.product_id
        WHERE oi.order_id=?
        ORDER BY oi.id`,
      [id],
    ),
    pool.query(
      "SELECT id,provider,provider_payment_id,amount_minor,currency,status,created_at,updated_at FROM payments WHERE order_id=? ORDER BY id DESC",
      [id],
    ),
  ]);

  const order = orderRows[0];
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({
    ...order,
    order_number: order.order_code,
    items,
    item_count: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    payments,
    payment: payments[0] || null,
  });
});

router.post("/orders/:id/cod-collected", manageOrders, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid order ID" });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[record]] = await connection.query(
      `SELECT o.id,o.status,o.payment_status,p.id AS payment_id,p.status AS provider_status
         FROM orders o
         JOIN payments p ON p.order_id=o.id AND p.provider='cod'
        WHERE o.id=?
        ORDER BY p.id DESC
        LIMIT 1
        FOR UPDATE`,
      [id],
    );
    if (!record) {
      await connection.rollback();
      return res.status(409).json({ message: "This order is not Cash on Delivery" });
    }
    if (record.payment_status === "paid") {
      await connection.rollback();
      return res.json({ message: "COD payment was already collected" });
    }
    if (["cancelled", "returned", "refunded", "failed"].includes(record.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Payment cannot be collected for this order status" });
    }

    await connection.query("UPDATE payments SET status='paid' WHERE id=?", [record.payment_id]);
    await connection.query("UPDATE orders SET payment_status='paid' WHERE id=?", [id]);
    await connection.query(
      "INSERT INTO order_status_history(order_id,status,note,actor_type,actor_id) VALUES (?,?,?,'admin',?)",
      [id, record.status, "Cash on Delivery payment collected", req.admin.id],
    );
    await connection.commit();
    res.json({ message: "COD payment marked as collected", payment_status: "paid" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/variants", manageContent, async (req, res) => {
  const input = parseVariant(req.body);
  if (input.error) return res.status(400).json({ message: input.error });

  const [result] = await pool.query(
    `INSERT INTO product_variants
      (product_id, brand, color, size, sku, price, stock, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(input.value),
  );
  res.status(201).json({ id: result.insertId });
});

router.put("/variants/:id", manageContent, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const input = parseVariant(req.body);
  if (!id || input.error) {
    return res.status(400).json({
      message: input.error || "Invalid variant ID",
    });
  }

  const [result] = await pool.query(
    `UPDATE product_variants
     SET product_id = ?, brand = ?, color = ?, size = ?, sku = ?,
         price = ?, stock = ?, status = ?
     WHERE id = ?`,
    [...Object.values(input.value), id],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "Variant not found" });
  }
  res.json({ message: "Variant updated" });
});

router.delete("/variants/:id", manageContent, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid variant ID" });

  const [result] = await pool.query(
    "DELETE FROM product_variants WHERE id = ?",
    [id],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "Variant not found" });
  }
  res.json({ message: "Variant deleted" });
});

router.post("/faqs", manageContent, async (req, res) => {
  const input = parseFaq(req.body);
  if (input.error) return res.status(400).json({ message: input.error });

  const [result] = await pool.query(
    "INSERT INTO faqs(question, answer, status) VALUES (?, ?, ?)",
    Object.values(input.value),
  );
  res.status(201).json({ id: result.insertId });
});

router.put("/faqs/:id", manageContent, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const input = parseFaq(req.body);
  if (!id || input.error) {
    return res.status(400).json({
      message: input.error || "Invalid FAQ ID",
    });
  }

  const [result] = await pool.query(
    "UPDATE faqs SET question = ?, answer = ?, status = ? WHERE id = ?",
    [...Object.values(input.value), id],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "FAQ not found" });
  }
  res.json({ message: "FAQ updated" });
});

router.delete("/faqs/:id", manageContent, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid FAQ ID" });

  const [result] = await pool.query("DELETE FROM faqs WHERE id = ?", [id]);
  if (!result.affectedRows) {
    return res.status(404).json({ message: "FAQ not found" });
  }
  res.json({ message: "FAQ deleted" });
});

router.put("/orders/:id/stage", manageOrders, async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const stage = Number(req.body.stage);

  if (!id || !Number.isInteger(stage) || stage < 1 || stage > 9) {
    return res.status(400).json({
      message: "Valid order ID and stage from 1 to 9 required",
    });
  }

  const statusByStage = [
    null,
    "pending",
    "confirmed",
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "returned",
  ];
  const nextStatus = statusByStage[stage];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[order]] = await connection.query(
      "SELECT id,user_id,order_code,status,stage FROM orders WHERE id=? FOR UPDATE",
      [id],
    );
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }
    if (
      ["cancelled", "returned", "refunded"].includes(order.status) &&
      order.status !== nextStatus
    ) {
      await connection.rollback();
      return res
        .status(409)
        .json({ message: "A terminal order cannot move to another stage" });
    }
    if (stage === 8 && order.status !== "cancelled") {
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
    }
    await connection.query("UPDATE orders SET stage=?,status=? WHERE id=?", [
      stage,
      nextStatus,
      id,
    ]);
    if (stage === 7) {
      await connection.query(
        "UPDATE payments SET status='paid' WHERE order_id=? AND provider='cod' AND status='created'",
        [id],
      );
      await connection.query(
        "UPDATE orders SET payment_status='paid' WHERE id=? AND EXISTS (SELECT 1 FROM payments WHERE order_id=? AND provider='cod')",
        [id, id],
      );
    }
    if (order.status !== nextStatus) {
      await connection.query(
        "INSERT INTO order_status_history(order_id,status,note,actor_type,actor_id) VALUES (?,?,?,'admin',?)",
        [id, nextStatus, "Updated from admin panel", req.admin.id],
      );
    }
    await connection.commit();
    const notificationEvent={confirmed:"order_confirmed",processing:"order_processing",packed:"order_packed",shipped:"order_shipped",out_for_delivery:"out_for_delivery",delivered:"order_delivered",cancelled:"order_cancelled"}[nextStatus];
    if(notificationEvent&&order.user_id)await queueUserEvent({userId:order.user_id,event:notificationEvent,entityType:"order",entityId:id,payload:{orderNumber:order.order_code,status:nextStatus}}).catch(()=>[]);
    res.json({ message: "Order stage updated", status: nextStatus });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

function parseVariant(body) {
  const value = {
    productId: parsePositiveId(body.product_id),
    brand: cleanText(body.brand, 120),
    color: cleanText(body.color, 80),
    size: cleanText(body.size, 80),
    sku: cleanText(body.sku, 120),
    price: Number(body.price),
    stock: Number(body.stock || 0),
    status: body.status || "Active",
  };

  if (!value.productId || !value.brand || !value.sku) {
    return { error: "Product, brand and SKU are required" };
  }
  if (!Number.isFinite(value.price) || value.price < 0) {
    return { error: "Price must be a positive number" };
  }
  if (!Number.isInteger(value.stock) || value.stock < 0) {
    return { error: "Stock must be a positive whole number" };
  }
  if (!isAllowed(value.status, PRODUCT_STATUSES)) {
    return { error: "Invalid variant status" };
  }
  return { value };
}

function parseFaq(body) {
  const value = {
    question: cleanText(body.question, 255),
    answer: cleanText(body.answer, 5000),
    status: body.status || "Published",
  };

  if (!value.question || !value.answer) {
    return { error: "FAQ question and answer are required" };
  }
  if (!isAllowed(value.status, FAQ_STATUSES)) {
    return { error: "Invalid FAQ status" };
  }
  return { value };
}

function safeSlug(value) {
  const slug = cleanText(value, 140).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export default router;
