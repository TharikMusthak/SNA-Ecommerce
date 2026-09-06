import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "development";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-only-secret-".repeat(5);
process.env.RAZORPAY_KEY_ID = "rzp_test_example";
process.env.RAZORPAY_KEY_SECRET = "test-razorpay-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-razorpay-webhook-secret";

const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/config/db.js");
const { productUploadsDir } = await import("../src/config/paths.js");
const { allowRoles } = await import("../src/middleware/auth.js");
const { imageFileFilter, verifyProductMedia } = await import(
  "../src/middleware/uploadSecurity.js"
);
const {
  isValidEmail,
  normalizeEmail,
  validatePassword,
} = await import("../src/security/validation.js");
const {
  isDuplicateProductNameError,
  normalizeProductName,
  productNameExists,
} = await import("../src/security/productValidation.js");
const {
  cleanupProductImageUploads,
  deleteUploadByUrl,
  isProductBlobUrl,
  resolveUploadPath,
  uploadProductImage,
  uploadProductImages,
} = await import(
  "../src/services/uploadFiles.js"
);
const { splitMigration } = await import(
  "../src/utils/sqlMigrationParser.js"
);
const { getOrderStatusLabels, ORDER_STATUS_DEFAULT_LABELS } = await import(
  "../src/services/orderStatusLabels.js"
);
const { createHmac } = await import("node:crypto");
const { verifyCheckoutSignature, verifyWebhookSignature } = await import(
  "../src/integrations/payments/razorpay.js"
);
const { createRazorpayOrder } = await import(
  "../src/integrations/payments/razorpay.js"
);

after(async () => {
  await pool.end();
});

test("password policy accepts only strong bcrypt-safe passwords", () => {
  assert.equal(validatePassword("short").valid, false);
  assert.equal(validatePassword("longbutnocomplexity").valid, false);
  assert.equal(validatePassword("StrongPassword@2026").valid, true);
  assert.equal(
    validatePassword(`StrongPassword@2026${"x".repeat(60)}`).valid,
    false,
  );
  assert.equal(validatePassword(`${"அ".repeat(25)}Aa1!`).valid, false);
});

test("email normalization and validation work", () => {
  assert.equal(normalizeEmail("  Admin@SNA.COM "), "admin@sna.com");
  assert.equal(isValidEmail("admin@sna.com"), true);
  assert.equal(isValidEmail("invalid-email"), false);
});

test("migration parser preserves semicolons in strings and stored procedures", () => {
  const statements = splitMigration(`
    INSERT INTO settings(setting_key,setting_value) VALUES ('example','a;b');
    DELIMITER $$
    CREATE PROCEDURE example_proc()
    BEGIN
      SELECT 'still;one;statement';
    END$$
    DELIMITER ;
    SELECT 1;
  `);
  assert.equal(statements.length, 3);
  assert.match(statements[0], /a;b/);
  assert.match(statements[1], /still;one;statement/);
  assert.equal(statements[2], "SELECT 1");
});

test("customer refresh cookie keeps the production __Host path invariant", async () => {
  const { customerRefreshCookieOptions } = await import("../src/config/env.js");
  assert.equal(customerRefreshCookieOptions().path, "/");
  assert.equal(customerRefreshCookieOptions().httpOnly, true);
});

test("Razorpay signatures reject tampering and verify exact raw payloads", () => {
  const orderId = "order_test_1";
  const paymentId = "pay_test_1";
  const checkoutSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(verifyCheckoutSignature(orderId, paymentId, checkoutSignature), true);
  assert.equal(verifyCheckoutSignature(orderId, "pay_tampered", checkoutSignature), false);

  const body = Buffer.from('{"event":"payment.captured","amount":12500}');
  const webhookSignature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, webhookSignature), true);
  assert.equal(verifyWebhookSignature(Buffer.from(`${body} `), webhookSignature), false);
});

test("Razorpay order creation sends only server-side credentials and order data", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return {
          id: "order_test_123",
          amount: 12500,
          currency: "INR",
        };
      },
    };
  };

  try {
    const order = await createRazorpayOrder({
      amountMinor: 12500,
      currency: "INR",
      receipt: "SNA-TEST-123",
    });
    assert.equal(order.id, "order_test_123");
    assert.equal(request.url, "https://api.razorpay.com/v1/orders");
    assert.deepEqual(JSON.parse(request.options.body), {
      amount: 12500,
      currency: "INR",
      receipt: "SNA-TEST-123",
    });
    assert.match(request.options.headers.Authorization, /^Basic /);
    assert.equal(request.options.body.includes("test-razorpay-key-secret"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("product name duplicate validation normalizes and identifies conflicts", () => {
  assert.equal(
    normalizeProductName("  Wild   Forest\tHoney  "),
    "Wild Forest Honey",
  );
  assert.equal(
    isDuplicateProductNameError({
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry for key 'products.uq_products_name'",
    }),
    true,
  );
  assert.equal(
    isDuplicateProductNameError({
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry for key 'admins.email'",
    }),
    false,
  );
});

test("product name lookup is case-insensitive and excludes edited product", async () => {
  let capturedQuery;
  let capturedParams;
  const queryable = {
    async query(query, params) {
      capturedQuery = query;
      capturedParams = params;
      return [[]];
    },
  };

  assert.equal(
    await productNameExists(queryable, "Wild Forest Honey", 42),
    false,
  );
  assert.match(capturedQuery, /LOWER\(name\) = LOWER\(\?\)/);
  assert.match(capturedQuery, /id <> \?/);
  assert.deepEqual(capturedParams, ["Wild Forest Honey", 42]);
});

test("upload paths stay inside their configured image folder", () => {
  assert.equal(
    resolveUploadPath("/uploads/products/example.jpg", "products"),
    path.join(productUploadsDir, "example.jpg"),
  );
  assert.equal(
    resolveUploadPath("/uploads/products/../../secret.txt", "products"),
    null,
  );
  assert.equal(
    resolveUploadPath("/uploads/banners/example.jpg", "products"),
    null,
  );
});

test("role middleware allows only configured roles", () => {
  const middleware = allowRoles("Super Admin", "Product Manager");
  let allowed = false;
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  middleware(
    { admin: { role: "Product Manager" } },
    response,
    () => {
      allowed = true;
    },
  );
  assert.equal(allowed, true);

  middleware({ admin: { role: "Order Manager" } }, response, () => {});
  assert.equal(response.statusCode, 403);
});

test("upload filter blocks SVG and allows supported raster images", () => {
  let svgError;
  imageFileFilter(
    {},
    { mimetype: "image/svg+xml" },
    (error) => {
      svgError = error;
    },
  );
  assert.match(svgError.message, /Only JPG/);

  let accepted = false;
  imageFileFilter({}, { mimetype: "image/png" }, (error, allowed) => {
    assert.equal(error, null);
    accepted = allowed;
  });
  assert.equal(accepted, true);
});

test("product image validation accepts a valid memory-backed image", async () => {
  const file = {
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
    fieldname: "main_image",
    filename: "validated.png",
    mimetype: "image/png",
    size: 68,
  };
  let nextCalled = false;
  await verifyProductMedia(
    { files: { main_image: [file] } },
    { status: () => ({ json: () => assert.fail("valid image was rejected") }) },
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
});

test("product Blob upload uses validated metadata and persists its absolute URL", async () => {
  const file = {
    buffer: Buffer.from("image"),
    filename: "unique.jpg",
    mimetype: "image/jpeg",
  };
  let call;
  const url = await uploadProductImage(file, async (...args) => {
    call = args;
    return { url: "https://store.public.blob.vercel-storage.com/products/unique.jpg" };
  });
  assert.equal(call[0], "products/unique.jpg");
  assert.equal(call[1], file.buffer);
  assert.deepEqual(call[2], { access: "public", contentType: "image/jpeg" });
  assert.equal(file.blobUrl, url);
  assert.equal(isProductBlobUrl(url), true);
});

test("partial product Blob upload failure deletes newly-created blobs", async () => {
  const files = [
    { buffer: Buffer.from("one"), filename: "one.jpg", mimetype: "image/jpeg" },
    { buffer: Buffer.from("two"), filename: "two.jpg", mimetype: "image/jpeg" },
  ];
  const deleted = [];
  let calls = 0;
  await assert.rejects(
    uploadProductImages(
      files,
      async () => {
        calls += 1;
        if (calls === 2) throw new Error("Blob unavailable");
        return { url: "https://store.public.blob.vercel-storage.com/products/one.jpg" };
      },
      async (url) => { deleted.push(url); },
    ),
    /Blob unavailable/,
  );
  assert.deepEqual(deleted, [
    "https://store.public.blob.vercel-storage.com/products/one.jpg",
  ]);
  assert.equal(files[0].blobUrl, undefined);
});

test("database rollback cleanup deletes all newly-persisted product Blob URLs", async () => {
  const files = [
    { buffer: Buffer.from("main"), filename: "main.jpg", mimetype: "image/jpeg" },
    { buffer: Buffer.from("future"), filename: "future.webp", mimetype: "image/webp" },
  ];
  await uploadProductImages(files, async (pathname) => ({
    url: `https://store.public.blob.vercel-storage.com/${pathname}`,
  }));
  const deleted = [];
  await cleanupProductImageUploads(files, async (url) => deleted.push(url));
  assert.deepEqual(deleted, [
    "https://store.public.blob.vercel-storage.com/products/main.jpg",
    "https://store.public.blob.vercel-storage.com/products/future.webp",
  ]);
  assert.equal(files.every((file) => file.blobUrl === undefined), true);
});

test("product image deletion supports Blob URLs and legacy local paths", async () => {
  const blobUrl = "https://store.public.blob.vercel-storage.com/products/old.webp";
  const deleted = [];
  assert.equal(
    await deleteUploadByUrl(blobUrl, "products", async (url) => deleted.push(url)),
    true,
  );
  assert.deepEqual(deleted, [blobUrl]);

  const fileName = `legacy-delete-${process.pid}.jpg`;
  const filePath = path.join(productUploadsDir, fileName);
  await fs.mkdir(productUploadsDir, { recursive: true });
  await fs.writeFile(filePath, "legacy");
  assert.equal(
    await deleteUploadByUrl(`/uploads/products/${fileName}`, "products"),
    true,
  );
  await assert.rejects(fs.access(filePath), { code: "ENOENT" });
});

test("product Blob replacement uploads the new image before deleting the old one", async () => {
  const events = [];
  const oldUrl = "https://store.public.blob.vercel-storage.com/products/old.jpg";
  const file = {
    buffer: Buffer.from("replacement"),
    filename: "replacement.jpg",
    mimetype: "image/jpeg",
  };
  const replacement = await uploadProductImage(file, async (pathname) => {
    events.push(`upload:${pathname}`);
    return {
      url: "https://store.public.blob.vercel-storage.com/products/replacement.jpg",
    };
  });
  assert.equal(file.blobUrl, replacement);
  await deleteUploadByUrl(oldUrl, "products", async (url) => {
    events.push(`delete:${url}`);
  });
  assert.deepEqual(events, [
    "upload:products/replacement.jpg",
    `delete:${oldUrl}`,
  ]);
});

test("health endpoint has security headers and hides Express", async () => {
  const response = await request(app).get("/api/health");

  assert.ok([200, 503].includes(response.status));
  assert.equal(response.body.success, response.status === 200);
  assert.ok(["connected", "unavailable"].includes(response.body.database));
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("v1 endpoints use consistent validation and authentication responses", async () => {
  const invalidRegistration = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", "http://localhost:5173")
    .send({ email: "invalid" })
    .expect(422);
  assert.equal(invalidRegistration.body.success, false);
  assert.equal(invalidRegistration.body.message, "Validation failed");
  assert.ok(invalidRegistration.body.errors.email);

  const protectedResponse = await request(app)
    .get("/api/v1/cart")
    .expect(401);
  assert.deepEqual(protectedResponse.body, {
    success: false,
    message: "Authentication required",
  });
});

test("uploaded images allow cross-origin display with nosniff protection", async () => {
  const fileName = `security-test-${process.pid}.png`;
  const filePath = path.join(productUploadsDir, fileName);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );

  await fs.mkdir(productUploadsDir, { recursive: true });
  await fs.writeFile(filePath, png);

  try {
    const response = await request(app)
      .get(`/uploads/products/${fileName}`)
      .expect(200);

    assert.equal(
      response.headers["cross-origin-resource-policy"],
      "cross-origin",
    );
    assert.equal(response.headers["x-content-type-options"], "nosniff");
  } finally {
    await fs.unlink(filePath).catch(() => undefined);
  }
});

test("protected routes reject requests without a session cookie", async () => {
  const response = await request(app).get("/api/cms/dashboard").expect(401);
  assert.equal(response.body.message, "Login required");
});

test("all core admin API modules require authentication", async () => {
  const protectedRoutes = [
    "/api/users",
    "/api/products",
    "/api/categories",
    "/api/inventory",
    "/api/banners",
    "/api/cms/pages",
    "/api/dashboard/summary",
  ];

  for (const route of protectedRoutes) {
    const response = await request(app).get(route).expect(401);
    assert.equal(response.body.message, "Login required");
  }
});

test("refresh and password reset endpoints validate missing input safely", async () => {
  await request(app)
    .post("/api/auth/refresh-token")
    .set("Origin", "http://localhost:5173")
    .expect(401);

  const forgot = await request(app)
    .post("/api/auth/forgot-password")
    .set("Origin", "http://localhost:5173")
    .send({ email: "not-an-email" })
    .expect(200);
  assert.match(forgot.body.message, /reset link/i);

  const reset = await request(app)
    .post("/api/auth/reset-password")
    .set("Origin", "http://localhost:5173")
    .send({ token: "invalid", password: "short" })
    .expect(400);
  assert.match(reset.body.message, /Password must contain/);
});

test("state-changing requests reject an untrusted origin", async () => {
  const response = await request(app)
    .post("/api/auth/logout")
    .set("Origin", "https://attacker.example")
    .expect(403);

  assert.equal(response.body.message, "Untrusted request origin");
});

test("development accepts equivalent configured loopback origins only on the configured port", async () => {
  for (const origin of ["http://127.0.0.1:5173", "http://[::1]:5173"]) {
    const preflight = await request(app)
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(204);

    assert.equal(preflight.headers["access-control-allow-origin"], origin);
    assert.equal(preflight.headers["access-control-allow-credentials"], "true");
  }

  const wrongPort = await request(app)
    .post("/api/auth/logout")
    .set("Origin", "http://127.0.0.1:5174")
    .expect(403);
  assert.equal(wrongPort.body.message, "Untrusted request origin");
});

test("logout clears a secure HttpOnly session cookie", async () => {
  const response = await request(app)
    .post("/api/auth/logout")
    .set("Origin", "http://localhost:5173")
    .expect(204);
  const cookie = response.headers["set-cookie"]?.[0] || "";

  assert.match(cookie, /sna_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
});

test("invalid login input returns a generic response", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Origin", "http://localhost:5173")
    .send({ email: "invalid", password: "wrong" })
    .expect(401);

  assert.equal(response.body.message, "Invalid email or password");
});

test("tracking labels fall back safely before the status-label migration", async () => {
  const database = {
    query: async () => {
      throw Object.assign(new Error("Table does not exist"), {
        code: "ER_NO_SUCH_TABLE",
      });
    },
  };

  assert.deepEqual(
    await getOrderStatusLabels(database),
    ORDER_STATUS_DEFAULT_LABELS,
  );
});
