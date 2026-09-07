import { JOURNEY_TEMPLATES } from "@data/journeyTemplates";

/**
 * Resolves the journey template for a given product.
 *
 * Resolution order:
 *  1. product_slug exact match (e.g. "garlic-honey", "energy-laddu", "ulundhu-laddu")
 *  2. product_name fuzzy keyword match (case-insensitive)
 *  3. category_name keyword match
 *  4. Default fallback
 *
 * Returns a JOURNEY_TEMPLATES entry (never null).
 */
export function resolveJourney(item = {}) {
  const slug = String(item.product_slug || item.slug || "").toLowerCase().trim();
  const name = String(item.product_name || item.name || "").toLowerCase().trim();
  const cat  = String(item.category_name || item.category || "").toLowerCase().trim();

  // ── 1. Direct slug / templateId match ───────────────────────────────────────
  if (JOURNEY_TEMPLATES[slug]) return JOURNEY_TEMPLATES[slug];
  // Backwards-compat alias: old "garlic-honey" slug → poondu-halwa
  if (slug === "garlic-honey") return JOURNEY_TEMPLATES["poondu-halwa"];

  // ── 2. Keyword rules — product name ─────────────────────────────────────────

  // Ulundhu Laddu — urad dal based
  if (hasAny(name, ["ulundhu", "urad", "black gram", "ulundu"])) {
    return JOURNEY_TEMPLATES["ulundhu-laddu"];
  }

  // Ellu Laddu — sesame based (check before generic laddu)
  if (hasAny(name, ["ellu", "sesame laddu", "sesame laddoo", "til laddu", "nuvvula laddu"])) {
    return JOURNEY_TEMPLATES["ellu-laddu"];
  }

  // Poondu Halwa — garlic + honey/ghee based
  if (hasAny(name, ["poondu", "halwa", "halva", "garlic halwa", "poondu halwa"])) {
    return JOURNEY_TEMPLATES["poondu-halwa"];
  }
  if (hasAny(name, ["garlic"])) {
    return JOURNEY_TEMPLATES["poondu-halwa"];
  }
  if (hasAny(name, ["honey"]) && !hasAny(name, ["laddu", "ladoo", "ladu", "ellu"])) {
    return JOURNEY_TEMPLATES["poondu-halwa"];
  }

  // Energy Laddu — finger millet / ragi based
  if (hasAny(name, ["energy laddu", "energy laddoo", "energy ladu", "energy ladoo"])) {
    return JOURNEY_TEMPLATES["energy-laddu"];
  }
  if (hasAny(name, ["ragi", "finger millet", "keppai"])) {
    return JOURNEY_TEMPLATES["energy-laddu"];
  }

  // Generic laddu fallback — use energy-laddu as closest match
  if (hasAny(name, ["laddu", "ladoo", "ladu", "ladoo"])) {
    return JOURNEY_TEMPLATES["energy-laddu"];
  }

  // ── 3. Keyword rules — category name ────────────────────────────────────────
  if (hasAny(cat, ["ulundhu", "urad", "ulundu"])) return JOURNEY_TEMPLATES["ulundhu-laddu"];
  if (hasAny(cat, ["ellu", "sesame"])) return JOURNEY_TEMPLATES["ellu-laddu"];
  if (hasAny(cat, ["halwa", "halva", "poondu", "garlic"])) return JOURNEY_TEMPLATES["poondu-halwa"];
  if (hasAny(cat, ["laddu", "ladoo", "ladu", "sweet"])) return JOURNEY_TEMPLATES["energy-laddu"];

  // ── 4. Default fallback ──────────────────────────────────────────────────────
  return JOURNEY_TEMPLATES["default"];
}

function hasAny(str, keywords) {
  return keywords.some((kw) => str.includes(kw));
}


/**
 * Normalises a raw status value into a consistent snake_case key.
 *
 * Shiprocket can return statuses as:
 *   - snake_case:  "pickup_pending", "rto_initiated"
 *   - Title Case:  "Pickup Pending", "RTO Initiated"
 *   - UPPER CASE:  "PICKUP PENDING"
 *   - numeric:     6 (status_code)
 *
 * This function converts all of them to the snake_case form used in statusMap.
 */
function normaliseStatus(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");   // "Pickup Pending" → "pickup_pending"
}

/**
 * Maps an order's current_status to a journey stage index.
 *
 * Covers the full Shiprocket status set:
 *
 *   PREPARATION STAGES (before shipment)
 *     pending / new / created                → stage 0
 *     confirmed / processing / fulfilling    → stage 1
 *     packing / packed / ready_to_ship       → stage 2  (≈65% through)
 *
 *   SHIPROCKET PICKUP & TRANSIT (shipment underway)
 *     pickup_pending / pickup_queued         → stage penultimate-1
 *     pickup_scheduled / pickup_error        → stage penultimate-1
 *     picked_up / shipment_created
 *     awb_assigned / label_created           → stage penultimate
 *     in_transit / transit                   → stage penultimate
 *     shipped                                → stage penultimate
 *
 *   DELIVERY ATTEMPT
 *     out_for_delivery / ofd                 → last stage
 *     delivery_failed / delivery_exception
 *     ndr_raised / ndr_actionable            → last stage (stuck at OFD)
 *
 *   COMPLETED
 *     delivered                              → all complete
 *
 *   RTO / RETURN (treated separately as cancelled — see isCancelledStatus)
 *     rto_initiated / rto_in_transit
 *     rto_delivered / rto_out_for_delivery
 *     return_initiated / return_pickup_pending
 *     return_delivered / returned
 *
 *   EXCEPTIONS
 *     lost / damaged                         → treated as terminal/cancelled
 *     cancelled / refunded                   → cancelled
 */
export function resolveStageIndex(currentStatus = "", stageCount = 4) {
  const status = normaliseStatus(currentStatus);

  // For cancelled/RTO/lost statuses the caller checks isCancelledStatus first
  // and skips the journey, but we still return a safe value here.
  if (isCancelledStatus(status)) return 0;

  // ── Stage boundaries (proportional, works for any stage count) ──────────────
  const s = (fraction) => Math.min(Math.floor(stageCount * fraction), stageCount - 1);
  const last = stageCount - 1;
  const penultimate = Math.max(last - 1, 0);

  const statusMap = {
    // ── Pre-shipment (preparation) ──────────────────────────────────────────
    pending:               0,
    new:                   0,
    created:               0,
    confirmed:             Math.min(1, last),
    processing:            s(0.35),
    fulfilling:            s(0.35),
    packing:               s(0.65),
    packed:                s(0.65),
    ready_to_ship:         s(0.65),

    // ── Shiprocket pickup pending / queued ───────────────────────────────────
    pickup_pending:        Math.max(penultimate - 1, s(0.65)),
    pickup_queued:         Math.max(penultimate - 1, s(0.65)),
    pickup_scheduled:      Math.max(penultimate - 1, s(0.65)),
    pickup_error:          Math.max(penultimate - 1, s(0.65)),

    // ── Shipment created / AWB assigned / in transit ─────────────────────────
    shipment_created:      penultimate,
    awb_assigned:          penultimate,
    label_created:         penultimate,
    picked_up:             penultimate,
    in_transit:            penultimate,
    transit:               penultimate,
    shipped:               penultimate,

    // ── Out for delivery / failed delivery attempts ──────────────────────────
    out_for_delivery:      last,
    ofd:                   last,
    delivery_failed:       last,
    delivery_exception:    last,
    ndr_raised:            last,
    ndr_actionable:        last,
    misrouted:             last,

    // ── Delivered ────────────────────────────────────────────────────────────
    delivered:             last,
  };

  const idx = statusMap[status] ?? 0;
  return Math.min(idx, last);
}

/**
 * Returns true if the order is in a terminal state (no further progress possible).
 * Includes all Shiprocket RTO, return, lost, and cancellation states.
 */
export function isTerminalStatus(currentStatus = "") {
  const status = normaliseStatus(currentStatus);
  const terminal = new Set([
    "delivered",
    "cancelled",
    "returned",
    "refunded",
    // Shiprocket RTO
    "rto_initiated",
    "rto_in_transit",
    "rto_out_for_delivery",
    "rto_delivered",
    "rto_shipment_created",
    // Shiprocket returns
    "return_initiated",
    "return_pickup_pending",
    "return_pickup_queued",
    "return_pickup_scheduled",
    "return_in_transit",
    "return_delivered",
    // Lost / damaged
    "lost",
    "damaged",
    "shipment_lost",
  ]);
  return terminal.has(status);
}

/**
 * Returns true if the order is cancelled, returned, lost, or in RTO —
 * i.e. the customer should see a negative/neutral status, not a journey.
 */
export function isCancelledStatus(currentStatus = "") {
  const status = normaliseStatus(currentStatus);
  const cancelled = new Set([
    "cancelled",
    "returned",
    "refunded",
    // Shiprocket RTO
    "rto_initiated",
    "rto_in_transit",
    "rto_out_for_delivery",
    "rto_delivered",
    "rto_shipment_created",
    // Shiprocket returns
    "return_initiated",
    "return_pickup_pending",
    "return_pickup_queued",
    "return_pickup_scheduled",
    "return_in_transit",
    "return_delivered",
    // Lost
    "lost",
    "damaged",
    "shipment_lost",
  ]);
  return cancelled.has(status);
}

/**
 * Returns true when delivery-related information (courier name, AWB, tracking URL)
 * should be surfaced prominently in the UI.
 */
export function isDeliveryVisible(currentStatus = "") {
  const status = normaliseStatus(currentStatus);
  const deliveryStatuses = new Set([
    "shipped",
    "shipment_created",
    "awb_assigned",
    "label_created",
    "pickup_pending",
    "pickup_queued",
    "pickup_scheduled",
    "picked_up",
    "in_transit",
    "transit",
    "out_for_delivery",
    "ofd",
    "delivery_failed",
    "delivery_exception",
    "ndr_raised",
    "ndr_actionable",
    "misrouted",
    "delivered",
  ]);
  return deliveryStatuses.has(status);
}

/**
 * Returns a customer-friendly label for any Shiprocket or internal status.
 */
export function humanStatus(value = "") {
  const status = normaliseStatus(value);
  const map = {
    // Internal
    pending:                   "Pending",
    new:                       "Order Received",
    created:                   "Order Received",
    confirmed:                 "Order Confirmed",
    processing:                "Preparation Underway",
    fulfilling:                "Preparation Underway",
    packing:                   "Quality Check",
    packed:                    "Quality Check Complete",
    ready_to_ship:             "Ready for Dispatch",
    // Shiprocket pickup
    pickup_pending:            "Pickup Pending",
    pickup_queued:             "Pickup Pending",
    pickup_scheduled:          "Pickup Scheduled",
    pickup_error:              "Pickup Rescheduled",
    // Transit
    shipment_created:          "On the Way",
    awb_assigned:              "On the Way",
    label_created:             "On the Way",
    picked_up:                 "Picked Up",
    in_transit:                "In Transit",
    transit:                   "In Transit",
    shipped:                   "On the Way",
    // Delivery
    out_for_delivery:          "Out for Delivery",
    ofd:                       "Out for Delivery",
    delivery_failed:           "Delivery Attempted",
    delivery_exception:        "Delivery Exception",
    ndr_raised:                "Delivery Attempted — Action Needed",
    ndr_actionable:            "Delivery Attempted — Action Needed",
    misrouted:                 "Shipment Rerouted",
    delivered:                 "Delivered",
    // Negative
    cancelled:                 "Cancelled",
    returned:                  "Returned",
    refunded:                  "Refunded",
    rto_initiated:             "Return to Origin Initiated",
    rto_in_transit:            "Return to Origin — In Transit",
    rto_out_for_delivery:      "Return to Origin — Out for Delivery",
    rto_delivered:             "Returned to Origin",
    rto_shipment_created:      "Return to Origin",
    return_initiated:          "Return Initiated",
    return_pickup_pending:     "Return Pickup Pending",
    return_pickup_queued:      "Return Pickup Pending",
    return_pickup_scheduled:   "Return Pickup Scheduled",
    return_in_transit:         "Return In Transit",
    return_delivered:          "Return Delivered",
    lost:                      "Shipment Lost",
    damaged:                   "Shipment Damaged",
    shipment_lost:             "Shipment Lost",
    // Payment
    paid:                      "Paid",
    completed:                 "Paid",
    failed:                    "Payment Failed",
    unpaid:                    "Unpaid",
    cod:                       "Cash on Delivery",
  };
  return (
    map[status] ??
    String(value).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}
