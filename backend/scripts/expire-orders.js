import { pool } from "../src/config/db.js";
import { expireOrderReservations } from "../src/services/orderExpiry.js";

try {
  const result = await expireOrderReservations();
  console.log(`Order expiry complete: ${result.expired} expired, ${result.skipped} skipped, ${result.failed} failed.`);
  process.exitCode = result.failed ? 1 : 0;
} finally {
  await pool.end();
}
