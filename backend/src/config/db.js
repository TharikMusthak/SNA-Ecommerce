import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { env } from "./env.js";

dotenv.config();

const databaseUser = process.env.DB_USER || "root";
const databasePassword = process.env.DB_PASSWORD || "";
const databaseTimezone = String(process.env.DB_TIMEZONE || "+05:30").trim();

if (!/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(databaseTimezone)) {
  throw new Error("DB_TIMEZONE must be a numeric offset such as +05:30");
}

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
  // Existing application timestamps use Indian Standard Time wall-clock values.
  // Keep parsing and database-generated timestamps on the same fixed offset.
  timezone: databaseTimezone,
});

pool.on("connection", (connection) => {
  connection.query(`SET time_zone = '${databaseTimezone}'`);
});

export async function testDatabase() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
}
