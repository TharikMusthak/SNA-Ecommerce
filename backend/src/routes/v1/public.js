import { createHash } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";
import { parsePagination } from "../../utils/pagination.js";
export const publicRouter = Router();
publicRouter.get(
  "/banners",
  asyncHandler(async (req, res) => {
    const allowedPositions = ["home_hero", "home_middle", "category_top", "product_top"];
    const position = String(req.query.position || "home_hero");
    if (!allowedPositions.includes(position)) return fail(res, 400, "Invalid banner position");
    const [rows] = await pool.query(
      `SELECT id,name,title,subtitle,button_text,button_link,image,mobile_image,
              redirect_type,product_id,category_id,redirect_url,display_position,sort_order
       FROM banners
       WHERE status='Active' AND display_position=?
         AND (start_at IS NULL OR start_at<=CURRENT_TIMESTAMP)
         AND (end_at IS NULL OR end_at>=CURRENT_TIMESTAMP)
       ORDER BY sort_order,id DESC`,
      [position],
    );
    return ok(res, rows);
  }),
);
publicRouter.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const p=parsePagination(req.query,["id","name","sort_order","created_at"],"sort_order"),params=[],where=["status='Active'"];
    if(p.search){where.push("name LIKE ?");params.push(`%${p.search}%`);}const clause=where.join(" AND ");
    const [[count],[rows]]=await Promise.all([pool.query(`SELECT COUNT(*) total FROM categories WHERE ${clause}`,params),pool.query(`SELECT id,name,slug,parent_id,description FROM categories WHERE ${clause} ORDER BY ${p.sort} ${p.order},name LIMIT ? OFFSET ?`,[...params,p.limit,p.offset])]);
    return paginated(res,rows,{...p,total:Number(count[0].total)});
  }),
);
publicRouter.get(
  "/categories/slug/:slug",
  asyncHandler(async (req, res) => {
    const [[row]] = await pool.query(
      "SELECT id,name,slug,parent_id,description FROM categories WHERE slug=? AND status='Active'",
      [String(req.params.slug).slice(0, 140)],
    );
    if (!row) return fail(res, 404, "Category not found");
    return ok(res, row);
  }),
);
publicRouter.get(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return fail(res, 400, "Invalid category ID");
    const [[row]] = await pool.query(
      "SELECT id,name,slug,parent_id,description FROM categories WHERE id=? AND status='Active'",
      [id],
    );
    if (!row) return fail(res, 404, "Category not found");
    return ok(res, row);
  }),
);
publicRouter.get(
  "/faqs",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "")
      .trim()
      .slice(0, 120);
    const [rows] = await pool.query(
      `SELECT id,question,answer,sort_order FROM faqs WHERE status='Published' ${search ? "AND (question LIKE ? OR answer LIKE ?)" : ""} ORDER BY sort_order,id`,
      search ? [`%${search}%`, `%${search}%`] : [],
    );
    return ok(res, rows);
  }),
);
publicRouter.get(
  "/coupons/available",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT code,discount_type,discount_value,minimum_order_value,maximum_discount,ends_at,first_order_only FROM coupons WHERE status='active' AND (starts_at IS NULL OR starts_at<=UTC_TIMESTAMP()) AND (ends_at IS NULL OR ends_at>=UTC_TIMESTAMP()) ORDER BY id DESC`,
    );
    return ok(res, rows);
  }),
);

export const searchRouter = Router();
searchRouter.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "")
      .trim()
      .slice(0, 120);
    if (q.length < 2) return ok(res, []);
    const [rows] = await pool.query(
      "SELECT name,slug FROM products WHERE status='Active' AND deleted_at IS NULL AND name LIKE ? ORDER BY name LIMIT 10",
      [`${q}%`],
    );
    return ok(res, rows);
  }),
);
searchRouter.get(
  "/popular",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT query,COUNT(*) AS searches FROM search_logs WHERE searched_at>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY) GROUP BY query ORDER BY searches DESC LIMIT 10",
    );
    return ok(res, rows);
  }),
);
searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "")
        .trim()
        .slice(0, 120),
      limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    if (!q) return fail(res, 422, "Search query is required");
    const [rows] = await pool.query(
      "SELECT id,name,slug,price,sale_price,main_image,stock FROM products WHERE status='Active' AND deleted_at IS NULL AND (name LIKE ? OR description LIKE ?) ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END,name LIMIT ?",
      [`%${q}%`, `%${q}%`, `${q}%`, limit],
    );
    const sessionHash = createHash("sha256")
      .update(`${req.ip}|${req.get("user-agent") || ""}`)
      .digest("hex");
    await pool.query(
      "INSERT INTO search_logs(query,results_count,session_hash) VALUES (?,?,?)",
      [q, rows.length, sessionHash],
    );
    return ok(res, rows);
  }),
);

export const analyticsRouter = Router();
analyticsRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
analyticsRouter.post(
  "/product-view",
  asyncHandler(async (req, res) => {
    const id = parsePositiveId(req.body.product_id);
    if (!id) return fail(res, 422, "Invalid product ID");
    const hash = createHash("sha256")
      .update(`${req.ip}|${req.get("user-agent") || ""}`)
      .digest("hex");
    await pool.query(
      "INSERT INTO product_views(product_id,session_hash) SELECT id,? FROM products WHERE id=? AND status='Active' AND deleted_at IS NULL",
      [hash, id],
    );
    return res.status(204).end();
  }),
);
analyticsRouter.post(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.body.query || "")
        .trim()
        .slice(0, 190),
      count = Math.max(Number(req.body.results_count) || 0, 0);
    if (!q) return fail(res, 422, "Search query is required");
    const hash = createHash("sha256")
      .update(`${req.ip}|${req.get("user-agent") || ""}`)
      .digest("hex");
    await pool.query(
      "INSERT INTO search_logs(query,results_count,session_hash) VALUES (?,?,?)",
      [q, count, hash],
    );
    return res.status(204).end();
  }),
);
