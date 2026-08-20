import { Router } from "express";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { parsePositiveId } from "../../security/validation.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";

const router = Router();
const SORTS = { newest: "p.id DESC", price_asc: "effective_price ASC", price_desc: "effective_price DESC", name: "p.name ASC" };
const pageInfo = (query) => ({ page: Math.max(Number.parseInt(query.page) || 1, 1), limit: Math.min(Math.max(Number.parseInt(query.limit) || 20, 1), 100) });

async function listProducts(req, res, extra = []) {
  const { page, limit } = pageInfo(req.query);
  const conditions = ["p.status = 'Active'", "p.deleted_at IS NULL", "(p.published_at IS NULL OR p.published_at<=UTC_TIMESTAMP())", "(p.category_id IS NULL OR c.status='Active')", "(p.brand_id IS NULL OR b.status='Active')", ...extra];
  const params = [];
  const search = String(req.query.q || req.query.search || "").trim().slice(0, 120);
  if (search) { conditions.push("(p.name LIKE ? OR p.description LIKE ? OR p.short_description LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const category = parsePositiveId(req.query.category_id); if (category) { conditions.push("p.category_id = ?"); params.push(category); }
  const brand = parsePositiveId(req.query.brand_id); if (brand) { conditions.push("p.brand_id = ?"); params.push(brand); }
  for (const [queryKey, column] of [["organic","is_organic"],["homemade","is_homemade"],["vegan","is_vegan"]]) if (req.query[queryKey] === "true") conditions.push(`p.${column} = TRUE`);
  if (req.query.available === "true") conditions.push("p.stock > 0");
  const min = Number(req.query.min_price); if (Number.isFinite(min) && min >= 0) { conditions.push("COALESCE(p.sale_price,p.price) >= ?"); params.push(min); }
  const max = Number(req.query.max_price); if (Number.isFinite(max) && max >= 0) { conditions.push("COALESCE(p.sale_price,p.price) <= ?"); params.push(max); }
  const where = conditions.join(" AND ");
  const [[count], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id WHERE ${where}`, params),
    pool.query(`SELECT p.id,p.name,p.slug,p.sku,p.short_description,p.price,p.sale_price,COALESCE(p.sale_price,p.price) AS effective_price,p.stock,p.main_image,p.future_image,p.video_url,p.is_featured,p.is_organic,p.is_homemade,p.is_vegan,c.name AS category_name,b.name AS brand_name FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id WHERE ${where} ORDER BY ${SORTS[req.query.sort] || SORTS.newest} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
  ]);
  return paginated(res, rows, { page, limit, total: Number(count[0].total) });
}

router.get("/search", asyncHandler((req, res) => listProducts(req, res)));
router.get("/featured", asyncHandler((req, res) => listProducts(req, res, ["p.is_featured = TRUE"])));
router.get("/new-arrivals", asyncHandler((req, res) => listProducts(req, res, ["p.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY)"])));
router.get("/bestsellers", asyncHandler(async (req, res) => {
  const {page,limit}=pageInfo(req.query);
  const [[count],[rows]] = await Promise.all([pool.query(`SELECT COUNT(DISTINCT p.id) total FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id WHERE o.status='delivered' AND o.payment_status='paid' AND p.status='Active' AND p.deleted_at IS NULL`),pool.query(`SELECT p.id,p.name,p.slug,p.price,p.sale_price,p.main_image,p.stock,SUM(oi.quantity) AS units_sold
    FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id
    LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id
    WHERE o.status='delivered' AND o.payment_status='paid' AND p.status='Active' AND p.deleted_at IS NULL
      AND (p.published_at IS NULL OR p.published_at<=UTC_TIMESTAMP())
      AND (p.category_id IS NULL OR c.status='Active') AND (p.brand_id IS NULL OR b.status='Active')
    GROUP BY p.id ORDER BY units_sold DESC,p.id DESC LIMIT ? OFFSET ?`,[limit,(page-1)*limit])]);
  return paginated(res,rows,{page,limit,total:Number(count[0].total)});
}));
router.get("/categories", asyncHandler(async (req, res) => {const {page,limit}=pageInfo(req.query),search=String(req.query.search||"").trim().slice(0,120),where=search?"AND name LIKE ?":"",params=search?[`%${search}%`]:[];const [[count],[rows]]=await Promise.all([pool.query(`SELECT COUNT(*) total FROM categories WHERE status='Active' ${where}`,params),pool.query(`SELECT id,name,slug,parent_id,description FROM categories WHERE status='Active' ${where} ORDER BY sort_order,name LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit])]);return paginated(res,rows,{page,limit,total:Number(count[0].total)});}));
router.get("/brands", asyncHandler(async (req, res) => {const {page,limit}=pageInfo(req.query),search=String(req.query.search||"").trim().slice(0,120),where=search?"AND name LIKE ?":"",params=search?[`%${search}%`]:[];const [[count],[rows]]=await Promise.all([pool.query(`SELECT COUNT(*) total FROM brands WHERE status='Active' ${where}`,params),pool.query(`SELECT id,name,slug,description FROM brands WHERE status='Active' ${where} ORDER BY name LIMIT ? OFFSET ?`,[...params,limit,(page-1)*limit])]);return paginated(res,rows,{page,limit,total:Number(count[0].total)});}));
router.get("/slug/:slug", asyncHandler((req, res) => detail(req, res, "p.slug = ?", String(req.params.slug).slice(0, 220))));
router.get("/:id/related", asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id); if (!id) return fail(res, 400, "Invalid product ID");
  const [[product]] = await pool.query("SELECT category_id FROM products WHERE id=? AND status='Active' AND deleted_at IS NULL", [id]); if (!product) return fail(res, 404, "Product not found");
  const [rows] = await pool.query("SELECT id,name,slug,price,sale_price,main_image,stock FROM products WHERE category_id <=> ? AND id<>? AND status='Active' AND deleted_at IS NULL ORDER BY id DESC LIMIT 8", [product.category_id,id]); return ok(res, rows);
}));
router.get("/:id", asyncHandler((req, res) => { const id = parsePositiveId(req.params.id); if (!id) return fail(res,400,"Invalid product ID"); return detail(req,res,"p.id = ?",id); }));
router.get("/", asyncHandler((req, res) => listProducts(req, res)));

async function detail(_req, res, predicate, value) {
  const [[product]] = await pool.query(`SELECT p.*,c.name AS category_name,b.name AS brand_name FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id WHERE ${predicate} AND p.status='Active' AND p.deleted_at IS NULL AND (p.published_at IS NULL OR p.published_at<=UTC_TIMESTAMP()) AND (p.category_id IS NULL OR c.status='Active') AND (p.brand_id IS NULL OR b.status='Active') LIMIT 1`, [value]);
  if (!product) return fail(res, 404, "Product not found");
  const [[images],[variants]] = await Promise.all([pool.query("SELECT id,image,sort_order FROM product_images WHERE product_id=? ORDER BY sort_order,id",[product.id]),pool.query("SELECT id,brand,color,size,sku,price,stock FROM product_variants WHERE product_id=? AND status='Active' ORDER BY id",[product.id])]);
  return ok(res, { ...product, images, variants });
}

export default router;
