export function normalizeWhatsappNumber(value, defaultCountryCode = "91") {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^[6-9]\d{9}$/.test(digits)) return `${defaultCountryCode}${digits}`;
  if (defaultCountryCode === "91" && /^91[6-9]\d{9}$/.test(digits)) return digits;
  if (digits.startsWith(`${defaultCountryCode}${defaultCountryCode}`)) return null;
  if (digits.startsWith(defaultCountryCode) && digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}
