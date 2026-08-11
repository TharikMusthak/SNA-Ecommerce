import { Router } from "express";
import { pool } from "../config/db.js";
import { allowRoles, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

router.get("/summary", async (req, res) => {
  const canViewContent = req.admin.role !== "Order Manager";
  const canViewOrders = req.admin.role !== "Product Manager";
  const summary = {
    products: 0,
    active_products: 0,
    categories: 0,
    banners: 0,
    low_stock: 0,
    admin_users: 0,
    orders: 0,
    order_value: 0,
  };

  if (canViewContent) {
    const [[products], [categories], [banners], [lowStock]] =
      await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) AS total,
             SUM(status = 'Active') AS active
           FROM products`,
        ),
        pool.query("SELECT COUNT(*) AS total FROM categories"),
        pool.query("SELECT COUNT(*) AS total FROM banners"),
        pool.query(
          "SELECT COUNT(*) AS total FROM products WHERE stock <= low_stock_threshold",
        ),
      ]);
    summary.products = Number(products[0].total);
    summary.active_products = Number(products[0].active || 0);
    summary.categories = Number(categories[0].total);
    summary.banners = Number(banners[0].total);
    summary.low_stock = Number(lowStock[0].total);
  }

  if (canViewOrders) {
    const [[orders]] = await pool.query(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(CASE
          WHEN user_id IS NULL AND stage NOT IN (8,9) THEN amount
          WHEN payment_status='paid' AND status NOT IN ('cancelled','failed','refunded') THEN amount
          ELSE 0 END),0) AS value
       FROM orders`,
    );
    summary.orders = Number(orders.total);
    summary.order_value = Number(orders.value);
  }

  if (req.admin.role === "Super Admin") {
    const [[admins]] = await pool.query(
      "SELECT COUNT(*) AS total FROM admins",
    );
    summary.admin_users = Number(admins.total);
  }

  res.json(summary);
});

router.get(
  "/products",
  allowRoles("Super Admin", "Product Manager"),
  async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT
         p.id, p.name, p.category, p.price, p.stock,
         p.low_stock_threshold, p.status, p.main_image, p.created_at
       FROM products p
       ORDER BY p.id DESC
       LIMIT 10`,
    );
    res.json(rows);
  },
);

router.get(
  "/inventory",
  allowRoles("Super Admin", "Product Manager"),
  async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT
         id AS product_id, name, stock, low_stock_threshold, main_image
       FROM products
       WHERE stock <= low_stock_threshold
       ORDER BY stock ASC, name
       LIMIT 10`,
    );
    res.json(rows);
  },
);

router.get("/recent-activities", async (req, res) => {
  const queries = [];

  if (req.admin.role !== "Order Manager") {
    queries.push(`
      SELECT 'Product' AS type, name AS title, created_at
      FROM products
      ORDER BY id DESC
      LIMIT 8
    `);
    queries.push(`
      SELECT 'Banner' AS type, title, created_at
      FROM banners
      ORDER BY id DESC
      LIMIT 8
    `);
  }

  if (req.admin.role !== "Product Manager") {
    queries.push(`
      SELECT 'Order' AS type, order_code AS title, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 8
    `);
  }

  const results = await Promise.all(
    queries.map(async (query) => {
      const [rows] = await pool.query(query);
      return rows;
    }),
  );
  const activities = results
    .flat()
    .sort(
      (left, right) =>
        new Date(right.created_at) - new Date(left.created_at),
    )
    .slice(0, 12);

  res.json(activities);
});

export default router;
