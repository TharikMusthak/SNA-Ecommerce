import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { pool } from "../config/db.js";

let transporter;

function getTransporter() {
  if (
    !env.smtp.enabled ||
    !env.smtp.host ||
    !env.smtp.user ||
    !env.smtp.pass ||
    !env.smtp.from
  ) {
    return null;
  }

  transporter ||= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
    connectionTimeout: env.smtp.timeoutMs,
    greetingTimeout: env.smtp.timeoutMs,
    socketTimeout: env.smtp.timeoutMs,
  });

  return transporter;
}

export async function verifySmtpConnection() {
  const mailer = getTransporter();
  if (!mailer) {
    const error = new Error("SMTP is disabled or incomplete");
    error.code = "SMTP_DISABLED";
    throw error;
  }

  await mailer.verify();
  return { host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure };
}

export function closeEmailTransport() {
  transporter?.close();
  transporter = undefined;
}

export async function sendPasswordResetEmail({ email, name, token }) {
  const resetUrl = new URL(env.adminResetUrl);
  resetUrl.searchParams.set("token", token);
  const mailer = getTransporter();

  return sendTrackedEmail({
    event: "admin_password_reset",
    recipient: email,
    mailer,
    message: {
    from: mailFrom(),
    to: email,
    subject: "Reset your SNA Admin password",
    text: `Hello ${name},\n\nOpen this link to reset your SNA Admin password:\n${resetUrl}\n\nThis link expires in ${env.resetMinutes} minutes.`,
    html: `<p>Hello ${escapeHtml(name)},</p>
      <p>Use the link below to reset your SNA Admin password.</p>
      <p><a href="${escapeHtml(resetUrl.toString())}">Reset password</a></p>
      <p>This link expires in ${env.resetMinutes} minutes.</p>`,
    },
  });
}

export async function sendCustomerAuthEmail({ email, name, token, type }) {
  const isVerification = type === "verification";
  const target = new URL(
    isVerification ? env.customerVerifyUrl : env.customerResetUrl,
  );
  target.searchParams.set("token", token);
  const mailer = getTransporter();
  if (!mailer) return sendTrackedEmail({ event: isVerification ? "email_verification" : "password_reset_requested", recipient: email, mailer });
  const action = isVerification ? "verify your email" : "reset your password";
  try {
    return await sendTrackedEmail({ event: isVerification ? "email_verification" : "password_reset_requested", recipient: email, mailer, message: {
      from: mailFrom(),
      to: email,
      subject: isVerification ? "Verify your SNA account" : "Reset your SNA password",
      text: `Hello ${name},\n\nOpen this link to ${action}:\n${target}\n\nThis link expires shortly.`,
      html: `<p>Hello ${escapeHtml(name)},</p><p>Use the link below to ${action}.</p><p><a href="${escapeHtml(target.toString())}">${isVerification ? "Verify email" : "Reset password"}</a></p><p>This link expires shortly.</p>`,
    } });
  } catch {
    return false;
  }
}

export async function sendOtpEmail({ email, otp, purpose }) {
  const mailer = getTransporter();
  if (!mailer) return sendTrackedEmail({ event: "otp_requested", recipient: email, mailer });
  try {
    return await sendTrackedEmail({ event: "otp_requested", recipient: email, mailer, message: {
      from: mailFrom(),
      to: email,
      subject: "Your SNA verification code",
      text: `Your SNA code for ${purpose} is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your SNA code for ${escapeHtml(purpose)} is <strong>${escapeHtml(otp)}</strong>.</p><p>It expires in 10 minutes.</p>`,
    } });
  } catch {
    return false;
  }
}

export async function sendContactFormNotificationEmail({
  name,
  email,
  phone,
  subject,
  message,
  ticketCode,
}) {
  const mailer = getTransporter();
  const safeTicketCode = escapeHtml(ticketCode || "");
  const safeName = escapeHtml(name || "");
  const safeEmail = escapeHtml(email || "");
  const safePhone = escapeHtml(phone || "Not provided");
  const safeSubject = escapeHtml(subject || "");
  const safeMessage = escapeHtml(message || "").replace(/\n/g, "<br/>");

  const emailSubject = `[Contact Form] ${subject} - ${ticketCode}`;

  const text = [
    `New Contact Us submission received.`,
    ``,
    `Ticket Code: ${ticketCode}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Subject: ${subject}`,
    ``,
    `Message:`,
    `${message}`,
  ].join("\n");

  const html = [
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">`,
    `  <div style="border-bottom: 2px solid #079447; padding-bottom: 12px; margin-bottom: 20px;">`,
    `    <h2 style="color: #079447; margin: 0 0 4px 0; font-size: 20px;">New Contact Us Submission</h2>`,
    `    <p style="color: #666; margin: 0; font-size: 13px;">Ticket Reference: <strong>${safeTicketCode}</strong></p>`,
    `  </div>`,
    `  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">`,
    `    <tr>`,
    `      <td style="padding: 8px 0; color: #555; width: 120px; vertical-align: top;"><strong>Name:</strong></td>`,
    `      <td style="padding: 8px 0; color: #222;">${safeName}</td>`,
    `    </tr>`,
    `    <tr>`,
    `      <td style="padding: 8px 0; color: #555; vertical-align: top;"><strong>Email:</strong></td>`,
    `      <td style="padding: 8px 0; color: #222;"><a href="mailto:${safeEmail}" style="color: #079447; text-decoration: none;">${safeEmail}</a></td>`,
    `    </tr>`,
    `    <tr>`,
    `      <td style="padding: 8px 0; color: #555; vertical-align: top;"><strong>Phone:</strong></td>`,
    `      <td style="padding: 8px 0; color: #222;">${safePhone}</td>`,
    `    </tr>`,
    `    <tr>`,
    `      <td style="padding: 8px 0; color: #555; vertical-align: top;"><strong>Subject:</strong></td>`,
    `      <td style="padding: 8px 0; color: #222;">${safeSubject}</td>`,
    `    </tr>`,
    `  </table>`,
    `  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #079447; margin-bottom: 20px;">`,
    `    <p style="margin: 0 0 8px 0; color: #555; font-size: 13px; font-weight: bold; text-transform: uppercase;">Message:</p>`,
    `    <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>`,
    `  </div>`,
    `  <p style="color: #888; font-size: 12px; margin: 0; text-align: center; border-top: 1px solid #eee; padding-top: 12px;">`,
    `    You can reply directly to this email to respond to ${safeName} (${safeEmail}).`,
    `  </p>`,
    `</div>`,
  ].join("\n");

  return sendTrackedEmail({
    event: "contact_form_submitted",
    recipient: env.contactEmail,
    mailer,
    payload: { ticketCode, email, subject },
    message: {
      from: mailFrom(),
      to: env.contactEmail,
      replyTo: email,
      subject: emailSubject,
      text,
      html,
    },
  });
}

export async function deliverQueuedEmail({ recipient, event, payload = {} }) {
  const mailer = getTransporter();
  if (!mailer) return { status: "skipped", code: "SMTP_DISABLED" };
  const subject = emailSubjects[event] || "Update from SNA";
  const safeEntries = Object.entries(payload).slice(0, 20).map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value ?? "").slice(0, 500)}`);
  try {
    await mailer.sendMail({
      from: mailFrom(),
      to: recipient,
      subject,
      text: [subject, "", ...safeEntries].join("\n"),
      html: `<h2>${escapeHtml(subject)}</h2>${safeEntries.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}`,
    });
    return { status: "sent" };
  } catch {
    const error = new Error("SMTP_SEND_FAILED");
    error.code = "SMTP_SEND_FAILED";
    error.retryable = true;
    throw error;
  }
}

const emailSubjects = Object.freeze({
  email_verification: "Verify your SNA account",
  password_reset_requested: "Reset your SNA password",
  order_created: "Your SNA order was created",
  order_confirmed: "Your SNA order is confirmed",
  order_processing: "Your SNA order is being processed",
  order_packed: "Your SNA order is packed",
  order_shipped: "Your SNA order has shipped",
  out_for_delivery: "Your SNA order is out for delivery",
  order_delivered: "Your SNA order was delivered",
  order_cancelled: "Your SNA order was cancelled",
  return_requested: "Your SNA return was requested",
  return_approved: "Your SNA return was approved",
  return_rejected: "Your SNA return was rejected",
  inspection_completed: "Your SNA return inspection is complete",
  refund_initiated: "Your SNA refund was initiated",
  refund_completed: "Your SNA refund was completed",
  ticket_created: "Your SNA support ticket was created",
  ticket_replied: "SNA replied to your support ticket",
  contact_form_submitted: "New contact form submission",
});

function mailFrom() {
  return { name: env.smtp.fromName, address: env.smtp.from };
}

async function sendTrackedEmail({ event, recipient, mailer, message, payload }) {
  let deliveryId;
  try {
    const status = mailer ? "sending" : "skipped";
    const [result] = await pool.query(
      `INSERT INTO notification_deliveries(channel,event,recipient,status,last_error_code,payload)
       VALUES ('email',?,?,?,?,?)`,
      [event, recipient, status, mailer ? null : "SMTP_DISABLED", payload ? JSON.stringify(payload) : null],
    );
    deliveryId = result.insertId;
  } catch {
    // Authentication flows must not fail if delivery tracking is temporarily unavailable.
  }
  if (!mailer || !message) return false;
  try {
    await mailer.sendMail(message);
    if (deliveryId) await pool.query("UPDATE notification_deliveries SET status='sent',sent_at=CURRENT_TIMESTAMP WHERE id=?", [deliveryId]);
    return true;
  } catch {
    if (deliveryId) await pool.query("UPDATE notification_deliveries SET status='failed',last_error_code='SMTP_SEND_FAILED' WHERE id=?", [deliveryId]);
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
