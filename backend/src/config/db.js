import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { env } from "./env.js";

dotenv.config();

const databaseUser = process.env.DB_USER || "root";
const databasePassword = process.env.DB_PASSWORD || "";
const databaseTimezone = process.env.DB_TIMEZONE || "+05:30";

if (env.isProduction && (!databasePassword || databaseUser === "root")) {
  throw new Error(
    "Production database must use a password-protected, non-root DB_USER",
  );
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: databaseUser,
  password: databasePassword,
  database: process.env.DB_NAME || "sna_cms",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  enableKeepAlive: true,
  multipleStatements: false,
  // MySQL timestamps in this application use Indian Standard Time. Supplying
  // the offset prevents mysql2 from interpreting an IST wall-clock value as UTC.
  timezone: databaseTimezone,
});

export async function testDatabase() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
}
