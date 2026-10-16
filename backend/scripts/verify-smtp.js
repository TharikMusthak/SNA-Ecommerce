import { closeEmailTransport, verifySmtpConnection } from "../src/services/email.js";
import { pool } from "../src/config/db.js";

try {
  const connection = await verifySmtpConnection();
  console.log(
    `SMTP verified: ${connection.host}:${connection.port} secure=${connection.secure}`,
  );
} catch (error) {
  console.error(`SMTP verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  closeEmailTransport();
  await pool.end();
}
