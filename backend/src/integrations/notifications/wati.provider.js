import { env } from "../../config/env.js";
import { normalizeWhatsappNumber } from "./whatsapp.provider.js";

export async function sendWatiTemplate({ recipient, template, payload = {}, signal }, { config = env.wati, fetchImpl = fetch } = {}) {
  if (!config.enabled) return { status: "skipped", code: "WATI_DISABLED" };
  const phone = normalizeWhatsappNumber(recipient, config.defaultCountryCode);
  if (!phone) throw providerError("WATI_INVALID_PHONE", false);
  const controller = signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), config.timeoutMs) : null;
  try {
    const response = await fetchImpl(`${config.apiBaseUrl}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(phone)}`, {
      method: "POST",
      signal: signal || controller.signal,
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_name: template.templateName,
        broadcast_name: `sna_${Date.now()}`,
        parameters: Object.entries(payload).map(([name, value]) => ({ name, value: String(value ?? "") })),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw providerError(`WATI_HTTP_${response.status}`, response.status === 429 || response.status >= 500);
    return { status: "sent", providerMessageId: String(body.messageId || body.id || body.localMessageId || "") || null };
  } catch (error) {
    if (error.name === "AbortError") throw providerError("WATI_TIMEOUT", true);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function providerError(code, retryable) {
  return Object.assign(new Error(code), { code, retryable });
}
