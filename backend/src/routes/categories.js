import { Router } from "express";
import { pool } from "../config/db.js";
import { allowRoles, requireAdmin } from "../middleware/auth.js";
import {
  cleanText,
  isAllowed,
  parsePositiveId,
} from "../security/validation.js";
import { paginated } from "../utils/apiResponse.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const CATEGORY_STATUSES = ["Active", "Draft"];

router.use(
  requireAdmin,
  allowRoles("Super Admin", "Product Manager"),
);

router.get("/", async (req, res) => {
  const p = parsePagination(req.query,["id","name","status","sort_order","created_at"],"sort_order");
  const search=cleanText(req.query.search,120),status=isAllowed(cleanText(req.query.status,20),CATEGORY_STATUSES)?cleanText(req.query.status,20):null;
  const where=[],params=[];if(search){where.push("c.name LIKE ?");params.push(`%${search}%`);}if(status){where.push("c.status=?");params.push(status);}const clause=where.length?`WHERE ${where.join(" AND ")}`:"";
  const [rows] = await pool.query(
    `SELECT
       c.id, c.name, c.slug, c.parent_id, c.description, c.status,
       c.sort_order, c.created_at, c.updated_at,
       parent.name AS parent_name,
       COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN categories parent ON parent.id = c.parent_id
     LEFT JOIN products p ON p.category_id = c.id
     ${clause}
     GROUP BY c.id
     ORDER BY c.${p.sort} ${p.order}, c.name
     ${req.baseUrl.includes("/v1/") ? "LIMIT ? OFFSET ?" : ""}`,
    req.baseUrl.includes("/v1/")?[...params,p.limit,p.offset]:params,
  );
  if(req.baseUrl.includes("/v1/")){const [[count]]=await pool.query(`SELECT COUNT(*) total FROM categories c ${clause}`,params);return paginated(res,rows,{...p,total:Number(count.total)});}
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid category ID" });

  const [[category]] = await pool.query(
    `SELECT
       c.*, parent.name AS parent_name
     FROM categories c
     LEFT JOIN categories parent ON parent.id = c.parent_id
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json(category);
});

router.post("/", async (req, res) => {
  const input = parseCategory(req.body);
  if (input.error) {
    return res.status(400).json({ message: input.error });
  }

  if (!(await parentExists(pool, input.value.parentId))) {
    return res.status(400).json({ message: "Parent category not found" });
  }

  const [result] = await pool.query(
    `INSERT INTO categories
      (name, slug, parent_id, description, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    Object.values(input.value),
  );
  res.status(201).json({ id: result.insertId });
});

router.put("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const input = parseCategory(req.body);

  if (!id || input.error) {
    return res.status(400).json({
      message: input.error || "Invalid category ID",
    });
  }
  if (input.value.parentId === id) {
    return res.status(400).json({
      message: "A category cannot be its own parent",
    });
  }
  if (!(await parentExists(pool, input.value.parentId))) {
    return res.status(400).json({ message: "Parent category not found" });
  }
  if (await createsCycle(id, input.value.parentId)) {
    return res.status(400).json({
      message: "Selected parent would create a category cycle",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[existing]] = await connection.query(
      "SELECT id FROM categories WHERE id = ? FOR UPDATE",
      [id],
    );
    if (!existing) {
      await connection.rollback();
      return res.status(404).json({ message: "Category not found" });
    }

    await connection.query(
      `UPDATE categories
       SET name = ?, slug = ?, parent_id = ?, description = ?,
           status = ?, sort_order = ?
       WHERE id = ?`,
      [...Object.values(input.value), id],
    );
    await connection.query(
      "UPDATE products SET category = ? WHERE category_id = ?",
      [input.value.name, id],
    );
    await connection.commit();
    res.json({ message: "Category updated" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.put("/:id/status", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const status = req.body.status;

  if (!id || !isAllowed(status, CATEGORY_STATUSES)) {
    return res.status(400).json({
      message: id ? "Invalid category status" : "Invalid category ID",
    });
  }

  const [result] = await pool.query(
    "UPDATE categories SET status = ? WHERE id = ?",
    [status, id],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json({ message: "Category status updated" });
});

router.delete("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid category ID" });

  const [[usage]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE category_id = ?) AS products,
       (SELECT COUNT(*) FROM categories WHERE parent_id = ?) AS children`,
    [id, id],
  );

  if (Number(usage.products) > 0 || Number(usage.children) > 0) {
    return res.status(409).json({
      message:
        "Move linked products and child categories before deleting this category",
    });
  }

  const [result] = await pool.query(
    "DELETE FROM categories WHERE id = ?",
    [id],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json({ message: "Category deleted" });
});

function parseCategory(body) {
  const name = cleanText(body.name, 120);
  const rawParentId = String(body.parent_id || "").trim();
  const parentId = rawParentId ? parsePositiveId(rawParentId) : null;
  const value = {
    name,
    slug: slugify(body.slug || name),
    parentId,
    description: cleanText(body.description, 2000),
    status: body.status || "Active",
    sortOrder: Number(body.sort_order || 0),
  };

  if (!value.name || !value.slug) {
    return { error: "Category name and slug are required" };
  }
  if (rawParentId && !parentId) {
    return { error: "Invalid parent category" };
  }
  if (!isAllowed(value.status, CATEGORY_STATUSES)) {
    return { error: "Invalid category status" };
  }
  if (!Number.isSafeInteger(value.sortOrder) || value.sortOrder < 0) {
    return { error: "Sort order must be a positive whole number" };
  }
  return { value };
}

function slugify(value) {
  return cleanText(value, 140)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function parentExists(queryable, parentId) {
  if (!parentId) return true;
  const [[parent]] = await queryable.query(
    "SELECT id FROM categories WHERE id = ? LIMIT 1",
    [parentId],
  );
  return Boolean(parent);
}

async function createsCycle(categoryId, parentId) {
  let current = parentId;
  const visited = new Set();

  while (current) {
    if (current === categoryId || visited.has(current)) return true;
    visited.add(current);
    const [[row]] = await pool.query(
      "SELECT parent_id FROM categories WHERE id = ? LIMIT 1",
      [current],
    );
    current = row?.parent_id ? Number(row.parent_id) : null;
  }

  return false;
}

export default router;
