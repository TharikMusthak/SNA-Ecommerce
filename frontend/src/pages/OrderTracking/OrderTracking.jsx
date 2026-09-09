import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  MapPin,
  PackageCheck,
  Package,
  Truck,
  CreditCard,
  AlertTriangle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";

import { apiErrorMessage } from "@api/axios";
import Spinner from "@components/ui/Spinner/Spinner";
import { fetchOrderTracking } from "@services/order.service";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl } from "@utils/helpers";
import {
  resolveJourney,
  resolveStageIndex,
  isTerminalStatus,
  isCancelledStatus,
  isDeliveryVisible,
  humanStatus,
} from "@utils/resolveJourney";
import fallbackImage from "@assets/images/product1.png";

// ── Constants ────────────────────────────────────────────────────────────────
const TERMINAL_STATUSES = new Set([
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "rto_delivered",
  "rto_initiated",
  "rto_in_transit",
  "rto_out_for_delivery",
  "rto_shipment_created",
  "return_initiated",
  "return_pickup_pending",
  "return_pickup_queued",
  "return_pickup_scheduled",
  "return_in_transit",
  "return_delivered",
  "lost",
  "damaged",
  "shipment_lost",
]);

// ── Main Component ────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const { orderId } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => fetchOrderTracking(orderId),
    enabled: Boolean(orderId),
    refetchInterval: (query) =>
      TERMINAL_STATUSES.has(query.state.data?.current_status) ? false : 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <PackageCheck className="mx-auto text-red-400" size={44} />
        <h1 className="mt-5 text-2xl font-semibold text-gray-900">
          Tracking unavailable
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {apiErrorMessage(error, "We could not load this order.")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#079447] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#057a3a]"
        >
          <RefreshCcw size={16} />
          Try again
        </button>
      </main>
    );
  }

  const currentStatus = String(data.current_status || "pending").toLowerCase();
  const address = data.shipping_address || {};
  const shipment = data.shipment;
  const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : null;
  const isCancelled = isCancelledStatus(currentStatus);
  const isDelivered = currentStatus === "delivered";
  const showDelivery = isDeliveryVisible(currentStatus);

  return (
    <main className="min-h-screen bg-[#f7faf7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">

        {/* Back */}
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#079447] transition hover:opacity-70"
        >
          <ArrowLeft size={17} />
          Back to my orders
        </Link>

        {/* ── Order Header ─────────────────────────────────────────────────── */}
        <OrderHeader data={data} currentStatus={currentStatus} />

        {/* ── Main Grid ───────────────────────────────────────────────────── */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">

          {/* Left — Journey section */}
          <div className="min-w-0 space-y-5">

            {/* Cancelled / returned state */}
            {isCancelled && (
              <CancelledBanner currentStatus={currentStatus} />
            )}

            {/* Product journey sections — one per ordered item */}
            {items ? (
              items.map((item, index) => (
                <ProductJourneySection
                  key={item.id ?? index}
                  item={item}
                  currentStatus={currentStatus}
                  isCancelled={isCancelled}
                  isDelivered={isDelivered}
                  orderIndex={index}
                />
              ))
            ) : (
              /* No items data — show generic journey */
              <ProductJourneySection
                item={null}
                currentStatus={currentStatus}
                isCancelled={isCancelled}
                isDelivered={isDelivered}
                orderIndex={0}
              />
            )}

            {/* Delivery info — appears once the order ships */}
            {showDelivery && shipment && (
              <DeliveryCard shipment={shipment} />
            )}
          </div>

          {/* Right — Order information */}
          <div className="space-y-4">
            <OrderInfoCard
              data={data}
              address={address}
              shipment={shipment}
              showDelivery={showDelivery}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Order Header ─────────────────────────────────────────────────────────────
function OrderHeader({ data, currentStatus }) {
  const label = humanStatus(currentStatus);
  const isDelivered = currentStatus === "delivered";
  const isCancelled = isCancelledStatus(currentStatus);

  return (
    <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 bg-[linear-gradient(135deg,#0f2a1e_0%,#0a4a27_60%,#079447_100%)] px-6 py-7 text-white sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Your Order Journey
          </p>
          <h1 className="mt-2.5 text-2xl font-semibold sm:text-3xl">
            Order {data.order_number}
          </h1>
          <p className="mt-1.5 text-sm text-emerald-100/80">
            Placed {formatDate(data.created_at)}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-4 py-2 text-sm font-bold tracking-wide backdrop-blur ${
            isDelivered
              ? "bg-emerald-400/25 text-emerald-100"
              : isCancelled
              ? "bg-red-400/25 text-red-100"
              : "bg-white/15 text-white"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Item count strip */}
      {Array.isArray(data.items) && data.items.length > 0 && (
        <div className="flex items-center gap-2 border-t border-emerald-50 bg-white px-6 py-3 sm:px-8">
          <Package size={15} className="text-[#079447]" />
          <span className="text-sm font-medium text-gray-600">
            {data.items.length} {data.items.length === 1 ? "product" : "products"}
            {" · "}
            {data.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)} items total
          </span>
        </div>
      )}
    </section>
  );
}

// ── Cancelled / RTO / NDR / Lost Banner ─────────────────────────────────────
function CancelledBanner({ currentStatus }) {
  const label = humanStatus(currentStatus);

  const getMessage = () => {
    if (currentStatus === "cancelled") return "This order has been cancelled. If you have any questions, please contact us.";
    if (currentStatus === "refunded") return "A refund has been processed for this order.";
    if (currentStatus === "returned" || currentStatus === "return_delivered") return "This order has been returned. If you have any questions, please contact us.";
    if (currentStatus.startsWith("rto")) return "This shipment is being returned to origin by the courier. We will update you shortly.";
    if (currentStatus.startsWith("return")) return "A return has been initiated for this order.";
    if (currentStatus === "lost" || currentStatus === "shipment_lost" || currentStatus === "damaged") return "The courier has reported an issue with this shipment. Please contact us so we can resolve this for you.";
    if (currentStatus === "ndr_raised" || currentStatus === "ndr_actionable") return "A delivery attempt was made but was unsuccessful. Please ensure someone is available to receive the package at the delivery address.";
    if (currentStatus === "delivery_failed" || currentStatus === "delivery_exception") return "A delivery attempt was made but was unsuccessful. The courier will try again.";
    return "This order is no longer active.";
  };

  const isWarning = ["ndr_raised", "ndr_actionable", "delivery_failed", "delivery_exception", "misrouted"].includes(currentStatus);
  const isLost = ["lost", "damaged", "shipment_lost"].includes(currentStatus);

  return (
    <section
      className={`flex items-start gap-4 rounded-[1.25rem] border p-5 ${
        isWarning
          ? "border-amber-100 bg-amber-50"
          : isLost
          ? "border-red-100 bg-red-50"
          : "border-red-100 bg-red-50"
      }`}
    >
      <AlertTriangle
        size={22}
        className={`mt-0.5 shrink-0 ${
          isWarning ? "text-amber-500" : "text-red-500"
        }`}
      />
      <div>
        <p className={`font-semibold ${ isWarning ? "text-amber-800" : "text-red-800" }`}>
          {label}
        </p>
        <p className={`mt-1 text-sm ${ isWarning ? "text-amber-700" : "text-red-600" }`}>
          {getMessage()}
        </p>
      </div>
    </section>
  );
}

// ── Product Journey Section ───────────────────────────────────────────────────
function ProductJourneySection({ item, currentStatus, isCancelled, isDelivered, orderIndex }) {
  const prefersReduced = useReducedMotion();
  const journey = resolveJourney(item ?? {});
  const stageIndex = isCancelled
    ? 0
    : resolveStageIndex(currentStatus, journey.stages.length);
  const activeStage = journey.stages[stageIndex];
  const allComplete = isDelivered;

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.07 } },
  };

  const stageVariants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">

      {/* Product identity strip */}
      {item && (
        <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4">
          <img
            src={assetUrl(item.product_image, fallbackImage)}
            alt={item.product_name || "Product"}
            className="h-14 w-14 shrink-0 rounded-xl bg-[#f5f7f1] object-contain p-1"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">
              {item.product_name || "SNA Sundaram Product"}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              Qty {item.quantity || 1}
              {item.variant_name ? ` · ${item.variant_name}` : ""}
              {item.unit_price ? ` · ${formatCurrency(item.unit_price)} each` : ""}
            </p>
          </div>
          {item.total_amount && (
            <span className="ml-auto shrink-0 text-sm font-bold text-gray-900">
              {formatCurrency(item.total_amount)}
            </span>
          )}
        </div>
      )}

      <div className="p-6 sm:p-8">
        {/* Journey header */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#079447]">
            Product Journey {orderIndex > 0 ? `· ${(item?.product_name || "").split(" ").slice(0, 2).join(" ")}` : ""}
          </p>
          <h2 className="mt-1.5 text-lg font-semibold text-gray-900">
            {journey.title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{journey.subtitle}</p>
        </div>

        {/* Active stage hero card */}
        {!isCancelled && activeStage && (
          <ActiveStageCard
            stage={activeStage}
            stageIndex={stageIndex}
            totalStages={journey.stages.length}
            allComplete={allComplete}
          />
        )}

        {/* Vertical timeline */}
        <motion.ol
          className="mt-8 space-y-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {journey.stages.map((stage, idx) => {
            const isComplete = allComplete || idx < stageIndex;
            const isCurrent = !allComplete && idx === stageIndex;
            const isFuture = !allComplete && idx > stageIndex;

            return (
              <motion.li
                key={stage.id}
                variants={stageVariants}
                className="relative flex gap-4"
              >
                {/* Connector line */}
                {idx < journey.stages.length - 1 && (
                  <span
                    className={`absolute left-[13px] top-7 h-[calc(100%-0.5rem)] w-0.5 transition-colors duration-500 ${
                      isComplete ? "bg-[#079447]" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Stage dot */}
                <div className="relative z-10 mt-1.5 shrink-0">
                  {isComplete ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#079447] shadow-sm">
                      <Check size={14} strokeWidth={3} className="text-white" />
                    </span>
                  ) : isCurrent ? (
                    <PulsingDot />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                    </span>
                  )}
                </div>

                {/* Stage content */}
                <div
                  className={`min-w-0 flex-1 pb-7 ${
                    isFuture ? "opacity-35" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-base leading-none">{stage.emoji}</span>
                    <p
                      className={`text-sm font-semibold ${
                        isCurrent
                          ? "text-[#079447]"
                          : isComplete
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      {stage.title}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#079447]">
                        Current
                      </span>
                    )}
                    {allComplete && (
                      <span className="text-xs text-gray-400">Complete</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-5.5 text-gray-500">
                    {stage.description}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>

        {/* All done message */}
        {allComplete && (
          <DeliveredMessage />
        )}
      </div>
    </section>
  );
}

// ── Active Stage Hero Card ───────────────────────────────────────────────────
function ActiveStageCard({ stage, stageIndex, totalStages, allComplete }) {
  const prefersReduced = useReducedMotion();
  if (allComplete) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#f0faf4] to-[#e8f7ee] p-5"
    >
      {/* Subtle decorative circle */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-100/40" />

      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{stage.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#079447]">
              Currently
            </p>
            <h3 className="mt-1 text-base font-bold text-gray-900">
              {stage.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {stage.description}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Stage {stageIndex + 1} of {totalStages}
            </span>
            <span className="text-xs font-semibold text-[#079447]">
              {Math.round(((stageIndex + 1) / totalStages) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <motion.div
              className="h-full rounded-full bg-[#079447]"
              initial={{ width: 0 }}
              animate={{ width: `${((stageIndex + 1) / totalStages) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Pulsing Current Stage Dot ────────────────────────────────────────────────
function PulsingDot() {
  const prefersReduced = useReducedMotion();
  return (
    <span className="relative flex h-7 w-7 items-center justify-center">
      {!prefersReduced && (
        <motion.span
          className="absolute inline-flex h-7 w-7 rounded-full bg-[#079447]/20"
          animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#079447] ring-4 ring-emerald-100">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </span>
  );
}

// ── Delivered Message ────────────────────────────────────────────────────────
function DeliveredMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-4"
    >
      <span className="text-xl">🎉</span>
      <div>
        <p className="font-semibold text-emerald-800">Your order has arrived!</p>
        <p className="mt-0.5 text-sm text-emerald-700">
          Your SNA Sundaram product has completed its journey to you. Enjoy!
        </p>
      </div>
    </motion.div>
  );
}

// ── Delivery Card (courier info) ─────────────────────────────────────────────
function DeliveryCard({ shipment }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <Truck size={18} className="text-[#079447]" />
        <h2 className="text-base font-semibold text-gray-900">On the Way</h2>
      </div>
      <div className="space-y-2.5">
        {shipment.courier_name && (
          <InfoRow label="Courier" value={shipment.courier_name} />
        )}
        {shipment.awb_code && (
          <InfoRow label="Tracking number" value={shipment.awb_code} />
        )}
        {shipment.estimated_delivery_at && (
          <InfoRow
            label="Estimated delivery"
            value={formatDate(shipment.estimated_delivery_at, false)}
            strong
          />
        )}
      </div>
      {shipment.tracking_url && (
        <a
          href={shipment.tracking_url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#079447] hover:underline"
        >
          Courier live tracking
          <ExternalLink size={14} />
        </a>
      )}
    </section>
  );
}

// ── Order Info Card (right column) ───────────────────────────────────────────
function OrderInfoCard({ data, address, shipment, showDelivery }) {
  const isCod = String(
    data.payment_method || data.payment?.provider || ""
  ).toLowerCase() === "cod";

  return (
    <div className="space-y-4">

      {/* Summary */}
      <InfoCard title="Order summary" icon={<PackageCheck size={17} />}>
        <InfoRow
          label="Items"
          value={String(
            (data.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)
          )}
        />
        <InfoRow
          label="Payment"
          value={isCod ? "Cash on Delivery" : "Paid Online"}
        />
        <InfoRow
          label="Payment status"
          value={humanStatus(data.payment_status)}
        />
        {data.summary?.subtotal != null && data.summary.subtotal !== data.summary?.total && (
          <InfoRow label="Subtotal" value={formatCurrency(data.summary.subtotal)} />
        )}
        <InfoRow
          label="Total"
          value={formatCurrency(data.summary?.total ?? 0)}
          strong
        />
        {data.created_at && (
          <InfoRow label="Ordered" value={formatDate(data.created_at, false)} />
        )}
      </InfoCard>

      {/* Delivery address */}
      <InfoCard title="Delivery address" icon={<MapPin size={17} />}>
        <p className="text-sm font-semibold text-gray-800">
          {address.full_name || "Customer"}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-gray-600">
          {[
            address.address_line_1,
            address.address_line_2,
            address.city,
            address.state,
            address.postal_code,
          ]
            .filter(Boolean)
            .join(", ") || "Address unavailable"}
        </p>
        {address.phone && (
          <p className="mt-1 text-sm text-gray-500">{address.phone}</p>
        )}
      </InfoCard>

      {/* Courier — compact version in sidebar when not shown in main */}
      {!showDelivery && shipment && (
        <InfoCard title="Shipment" icon={<Truck size={17} />}>
          <InfoRow
            label="Courier"
            value={shipment.courier_name || "Pending assignment"}
          />
          {shipment.awb_code && (
            <InfoRow label="AWB" value={shipment.awb_code} />
          )}
          {shipment.estimated_delivery_at && (
            <InfoRow
              label="Estimated delivery"
              value={formatDate(shipment.estimated_delivery_at, false)}
              strong
            />
          )}
          {shipment.tracking_url && (
            <a
              href={shipment.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#079447] hover:underline"
            >
              Courier tracking <ExternalLink size={13} />
            </a>
          )}
        </InfoCard>
      )}

      {/* Payment indicator */}
      <InfoCard title="Payment" icon={<CreditCard size={17} />}>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              data.payment_status === "paid" || data.payment_status === "completed"
                ? "bg-emerald-500"
                : data.payment_status === "failed"
                ? "bg-red-500"
                : "bg-amber-400"
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {humanStatus(data.payment_status || "pending")}
          </span>
        </div>
        {isCod && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            This is a Cash on Delivery order. Payment is collected at delivery.
          </p>
        )}
      </InfoCard>
    </div>
  );
}

// ── Shared Sub-components ────────────────────────────────────────────────────
function InfoCard({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <span className="text-[#079447]">{icon}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-2.5">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-right ${
          strong ? "font-bold text-gray-900" : "font-medium text-gray-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────
function formatDate(value, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
