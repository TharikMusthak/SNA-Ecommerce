import assert from "node:assert/strict";
import test, { after } from "node:test";
import request from "supertest";
import bcrypt from "bcryptjs";

process.env.NODE_ENV = "test";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.JWT_SECRET = "integration-test-secret-".repeat(4);
process.env.DB_NAME = process.env.TEST_DB_NAME || "sna_cms_test";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");
const origin = "http://localhost:5173";
let userId;
let orderId;
let productId;
let originalStock;
let adminId;
let orderManagerId;

after(async () => {
  if (userId) {
    await pool.query("DELETE FROM notification_deliveries WHERE user_id=?", [userId]);
    await pool.query("DELETE FROM reviews WHERE user_id=?", [userId]);
    await pool.query("DELETE stm FROM support_ticket_messages stm JOIN support_tickets st ON st.id=stm.ticket_id WHERE st.user_id=?", [userId]);
    await pool.query("DELETE FROM support_tickets WHERE user_id=?", [userId]);
    await pool.query("DELETE FROM returns WHERE user_id=?", [userId]);
    if (orderId) {
      await pool.query("DELETE FROM payments WHERE order_id=?", [orderId]);
      await pool.query("DELETE FROM orders WHERE id=?", [orderId]);
    }
    await pool.query("DELETE FROM users WHERE id=?", [userId]);
  }
  if (productId && originalStock !== undefined) {
    await pool.query("DELETE FROM products WHERE id=?", [productId]);
  }
  if (adminId || orderManagerId) {
    await pool.query("DELETE FROM admins WHERE id IN (?,?)", [adminId || 0, orderManagerId || 0]);
  }
  await pool.end();
});

test("customer commerce lifecycle is transactional, owned, and idempotent", async () => {
  const adminPassword = "IntegrationAdmin@2026";
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const [adminResult] = await pool.query("INSERT INTO admins(name,email,password_hash,role,status) VALUES ('Integration Admin',? ,?,'Super Admin','Active')", [`integration-admin-${Date.now()}@example.invalid`,adminHash]);
  adminId = adminResult.insertId;
  const [managerResult] = await pool.query("INSERT INTO admins(name,email,password_hash,role,status) VALUES ('Integration Orders',? ,?,'Order Manager','Active')", [`integration-orders-${Date.now()}@example.invalid`,adminHash]);
  orderManagerId = managerResult.insertId;
  const [adminQuery,managerQuery] = await Promise.all([pool.query("SELECT email FROM admins WHERE id=?",[adminId]),pool.query("SELECT email FROM admins WHERE id=?",[orderManagerId])]);
  const adminEmail = adminQuery[0][0].email;
  const managerEmail = managerQuery[0][0].email;
  const adminAgent = request.agent(app);
  await adminAgent.post("/api/auth/login").set("Origin",origin).send({email:adminEmail,password:adminPassword}).expect(200);
  const orderManager = request.agent(app);
  await orderManager.post("/api/auth/login").set("Origin",origin).send({email:managerEmail,password:adminPassword}).expect(200);
  await orderManager.get("/api/products").expect(403);
  const categories = await adminAgent.get("/api/categories").expect(200);
  const productName = `Integration Product ${Date.now()}`;
  const createdProduct = await adminAgent.post("/api/products").set("Origin",origin).send({name:productName,category_id:categories.body[0].id,price:125,stock:5,status:"Active",description:"Integration catalog product"}).expect(201);
  productId = createdProduct.body.id;
  const [[createdRow]] = await pool.query("SELECT slug,stock FROM products WHERE id=?",[productId]);
  assert.ok(createdRow.slug);
  originalStock = Number(createdRow.stock);
  await request(app).get(`/api/v1/products/slug/${createdRow.slug}`).expect(200);

  const agent = request.agent(app);
  const email = `integration-${Date.now()}@example.invalid`;
  const password = "Integration@2026Strong";
  const registered = await agent.post("/api/v1/auth/register").set("Origin", origin).send({
    first_name: "Integration", last_name: "Customer", email,
    phone: "+919876543210", password, password_confirmation: password,
    accept_terms: true,
  }).expect(201);
  userId = registered.body.data.id;

  const login = await agent.post("/api/v1/auth/login").set("Origin", origin)
    .send({ login: email.toUpperCase(), password }).expect(200);
  const originalRefresh = login.headers["set-cookie"].find((cookie) => cookie.startsWith("sna_customer_refresh="));
  assert.ok(originalRefresh);
  await agent.get("/api/v1/auth/me").expect(200);

  const otpSend = await agent.post("/api/v1/auth/send-otp").set("Origin", origin)
    .send({ destination: email, purpose: "verify_email" }).expect(200);
  await agent.post("/api/v1/auth/verify-otp").set("Origin", origin)
    .send({ destination: email, purpose: "verify_email", otp: otpSend.body.data.development_otp }).expect(200);
  await agent.post("/api/v1/auth/verify-otp").set("Origin", origin)
    .send({ destination: email, purpose: "verify_email", otp: otpSend.body.data.development_otp }).expect(400);

  const address = await agent.post("/api/v1/addresses").set("Origin", origin).send({
    full_name: "Integration Customer", phone: "+919876543210",
    address_line_1: "1 Test Street", city: "Chennai", state: "Tamil Nadu",
    country: "India", postal_code: "600001", address_type: "home", is_default: true,
  }).expect(201);

  const products = await agent.get("/api/v1/products").expect(200);
  assert.ok(products.body.data.length > 0);
  assert.ok(products.body.data.some((product) => product.id === productId));
  const [[before]] = await pool.query("SELECT stock FROM products WHERE id=?", [productId]);
  originalStock = Number(before.stock);
  assert.ok(originalStock > 0);

  await agent.post("/api/v1/cart/add").set("Origin", origin)
    .send({ product_id: productId, quantity: 1 }).expect(201);
  await agent.post("/api/v1/wishlist/add").set("Origin", origin)
    .send({ product_id: productId }).expect(201);

  const idempotencyKey = `integration-${Date.now()}`;
  const order = await agent.post("/api/v1/orders/create").set("Origin", origin)
    .set("Idempotency-Key", idempotencyKey)
    .send({ address_id: address.body.data.id, payment_method: "cod" }).expect(201);
  orderId = order.body.data.id;
  const replay = await agent.post("/api/v1/orders/create").set("Origin", origin)
    .set("Idempotency-Key", idempotencyKey)
    .send({ address_id: address.body.data.id, payment_method: "cod" }).expect(200);
  assert.equal(replay.body.data.id, orderId);
  assert.equal(replay.body.data.replayed, true);

  await pool.query("UPDATE orders SET stage=7,status='delivered',payment_status='paid' WHERE id=?", [orderId]);
  await pool.query("UPDATE payments SET status='paid' WHERE order_id=?", [orderId]);
  await pool.query("INSERT INTO order_status_history(order_id,status,note,actor_type) VALUES (?,'delivered','Integration delivery','system')", [orderId]);
  const [[orderItem]] = await pool.query("SELECT id FROM order_items WHERE order_id=? LIMIT 1", [orderId]);

  await agent.post("/api/v1/reviews").set("Origin", origin)
    .send({ product_id: productId, rating: 5, review_text: "Integration review" }).expect(201);
  await agent.post("/api/v1/returns").set("Origin", origin)
    .send({ order_id: orderId, reason: "Integration return", items: [{ order_item_id: orderItem.id, quantity: 1 }] }).expect(201);
  await agent.post("/api/v1/tickets").set("Origin", origin)
    .send({ subject: "Integration ticket", message: "Lifecycle verification" }).expect(201);

  await agent.post("/api/v1/auth/refresh-token").set("Origin", origin).expect(200);
  const oldCookie = originalRefresh.split(";")[0];
  await request(app).post("/api/v1/auth/refresh-token").set("Origin", origin)
    .set("Cookie", oldCookie).expect(401);
  await agent.get("/api/v1/auth/me").expect(401);
});
