import { Router } from "express";
import { pool } from "../config/db.js";
import { allowRoles, requireAdmin } from "../middleware/auth.js";
import { cleanText, parsePositiveId } from "../security/validation.js";
import { paginated } from "../utils/apiResponse.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

router.use(
  requireAdmin,
  allowRoles("Super Admin", "Product Manager"),
);

router.get("/", async (req, res) => {
  const p=parsePagination(req.query,["id","name","stock","status"],"stock"),search=cleanText(req.query.search,120),where=search?"WHERE p.name LIKE ?":"",params=search?[`%${search}%`]:[];
  const [rows] = await pool.query(
    `SELECT
       p.id AS product_id, p.name, p.category, p.main_image, p.stock,
       p.low_stock_threshold, p.status,
       CASE WHEN p.stock <= p.low_stock_threshold THEN 1 ELSE 0 END AS is_low_stock
     FROM products p
     ${where}
     ORDER BY is_low_stock DESC, p.${p.sort} ${p.order}, p.name
     ${req.baseUrl.includes("/v1/")?"LIMIT ? OFFSET ?":""}`,
    req.baseUrl.includes("/v1/")?[...params,p.limit,p.offset]:params,
  );
  if(req.baseUrl.includes("/v1/")){const [[count]]=await pool.query(`SELECT COUNT(*) total FROM products p ${where}`,params);return paginated(res,rows,{...p,total:Number(count.total)});}
  res.json(rows);
});

router.get("/low-stock", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT
       id AS product_id, name, category, main_image, stock,
       low_stock_threshold, status
     FROM products
     WHERE stock <= low_stock_threshold
     ORDER BY stock ASC, name`,
  );
  res.json(rows);
});

router.get("/history", async (req, res) => {
  const p=parsePagination(req.query,["id","action","quantity_change","created_at"],"id");
  const productId = parsePositiveId(req.query.product_id);
  const limit = req.baseUrl.includes("/v1/") ? p.limit : Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const params = [];
  const where = productId ? "WHERE h.product_id = ?" : "";
  if (productId) params.push(productId);
  params.push(limit);
  if(req.baseUrl.includes("/v1/"))params.push(p.offset);

  const [rows] = await pool.query(
    `SELECT
       h.id, h.product_id, p.name AS product_name, h.admin_id,
       a.name AS admin_name, h.action, h.quantity_change,
       h.previous_stock, h.new_stock, h.note, h.created_at
     FROM inventory_history h
     JOIN products p ON p.id = h.product_id
     LEFT JOIN admins a ON a.id = h.admin_id
     ${where}
     ORDER BY h.${p.sort} ${p.order}
     LIMIT ? ${req.baseUrl.includes("/v1/")?"OFFSET ?":""}`,
    params,
  );
  if(req.baseUrl.includes("/v1/")){const [[count]]=await pool.query(`SELECT COUNT(*) total FROM inventory_history h ${where}`,productId?[productId]:[]);return paginated(res,rows,{...p,total:Number(count.total)});}
  res.json(rows);
});

router.put("/:productId/stock", async (req, res) => {
  const productId = parsePositiveId(req.params.productId);
  const stock = Number(req.body.stock);
  const threshold =
    req.body.low_stock_threshold === undefined
      ? null
      : Number(req.body.low_stock_threshold);

  if (!productId || !Number.isSafeInteger(stock) || stock < 0) {
    return res.status(400).json({
      message: productId
        ? "Stock must be a positive whole number"
        : "Invalid product ID",
    });
  }
  if (
    threshold !== null &&
    (!Number.isSafeInteger(threshold) || threshold < 0)
  ) {
    return res.status(400).json({
      message: "Low-stock threshold must be a positive whole number",
    });
  }

  const result = await updateInventory({
    productId,
    adminId: req.admin.id,
    mode: "set",
    quantity: stock,
    threshold,
    note: cleanText(req.body.note, 500),
  });

  if (!result) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Stock updated", ...result });
});

router.post("/:productId/restock", async (req, res) => {
  const productId = parsePositiveId(req.params.productId);
  const quantity = Number(req.body.quantity);

  if (!productId || !Number.isSafeInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: productId
        ? "Restock quantity must be a whole number greater than zero"
        : "Invalid product ID",
    });
  }

  const result = await updateInventory({
    productId,
    adminId: req.admin.id,
    mode: "restock",
    quantity,
    threshold: null,
    note: cleanText(req.body.note, 500),
  });

  if (!result) return res.status(404).json({ message: "Product not found" });
  res.status(201).json({ message: "Product restocked", ...result });
});

async function updateInventory({
  productId,
  adminId,
  mode,
  quantity,
  threshold,
  note,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[product]] = await connection.query(
      `SELECT stock, low_stock_threshold
       FROM products
       WHERE id = ?
       FOR UPDATE`,
      [productId],
    );

    if (!product) {
      await connection.rollback();
      return null;
    }

    const previousStock = Number(product.stock);
    const nextStock =
      mode === "restock" ? previousStock + quantity : quantity;
    const nextThreshold =
      threshold === null
        ? Number(product.low_stock_threshold)
        : threshold;

    await connection.query(
      `UPDATE products
       SET stock = ?, low_stock_threshold = ?
       WHERE id = ?`,
      [nextStock, nextThreshold, productId],
    );
    await connection.query(
      `INSERT INTO inventory_history
        (product_id, admin_id, action, quantity_change,
         previous_stock, new_stock, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        adminId,
        mode === "restock" ? "Restock" : "Set",
        nextStock - previousStock,
        previousStock,
        nextStock,
        note,
      ],
    );
    await connection.commit();

    return {
      product_id: productId,
      previous_stock: previousStock,
      stock: nextStock,
      low_stock_threshold: nextThreshold,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default router;
