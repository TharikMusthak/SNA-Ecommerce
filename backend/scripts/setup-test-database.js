import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { parseSqlMigration } from "../src/utils/sqlMigrationParser.js";

dotenv.config();
const testDatabase = process.env.TEST_DB_NAME || "sna_cms_test";
if (!/^[a-z0-9_]+_test$/i.test(testDatabase)) {
  throw new Error("TEST_DB_NAME must end with _test");
}
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
});
try {
  if (process.env.RESET_TEST_DATABASE === "true") {
    await connection.query(`DROP DATABASE IF EXISTS \`${testDatabase}\``);
  }
  const [[exists]] = await connection.query(
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [testDatabase],
  );
  if (exists) {
    console.log(`Test database ${testDatabase} already exists`);
  } else {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const baseSql = await fs.readFile(path.join(root, "database", "sna_cms.sql"), "utf8");
    const testSql = baseSql.replaceAll("sna_cms", testDatabase);
    await connection.query(testSql);
    console.log(`Created test database ${testDatabase}`);
  }
  await connection.changeUser({ database: testDatabase });
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const migrationRoot = path.join(root, "database", "migrations");
  const files = (await fs.readdir(migrationRoot)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const version = path.basename(file, ".sql");
    const [[applied]] = await connection.query("SELECT version FROM schema_migrations WHERE version=?", [version]);
    if (applied) continue;
    const statements = parseSqlMigration(await fs.readFile(path.join(migrationRoot, file), "utf8"));
    for (const statement of statements) await connection.query(statement);
    await connection.query("INSERT INTO schema_migrations(version) VALUES (?)", [version]);
    console.log(`Applied test migration ${file}`);
  }
} finally {
  await connection.end();
}
