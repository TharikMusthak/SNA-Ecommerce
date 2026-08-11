import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRoutes } from "./lib/discover-routes.js";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const projectRoot = path.resolve(backendRoot, "..");
const docsRoot = path.join(projectRoot, "docs");
const routes = discoverRoutes();
const schemas = [
  "SuccessResponse",
  "ValidationError",
  "AuthenticationError",
  "ForbiddenError",
  "NotFoundError",
  "ConflictError",
  "RateLimitError",
  "Pagination",
  "User",
  "Address",
  "Product",
  "ProductImage",
  "Category",
  "Brand",
  "Cart",
  "CartItem",
  "WishlistItem",
  "Order",
  "OrderItem",
  "Coupon",
  "Review",
  "Notification",
  "Return",
  "ReturnItem",
  "RefundRecord",
  "SupportTicket",
  "SupportMessage",
  "Admin",
  "Role",
  "HealthResponse",
];
const paths = {};
for (const route of routes) {
  paths[route.path] ||= {};
  paths[route.path][route.method] = operation(route);
}
const spec = {
  openapi: "3.0.3",
  info: {
    title: "SNA CMS and E-commerce API",
    version: "1.0.0",
    description:
      "Actual registered SNA API. Online provider operations are deferred and return ONLINE_PAYMENTS_DISABLED while ONLINE_PAYMENTS_ENABLED=false. COD remains available.",
  },
  servers: [{ url: "http://localhost:5000", description: "Local development" }],
  tags: [...new Set(routes.map(tagFor))].map((name) => ({
    name,
    description:
      name === "Payments — Deferred"
        ? "Online payment provider integration is disabled by feature flag and is not certified."
        : `${name} operations`,
  })),
  paths,
  components: {
    securitySchemes: {
      customerAccessCookie: {
        type: "apiKey",
        in: "cookie",
        name: "sna_customer",
        description:
          "Customer JWT access cookie; __Host-sna_customer in production.",
      },
      customerRefreshCookie: {
        type: "apiKey",
        in: "cookie",
        name: "sna_customer_refresh",
      },
      adminAccessCookie: {
        type: "apiKey",
        in: "cookie",
        name: "sna_session",
        description:
          "Admin JWT access cookie; __Host-sna_session in production.",
      },
    },
    parameters: {
      Page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      Search: {
        name: "search",
        in: "query",
        schema: { type: "string", maxLength: 120 },
      },
      Sort: { name: "sort", in: "query", schema: { type: "string" } },
      Order: {
        name: "order",
        in: "query",
        schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
      },
    },
    schemas: Object.fromEntries(schemas.map((name) => [name, schema(name)])),
  },
};
fs.writeFileSync(
  path.join(docsRoot, "openapi.yaml"),
  `${JSON.stringify(spec, null, 2)}\n`,
);
generatePostman(routes);
console.log(
  `Generated OpenAPI and Postman documentation for ${routes.length} registered routes.`,
);

function operation(route) {
  const tag = tagFor(route),
    security = securityFor(route),
    parameters = [...route.path.matchAll(/\{([^}]+)\}/g)].map((m) => ({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "integer", minimum: 1 },
    }));
  if (route.method === "get" && !route.path.match(/\{[^}]+\}$/))
    parameters.push(
      ...["Page", "Limit", "Search", "Sort", "Order"].map((name) => ({
        $ref: `#/components/parameters/${name}`,
      })),
    );
  const result = {
    tags: [tag],
    summary: `${route.method.toUpperCase()} ${route.path}`,
    operationId: operationId(route),
    description: description(route),
    security,
    parameters,
    responses: {
      200: response("Successful response"),
      201: response("Resource created"),
      204: { description: "No content" },
      400: error("ValidationError"),
      401: error("AuthenticationError"),
      403: error("ForbiddenError"),
      404: error("NotFoundError"),
      409: error("ConflictError"),
      422: error("ValidationError"),
      429: error("RateLimitError"),
      500: response("Internal server error"),
      503: response("Feature disabled or dependent service unavailable"),
    },
  };
  if (
    ["post", "put", "patch", "delete"].includes(route.method) &&
    !route.path.includes("webhook")
  ) {
    result.requestBody = {
      required: route.method !== "delete",
      content: {
        "application/json": {
          schema: { type: "object", additionalProperties: true },
          example: requestExample(route) || {},
        },
      },
    };
  }
  return result;
}
function schema(name) {
  if (name === "Pagination")
    return {
      type: "object",
      required: [
        "page",
        "limit",
        "total",
        "totalPages",
        "hasNext",
        "hasPrevious",
      ],
      properties: {
        page: { type: "integer", minimum: 1, example: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
        total: { type: "integer", minimum: 0, example: 0 },
        totalPages: { type: "integer", minimum: 0, example: 0 },
        hasNext: { type: "boolean" },
        hasPrevious: { type: "boolean" },
      },
    };
  if (name.endsWith("Error"))
    return {
      type: "object",
      required: ["success", "message"],
      properties: {
        success: { type: "boolean", enum: [false] },
        message: { type: "string", example: "Request could not be completed" },
        errors: {
          type: "object",
          nullable: true,
          additionalProperties: { type: "array", items: { type: "string" } },
        },
        code: { type: "string", nullable: true },
      },
    };
  const common = {
    id: { type: "integer", minimum: 1, example: 1 },
    created_at: { type: "string", format: "date-time", nullable: true },
  };
  const definitions = {
    SuccessResponse: { required:["success","message"], properties:{ success:{type:"boolean",enum:[true]},message:{type:"string",example:"Operation completed successfully"},data:{nullable:true},pagination:{$ref:"#/components/schemas/Pagination"} } },
    HealthResponse: { required:["success","status","database","timestamp"], properties:{success:{type:"boolean",enum:[true]},status:{type:"string",enum:["healthy"]},database:{type:"string",enum:["connected"]},timestamp:{type:"string",format:"date-time"}} },
    User: { required:["id","first_name","last_name","email","status"], properties:{...common,first_name:{type:"string",maxLength:100,example:"Sample"},last_name:{type:"string",maxLength:100,example:"Customer"},email:{type:"string",format:"email",example:"customer@example.invalid"},phone:{type:"string",nullable:true,pattern:"^[6-9][0-9]{9}$",example:"9876543210"},status:{type:"string",enum:["pending_verification","active","locked","disabled"]},email_verified_at:{type:"string",format:"date-time",nullable:true}} },
    Address: { required:["id","full_name","phone","address_line_1","city","state","country","postal_code"], properties:{...common,full_name:{type:"string",maxLength:200},phone:{type:"string",maxLength:20},address_line_1:{type:"string",maxLength:255},address_line_2:{type:"string",nullable:true,maxLength:255},city:{type:"string",maxLength:120},state:{type:"string",maxLength:120},country:{type:"string",example:"India"},postal_code:{type:"string",maxLength:20},address_type:{type:"string",enum:["home","work","other"]},is_default:{type:"boolean"}} },
    Product: { required:["id","name","slug","price","stock","status"], properties:{...common,name:{type:"string",maxLength:190,example:"Sample Product"},slug:{type:"string",maxLength:220,example:"sample-product"},sku:{type:"string",nullable:true,maxLength:120},price:{type:"number",format:"double",minimum:0,example:199},sale_price:{type:"number",format:"double",minimum:0,nullable:true},stock:{type:"integer",minimum:0},status:{type:"string",enum:["Active","Draft"]}} },
    ProductImage: { required:["id","image","sort_order"], properties:{...common,image:{type:"string",format:"uri-reference"},sort_order:{type:"integer",minimum:0}} },
    Category: { required:["id","name","slug","status"], properties:{...common,name:{type:"string",maxLength:120},slug:{type:"string",maxLength:140},parent_id:{type:"integer",minimum:1,nullable:true},status:{type:"string",enum:["Active","Draft"]}} },
    Brand: { required:["id","name","slug","status"], properties:{...common,name:{type:"string",maxLength:120},slug:{type:"string",maxLength:140},status:{type:"string",enum:["Active","Draft"]}} },
    Cart: { required:["items","summary"], properties:{id:{type:"integer",minimum:1},coupon_code:{type:"string",nullable:true,maxLength:80},items:{type:"array",items:{$ref:"#/components/schemas/CartItem"}},summary:{type:"object",properties:{subtotal:{type:"number",minimum:0},tax:{type:"number",minimum:0},shipping:{type:"number",minimum:0},discount:{type:"number",minimum:0},total:{type:"number",minimum:0}}}} },
    CartItem: { required:["id","product_id","quantity"], properties:{...common,product_id:{type:"integer",minimum:1},variant_id:{type:"integer",minimum:1,nullable:true},quantity:{type:"integer",minimum:1,maximum:999}} },
    WishlistItem: { required:["wishlist_item_id","id","name"], properties:{wishlist_item_id:{type:"integer",minimum:1},id:{type:"integer",minimum:1},name:{type:"string"},slug:{type:"string"},price:{type:"number",minimum:0}} },
    Order: { required:["id","order_code","amount","status","payment_status","currency"], properties:{...common,order_code:{type:"string",maxLength:80,example:"SNA-EXAMPLE-001"},amount:{type:"number",format:"double",minimum:0},status:{type:"string",enum:["pending","confirmed","processing","packed","shipped","out_for_delivery","delivered","cancelled","return_requested","returned","refunded","partially_refunded","failed"]},payment_status:{type:"string",enum:["pending","authorized","paid","failed","refunded","partially_refunded"]},currency:{type:"string",minLength:3,maxLength:3,example:"INR"},reservation_expires_at:{type:"string",format:"date-time",nullable:true}} },
    OrderItem: { required:["id","product_name","unit_price","quantity","total_amount"], properties:{...common,product_id:{type:"integer",minimum:1,nullable:true},variant_id:{type:"integer",minimum:1,nullable:true},product_name:{type:"string",maxLength:190},unit_price:{type:"number",minimum:0},quantity:{type:"integer",minimum:1},total_amount:{type:"number",minimum:0}} },
    Coupon: { required:["id","code","discount_type","discount_value","status"], properties:{...common,code:{type:"string",maxLength:80,example:"SAMPLE10"},discount_type:{type:"string",enum:["percentage","fixed","free_shipping"]},discount_value:{type:"number",minimum:0},starts_at:{type:"string",format:"date-time",nullable:true},ends_at:{type:"string",format:"date-time",nullable:true},status:{type:"string",enum:["active","inactive"]}} },
    Review: { required:["id","product_id","user_id","rating","status"], properties:{...common,product_id:{type:"integer",minimum:1},user_id:{type:"integer",minimum:1},rating:{type:"integer",minimum:1,maximum:5},review_text:{type:"string",maxLength:5000},is_verified_purchase:{type:"boolean"},status:{type:"string",enum:["pending","approved","rejected","hidden"]}} },
    Notification: { required:["id","type","title","message"], properties:{...common,type:{type:"string",maxLength:80},title:{type:"string",maxLength:190},message:{type:"string"},read_at:{type:"string",format:"date-time",nullable:true}} },
    Return: { required:["id","return_code","order_id","reason","status","refund_amount"], properties:{...common,return_code:{type:"string",maxLength:80,example:"RET-EXAMPLE01"},order_id:{type:"integer",minimum:1},reason:{type:"string",maxLength:190},status:{type:"string",enum:["requested","approved","rejected","pickup_scheduled","picked_up","received","inspection_pending","inspection_passed","inspection_failed","refund_pending","refunded","partially_refunded","completed","cancelled"]},refund_amount:{type:"number",minimum:0}} },
    ReturnItem: { required:["id","order_item_id","quantity","eligible_amount"], properties:{...common,order_item_id:{type:"integer",minimum:1},quantity:{type:"integer",minimum:1},accepted_quantity:{type:"integer",minimum:0},restocked_quantity:{type:"integer",minimum:0},eligible_amount:{type:"number",minimum:0},disposition:{type:"string",enum:["pending","restocked","damaged","expired","quality_rejected","no_restock"]}} },
    RefundRecord: { required:["id","return_id","refund_reference","refund_method","eligible_amount","refunded_amount","status"], properties:{...common,return_id:{type:"integer",minimum:1},refund_reference:{type:"string",maxLength:190,example:"MANUAL-EXAMPLE-001"},refund_method:{type:"string",enum:["cod_manual","bank_transfer","upi_manual","store_credit","external_pending"]},eligible_amount:{type:"number",minimum:0},refunded_amount:{type:"number",minimum:0,exclusiveMinimum:true},status:{type:"string",enum:["pending","approved","processing","completed","failed","cancelled"]},external_provider_reference:{type:"string",nullable:true,maxLength:190}} },
    SupportTicket: { required:["id","ticket_code","subject","status","priority"], properties:{...common,ticket_code:{type:"string",maxLength:80,example:"TKT-EXAMPLE01"},subject:{type:"string",maxLength:190},status:{type:"string",enum:["open","in_progress","waiting_for_customer","resolved","closed"]},priority:{type:"string",enum:["low","normal","high","urgent"]}} },
    SupportMessage: { required:["id","sender_type","message"], properties:{...common,sender_type:{type:"string",enum:["customer","admin"]},sender_id:{type:"integer",minimum:1},message:{type:"string",maxLength:10000}} },
    Admin: { required:["id","name","email","role","status"], properties:{...common,name:{type:"string",maxLength:100},email:{type:"string",format:"email",example:"admin@example.invalid"},role:{type:"string",enum:["Super Admin","Product Manager","Order Manager"]},status:{type:"string",enum:["Active","Disabled"]}} },
    Role: { required:["name"], properties:{name:{type:"string",enum:["Super Admin","Product Manager","Order Manager"]},permissions:{type:"array",items:{type:"string"}}} },
  };
  if (definitions[name]) return { type:"object", ...definitions[name], additionalProperties:true };
  return {
    type: "object",
    description: `${name} representation. Responses may include additional persisted fields documented by the route example.`,
    properties: {
      id: { type: "integer", minimum: 1, example: 1 },
      status: { type: "string", nullable: true },
      created_at: { type: "string", format: "date-time", nullable: true },
    },
    additionalProperties: true,
  };
}
function response(description) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/SuccessResponse" },
      },
    },
  };
}
function error(name) {
  return {
    description: name,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${name}` },
        example: {
          success: false,
          message:
            name === "ValidationError"
              ? "Validation failed"
              : "Request could not be completed",
        },
      },
    },
  };
}
function securityFor(route) {
  if (
    route.path.startsWith("/api/auth/") &&
    !/(login|forgot-password|reset-password)$/.test(route.path)
  )
    return [{ adminAccessCookie: [] }];
  if (route.path.startsWith("/api/v1/admin/"))
    return [{ adminAccessCookie: [] }];
  if (
    /^\/api\/v1\/(users|addresses|cart|wishlist|orders|notifications|returns|tickets)(\/|$)/.test(
      route.path,
    )
  )
    return [{ customerAccessCookie: [] }];
  if (route.path.startsWith("/api/v1/payments"))
    return route.path.includes("webhook") ? [] : [{ customerAccessCookie: [] }];
  if (
    route.path === "/api/v1/auth/me" ||
    /\/auth\/(logout|refresh-token)$/.test(route.path)
  )
    return [{ customerAccessCookie: [] }];
  if (
    route.path.startsWith("/api/v1/reviews") &&
    !["get"].includes(route.method)
  )
    return [{ customerAccessCookie: [] }];
  return [];
}
function tagFor(route) {
  const pathValue = route.path;
  if (pathValue.startsWith("/api/auth")) return "Admin Authentication";
  if (pathValue.includes("/payments")) return "Payments — Deferred";
  if (pathValue.includes("/webhooks/wati")) return "WATI Webhook";
  if (pathValue === "/api/health") return "Health";
  const segment = pathValue.replace(/^\/api\/v1\/?/, "").split("/");
  return segment[0] === "admin"
    ? `Admin ${title(segment[1] || "commerce")}`
    : title(segment[0] || "API");
}
function operationId(route) {
  return `${route.method}_${route.path
    .replace(/^\/api\//, "")
    .replace(/[{}]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")}`;
}
function title(value) {
  return value
    .split("-")
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join(" ");
}
function description(route) {
  if (route.path.includes("/payments"))
    return "Deferred online-payment endpoint. Returns 503 with code ONLINE_PAYMENTS_DISABLED when the feature flag is off.";
  if (route.path.includes("/webhooks/wati"))
    return "Public provider callback authenticated with the configured WATI webhook HMAC secret; duplicate external events are idempotent.";
  return `Registered from ${route.sources.join(", ")}. Authentication requirements are declared in security.`;
}
function requestExample(route) {
  const { method, path: routePath } = route;
  const key = `${method.toUpperCase()} ${routePath}`;
  const address = {
    full_name: "Postman Customer",
    phone: "9876543210",
    address_line_1: "12 Test Market Road",
    address_line_2: "API Test Suite",
    landmark: "Near Test Park",
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    postal_code: "600001",
    address_type: "home",
    is_default: true,
  };
  const examples = {
    "POST /api/auth/login": { email: "{{adminEmail}}", password: "{{adminPassword}}" },
    "POST /api/auth/forgot-password": { email: "{{adminEmail}}" },
    "POST /api/auth/reset-password": { token: "{{adminResetToken}}", password: "{{newAdminPassword}}" },
    "POST /api/v1/auth/register": { first_name: "Postman", last_name: "Customer", email: "{{customerEmail}}", phone: "{{customerPhone}}", password: "{{customerPassword}}", password_confirmation: "{{customerPassword}}", accept_terms: true },
    "POST /api/v1/auth/login": { login: "{{customerEmail}}", password: "{{customerPassword}}" },
    "POST /api/v1/auth/forgot-password": { email: "{{customerEmail}}" },
    "POST /api/v1/auth/reset-password": { token: "{{customerResetToken}}", password: "{{newCustomerPassword}}", password_confirmation: "{{newCustomerPassword}}" },
    "POST /api/v1/auth/send-otp": { destination: "{{customerEmail}}", purpose: "verify_email" },
    "POST /api/v1/auth/verify-otp": { destination: "{{customerEmail}}", purpose: "verify_email", otp: "{{otp}}" },
    "POST /api/v1/auth/verify-email": { token: "{{verificationToken}}" },
    "POST /api/v1/addresses": address,
    "PUT /api/v1/addresses/{id}": address,
    "POST /api/v1/cart/add": { product_id: "{{productId}}", quantity: 1 },
    "PUT /api/v1/cart/update": { item_id: "{{cartItemId}}", quantity: 2 },
    "DELETE /api/v1/cart/remove": { item_id: "{{cartItemId}}" },
    "POST /api/v1/cart/apply-coupon": { code: "{{couponCode}}" },
    "POST /api/v1/orders/create": { address_id: "{{addressId}}", payment_method: "cod" },
    "PUT /api/v1/orders/{id}/cancel": { reason: "Postman cancellation test" },
    "POST /api/v1/reviews": { product_id: "{{productId}}", rating: 5, title: "Postman test review", review_text: "Synthetic review created by the API test collection." },
    "PUT /api/v1/reviews/{id}": { rating: 4, title: "Updated Postman review", review_text: "Updated synthetic review text." },
    "POST /api/v1/returns": { order_id: "{{orderId}}", reason: "Test return request", comments: "Synthetic return created in Postman.", items: [{ order_item_id: "{{orderItemId}}", quantity: 1 }] },
    "PUT /api/v1/returns/{id}/cancel": { reason: "Postman cancellation test" },
    "POST /api/v1/tickets": { subject: "Postman API test ticket", category: "order", priority: "normal", message: "Synthetic support request generated by Postman." },
    "POST /api/v1/tickets/{id}/messages": { message: "Synthetic customer follow-up from Postman." },
    "PUT /api/v1/users/profile": { first_name: "Postman", last_name: "Customer", phone: "{{customerPhone}}" },
    "PUT /api/v1/users/change-password": { current_password: "{{customerPassword}}", password: "{{newCustomerPassword}}", password_confirmation: "{{newCustomerPassword}}" },
    "DELETE /api/v1/users/account": { password: "{{customerPassword}}" },
    "POST /api/v1/admin/categories": { name: "Postman Test Category", slug: "postman-test-category-{{runId}}", description: "Synthetic API test category", status: "Active", sort_order: 999 },
    "PUT /api/v1/admin/categories/{id}": { name: "Postman Test Category Updated", slug: "postman-test-category-updated-{{runId}}", description: "Updated synthetic category", status: "Active", sort_order: 999 },
    "PUT /api/v1/admin/categories/{id}/status": { status: "Active" },
    "POST /api/v1/admin/products": { name: "Postman Test Product {{runId}}", category_id: "{{categoryId}}", price: 125.5, stock: 20, low_stock_threshold: 5, status: "Active", description: "Synthetic product for API testing" },
    "PUT /api/v1/admin/products/{id}": { name: "Postman Test Product Updated {{runId}}", category_id: "{{categoryId}}", price: 130, stock: 20, low_stock_threshold: 5, status: "Active", description: "Updated synthetic product" },
    "PUT /api/v1/admin/products/{id}/status": { status: "Active" },
    "POST /api/v1/admin/banners": { title: "Postman Test Banner", subtitle: "Synthetic API test banner", button_text: "View products", button_link: "/products", status: "Active", sort_order: 999 },
    "PUT /api/v1/admin/banners/{id}": { title: "Postman Test Banner Updated", subtitle: "Updated synthetic banner", button_text: "View products", button_link: "/products", status: "Active", sort_order: 999 },
    "PUT /api/v1/admin/banners/{id}/status": { status: "Active" },
    "PUT /api/v1/admin/inventory/{productId}/stock": { stock: 25, low_stock_threshold: 5, note: "Postman stock test" },
    "POST /api/v1/admin/inventory/{productId}/restock": { quantity: 5, note: "Postman restock test" },
    "PUT /api/v1/admin/customers/{id}/status": { status: "active" },
    "PUT /api/v1/admin/reviews/{id}/status": { status: "approved" },
    "POST /api/v1/admin/coupons": { code: "POSTMAN{{runId}}", discount_type: "percentage", discount_value: 10, minimum_order_value: 100, maximum_discount: 50, starts_at: "2026-01-01T00:00:00.000Z", ends_at: "2027-12-31T23:59:59.000Z", per_user_limit: 1, total_usage_limit: 100, first_order_only: false, status: "active", product_ids: [], category_ids: [] },
    "PUT /api/v1/admin/coupons/{id}": { code: "POSTMAN{{runId}}", discount_type: "percentage", discount_value: 15, minimum_order_value: 100, maximum_discount: 75, starts_at: "2026-01-01T00:00:00.000Z", ends_at: "2027-12-31T23:59:59.000Z", per_user_limit: 1, total_usage_limit: 100, first_order_only: false, status: "active", product_ids: [], category_ids: [] },
    "PUT /api/v1/admin/coupons/{id}/status": { status: "active" },
    "PUT /api/v1/admin/returns/{id}/approve": { notes: "Approved by Postman test" },
    "PUT /api/v1/admin/returns/{id}/reject": { notes: "Rejected by Postman test" },
    "PUT /api/v1/admin/returns/{id}/status": { status: "received", notes: "Status updated by Postman" },
    "POST /api/v1/admin/returns/{id}/inspection": { result: "passed", notes: "Inspection passed in Postman", items: [{ return_item_id: "{{returnItemId}}", accepted_quantity: 1 }] },
    "POST /api/v1/admin/returns/{id}/restock": { items: [{ return_item_id: "{{returnItemId}}", quantity: 1, disposition: "restocked" }] },
    "POST /api/v1/admin/returns/{id}/refund-record": { refund_method: "cod_manual", refunded_amount: 100, refund_reference: "POSTMAN-REFUND-{{runId}}", status: "completed", notes: "Synthetic manual refund" },
    "PUT /api/v1/admin/refunds/{id}/status": { status: "completed", notes: "Completed in Postman" },
    "PUT /api/v1/admin/tickets/{id}/assign": { admin_id: "{{adminId}}" },
    "POST /api/v1/admin/tickets/{id}/messages": { message: "Synthetic administrator reply from Postman." },
    "PUT /api/v1/admin/tickets/{id}/status": { status: "in_progress", priority: "high" },
    "POST /api/v1/admin/users": { name: "Postman Product Manager", email: "postman.manager.{{runId}}@example.invalid", password: "{{newAdminPassword}}", role: "Product Manager", status: "Active" },
    "PUT /api/v1/admin/users/{id}": { name: "Postman Product Manager Updated", email: "postman.manager.{{runId}}@example.invalid", role: "Product Manager", status: "Active" },
    "PUT /api/v1/admin/users/{id}/status": { status: "Active" },
    "PUT /api/v1/admin/users/change-password": { current_password: "{{adminPassword}}", new_password: "{{newAdminPassword}}" },
    "POST /api/v1/analytics/product-view": { product_id: "{{productId}}", source: "postman" },
    "POST /api/v1/analytics/search": { query: "postman test", result_count: 1 },
    "PUT /api/v1/notifications/preferences": { email_enabled: true, whatsapp_enabled: true, order_updates: true, promotional: false },
    "POST /api/v1/payments/create-order": { order_id: "{{orderId}}", provider: "{{provider}}" },
    "POST /api/v1/payments/verify": { provider: "{{provider}}", payment_id: "pay_test_example", order_id: "order_test_example", signature: "test_signature" },
    "POST /api/v1/payments/webhook/{provider}": { event: "payment.captured", external_event_id: "postman-{{runId}}" },
    "POST /api/v1/webhooks/wati": { eventId: "postman-wati-{{runId}}", status: "delivered", messageId: "wati-test-message", timestamp: "2026-08-05T12:00:00.000Z" },
  };
  return Object.hasOwn(examples, key) ? examples[key] : null;
}

function generatePostman(routeList) {
  const folders = new Map();
  for (const route of routeList) {
    const folder = postmanFolder(route);
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push(postmanItem(route));
  }
  const testValues = {
    baseUrl: "http://localhost:5000",
    runId: "postman-test",
    customerEmail: "postman.customer@example.invalid",
    customerPassword: "PostmanCustomer@2026!",
    newCustomerPassword: "PostmanCustomerNew@2026!",
    customerPhone: "9876543210",
    adminEmail: "postman.admin@example.invalid",
    adminPassword: "PostmanAdmin@2026!",
    newAdminPassword: "PostmanAdminNew@2026!",
    adminResetToken: "replace-with-admin-reset-token",
    customerResetToken: "replace-with-customer-reset-token",
    verificationToken: "replace-with-verification-token-at-least-32-characters",
    otp: "123456",
    provider: "razorpay",
    couponCode: "POSTMAN10",
    productId: "1",
    categoryId: "1",
    addressId: "1",
    cartItemId: "1",
    orderId: "1",
    orderItemId: "1",
    couponId: "1",
    reviewId: "1",
    returnId: "1",
    returnItemId: "1",
    refundId: "1",
    ticketId: "1",
    notificationId: "1",
    customerId: "1",
    adminId: "1",
    bannerId: "1",
    imageId: "1",
    paymentId: "1",
    recordId: "1",
  };
  const variables = Object.entries(testValues).map(([key, value]) => ({
    key,
    value,
    type: "string",
  }));
  const collection = {
    info: {
      name: "SNA E-commerce — Complete API",
      description:
        "Generated from registered Express routes with synthetic test bodies and IDs. Uses Postman's cookie jar; JWT values are not collection variables. Replace the sample admin credentials with a dedicated test administrator. Never run destructive requests against production. Online payments are deferred.",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: variables,
    item: [...folders.entries()].sort().map(([name, item]) => ({ name, item })),
  };
  const postmanRoot = path.join(docsRoot, "postman");
  fs.mkdirSync(postmanRoot, { recursive: true });
  fs.writeFileSync(
    path.join(postmanRoot, "SNA-Ecommerce.postman_collection.json"),
    `${JSON.stringify(collection, null, 2)}\n`,
  );
  const environment = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "SNA Local — Synthetic Test Data",
    values: variables.map((v) => ({
      key: v.key,
      value: v.value,
      enabled: true,
      type: "default",
    })),
    _postman_variable_scope: "environment",
    _postman_exported_at: new Date(0).toISOString(),
    _postman_exported_using: "SNA documentation generator",
  };
  fs.writeFileSync(
    path.join(postmanRoot, "SNA-Local.postman_environment.json"),
    `${JSON.stringify(environment, null, 2)}\n`,
  );
}
function postmanItem(route) {
  const raw = `{{baseUrl}}${route.path
    .replace(/\{([^}]+)\}/g, (_match, parameter) => `{{${postmanPathVariable(route, parameter)}}}`)}`;
  const item = {
    name: `${route.method.toUpperCase()} ${route.path}`,
    request: {
      method: route.method.toUpperCase(),
      header: [],
      url: raw,
      description: description(route),
    },
  };
  const example = requestExample(route);
  if (example !== null) {
    item.request.header.push({
      key: "Content-Type",
      value: "application/json",
    });
    if (/(create|inspection|restock|refund-record)/.test(route.path))
      item.request.header.push({ key: "Idempotency-Key", value: "{{$guid}}" });
    item.request.body = {
      mode: "raw",
      raw: JSON.stringify(example, null, 2),
      options: { raw: { language: "json" } },
    };
  }
  item.event = [];
  if (route.path === "/api/v1/auth/register" && route.method === "post") {
    item.event.push({
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "const runId = `${Date.now()}-${Math.floor(Math.random()*10000)}`;",
          "pm.environment.set('runId', runId);",
          "pm.environment.set('customerEmail', `postman.customer.${runId}@example.invalid`);",
        ],
      },
    });
  }
  const capture = postmanCapture(route);
  item.event.push(
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "pm.test('Expected HTTP status', () => pm.expect(pm.response.code).to.be.oneOf([200,201,204,400,401,403,404,409,422,429,503]));",
          "if (pm.response.code !== 204 && pm.response.headers.get('Content-Type')?.includes('json')) { const body=pm.response.json(); pm.test('JSON success field',()=>pm.expect(body).to.have.property('success')); if (body.pagination) pm.test('Pagination shape',()=>pm.expect(body.pagination).to.include.all.keys('page','limit','total','totalPages','hasNext','hasPrevious')); const data=body.data ?? body; " + (capture || "") + " }",
        ],
      },
    },
  );
  return item;
}

function postmanPathVariable(route, parameter) {
  if (parameter !== "id") return parameter;
  const pathValue = route.path;
  const mappings = [
    ["/addresses/", "addressId"], ["/orders/", "orderId"],
    ["/notifications/", "notificationId"], ["/returns/", "returnId"],
    ["/reviews/", "reviewId"], ["/tickets/", "ticketId"],
    ["/admin/products/", "productId"], ["/admin/categories/", "categoryId"],
    ["/admin/banners/", "bannerId"], ["/admin/coupons/", "couponId"],
    ["/admin/customers/", "customerId"], ["/admin/refunds/", "refundId"],
    ["/admin/users/", "adminId"], ["/payments/", "paymentId"],
  ];
  return mappings.find(([segment]) => pathValue.includes(segment))?.[1] || "recordId";
}

function postmanCapture(route) {
  const key = `${route.method.toUpperCase()} ${route.path}`;
  const direct = {
    "POST /api/v1/addresses": "addressId",
    "POST /api/v1/cart/add": "cartItemId",
    "POST /api/v1/orders/create": "orderId",
    "POST /api/v1/reviews": "reviewId",
    "POST /api/v1/returns": "returnId",
    "POST /api/v1/tickets": "ticketId",
    "POST /api/v1/admin/products": "productId",
    "POST /api/v1/admin/categories": "categoryId",
    "POST /api/v1/admin/banners": "bannerId",
    "POST /api/v1/admin/coupons": "couponId",
    "POST /api/v1/admin/returns/{id}/refund-record": "refundId",
    "POST /api/v1/admin/users": "adminId",
  };
  if (direct[key]) {
    const variable = direct[key];
    return `const createdId=data?.id ?? data?.${variable.replace(/Id$/, "_id")}; if(createdId) pm.environment.set('${variable}', String(createdId));`;
  }
  const listCaptures = {
    "GET /api/v1/products": "productId",
    "GET /api/v1/categories": "categoryId",
    "GET /api/v1/notifications": "notificationId",
    "GET /api/v1/admin/customers": "customerId",
    "GET /api/v1/admin/refunds": "refundId",
  };
  if (listCaptures[key]) {
    const variable = listCaptures[key];
    return `const first=Array.isArray(data)?data[0]:null; if(first?.id) pm.environment.set('${variable}', String(first.id));`;
  }
  return "";
}
function postmanFolder(route) {
  const pathValue = route.path;
  if (pathValue === "/api/health") return "00 Health";
  if (pathValue.startsWith("/api/auth")) return "13 Admin Authentication";
  if (pathValue.includes("/webhooks/wati")) return "26 WATI Webhook Examples";
  if (pathValue.includes("/payments")) return "27 Deferred Payments";
  const map = {
    auth: "01 Customer Authentication",
    users: "02 User Profile",
    addresses: "03 Addresses",
    products: "04 Public Catalog",
    search: "04 Public Catalog",
    cart: "05 Cart",
    wishlist: "06 Wishlist",
    orders: "07 Checkout and Orders",
    coupons: "08 Coupons",
    reviews: "09 Reviews",
    notifications: "10 Notifications",
    returns: "11 Returns",
    tickets: "12 Support Tickets",
  };
  const parts = pathValue.replace("/api/v1/", "").split("/");
  if (parts[0] !== "admin") return map[parts[0]] || "04 Public Catalog";
  const admin = {
    dashboard: "14 Admin Dashboard",
    products: "15 Admin Products",
    categories: "16 Admin Categories",
    inventory: "17 Admin Inventory",
    orders: "18 Admin Orders",
    customers: "19 Admin Customers",
    reviews: "20 Admin Reviews",
    coupons: "21 Admin Coupons",
    returns: "22 Admin Returns",
    refunds: "23 Admin Refund Records",
    tickets: "24 Admin Support Tickets",
    users: "25 Administrators and Permissions",
  };
  return admin[parts[1]] || "25 Administrators and Permissions";
}
