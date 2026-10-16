import { pool } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { expireOrderReservations } from "../src/services/orderExpiry.js";

let stopping = false;
let running = false;
let timer;
async function run() {
  if (stopping || running) return;
  running = true;
  try {
    const result = await expireOrderReservations();
    console.log(`Order expiry cycle: ${result.expired} expired, ${result.failed} failed.`);
  } finally { running = false; }
}
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (timer) clearInterval(timer);
  console.log(`${signal} received; stopping order expiry worker`);
  await pool.end();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (!env.orderExpiry.workerEnabled) {
  console.log("Order expiry worker is disabled");
  await pool.end();
} else {
  await run();
  timer = setInterval(() => run().catch((error) => console.error("Order expiry cycle failed:", error.message)), env.orderExpiry.intervalMinutes * 60_000);
}
