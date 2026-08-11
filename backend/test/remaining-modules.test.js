import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.JWT_SECRET = "remaining-modules-test-secret-".repeat(4);
process.env.DB_NAME = process.env.TEST_DB_NAME || "sna_cms_test";
process.env.ONLINE_PAYMENTS_ENABLED = "false";
process.env.WATI_ENABLED = "false";
process.env.WATI_WEBHOOK_SECRET = "wati-test-webhook-secret";
process.env.SMTP_ENABLED = "false";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");
const { expireOrderReservations } =
  await import("../src/services/orderExpiry.js");
const { normalizeWhatsappNumber } =
  await import("../src/integrations/notifications/whatsapp.provider.js");
const { queueNotification, processNotificationQueue } =
  await import("../src/integrations/notifications/notification.service.js");
const { sendWatiTemplate } =
  await import("../src/integrations/notifications/wati.provider.js");
const { sendOtpEmail } = await import("../src/services/email.js");
const { discoverRoutes } = await import("../scripts/lib/discover-routes.js");
const origin = "http://localhost:5173",
  stamp = Date.now();
let user,
  admin,
  productManager,
  product,
  expiryOrders = [],
  returnOrder,
  returnId,
  refundId;

before(async () => {
  const hash = await bcrypt.hash("RemainingTest@2026", 12);
  const [u] = await pool.query(
    `INSERT INTO users(first_name,last_name,email,phone,password_hash,status,email_verified_at,referral_code,terms_accepted_at) VALUES ('Remaining','Tester',?,?,?,'active',UTC_TIMESTAMP(),?,UTC_TIMESTAMP())`,
    [
      `remaining-${stamp}@example.invalid`,
      `9${String(stamp).slice(-9)}`,
      hash,
      `R${stamp}`.slice(0, 32),
    ],
  );
  user = u.insertId;
  const [a] = await pool.query(
    "INSERT INTO admins(name,email,password_hash,role,status) VALUES ('Remaining Admin',?,?,'Super Admin','Active')",
    [`remaining-admin-${stamp}@example.invalid`, hash],
  );
  admin = a.insertId;
  const [m] = await pool.query(
    "INSERT INTO admins(name,email,password_hash,role,status) VALUES ('Remaining Product',?,?,'Product Manager','Active')",
    [`remaining-product-${stamp}@example.invalid`, hash],
  );
  productManager = m.insertId;
  const [[category]] = await pool.query(
    "SELECT id,name FROM categories ORDER BY id LIMIT 1",
  );
  const [p] = await pool.query(
    "INSERT INTO products(name,category,category_id,price,stock,status,slug,sku) VALUES (?,?,?,?,10,'Active',?,?)",
    [
      `Remaining Product ${stamp}`,
      category.name,
      category.id,
      100,
      `remaining-${stamp}`,
      `REM-${stamp}`,
    ],
  );
  product = p.insertId;
});

after(async () => {
  await pool.query(
    "DELETE FROM notification_webhook_events WHERE provider='wati' AND external_event_id LIKE ?",
    [`remaining-${stamp}%`],
  );
  await pool.query(
    "DELETE FROM notification_deliveries WHERE recipient LIKE ? OR entity_id=? OR provider_message_id LIKE ?",
    [`%${String(stamp).slice(-9)}%`, String(returnId || 0), `%${stamp}%`],
  );
  if (user) {
    await pool.query("DELETE FROM notification_deliveries WHERE user_id=?", [user]);
    await pool.query("DELETE rr FROM refund_records rr JOIN returns r ON r.id=rr.return_id WHERE r.user_id=?", [user]);
    await pool.query("DELETE FROM returns WHERE user_id=?", [user]);
    await pool.query("DELETE FROM audit_logs WHERE (actor_type='customer' AND actor_id=?) OR (actor_type='admin' AND actor_id IN (?,?))", [user,admin||0,productManager||0]);
  }
  const orderIds = [...expiryOrders, returnOrder].filter(Boolean);
  if (orderIds.length) {
    await pool.query(
      `DELETE FROM audit_logs WHERE entity_type IN ('order','return','refund_record') AND (entity_id IN (${orderIds.map(() => "?").join(",")}) OR entity_id=?)`,
      [...orderIds, String(returnId || 0)],
    );
    await pool.query(
      `DELETE FROM payments WHERE order_id IN (${orderIds.map(() => "?").join(",")})`,
      orderIds,
    );
    await pool.query(
      `DELETE FROM orders WHERE id IN (${orderIds.map(() => "?").join(",")})`,
      orderIds,
    );
  }
  if (product) await pool.query("DELETE FROM products WHERE id=?", [product]);
  if (user) await pool.query("DELETE FROM users WHERE id=?", [user]);
  await pool.query("DELETE FROM admins WHERE id IN (?,?)", [
    admin || 0,
    productManager || 0,
  ]);
  await pool.end();
});

test("online payments are feature-disabled while COD remains accepted", async () => {
  const response = await request(app)
    .post("/api/v1/payments/create-order")
    .set("Origin", origin)
    .expect(503);
  assert.equal(response.body.code, "ONLINE_PAYMENTS_DISABLED");
});

test("expiry worker excludes COD, paid, cancelled, and future orders and releases stock once under concurrency", async () => {
  async function order(
    provider,
    { status = "pending", paymentStatus = "pending", expires = "past" } = {},
  ) {
    const [created] = await pool.query(
      `INSERT INTO orders(order_code,customer,phone,product,amount,stage,user_id,status,payment_status,subtotal,currency,reservation_expires_at) VALUES (?,?,?,?,100,1,?,?,?,?, 'INR',?)`,
      [
        `EXP-${stamp}-${expiryOrders.length}`,
        "Remaining Tester",
        "9876543210",
        "Expiry product",
        user,
        status,
        paymentStatus,
        100,
        expires === "past"
          ? new Date(Date.now() - 3600000)
          : new Date(Date.now() + 3600000),
      ],
    );
    expiryOrders.push(created.insertId);
    await pool.query(
      "INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,total_amount) VALUES (?,?,?,100,1,100)",
      [created.insertId, product, "Expiry product"],
    );
    await pool.query(
      "INSERT INTO payments(order_id,provider,amount_minor,currency,status,idempotency_key) VALUES (?,?,10000,'INR',?,?)",
      [
        created.insertId,
        provider,
        paymentStatus === "paid" ? "paid" : "created",
        `expiry:${stamp}:${created.insertId}`,
      ],
    );
    return created.insertId;
  }
  const target = await order("razorpay");
  await order("cod");
  await order("razorpay", { paymentStatus: "paid" });
  await order("razorpay", { status: "cancelled" });
  await order("razorpay", { expires: "future" });
  await pool.query("UPDATE products SET stock=9 WHERE id=?", [product]);
  const results = await Promise.all([
    expireOrderReservations(),
    expireOrderReservations(),
  ]);
  assert.equal(
    results.reduce((sum, value) => sum + value.expired, 0),
    1,
  );
  const [[stock]] = await pool.query("SELECT stock FROM products WHERE id=?", [
    product,
  ]);
  assert.equal(Number(stock.stock), 10);
  const [[expired]] = await pool.query(
    "SELECT status,reservation_released_at,expired_at FROM orders WHERE id=?",
    [target],
  );
  assert.equal(expired.status, "failed");
  assert.ok(expired.reservation_released_at);
  assert.ok(expired.expired_at);
  const [[history]] = await pool.query(
    "SELECT COUNT(*) total FROM inventory_history WHERE reference_type='order' AND reference_id=? AND action='ReservationExpiry'",
    [target],
  );
  assert.equal(Number(history.total), 1);
  const rollbackTarget = await order("razorpay");
  await pool.query("UPDATE products SET stock=9 WHERE id=?", [product]);
  const rollback = await expireOrderReservations({
    beforeCommit() {
      throw Object.assign(new Error("Injected rollback"), { code: "TEST_ROLLBACK" });
    },
  });
  assert.equal(rollback.failed, 1);
  const [[rolledBackOrder]] = await pool.query(
    "SELECT status,reservation_released_at FROM orders WHERE id=?",
    [rollbackTarget],
  );
  assert.equal(rolledBackOrder.status, "pending");
  assert.equal(rolledBackOrder.reservation_released_at, null);
  const [[rolledBackStock]] = await pool.query("SELECT stock FROM products WHERE id=?", [product]);
  assert.equal(Number(rolledBackStock.stock), 9);
  await pool.query("UPDATE products SET stock=10 WHERE id=?", [product]);
});

test("return inspection, idempotent restock, and amount-capped internal refund workflow", async () => {
  const [created] = await pool.query(
    `INSERT INTO orders(order_code,customer,phone,product,amount,stage,user_id,status,payment_status,subtotal,currency) VALUES (?,?,?,?,200,7,?,'delivered','paid',200,'INR')`,
    [
      `RETORD-${stamp}`,
      "Remaining Tester",
      "9876543210",
      "Return product",
      user,
    ],
  );
  returnOrder = created.insertId;
  const [item] = await pool.query(
    "INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,total_amount) VALUES (?,?,?,100,2,200)",
    [returnOrder, product, "Return product"],
  );
  await pool.query(
    "INSERT INTO payments(order_id,provider,amount_minor,currency,status,idempotency_key) VALUES (?,'cod',20000,'INR','paid',?)",
    [returnOrder, `return:${stamp}`],
  );
  await pool.query(
    "INSERT INTO order_status_history(order_id,status,note,actor_type) VALUES (?,'delivered','Delivered fixture','system')",
    [returnOrder],
  );
  const customer = request.agent(app);
  await customer
    .post("/api/v1/auth/login")
    .set("Origin", origin)
    .send({
      login: `remaining-${stamp}@example.invalid`,
      password: "RemainingTest@2026",
    })
    .expect(200);
  const requested = await customer
    .post("/api/v1/returns")
    .set("Origin", origin)
    .send({
      order_id: returnOrder,
      reason: "Quality issue",
      items: [{ order_item_id: item.insertId, quantity: 2 }],
    })
    .expect(201);
  returnId = requested.body.data.id;
  await customer
    .post("/api/v1/returns")
    .set("Origin", origin)
    .send({
      order_id: returnOrder,
      reason: "Duplicate excess",
      items: [{ order_item_id: item.insertId, quantity: 1 }],
    })
    .expect(409);
  const adminAgent = request.agent(app);
  await adminAgent
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({
      email: `remaining-admin-${stamp}@example.invalid`,
      password: "RemainingTest@2026",
    })
    .expect(200);
  await adminAgent
    .put(`/api/v1/admin/returns/${returnId}/status`)
    .set("Origin", origin)
    .send({ status: "completed" })
    .expect(409);
  await adminAgent
    .put(`/api/v1/admin/returns/${returnId}/approve`)
    .set("Origin", origin)
    .send({ notes: "Approved" })
    .expect(200);
  await adminAgent
    .put(`/api/v1/admin/returns/${returnId}/status`)
    .set("Origin", origin)
    .send({ status: "received" })
    .expect(200);
  await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/inspection`)
    .set("Origin", origin)
    .set("Idempotency-Key", `inspect-${stamp}`)
    .send({ result: "passed", notes: "Good condition" })
    .expect(201);
  const [[returnItem]] = await pool.query(
    "SELECT id FROM return_items WHERE return_id=?",
    [returnId],
  );
  await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/restock`)
    .set("Origin", origin)
    .set("Idempotency-Key", `restock-${stamp}`)
    .send({
      items: [
        {
          return_item_id: returnItem.id,
          quantity: 1,
          disposition: "restocked",
        },
      ],
    })
    .expect(201);
  await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/restock`)
    .set("Origin", origin)
    .set("Idempotency-Key", `no-restock-${stamp}`)
    .send({
      items: [
        {
          return_item_id: returnItem.id,
          quantity: 1,
          disposition: "no_restock",
        },
      ],
    })
    .expect(201);
  await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/restock`)
    .set("Origin", origin)
    .set("Idempotency-Key", `no-restock-repeat-${stamp}`)
    .send({ items:[{ return_item_id:returnItem.id,quantity:1,disposition:"restocked" }] })
    .expect(409);
  const refund = await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/refund-record`)
    .set("Origin", origin)
    .set("Idempotency-Key", `refund-${stamp}`)
    .send({
      refund_method: "cod_manual",
      refunded_amount: 100,
      status: "completed",
      refund_reference: `MAN-${stamp}`,
    })
    .expect(201);
  refundId = refund.body.data.id;
  const [[partiallyRefundedOrder]] = await pool.query("SELECT status,payment_status FROM orders WHERE id=?", [returnOrder]);
  assert.equal(partiallyRefundedOrder.status, "partially_refunded");
  await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/refund-record`)
    .set("Origin", origin)
    .set("Idempotency-Key", `refund-2-${stamp}`)
    .send({
      refund_method: "cod_manual",
      refunded_amount: 100,
      status: "completed",
      refund_reference: `MAN-SECOND-${stamp}`,
    })
    .expect(201);
  await adminAgent
    .post(`/api/v1/admin/returns/${returnId}/refund-record`)
    .set("Origin", origin)
    .set("Idempotency-Key", `refund-excess-${stamp}`)
    .send({ refund_method:"cod_manual",refunded_amount:1,status:"completed" })
    .expect(409);
  const [[refundedOrder]] = await pool.query("SELECT status,payment_status FROM orders WHERE id=?", [returnOrder]);
  assert.equal(refundedOrder.status, "refunded");
  async function deliveredFixture(suffix, deliveredExpression) {
    const [createdOrder]=await pool.query(`INSERT INTO orders(order_code,customer,phone,product,amount,stage,user_id,status,payment_status,subtotal,currency) VALUES (?,?,?,?,100,7,?,'delivered','paid',100,'INR')`,[`RET-${suffix}-${stamp}`,"Remaining Tester","9876543210","Return product",user]);
    expiryOrders.push(createdOrder.insertId);
    const [createdItem]=await pool.query("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,total_amount) VALUES (?,?,?,100,1,100)",[createdOrder.insertId,product,"Return product"]);
    await pool.query("INSERT INTO payments(order_id,provider,amount_minor,currency,status,idempotency_key) VALUES (?,'cod',10000,'INR','paid',?)",[createdOrder.insertId,`return-${suffix}:${stamp}`]);
    await pool.query(`INSERT INTO order_status_history(order_id,status,note,actor_type,created_at) VALUES (?,'delivered','Delivered fixture','system',${deliveredExpression})`,[createdOrder.insertId]);
    return {orderId:createdOrder.insertId,itemId:createdItem.insertId};
  }
  const stale=await deliveredFixture("STALE","DATE_SUB(UTC_TIMESTAMP(),INTERVAL 31 DAY)");
  await customer.post("/api/v1/returns").set("Origin",origin).send({order_id:stale.orderId,reason:"Too late",items:[{order_item_id:stale.itemId,quantity:1}]}).expect(409);
  const rejectable=await deliveredFixture("REJECT","UTC_TIMESTAMP()");
  const rejectRequest=await customer.post("/api/v1/returns").set("Origin",origin).send({order_id:rejectable.orderId,reason:"Review required",items:[{order_item_id:rejectable.itemId,quantity:1}]}).expect(201);
  const rejectedId=rejectRequest.body.data.id;
  await adminAgent.put(`/api/v1/admin/returns/${rejectedId}/reject`).set("Origin",origin).send({notes:"Not eligible after review"}).expect(200);
  await adminAgent.put(`/api/v1/admin/returns/${rejectedId}/approve`).set("Origin",origin).send({}).expect(409);
  const manager = request.agent(app);
  await manager
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({
      email: `remaining-product-${stamp}@example.invalid`,
      password: "RemainingTest@2026",
    })
    .expect(200);
  await manager.get("/api/v1/admin/returns").expect(403);
});

test("WATI disabled queue, phone normalization, signed webhook, and duplicate event handling are safe", async () => {
  assert.equal(normalizeWhatsappNumber("+91 98765-43210"), "919876543210");
  assert.equal(normalizeWhatsappNumber("91919876543210"), null);
  assert.equal(normalizeWhatsappNumber("123"), null);
  const queued = await queueNotification({
    channel: "whatsapp",
    event: "order_confirmed",
    userId: user,
    entityType: "order",
    entityId: returnOrder,
    payload: { orderNumber: `RETORD-${stamp}` },
  });
  assert.equal(queued.status, "skipped");
  const messageId = `wamid.remaining-${stamp}`;
  await pool.query(
    `INSERT INTO notification_deliveries(user_id,channel,event,recipient,template_name,provider_message_id,status) VALUES (?,'whatsapp','order_confirmed','919876543210','sna_order_confirmed',?,'sent')`,
    [user, messageId],
  );
  const payload = {
    eventType: "sentMessageDELIVERED_v2",
    statusString: "Delivered",
    id: `remaining-${stamp}-event`,
    whatsappMessageId: messageId,
  };
  const raw = JSON.stringify(payload),
    signature = createHmac("sha256", process.env.WATI_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");
  await request(app)
    .post("/api/v1/webhooks/wati")
    .set("X-WATI-Signature", signature)
    .set("Content-Type", "application/json")
    .send(raw)
    .expect(200);
  await request(app)
    .post("/api/v1/webhooks/wati")
    .set("X-WATI-Signature", signature)
    .set("Content-Type", "application/json")
    .send(raw)
    .expect(200);
  const [[events]] = await pool.query(
    "SELECT COUNT(*) total FROM notification_webhook_events WHERE provider='wati' AND external_event_id=?",
    [`remaining-${stamp}-event`],
  );
  assert.equal(Number(events.total), 1);
  await request(app)
    .post("/api/v1/webhooks/wati")
    .set("X-WATI-Signature", "invalid")
    .send(payload)
    .expect(401);
});

test("notification retries, template variables, WATI timeout, and SMTP-disabled fallback are controlled", async () => {
  const [delivery] = await pool.query(
    `INSERT INTO notification_deliveries(user_id,channel,event,recipient,template_name,entity_type,entity_id,payload,status)
     VALUES (?,'whatsapp','order_confirmed','919876543210','sna_order_confirmed','order',?,?,'queued')`,
    [user, String(returnOrder), JSON.stringify({ orderNumber: `RETORD-${stamp}` })],
  );
  const retry = await processNotificationQueue({
    sendWhatsapp: async () => {
      throw Object.assign(new Error("timeout"), { code: "WATI_TIMEOUT", retryable: true });
    },
  });
  assert.equal(retry.retrying, 1);
  const [[retrying]] = await pool.query("SELECT status,attempt_count,last_error_code FROM notification_deliveries WHERE id=?", [delivery.insertId]);
  assert.equal(retrying.status, "retrying");
  assert.equal(retrying.last_error_code, "WATI_TIMEOUT");
  await pool.query("UPDATE notification_deliveries SET status='queued',next_attempt_at=NULL WHERE id=?", [delivery.insertId]);
  let received;
  const sent = await processNotificationQueue({ sendWhatsapp: async (input) => { received=input; return { status:"sent",providerMessageId:`mock-${stamp}` }; } });
  assert.equal(sent.sent, 1);
  assert.equal(received.template.templateName, "sna_order_confirmed");
  assert.equal(received.payload.orderNumber, `RETORD-${stamp}`);

  await assert.rejects(
    sendWatiTemplate(
      { recipient:"9876543210",template:{templateName:"sna_order_confirmed"},payload:{} },
      { config:{enabled:true,defaultCountryCode:"91",timeoutMs:1,apiBaseUrl:"https://wati.invalid",accessToken:"test-only"}, fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener("abort",()=>{const error=new Error("aborted");error.name="AbortError";reject(error);} )) },
    ),
    (error) => error.code === "WATI_TIMEOUT" && error.retryable,
  );

  assert.equal(await sendOtpEmail({ email:`smtp-disabled-${stamp}@example.invalid`,otp:"123456",purpose:"login" }), false);
  const [[smtp]] = await pool.query("SELECT status,last_error_code,payload FROM notification_deliveries WHERE channel='email' AND recipient=? ORDER BY id DESC LIMIT 1", [`smtp-disabled-${stamp}@example.invalid`]);
  assert.equal(smtp.status, "skipped");
  assert.equal(smtp.last_error_code, "SMTP_DISABLED");
  assert.equal(smtp.payload, null);
});

test("OpenAPI and Postman artifacts parse and cover every registered route", () => {
  const root = path.resolve(
    path.basename(process.cwd()) === "backend" ? ".." : ".",
  );
  const spec = JSON.parse(
      fs.readFileSync(path.join(root, "docs/openapi.yaml"), "utf8"),
    ),
    collection = JSON.parse(
      fs.readFileSync(
        path.join(root, "docs/postman/SNA-Ecommerce.postman_collection.json"),
        "utf8",
      ),
    ),
    environment = JSON.parse(
      fs.readFileSync(
        path.join(root, "docs/postman/SNA-Local.postman_environment.json"),
        "utf8",
      ),
    );
  const documented = new Set(
    Object.entries(spec.paths).flatMap(([routePath, methods]) =>
      Object.keys(methods)
        .filter((method) =>
          ["get", "post", "put", "patch", "delete"].includes(method),
        )
        .map((method) => `${method} ${routePath}`),
    ),
  );
  for (const route of discoverRoutes())
    assert.ok(documented.has(`${route.method} ${route.path}`));
  assert.ok(collection.item.length >= 20);
  assert.equal(environment.name, "SNA Local — Synthetic Test Data");
});
