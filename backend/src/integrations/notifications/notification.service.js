import { pool as defaultPool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { templateFor } from "./templateMap.js";
import { normalizeWhatsappNumber } from "./whatsapp.provider.js";
import { sendWatiTemplate } from "./wati.provider.js";
import { deliverQueuedEmail } from "../../services/email.js";

export async function queueNotification({ channel, event, userId = null, recipient, entityType = null, entityId = null, payload = {} }, pool = defaultPool) {
  if (!['whatsapp','email'].includes(channel)) throw Object.assign(new Error("Unsupported notification channel"), { status: 422 });
  let target = recipient;
  if (!target && userId) {
    const [[user]] = await pool.query("SELECT email,phone FROM users WHERE id=?", [userId]);
    target = channel === "whatsapp" ? user?.phone : user?.email;
  }
  if (channel === "whatsapp") target = normalizeWhatsappNumber(target, env.wati.defaultCountryCode);
  if (!target) throw Object.assign(new Error("Notification recipient is invalid"), { status: 422 });
  const template = channel === "whatsapp" ? templateFor(event) : null;
  if (channel === "whatsapp" && !template) throw Object.assign(new Error("Notification event is not mapped"), { status: 422 });
  const status = channel === "whatsapp" && !env.wati.enabled ? "skipped" : channel === "email" && !env.smtp.enabled ? "skipped" : "queued";
  const [result] = await pool.query(
    `INSERT INTO notification_deliveries(user_id,channel,event,recipient,template_name,entity_type,entity_id,payload,status,last_error_code)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [userId, channel, event, target, template?.templateName || null, entityType, entityId == null ? null : String(entityId), JSON.stringify(payload), status, status === "skipped" ? `${channel.toUpperCase()}_DISABLED` : null],
  );
  return { id: result.insertId, status };
}

export async function queueUserEvent(input, pool = defaultPool) {
  const results = await Promise.allSettled([
    queueNotification({ channel: "whatsapp", ...input }, pool),
    queueNotification({ channel: "email", ...input }, pool),
  ]);
  return results.map((result) => result.status === "fulfilled" ? result.value : { status: "failed", code: result.reason?.code || "QUEUE_FAILED" });
}

export async function processNotificationQueue({ pool = defaultPool, limit = 50, sendWhatsapp = sendWatiTemplate, sendEmail = deliverQueuedEmail } = {}) {
  const [ids] = await pool.query(
    `SELECT id FROM notification_deliveries WHERE status IN ('queued','retrying') AND (next_attempt_at IS NULL OR next_attempt_at<=UTC_TIMESTAMP()) ORDER BY id LIMIT ?`,
    [Math.min(Math.max(Number(limit) || 50, 1), 100)],
  );
  const summary = { examined: ids.length, sent: 0, skipped: 0, retrying: 0, failed: 0 };
  for (const { id } of ids) {
    const connection = await pool.getConnection();
    let delivery;
    try {
      await connection.beginTransaction();
      ([[delivery]] = await connection.query("SELECT * FROM notification_deliveries WHERE id=? FOR UPDATE", [id]));
      if (!delivery || !['queued','retrying'].includes(delivery.status)) { await connection.rollback(); continue; }
      await connection.query("UPDATE notification_deliveries SET status='sending',attempt_count=attempt_count+1 WHERE id=?", [id]);
      await connection.commit();
    } finally { connection.release(); }
    try {
      const result = delivery.channel === "whatsapp"
        ? await sendWhatsapp({ recipient: delivery.recipient, template: { templateName: delivery.template_name }, payload: parsePayload(delivery.payload) })
        : await sendEmail({ recipient: delivery.recipient, event: delivery.event, payload: parsePayload(delivery.payload) });
      await pool.query(
        "UPDATE notification_deliveries SET status=?,provider_message_id=?,last_error_code=?,sent_at=IF(?='sent',UTC_TIMESTAMP(),sent_at) WHERE id=?",
        [result.status, result.providerMessageId || null, result.code || null, result.status, id],
      );
      summary[result.status] = (summary[result.status] || 0) + 1;
    } catch (error) {
      const retry = error.retryable && Number(delivery.attempt_count) + 1 < env.wati.maxRetries;
      await pool.query(
        "UPDATE notification_deliveries SET status=?,last_error_code=?,next_attempt_at=IF(?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MINUTE),NULL) WHERE id=?",
        [retry ? "retrying" : "failed", String(error.code || "WATI_FAILED").slice(0, 120), retry, id],
      );
      summary[retry ? "retrying" : "failed"] += 1;
    }
  }
  return summary;
}

function parsePayload(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}
