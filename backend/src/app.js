import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import { env, isTrustedFrontendOrigin } from "./config/env.js";
import { pool } from "./config/db.js";
import { docsRoot, uploadsRoot } from "./config/paths.js";
import { requireTrustedOrigin } from "./middleware/requestSecurity.js";
import {
  DUPLICATE_PRODUCT_MESSAGE,
  isDuplicateProductNameError,
} from "./security/productValidation.js";
import authRoutes from "./routes/authSecure.js";
import bannerRoutes from "./routes/banners.js";
import categoryRoutes from "./routes/categories.js";
import cmsRoutes from "./routes/cms.js";
import dashboardRoutes from "./routes/dashboard.js";
import inventoryRoutes from "./routes/inventory.js";
import productRoutes from "./routes/products.js";
import userRoutes from "./routes/users.js";
import customerAuthRoutes from "./routes/v1/auth.js";
import customerUserRoutes from "./routes/v1/users.js";
import addressRoutes from "./routes/v1/addresses.js";
import catalogRoutes from "./routes/v1/catalog.js";
import cartRoutes from "./routes/v1/cart.js";
import wishlistRoutes from "./routes/v1/wishlist.js";
import orderRoutes from "./routes/v1/orders.js";
import paymentRoutes from "./routes/v1/payments.js";
import shippingRoutes from "./routes/v1/shipping.js";
import reviewRoutes from "./routes/v1/reviews.js";
import notificationRoutes from "./routes/v1/notifications.js";
import returnRoutes from "./routes/v1/returns.js";
import ticketRoutes from "./routes/v1/tickets.js";
import { publicRouter, searchRouter, analyticsRouter } from "./routes/v1/public.js";
import adminCommerceRoutes from "./routes/v1/adminCommerce.js";
import adminReturnRoutes from "./routes/v1/adminReturns.js";
import adminDispatchRoutes from "./routes/v1/adminDispatch.js";
import webhookRoutes from "./routes/v1/webhooks.js";

const app = express();

// cPanel/Passenger may forward the public application mount (for example,
// /sna-api) as part of req.url. Remove only the configured mount so the API
// routes keep their canonical /api/... paths both locally and in production.
if (env.appBasePath) {
  app.use((req, _res, next) => {
    req.url = stripBasePath(req.url, env.appBasePath);
    req.originalUrl = stripBasePath(req.originalUrl, env.appBasePath);
    next();
  });
}

if (env.trustProxy) {
  const numericTrustProxy = Number(env.trustProxy);
  app.set(
    "trust proxy",
    Number.isNaN(numericTrustProxy) ? env.trustProxy : numericTrustProxy,
  );
}

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isTrustedFrontendOrigin(origin)) {
        return callback(null, true);
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-WATI-Signature", "X-API-Key"],
  }),
);
app.use(express.json({
  limit: "32kb",
  verify(req, _res, buffer) {
    if (/^\/api\/v1\/(?:(?:payments|shipping)\/webhook\/|webhooks\/wati)/.test(req.originalUrl)) {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(cookieParser());
app.use("/docs", express.static(docsRoot, { dotfiles: "deny", index: false }));
if (env.apiDocsEnabled) {
  const openapiPath = path.join(docsRoot, "openapi.yaml");
  const openapiDocument = JSON.parse(fs.readFileSync(openapiPath, "utf8"));
  app.get("/api/docs/openapi.yaml", (_req, res) => res.type("application/yaml").send(fs.readFileSync(openapiPath, "utf8")));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument, { customSiteTitle: "SNA API Documentation" }));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api", apiLimiter, requireTrustedOrigin);
app.use(
  "/uploads",
  express.static(uploadsRoot, {
    dotfiles: "deny",
    index: false,
    maxAge: env.isProduction ? "1d" : 0,
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ success: true, status: "healthy", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ success: false, status: "unhealthy", database: "unavailable", timestamp: new Date().toISOString() });
  }
});
app.get("/api/v1", (_req, res) => {
  res.json({ success: true, message: "SNA E-commerce API v1", data: { health: "/api/health", documentation: "/docs/openapi.yaml" } });
});
app.use("/api/v1/auth", customerAuthRoutes);
app.use("/api/v1/users", customerUserRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/products", catalogRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/shipping", shippingRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/returns", returnRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1", publicRouter);

// Versioned admin aliases preserve the proven legacy handlers during migration.
app.use("/api/v1/admin/products", productRoutes);
app.use("/api/v1/admin/categories", categoryRoutes);
app.use("/api/v1/admin/inventory", inventoryRoutes);
app.use("/api/v1/admin/banners", bannerRoutes);
app.use("/api/v1/admin/users", userRoutes);
app.use("/api/v1/admin/dashboard", dashboardRoutes);
app.use("/api/v1/admin", adminReturnRoutes);
app.use("/api/v1/admin", adminDispatchRoutes);
app.use("/api/v1/admin", adminCommerceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Uploaded file is too large" });
  }

  if (error?.code?.startsWith("LIMIT_")) {
    const message = error.code === "LIMIT_UNEXPECTED_FILE"
      ? "Use only one review image field named image and one review video field named video"
      : "Invalid upload request";
    return res.status(400).json({ message });
  }

  if (error?.message === "Only JPG, PNG and WEBP images are allowed") {
    return res.status(400).json({ message: error.message });
  }

  if (error?.message === "Only MP4, WebM and MOV videos are allowed") {
    return res.status(400).json({ message: error.message });
  }

  if (isDuplicateProductNameError(error)) {
    return res.status(409).json({
      message: DUPLICATE_PRODUCT_MESSAGE,
    });
  }

  if (error?.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "A record with the same unique value already exists",
    });
  }

  console.error("Request failed:", error);
  const status = Number(error?.status);
  res.status(Number.isInteger(status) && status >= 400 && status < 600 ? status : 500).json({ success: false, message: status ? error.message : "Server error" });
});

export default app;

function stripBasePath(url, basePath) {
  if (url === basePath) return "/";
  if (url.startsWith(`${basePath}/`)) return url.slice(basePath.length);
  return url;
}
