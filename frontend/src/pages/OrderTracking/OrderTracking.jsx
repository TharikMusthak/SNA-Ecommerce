import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { apiErrorMessage } from "@api/axios";
import Spinner from "@components/ui/Spinner/Spinner";
import { fetchOrderTracking } from "@services/order.service";
import formatCurrency from "@utils/formatCurrency";

const terminalStatuses = new Set([
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "rto_delivered",
]);
const deliveryMilestones = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => fetchOrderTracking(orderId),
    enabled: Boolean(orderId),
    refetchInterval: (query) =>
      terminalStatuses.has(query.state.data?.current_status) ? false : 60_000,
  });

  if (isLoading) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Spinner /></div>;
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <PackageCheck className="mx-auto text-red-500" size={42} />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Tracking unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">{apiErrorMessage(error, "We could not load this order")}</p>
        <button type="button" onClick={() => refetch()} className="mt-6 rounded-xl bg-[#079447] px-5 py-3 text-sm font-semibold text-white">Try again</button>
      </main>
    );
  }

  const milestones = trackingMilestones(data);
  const address = data.shipping_address || {};
  const shipment = data.shipment;

  return (
    <main className="bg-[#f7faf7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[#079447] hover:underline">
          <ArrowLeft size={17} /> Back to my orders
        </Link>

        <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm">
          <header className="bg-gradient-to-r from-[#075d32] to-[#079447] px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Live order tracking</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">Order {data.order_number}</h1>
                <p className="mt-2 text-sm text-emerald-100">Placed {formatDate(data.created_at)}</p>
              </div>
              <span className="w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                {statusLabel(data.current_status, data.status_labels)}
              </span>
            </div>
          </header>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.5fr_1fr]">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">Tracking timeline</h2>
              <p className="mt-1 text-sm text-gray-500">Updates made in CRM and courier events appear here.</p>
              <ol className="mt-7">
                {milestones.map((milestone, index) => {
                  const isLast = index === milestones.length - 1;
                  return (
                    <li key={milestone.status} className="relative flex gap-4 pb-8 last:pb-0">
                      {!isLast && (
                        <span className={`absolute left-[9px] top-5 h-[calc(100%-0.15rem)] w-0.5 ${milestone.lineComplete ? "bg-[#16a34a]" : "bg-gray-200"}`} />
                      )}
                      <span className={`relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${milestone.current ? "border-[#079447] bg-[#079447] text-white ring-4 ring-emerald-100" : milestone.complete ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-gray-300 bg-white text-transparent"}`}>
                        {milestone.complete && <Check size={12} strokeWidth={3} />}
                      </span>
                      <div className={`min-w-0 flex-1 ${milestone.complete || milestone.current ? "" : "opacity-45"}`}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <p className="font-semibold text-gray-900">{statusLabel(milestone.status, data.status_labels)}</p>
                          {milestone.date && <p className="text-sm text-gray-400">{formatDate(milestone.date)}</p>}
                        </div>
                        {milestone.events.length ? (
                          <div className="mt-2 space-y-2">
                            {milestone.events.map((event) => (
                              <div key={event.key}>
                                {event.note && <p className="text-sm leading-6 text-gray-700">{event.note}</p>}
                                {(event.location || (event.date && event.date !== milestone.date)) && (
                                  <p className="text-xs text-gray-400">{event.date ? formatDate(event.date) : ""}{event.location ? ` · ${event.location}` : ""}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : milestone.current ? (
                          <p className="mt-2 text-sm text-gray-600">Your order is currently at this stage.</p>
                        ) : (
                          <p className="mt-2 text-sm text-gray-400">Waiting for update</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <aside className="space-y-4">
              {shipment && (
                <InfoCard title="Shipment" icon={<Truck size={18} />}>
                  <InfoRow label="Courier" value={shipment.courier_name || "Assignment pending"} />
                  <InfoRow label="AWB" value={shipment.awb_code || "Not assigned"} />
                  {shipment.estimated_delivery_at && <InfoRow label="Estimated delivery" value={formatDate(shipment.estimated_delivery_at, false)} />}
                  {shipment.tracking_url && (
                    <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#079447] hover:underline">
                      Courier tracking <ExternalLink size={14} />
                    </a>
                  )}
                </InfoCard>
              )}

              <InfoCard title="Delivery address" icon={<MapPin size={18} />}>
                <p className="text-sm font-semibold text-gray-800">{address.full_name || "Customer"}</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">{[address.address_line_1, address.address_line_2, address.city, address.state, address.postal_code].filter(Boolean).join(", ") || "Address unavailable"}</p>
              </InfoCard>

              <InfoCard title="Order summary" icon={<PackageCheck size={18} />}>
                <InfoRow label="Items" value={String((data.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0))} />
                <InfoRow label="Payment" value={statusLabel(data.payment_status)} />
                <InfoRow label="Total" value={formatCurrency(data.summary?.total || 0)} strong />
              </InfoCard>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function trackingMilestones(data) {
  if (!data || typeof data !== "object") return [];
  const orderEvents = (Array.isArray(data.history) ? data.history : []).map((event, index) => ({
    key: `order-${index}-${event.created_at}`,
    status: event.status,
    note: event.note,
    date: event.created_at,
    source: "order",
  }));
  const shipmentEvents = (Array.isArray(data.shipment?.timeline) ? data.shipment.timeline : []).map((event, index) => ({
    key: `shipment-${event.id || index}-${event.timestamp}`,
    status: event.status,
    note: event.description,
    location: event.location,
    date: event.timestamp,
    source: "shipment",
  }));
  const events = [...orderEvents, ...shipmentEvents].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
  const currentStatus = milestoneStatus(data.current_status);
  const exceptionStatus = ["cancelled", "returned", "refunded", "rto_delivered"].includes(currentStatus)
    ? currentStatus
    : null;
  const eventProgress = events.reduce((furthest, event) => {
    const index = deliveryMilestones.indexOf(milestoneStatus(event.status));
    return Math.max(furthest, index);
  }, 0);
  const currentIndex = Math.max(
    deliveryMilestones.indexOf(currentStatus),
    eventProgress,
    0,
  );
  const statuses = exceptionStatus
    ? [...deliveryMilestones.slice(0, currentIndex + 1), exceptionStatus]
    : deliveryMilestones;

  return statuses.map((status, index) => {
    const matching = events.filter((event) => milestoneStatus(event.status) === status);
    const current = exceptionStatus ? status === exceptionStatus : index === currentIndex;
    const complete = exceptionStatus
      ? status === exceptionStatus || index <= currentIndex
      : index <= currentIndex;
    return {
      status,
      current,
      complete,
      lineComplete: exceptionStatus ? complete : index < currentIndex,
      events: matching,
      date: matching.at(-1)?.date || (index === 0 ? data.created_at : null),
    };
  });
}

function milestoneStatus(value) {
  const status = String(value || "pending").toLowerCase();
  if (["shipment_created", "awb_assigned", "pickup_scheduled", "picked_up", "in_transit"].includes(status)) return "shipped";
  if (status === "delivery_failed") return "out_for_delivery";
  return status;
}

function statusLabel(value, labels = {}) {
  if (labels[value]) return labels[value];
  return String(value || "Pending").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value, includeTime = true) {
  if (!value) return "Update pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function InfoCard({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><span className="text-[#079447]">{icon}</span>{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, strong = false }) {
  return <div className="flex items-start justify-between gap-4 text-sm"><span className="text-gray-500">{label}</span><span className={`text-right ${strong ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>{value}</span></div>;
}
