import { pool } from "../src/config/db.js";

const requiredTables = [
  "admins",
  "users",
  "user_email_verifications",
  "user_refresh_tokens",
  "products",
  "categories",
  "carts",
  "cart_items",
  "orders",
  "order_items",
  "payments",
  "returns",
  "reviews",
  "support_tickets",
  "schema_migrations",
  "return_status_history",
  "return_inspections",
  "return_restock_actions",
  "refund_records",
  "inventory_history",
  "notification_deliveries",
  "notification_webhook_events",
  "admin_refresh_tokens",
  "password_reset_tokens",
];

try {
  const [[server]] = await pool.query(
    "SELECT VERSION() AS version, @@character_set_database AS charset",
  );
  const [tables] = await pool.query(
    "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()",
  );
  const [migrations] = await pool.query(
    "SELECT version FROM schema_migrations",
  );
  const [indexes] = await pool.query(
    "SELECT TABLE_NAME,INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()",
  );
  const [constraints] = await pool.query(
    "SELECT TABLE_NAME,CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()",
  );
  const [columns] = await pool.query(
    "SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()",
  );
  const names = new Set(tables.map((row) => row.TABLE_NAME));
  const missing = requiredTables.filter((table) => !names.has(table));
  const nonInnoDb = tables.filter((row) => row.ENGINE !== "InnoDB");
  if (missing.length) throw new Error(`Missing tables: ${missing.join(", ")}`);
  if (nonInnoDb.length)
    throw new Error(
      `Non-InnoDB tables: ${nonInnoDb.map((row) => row.TABLE_NAME).join(", ")}`,
    );
  if (server.charset !== "utf8mb4")
    throw new Error(`Database charset is ${server.charset}, expected utf8mb4`);
  const migrationNames = new Set(migrations.map((row) => row.version));
  for (const version of [
    "001_ecommerce_core",
    "002_stabilization_constraints",
    "003_remaining_modules",
    "004_admin_controls",
    "005_inventory_action_compatibility",
    "006_legacy_category_compatibility",
    "007_admin_auth_compatibility",
    "008_customer_identity_integrity",
  ]) {
    if (!migrationNames.has(version))
      throw new Error(`Migration not applied: ${version}`);
  }
  const columnNames = new Set(
    columns.map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`),
  );
  for (const name of [
    "admins.password_hash",
    "admins.role",
    "admins.status",
    "admins.session_version",
    "admin_refresh_tokens.token_hash",
    "admin_refresh_tokens.session_version",
  ]) {
    if (!columnNames.has(name))
      throw new Error(`Required column missing: ${name}`);
  }
  const indexNames = new Set(
    indexes.map((row) => `${row.TABLE_NAME}.${row.INDEX_NAME}`),
  );
  for (const name of [
    "users.uq_users_email",
    "users.uq_users_phone",
    "products.uq_products_slug",
    "orders.uq_orders_checkout_idempotency",
    "orders.idx_orders_reservation_expiry",
    "cart_items.uq_cart_product_variant_stable",
    "refund_records.uq_refund_idempotency",
    "notification_webhook_events.uq_notification_webhook_event",
  ]) {
    if (!indexNames.has(name))
      throw new Error(`Required index missing: ${name}`);
  }
  const constraintNames = new Set(
    constraints.map((row) => `${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`),
  );
  for (const name of [
    "products.fk_products_brand",
    "orders.fk_orders_user",
    "orders.fk_orders_address",
  ]) {
    if (!constraintNames.has(name))
      throw new Error(`Required constraint missing: ${name}`);
  }
  console.log(
    `Database verified: ${tables.length} InnoDB tables, ${migrations.length} migrations, utf8mb4, server ${server.version}`,
  );
} catch (error) {
  console.error(`Database verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
