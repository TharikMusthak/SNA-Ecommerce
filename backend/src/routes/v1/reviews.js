import { Router } from "express";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { reviewFileUrl, reviewUpload } from "../../middleware/reviewUpload.js";
import { deleteUploadedFiles, uploadedFiles } from "../../middleware/uploadSecurity.js";
import { parsePositiveId } from "../../security/validation.js";
import { safelyDeleteUpload, safelyDeleteUploads } from "../../services/uploadFiles.js";
import { fail, ok, paginated } from "../../utils/apiResponse.js";

const router = Router();

router.get("/product/:productId", asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.productId);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  if (!id) return fail(res, 400, "Invalid product ID");
  const [[counts], [rows]] = await Promise.all([
    pool.query("SELECT COUNT(*) AS total FROM reviews WHERE product_id=? AND status='approved'", [id]),
    pool.query(`SELECT r.id,r.rating,r.title,r.review_text,r.image_url,r.video_url,r.is_verified_purchase,r.helpful_count,r.created_at,CONCAT(u.first_name,' ',LEFT(u.last_name,1),'.') AS reviewer FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? AND r.status='approved' ORDER BY r.id DESC LIMIT ? OFFSET ?`, [id, limit, (page - 1) * limit]),
  ]);
  return paginated(res, rows, { page, limit, total: Number(counts[0].total) });
}));

router.get("/my", requireCustomer, asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  const [[count], [rows]] = await Promise.all([
    pool.query("SELECT COUNT(*) AS total FROM reviews WHERE user_id=?", [req.user.id]),
    pool.query(
      `SELECT r.id,r.product_id,p.name AS product_name,p.slug AS product_slug,
              p.main_image AS product_image,r.rating,r.title,r.review_text,
              r.image_url,r.video_url,r.is_verified_purchase,r.status,
              r.helpful_count,r.created_at,r.updated_at
       FROM reviews r
       JOIN products p ON p.id=r.product_id
       WHERE r.user_id=?
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset],
    ),
  ]);
  return paginated(res, rows, { page, limit, total: Number(count[0].total) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid review ID");
  const [[row]] = await pool.query("SELECT id,product_id,rating,title,review_text,image_url,video_url,is_verified_purchase,helpful_count,created_at FROM reviews WHERE id=? AND status='approved'", [id]);
  return row ? ok(res, row) : fail(res, 404, "Review not found");
}));

router.post("/", requireCustomer, ...reviewUpload, asyncHandler(async (req, res) => {
  const input = reviewInput(req.body);
  const files = uploadedFiles(req);
  if (input.error) {
    await deleteUploadedFiles(files);
    return fail(res, 422, "Validation failed", { review: [input.error] });
  }
  const [[purchase]] = await pool.query(`SELECT oi.id FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=? AND oi.product_id=? AND o.status='delivered' ORDER BY oi.id DESC LIMIT 1`, [req.user.id, input.productId]);
  try {
    const [result] = await pool.query(
      "INSERT INTO reviews(user_id,product_id,order_item_id,rating,title,review_text,image_url,video_url,is_verified_purchase,status) VALUES (?,?,?,?,?,?,?,?,?,'approved')",
      [req.user.id, input.productId, purchase?.id || null, input.rating, input.title, input.reviewText, reviewFileUrl(req.files?.image?.[0]), reviewFileUrl(req.files?.video?.[0]), Boolean(purchase)],
    );
    return ok(res, { id: result.insertId, status: "approved" }, "Review published successfully", 201);
  } catch (error) {
    await deleteUploadedFiles(files);
    if (error.code === "ER_DUP_ENTRY") return fail(res, 409, "You have already reviewed this product");
    throw error;
  }
}));

router.put("/:id", requireCustomer, ...reviewUpload, asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const input = reviewInput(req.body, false);
  const files = uploadedFiles(req);
  if (!id || input.error) {
    await deleteUploadedFiles(files);
    return fail(res, 422, input.error || "Invalid review ID");
  }
  const [[existing]] = await pool.query("SELECT image_url,video_url FROM reviews WHERE id=? AND user_id=?", [id, req.user.id]);
  if (!existing) {
    await deleteUploadedFiles(files);
    return fail(res, 404, "Review not found");
  }
  const imageUrl = reviewFileUrl(req.files?.image?.[0]) || (req.body.remove_image === "1" ? null : existing.image_url);
  const videoUrl = reviewFileUrl(req.files?.video?.[0]) || (req.body.remove_video === "1" ? null : existing.video_url);
  await pool.query("UPDATE reviews SET rating=?,title=?,review_text=?,image_url=?,video_url=?,status='approved' WHERE id=? AND user_id=?", [input.rating, input.title, input.reviewText, imageUrl, videoUrl, id, req.user.id]);
  if (existing.image_url !== imageUrl) await safelyDeleteUpload(existing.image_url, "reviews");
  if (existing.video_url !== videoUrl) await safelyDeleteUpload(existing.video_url, "reviews");
  return ok(res, { status: "approved" }, "Review updated and published successfully");
}));

router.delete("/:id", requireCustomer, asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid review ID");
  const [[review]] = await pool.query("SELECT image_url,video_url FROM reviews WHERE id=? AND user_id=?", [id, req.user.id]);
  if (!review) return fail(res, 404, "Review not found");
  await pool.query("DELETE FROM reviews WHERE id=? AND user_id=?", [id, req.user.id]);
  await safelyDeleteUploads([review.image_url, review.video_url], "reviews");
  return res.status(204).end();
}));

router.post("/:id/helpful", requireCustomer, asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, "Invalid review ID");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [insert] = await connection.query("INSERT IGNORE INTO review_helpful(review_id,user_id) SELECT id,? FROM reviews WHERE id=? AND status='approved'", [req.user.id, id]);
    if (!insert.affectedRows) {
      await connection.rollback();
      return fail(res, 409, "Review was already marked helpful or was not found");
    }
    await connection.query("UPDATE reviews SET helpful_count=helpful_count+1 WHERE id=?", [id]);
    await connection.commit();
    return ok(res, null, "Review marked helpful");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

function reviewInput(body, requireProduct = true) {
  const productId = parsePositiveId(body.product_id);
  const rating = Number(body.rating);
  const title = String(body.title || "").trim().slice(0, 190) || null;
  const reviewText = String(body.review_text || "").trim().slice(0, 5000);
  if ((requireProduct && !productId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || !reviewText) {
    return { error: "Product, rating from 1 to 5, and review text are required" };
  }
  return { productId, rating, title, reviewText };
}

export default router;
