import { env } from "../config/env.js";

const cache = new Map();

const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

function matchesPlace(input, office) {
  const expected = normalize(input);
  if (!expected) return false;
  return [office.Name, office.Block, office.District, office.Division, office.Region]
    .map(normalize)
    .some((candidate) => candidate && (candidate === expected || candidate.includes(expected) || expected.includes(candidate)));
}

async function fetchPincode(postalCode) {
  const cached = cache.get(postalCode);
  if (cached && cached.expiresAt > Date.now()) return cached.offices;

  let response;
  try {
    response = await fetch(`${env.pincodeVerification.apiUrl}/${encodeURIComponent(postalCode)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(env.pincodeVerification.timeoutMs),
    });
  } catch {
    throw Object.assign(new Error("PIN code verification service is temporarily unavailable"), { status: 503 });
  }
  if (!response.ok) throw Object.assign(new Error("PIN code verification service is temporarily unavailable"), { status: 503 });
  const body = await response.json().catch(() => []);
  const result = Array.isArray(body) ? body[0] : null;
  const offices = result?.Status === "Success" && Array.isArray(result.PostOffice) ? result.PostOffice : [];
  cache.set(postalCode, { offices, expiresAt: Date.now() + env.pincodeVerification.cacheMinutes * 60_000 });
  return offices;
}

export async function verifyAddressPincode(address) {
  if (!env.pincodeVerification.enabled || normalize(address.country) !== "india") return null;
  const postalCode = String(address.postal_code || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(postalCode)) throw Object.assign(new Error("Indian PIN code must contain exactly 6 digits"), { status: 422 });
  const offices = await fetchPincode(postalCode);
  if (!offices.length) throw Object.assign(new Error("This PIN code was not found in India Post records"), { status: 422 });
  if (!offices.some((office) => matchesPlace(address.city, office))) {
    const suggestions = [...new Set(offices.flatMap((office) => [office.Name, office.Block, office.District]).filter(Boolean))].slice(0, 6);
    throw Object.assign(new Error(`City/locality does not match PIN code ${postalCode}. Try: ${suggestions.join(", ")}`), { status: 422 });
  }
  const expectedState = normalize(address.state);
  if (expectedState && !offices.some((office) => normalize(office.State) === expectedState)) {
    throw Object.assign(new Error(`State does not match PIN code ${postalCode}; expected ${offices[0].State}`), { status: 422 });
  }
  return { postal_code: postalCode, district: offices[0].District, state: offices[0].State, matched_offices: offices.filter((office) => matchesPlace(address.city, office)).map((office) => office.Name) };
}
