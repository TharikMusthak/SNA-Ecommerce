import { env } from "../../config/env.js";

export function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  return null;
}

export async function sendMsg91Otp({ mobile, otp }) {
  if (!env.msg91.enabled) {
    throw Object.assign(new Error("Mobile OTP service is not configured"), {
      status: 503,
      code: "MSG91_DISABLED",
    });
  }

  const localMobile = normalizeIndianMobile(mobile);
  if (!localMobile) {
    throw Object.assign(new Error("A valid Indian mobile number is required"), {
      status: 422,
      code: "INVALID_MOBILE",
    });
  }

  const query = new URLSearchParams({
    template_id: env.msg91.templateId,
    mobile: `${env.msg91.countryCode}${localMobile}`,
    otp: String(otp),
  });
  const response = await fetch(`https://api.msg91.com/api/v5/otp?${query}`, {
    method: "GET",
    headers: { accept: "application/json", authkey: env.msg91.authKey },
    signal: AbortSignal.timeout(env.msg91.timeoutMs),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || String(body.type || "").toLowerCase() === "error") {
    throw Object.assign(new Error(body.message || "Unable to send mobile OTP"), {
      status: 502,
      code: "MSG91_SEND_FAILED",
    });
  }
  return body;
}
