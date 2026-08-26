export async function ensureCart(queryable, userId) {
  await queryable.query("INSERT IGNORE INTO carts(user_id,expires_at) VALUES (?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))", [userId]);
  const [[cart]] = await queryable.query("SELECT id,coupon_code FROM carts WHERE user_id=? LIMIT 1", [userId]);
  return cart;
}

export async function getCart(queryable, userId, { lock = false } = {}) {
  const cart = await ensureCart(queryable, userId);
  const [items] = await queryable.query(
    `SELECT ci.id,ci.product_id,ci.variant_id,ci.quantity,p.name,p.slug,p.main_image,
            COALESCE(v.price,p.sale_price,p.price) AS unit_price,
            COALESCE(v.stock,p.stock) AS available_stock,p.tax_rate,COALESCE(v.sku,p.sku) AS sku
     FROM cart_items ci JOIN products p ON p.id=ci.product_id
     LEFT JOIN product_variants v ON v.id=ci.variant_id AND v.product_id=p.id
     WHERE ci.cart_id=? AND p.status='Active' AND p.deleted_at IS NULL
     ORDER BY ci.id ${lock ? "FOR UPDATE" : ""}`, [cart.id],
  );
  let subtotal = 0; let tax = 0;
  const normalized = items.map((item) => {
    const unitPrice = Number(item.unit_price); const lineSubtotal = money(unitPrice * Number(item.quantity));
    const lineTax = money(lineSubtotal * Number(item.tax_rate || 0) / 100);
    subtotal += lineSubtotal; tax += lineTax;
    return { ...item, unit_price: unitPrice, line_subtotal: lineSubtotal, tax_amount: lineTax, line_total: money(lineSubtotal + lineTax) };
  });
  subtotal = money(subtotal); tax = money(tax);
  let shipping = 0; let discount = 0; let coupon = null;
  if (cart.coupon_code) {
    const [[validCoupon]] = await queryable.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM coupon_usage cu WHERE cu.coupon_id=c.id) AS total_used,
        (SELECT COUNT(*) FROM coupon_usage cu WHERE cu.coupon_id=c.id AND cu.user_id=?) AS user_used,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id=? AND o.status NOT IN ('cancelled','failed')) AS order_count
       FROM coupons c WHERE code=? AND status='active'
       AND (starts_at IS NULL OR starts_at<=UTC_TIMESTAMP())
       AND (ends_at IS NULL OR ends_at>=UTC_TIMESTAMP()) LIMIT 1 ${lock ? "FOR UPDATE" : ""}`, [userId,userId,cart.coupon_code],
    );
    const withinTotalLimit = validCoupon?.total_usage_limit == null || Number(validCoupon.total_used) < Number(validCoupon.total_usage_limit);
    const withinUserLimit = validCoupon?.per_user_limit == null || Number(validCoupon.user_used) < Number(validCoupon.per_user_limit);
    const firstOrderAllowed = !validCoupon?.first_order_only || Number(validCoupon.order_count) === 0;
    if (validCoupon && subtotal >= Number(validCoupon.minimum_order_value) && withinTotalLimit && withinUserLimit && firstOrderAllowed) {
      if (validCoupon.discount_type === "percentage") discount = money(subtotal * Number(validCoupon.discount_value) / 100);
      if (validCoupon.discount_type === "fixed") discount = Math.min(subtotal, Number(validCoupon.discount_value));
      if (validCoupon.maximum_discount != null) discount = Math.min(discount, Number(validCoupon.maximum_discount));
      if (validCoupon.discount_type === "free_shipping") shipping = 0;
      coupon = validCoupon;
    }
  }
  return { id: cart.id, coupon_code: coupon?.code || null, coupon_id: coupon?.id || null, free_shipping: coupon?.discount_type === "free_shipping", invalid_coupon: Boolean(cart.coupon_code && !coupon), items: normalized, summary: { subtotal, tax, shipping, discount, total: money(subtotal + tax + shipping - discount), currency: "INR" } };
}

export const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
