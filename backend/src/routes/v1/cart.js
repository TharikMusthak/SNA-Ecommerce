import { Router } from "express";
import { pool } from "../../config/db.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { parsePositiveId } from "../../security/validation.js";
import { ensureCart, getCart } from "../../services/cart.js";
import { fail, ok } from "../../utils/apiResponse.js";

const router = Router();
router.use(requireCustomer);
router.get("/", asyncHandler(async (req, res) => ok(res, await getCart(pool, req.user.id))));
router.get("/summary", asyncHandler(async (req, res) => ok(res, (await getCart(pool, req.user.id)).summary)));

router.post("/add", asyncHandler(async (req, res) => {
  const productId = parsePositiveId(req.body.product_id); const variantId = req.body.variant_id == null ? null : parsePositiveId(req.body.variant_id); const quantity = Number(req.body.quantity || 1);
  if (!productId || (req.body.variant_id != null && !variantId) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return fail(res, 422, "Validation failed", { quantity: ["Use a quantity from 1 to 99"] });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[product]] = await connection.query("SELECT id,stock,status,deleted_at FROM products WHERE id=? FOR UPDATE", [productId]);
    if (!product || product.status !== "Active" || product.deleted_at) { await connection.rollback(); return fail(res,404,"Product not found"); }
    let available = Number(product.stock);
    if (variantId) { const [[variant]] = await connection.query("SELECT stock FROM product_variants WHERE id=? AND product_id=? AND status='Active' FOR UPDATE", [variantId,productId]); if (!variant) { await connection.rollback(); return fail(res,404,"Product variant not found"); } available=Number(variant.stock); }
    const cart = await ensureCart(connection, req.user.id);
    const [[existing]] = await connection.query("SELECT id,quantity FROM cart_items WHERE cart_id=? AND product_id=? AND variant_id <=> ? FOR UPDATE", [cart.id,productId,variantId]);
    const nextQuantity = Number(existing?.quantity || 0) + quantity;
    if (nextQuantity > available) { await connection.rollback(); return fail(res,409,"Requested quantity is not available"); }
    if (existing) await connection.query("UPDATE cart_items SET quantity=? WHERE id=?", [nextQuantity,existing.id]);
    else await connection.query("INSERT INTO cart_items(cart_id,product_id,variant_id,quantity) VALUES (?,?,?,?)", [cart.id,productId,variantId,quantity]);
    await connection.commit(); return ok(res, await getCart(pool,req.user.id), "Item added to cart", 201);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));

router.put("/update", asyncHandler(async (req, res) => {
  const itemId = parsePositiveId(req.body.item_id); const quantity = Number(req.body.quantity);
  if (!itemId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return fail(res,422,"Validation failed");
  const cart = await ensureCart(pool,req.user.id);
  const [[item]] = await pool.query(`SELECT ci.id,COALESCE(v.stock,p.stock) AS available_stock FROM cart_items ci JOIN products p ON p.id=ci.product_id LEFT JOIN product_variants v ON v.id=ci.variant_id WHERE ci.id=? AND ci.cart_id=?`,[itemId,cart.id]);
  if (!item) return fail(res,404,"Cart item not found"); if (quantity > Number(item.available_stock)) return fail(res,409,"Requested quantity is not available");
  await pool.query("UPDATE cart_items SET quantity=? WHERE id=? AND cart_id=?",[quantity,itemId,cart.id]); return ok(res,await getCart(pool,req.user.id),"Cart updated");
}));

router.delete("/remove", asyncHandler(async (req,res)=>{ const itemId=parsePositiveId(req.body.item_id ?? req.query.item_id); if(!itemId)return fail(res,400,"Invalid cart item ID"); const cart=await ensureCart(pool,req.user.id); const [result]=await pool.query("DELETE FROM cart_items WHERE id=? AND cart_id=?",[itemId,cart.id]); if(!result.affectedRows)return fail(res,404,"Cart item not found"); return res.status(204).end(); }));
router.delete("/clear", asyncHandler(async (req,res)=>{ const cart=await ensureCart(pool,req.user.id); await pool.query("DELETE FROM cart_items WHERE cart_id=?",[cart.id]); return res.status(204).end(); }));
router.post("/apply-coupon", asyncHandler(async(req,res)=>{
  const code=String(req.body.code||"").trim().toUpperCase().slice(0,80);
  if(!code)return fail(res,422,"Validation failed",{code:["Coupon code is required"]});
  const cart=await getCart(pool,req.user.id);
  const [[coupon]]=await pool.query(`SELECT c.*,
    (SELECT COUNT(*) FROM coupon_usage cu WHERE cu.coupon_id=c.id) AS total_used,
    (SELECT COUNT(*) FROM coupon_usage cu WHERE cu.coupon_id=c.id AND cu.user_id=?) AS user_used,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id=? AND o.status NOT IN ('cancelled','failed')) AS order_count
    FROM coupons c WHERE c.code=? AND c.status='active' AND (c.starts_at IS NULL OR c.starts_at<=UTC_TIMESTAMP()) AND (c.ends_at IS NULL OR c.ends_at>=UTC_TIMESTAMP()) LIMIT 1`,[req.user.id,req.user.id,code]);
  if(!coupon)return fail(res,422,"Coupon is invalid or expired");
  if(cart.summary.subtotal<Number(coupon.minimum_order_value))return fail(res,422,`Minimum order value is ${coupon.minimum_order_value}`);
  if(coupon.total_usage_limit!=null&&Number(coupon.total_used)>=Number(coupon.total_usage_limit))return fail(res,422,"Coupon usage limit has been reached");
  if(coupon.per_user_limit!=null&&Number(coupon.user_used)>=Number(coupon.per_user_limit))return fail(res,422,"You have already used this coupon");
  if(coupon.first_order_only&&Number(coupon.order_count)>0)return fail(res,422,"Coupon is valid only for the first order");
  await pool.query("UPDATE carts SET coupon_code=? WHERE user_id=?",[code,req.user.id]);
  return ok(res,await getCart(pool,req.user.id),"Coupon applied");
}));
router.delete("/remove-coupon", asyncHandler(async(req,res)=>{ await pool.query("UPDATE carts SET coupon_code=NULL WHERE user_id=?",[req.user.id]); return ok(res,null,"Coupon removed"); }));
export default router;
