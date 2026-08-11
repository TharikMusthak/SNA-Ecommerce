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
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  });
