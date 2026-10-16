export const watiTemplates = Object.freeze(Object.fromEntries([
  "customer_registered","otp_requested","password_reset_requested","order_created",
  "order_confirmed","order_processing","order_packed","order_shipped",
  "out_for_delivery","order_delivered","order_cancelled","return_requested",
  "return_approved","return_rejected","pickup_scheduled","return_received",
  "inspection_completed","refund_initiated","refund_completed","ticket_created","ticket_replied",
].map((event) => [event, { templateName: `sna_${event}`, language: "en" }])));

export function templateFor(event) {
  return watiTemplates[event] || null;
}
