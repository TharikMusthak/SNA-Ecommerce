import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { splitMigration } from "../src/utils/sqlMigrationParser.js";

dotenv.config();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "database", "migrations");
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sna_cms",
  multipleStatements: true,
});

try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const files = (await fs.readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const version = path.basename(file, ".sql");
    const [[applied]] = await connection.query("SELECT version FROM schema_migrations WHERE version = ?", [version]);
    if (applied) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    const statements = splitMigration(sql);
    for (const [index, statement] of statements.entries()) {
      try {
        await connection.query(statement);
      } catch (error) {
        throw new Error(
          `Migration ${version} failed at statement ${index + 1}/${statements.length}: ${error.message}`,
          { cause: error },
        );
      }
    }
    await connection.query("INSERT INTO schema_migrations(version) VALUES (?)", [version]);
    console.log(`Applied migration ${version}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
