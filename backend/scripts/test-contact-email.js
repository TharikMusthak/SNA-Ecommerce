import { env } from "../src/config/env.js";
import { pool } from "../src/config/db.js";
import {
  closeEmailTransport,
  sendContactFormNotificationEmail,
} from "../src/services/email.js";

console.log("Starting contact email delivery test...");
console.log(`Target recipient: ${env.contactEmail}`);
console.log(`SMTP host: ${env.smtp.host}:${env.smtp.port} (secure: ${env.smtp.secure})`);
console.log(`Sender from: ${env.smtp.fromName} <${env.smtp.from}>`);

try {
  const result = await sendContactFormNotificationEmail({
    ticketCode: "TKT-LOCAL-TEST",
    name: "Local Test Customer",
    email: "customer.test@gmail.com",
    phone: "+91 9876543210",
    subject: "Testing Contact Us Email",
    message: "This is a direct verification test from the local development environment.",
  });

  if (result) {
    console.log("Email sent successfully!");
    console.log(`Delivered notification to ${env.contactEmail}`);
  } else {
    console.error("Email send failed or was skipped (result returned false).");
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Unexpected error during contact email test:", error);
  process.exitCode = 1;
} finally {
  closeEmailTransport();
  try {
    await pool.end();
  } catch {
    // Ignore pool closure errors if database was not connected
  }
}
