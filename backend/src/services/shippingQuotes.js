import { createHash } from "node:crypto";
import { pool } from "../config/db.js";
import { getShiprocketRates } from "../integrations/shipping/shiprocket.js";
import { getCart, money } from "./cart.js";

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function shippingSummary(cart, shipping) {
  const charge = money(shipping);
  return { ...cart.summary, shipping: charge, total: money(cart.summary.subtotal + cart.summary.tax + charge - cart.summary.discount) };
}

export function quoteFingerprint(cart, address, paymentMethod) {
  const payload = {
    address: Number(address.id), pincode: String(address.postal_code || ""), paymentMethod,
    coupon: cart.coupon_code || null,
    items: cart.items.map((item) => [Number(item.product_id), item.variant_id ? Number(item.variant_id) : null, Number(item.quantity), number(item.unit_price)]),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function createShippingQuote({ userId, addressId, paymentMethod }) {
  const [addressResult, settingsResult] = await Promise.all([
    pool.query("SELECT * FROM user_addresses WHERE id=? AND user_id=? LIMIT 1", [addressId, userId]),
    pool.query("SELECT * FROM shipping_settings WHERE id=1 LIMIT 1"),
  ]);
  const address = addressResult[0][0];
  const settings = settingsResult[0][0];
  if (!address) throw Object.assign(new Error("Delivery address not found"), { status: 404 });
  if (!settings || !Number(settings.provider_enabled)) throw Object.assign(new Error("Live shipping rates are disabled"), { status: 503 });
  const deliveryPincode = String(address.postal_code || address.pincode || "").replace(/\D/g, "");
  const pickupPincode = String(settings.pickup_pincode || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(pickupPincode)) throw Object.assign(new Error("The pickup pincode in Shipping Settings must contain exactly 6 digits"), { status: 422 });
  if (!/^\d{6}$/.test(deliveryPincode)) throw Object.assign(new Error("The selected delivery address must contain exactly 6 pincode digits"), { status: 422 });
  address.postal_code = deliveryPincode;
  const cart = await getCart(pool, userId);
  if (!cart.items.length) throw Object.assign(new Error("Cart is empty"), { status: 409 });
  const quantity = cart.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const weight = Math.max(0.001, number(settings.default_weight_grams, 500) * quantity / 1000);
  const couriers = await getShiprocketRates({
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    cod: paymentMethod === "cod" ? 1 : 0,
    weight: weight.toFixed(3),
    length: number(settings.default_length_cm, 10), breadth: number(settings.default_width_cm, 10), height: number(settings.default_height_cm, 10),
    declared_value: Math.max(1, money(cart.summary.subtotal - cart.summary.discount)),
  });
  const options = couriers.map((courier) => {
    const rate = money(number(courier.rate, number(courier.freight_charge) + number(courier.cod_charges)));
    return { courier_id: Number(courier.courier_company_id || courier.courier_id), courier_name: courier.courier_name, rate, estimated_delivery_days: number(courier.estimated_delivery_days, null), etd: courier.etd || null };
  }).filter((option) => option.courier_id && option.rate >= 0);
  if (!options.length) throw Object.assign(new Error("No courier service is available for this pincode"), { status: 422 });
  options.sort(settings.default_courier_strategy === "fastest"
    ? (a, b) => (a.estimated_delivery_days ?? 999) - (b.estimated_delivery_days ?? 999) || a.rate - b.rate
    : (a, b) => a.rate - b.rate);
  const selected = options[0];
  const free = cart.free_shipping || (number(settings.free_shipping_threshold) > 0 && cart.summary.subtotal >= number(settings.free_shipping_threshold));
  const customerRate = free ? 0 : selected.rate;
  const summary = shippingSummary(cart, customerRate);
  const packageHash = quoteFingerprint(cart, address, paymentMethod);
  const payload = { selected, options, customer_rate: customerRate, actual_rate: selected.rate, summary };
  const [result] = await pool.query(
    `INSERT INTO shipping_rate_quotes(user_id,address_id,provider,delivery_pincode,payment_method,package_hash,options_json,selected_courier_id,selected_rate,expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))`,
    [userId, address.id, "shiprocket", deliveryPincode, paymentMethod, packageHash, JSON.stringify(payload), selected.courier_id, customerRate],
  );
  return { quote_id: result.insertId, provider: "shiprocket", courier: selected, shipping_charge: customerRate, actual_shipping_cost: selected.rate, free_shipping: free, expires_in_seconds: 900, summary };
}

export async function validateShippingQuote(connection, { quoteId, userId, address, paymentMethod, cart }) {
  const [[quote]] = await connection.query(
    `SELECT * FROM shipping_rate_quotes WHERE id=? AND user_id=? AND address_id=? AND payment_method=? AND expires_at>UTC_TIMESTAMP() LIMIT 1 FOR UPDATE`,
    [quoteId, userId, address.id, paymentMethod],
  );
  if (!quote) throw Object.assign(new Error("Shipping quote is missing or expired; refresh the rate"), { status: 409 });
  if (quote.package_hash !== quoteFingerprint(cart, address, paymentMethod)) throw Object.assign(new Error("Cart or address changed; refresh the shipping rate"), { status: 409 });
  const details = typeof quote.options_json === "string" ? JSON.parse(quote.options_json) : quote.options_json;
  return { quote, details, summary: shippingSummary(cart, number(details?.customer_rate, quote.selected_rate)) };
}
