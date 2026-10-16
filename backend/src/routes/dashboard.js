import { Router } from "express";
import { pool } from "../config/db.js";
import { allowRoles, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

router.get("/summary", async (req, res) => {
  const requestedDays = Number(req.query.days);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
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
    today_orders: 0,
    today_revenue: 0,
    pending_orders: 0,
    ready_to_dispatch: 0,
    new_customers: 0,
    pending_returns: 0,
    open_tickets: 0,
    insights: {
      revenue_trend: [], orders_by_status: [], recent_orders: [],
      low_stock_products: [], recent_customers: [], pending_returns: [],
      recent_reviews: [], dispatch_status: [],
    },
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
    const [[lowStockProducts], [recentReviews]] = await Promise.all([
      pool.query(`SELECT id,name,stock,low_stock_threshold,main_image FROM products
        WHERE stock<=low_stock_threshold AND deleted_at IS NULL ORDER BY stock,name LIMIT 6`),
      pool.query(`SELECT r.id,r.rating,r.status,r.created_at,p.name AS product_name,
        CONCAT_WS(' ',u.first_name,u.last_name) AS customer FROM reviews r
        JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id
        ORDER BY r.created_at DESC,r.id DESC LIMIT 6`),
    ]);
    summary.insights.low_stock_products = lowStockProducts;
    summary.insights.recent_reviews = recentReviews;
  }

  if (canViewOrders) {
    const eligibleRevenue = `CASE WHEN user_id IS NULL AND stage NOT IN (8,9) THEN amount
      WHEN payment_status='paid' AND status NOT IN ('cancelled','failed','refunded') THEN amount ELSE 0 END`;
    const [[orders],[today],[workflow],[customerCount],[returnCount],[ticketCount],
      [revenueRows],[statusRows],[recentOrders],[recentCustomers],[pendingReturns],[dispatchRows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total,COALESCE(SUM(${eligibleRevenue}),0) AS value FROM orders`),
      pool.query(`SELECT SUM(status NOT IN ('cancelled','failed','refunded')) AS orders,
        COALESCE(SUM(${eligibleRevenue}),0) AS revenue FROM orders WHERE DATE(created_at)=CURRENT_DATE`),
      pool.query(`SELECT SUM(status IN ('pending','confirmed','processing')) AS pending,
        SUM(status='packed') AS ready FROM orders`),
      pool.query(`SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND DATE(created_at)=CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) AS total FROM returns WHERE status IN ('requested','approved','pickup_scheduled','received','inspected')`),
      pool.query(`SELECT COUNT(*) AS total FROM support_tickets WHERE status IN ('open','in_progress','waiting_for_customer')`),
      pool.query(`SELECT DATE(created_at) AS date,COALESCE(SUM(${eligibleRevenue}),0) AS value FROM orders
        WHERE created_at>=DATE_SUB(CURRENT_DATE,INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,[days-1]),
      pool.query(`SELECT status,COUNT(*) AS total FROM orders WHERE created_at>=DATE_SUB(CURRENT_DATE,INTERVAL ? DAY)
        GROUP BY status ORDER BY total DESC,status`,[days-1]),
      pool.query(`SELECT id,order_code,customer,amount,status,created_at FROM orders ORDER BY created_at DESC,id DESC LIMIT 6`),
      pool.query(`SELECT id,first_name,last_name,email,status,created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 6`),
      pool.query(`SELECT r.id,r.return_code,r.status,r.created_at,o.order_code,
        CONCAT_WS(' ',u.first_name,u.last_name) AS customer FROM returns r JOIN orders o ON o.id=r.order_id
        JOIN users u ON u.id=r.user_id WHERE r.status IN ('requested','approved','pickup_scheduled','received','inspected')
        ORDER BY r.created_at DESC,r.id DESC LIMIT 6`),
      pool.query(`SELECT status,COUNT(*) AS total FROM orders
        WHERE status IN ('confirmed','processing','packed','shipped','out_for_delivery','delivered')
        GROUP BY status ORDER BY total DESC,status`),
    ]);
    summary.orders = Number(orders.total);
    summary.order_value = Number(orders.value);
    summary.today_orders = Number(today.orders || 0);
    summary.today_revenue = Number(today.revenue || 0);
    summary.pending_orders = Number(workflow.pending || 0);
    summary.ready_to_dispatch = Number(workflow.ready || 0);
    summary.new_customers = Number(customerCount.total || 0);
    summary.pending_returns = Number(returnCount.total || 0);
    summary.open_tickets = Number(ticketCount.total || 0);
    summary.insights.revenue_trend = fillRevenueDates(revenueRows, days);
    summary.insights.orders_by_status = statusRows;
    summary.insights.recent_orders = recentOrders;
    summary.insights.recent_customers = recentCustomers;
    summary.insights.pending_returns = pendingReturns;
    summary.insights.dispatch_status = dispatchRows;
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

function fillRevenueDates(rows, days) {
  const values = new Map(rows.map((row) => [toDateKey(row.date), Number(row.value || 0)]));
  const result = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toDateKey(date);
    result.push({ date: key, value: values.get(key) || 0 });
  }
  return result;
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
