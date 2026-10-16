import app from "./app.js";
import { env } from "./config/env.js";
import { testDatabase } from "./config/db.js";

const port = Number(process.env.PORT || 5000);

testDatabase()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(
        `SNA CMS backend (${env.nodeEnv}): http://localhost:${port}`,
      );
    });
    const shutdown = async (signal) => {
      console.log(`${signal} received; shutting down`);
      server.close(async () => {
        const { pool } = await import("./config/db.js");
        await pool.end();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error) => {
    const host = process.env.DB_HOST || "localhost";
    const portNum = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || "hint_sna";
    console.error(`MySQL connection failed to ${host}:${portNum}/${dbName}:`, error.message || error);
    if (error.code === "ECONNREFUSED") {
      console.error(`Troubleshooting: MySQL server is not running on ${host}:${portNum}. Ensure your MySQL service (e.g. XAMPP or Windows Service) is started.`);
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(`Troubleshooting: Access denied for user '${process.env.DB_USER || "root"}'. Check DB_USER and DB_PASSWORD in backend/.env.`);
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error(`Troubleshooting: Database '${dbName}' does not exist on MySQL.`);
    }
    process.exit(1);
  });
