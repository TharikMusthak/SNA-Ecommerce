import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  RotateCcw,
} from "lucide-react";
import { api, assetUrl } from "../api";
import Badge from "../components/Badge";
import { TableImage } from "../components/DataTable";
import { Dialog } from "../components/Dialog";

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];
const scopes = [
  { value: "current", label: "Current" },
  { value: "unpaid", label: "Unpaid" },
  { value: "all", label: "All orders" },
];

export default function Orders({ onStageChange }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState({
    search: "",
    scope: "current",
    status: "",
    payment_status: "",
    from: "",
    to: "",
    page: 1,
    limit: 20,
  });
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setQuery((current) => ({ ...current, search, page: 1 })),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(
        Object.entries(query).filter(([, value]) => value !== ""),
      );
      const response = await api(`/v1/admin/orders?${params}`);
      setRows(response.data || []);
      setPagination(
        response.pagination || { page: 1, totalPages: 1, total: 0 },
      );
    } catch (requestError) {
      try {
        const dashboard = await api("/cms/dashboard");
        const filtered = filterLegacyOrders(dashboard.orders || [], query);
        const start = (query.page - 1) * query.limit;
        const pageRows = filtered.slice(start, start + query.limit);
        const totalPages = Math.max(Math.ceil(filtered.length / query.limit), 1);
        setRows(pageRows);
        setPagination({
          page: query.page,
          limit: query.limit,
          total: filtered.length,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrevious: query.page > 1,
        });
      } catch {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(order, status) {
    const stage = statuses.indexOf(status) + 1;
    if (!stage || saving) return;
    setSaving(true);
    try {
      await onStageChange(order.id, stage);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const hasFilters =
    Object.entries(query).some(
      ([key, value]) =>
        !["page", "limit", "scope"].includes(key) && Boolean(value),
    ) || search;

  return (
    <section className="orders-page">
      <div className="section-heading">
        <div>
          <h2>Orders</h2>
          <p>{pagination.total} orders in this view</p>
        </div>
      </div>

      <nav className="order-scope-tabs" aria-label="Order views">
        {scopes.map((scope) => (
          <button
            key={scope.value}
            type="button"
            className={query.scope === scope.value ? "active" : ""}
            onClick={() =>
              setQuery({
                ...query,
                scope: scope.value,
                status: "",
                payment_status: "",
                page: 1,
              })
            }
          >
            {scope.label}
          </button>
        ))}
      </nav>

      <div className="commerce-toolbar order-toolbar">
        <input
          type="search"
          aria-label="Search orders"
          placeholder="Order number, customer or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Order status"
          value={query.status}
          onChange={(event) =>
            setQuery({ ...query, status: event.target.value, page: 1 })
          }
        >
          <option value="">All order statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </select>
        <select
          aria-label="Payment status"
          value={query.payment_status}
          onChange={(event) =>
            setQuery({
              ...query,
              payment_status: event.target.value,
              page: 1,
            })
          }
        >
          <option value="">All payment statuses</option>
          {["pending", "authorized", "paid", "failed", "refunded", "partially_refunded"].map(
            (status) => (
              <option key={status}>{status}</option>
            ),
          )}
        </select>
        <input
          aria-label="From date"
          type="date"
          value={query.from}
          onChange={(event) =>
            setQuery({ ...query, from: event.target.value, page: 1 })
          }
        />
        <input
          aria-label="To date"
          type="date"
          value={query.to}
          onChange={(event) =>
            setQuery({ ...query, to: event.target.value, page: 1 })
          }
        />
        <button
          className="secondary-button"
          type="button"
          disabled={!hasFilters}
          onClick={() => {
            setSearch("");
            setQuery({
              search: "",
              scope: query.scope,
              status: "",
              payment_status: "",
              from: "",
              to: "",
              page: 1,
              limit: 20,
            });
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {loading && <p className="orders-state">Loading orders…</p>}
      {!loading && error && <p className="orders-state orders-state--error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="orders-state">No orders match these filters.</p>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="order-card-list">
          {rows.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              saving={saving}
              onStatusChange={changeStatus}
              onView={() => setSelected(order)}
            />
          ))}
        </div>
      )}

      <div className="commerce-pagination">
        <button
          disabled={loading || pagination.page <= 1}
          onClick={() => setQuery({ ...query, page: query.page - 1 })}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
        </span>
        <button
          disabled={loading || !pagination.hasNext}
          onClick={() => setQuery({ ...query, page: query.page + 1 })}
        >
          Next
        </button>
      </div>

      {selected && (
        <OrderDialog order={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

function OrderCard({ order, saving, onStatusChange, onView }) {
  const [expanded, setExpanded] = useState(false);
  const items = order.items || [];
  const visibleItems = expanded ? items : items.slice(0, 4);
  const address = order.shipping_address || safeJson(order.shipping_address_json);
  const summary = order.summary || {
    total: Number(order.amount || 0),
    currency: order.currency || "INR",
  };

  return (
    <article className="order-card">
      <header className="order-card__header">
        <div>
          <h3>Order #: {order.order_number || order.order_code}</h3>
          <p>
            {order.item_count || items.length} products · {formatDateOnly(order.created_at)}
          </p>
        </div>
        <div className="order-card__actions">
          <button type="button" onClick={() => downloadInvoice(order)}>
            <Download size={14} /> Download invoice
          </button>
          <button type="button" aria-label="View complete order details" onClick={onView}>
            <Eye size={15} /> View details
          </button>
        </div>
      </header>

      <div className="order-card__meta">
        <div>
          <span>Status</span>
          <select
            aria-label={`Status for ${order.order_code}`}
            value={order.status || "pending"}
            disabled={
              saving || ["delivered", "cancelled", "returned"].includes(order.status)
            }
            onChange={(event) => onStatusChange(order, event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span>Date of delivery</span>
          <b>{deliveryDate(order)}</b>
        </div>
        <div>
          <span>Delivered to</span>
          <b>{shortAddress(address)}</b>
        </div>
        <div>
          <span>Total</span>
          <b>{currency(summary.total, summary.currency)}</b>
          <small><Badge value={order.payment_status} /></small>
        </div>
      </div>

      <div className="order-product-grid">
        {visibleItems.map((item) => (
          <div className="order-product" key={item.id}>
            <TableImage
              src={item.product_image ? assetUrl(item.product_image) : ""}
              alt={item.product_name}
            />
            <span>
              <b>{item.product_name || `Product #${item.product_id}`}</b>
              <small>
                Quantity: {item.quantity} × {currency(item.unit_price, order.currency)}
              </small>
              <small>{variantLabel(item)}</small>
            </span>
            <strong>{currency(item.total_amount, order.currency)}</strong>
          </div>
        ))}
      </div>

      {items.length > 4 && (
        <button
          className="order-card__expand"
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {expanded ? "Show fewer products" : `Show ${items.length - 4} more products`}
        </button>
      )}
    </article>
  );
}

function OrderDialog({ order, onClose }) {
  const address = order.shipping_address || safeJson(order.shipping_address_json);
  const summary = order.summary || {};
  return (
    <Dialog
      title={`Order ${order.order_number || order.order_code}`}
      description={`${formatDate(order.created_at)} · ${order.customer_details?.name || order.customer}`}
      onClose={onClose}
      size="large"
    >
      <div className="order-detail-grid">
        <section>
          <h3>Order summary</h3>
          <dl className="commerce-detail">
            <div><dt>Status</dt><dd><Badge value={order.status} /></dd></div>
            <div><dt>Payment</dt><dd><Badge value={order.payment_status} /></dd></div>
            <div><dt>Customer</dt><dd>{order.customer_details?.name || order.customer}<small>{order.customer_details?.email}</small><small>{order.customer_details?.phone || order.phone}</small></dd></div>
            <div><dt>Delivery</dt><dd>{fullAddress(address)}</dd></div>
            <div><dt>Shipment</dt><dd>{order.shipment ? `${order.shipment.courier_name || order.shipment.provider} · ${order.shipment.awb_code || label(order.shipment.status)}` : "Not dispatched"}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Price breakdown</h3>
          <dl className="price-breakdown">
            <div><dt>Subtotal</dt><dd>{currency(summary.subtotal ?? order.subtotal, order.currency)}</dd></div>
            <div><dt>Discount</dt><dd>− {currency(summary.discount ?? order.discount_amount, order.currency)}</dd></div>
            <div><dt>Shipping</dt><dd>{currency(summary.shipping ?? order.shipping_amount, order.currency)}</dd></div>
            <div><dt>Tax</dt><dd>{currency(summary.tax ?? order.tax_amount, order.currency)}</dd></div>
            <div className="price-total"><dt>Grand total</dt><dd>{currency(summary.total ?? order.amount, order.currency)}</dd></div>
          </dl>
        </section>
      </div>
      <section>
        <h3>Products</h3>
        {order.items?.length ? (
          <div className="detail-items">
            {order.items.map((item) => (
              <div key={item.id}>
                <span><b>{item.product_name || `Product #${item.product_id}`}</b><small>Quantity {item.quantity} · {variantLabel(item)}</small></span>
                <b>{currency(item.total_amount, order.currency)}</b>
              </div>
            ))}
          </div>
        ) : <p className="compact-empty">No line items recorded.</p>}
      </section>
      <section>
        <h3>Order timeline</h3>
        <div className="timeline">
          {(order.status_history || order.history || []).map((item, index) => (
            <div key={item.id || index}><i /><span><b>{label(item.status)}</b><small>{formatDate(item.created_at)}{item.note ? ` · ${item.note}` : ""}</small></span></div>
          ))}
        </div>
      </section>
      <footer className="modal-actions-footer">
        <button className="secondary-button" type="button" onClick={() => downloadInvoice(order)}><Download size={14} /> Download invoice</button>
        <button className="secondary-button" type="button" onClick={onClose}>Close</button>
      </footer>
    </Dialog>
  );
}

function downloadInvoice(order) {
  const address = order.shipping_address || safeJson(order.shipping_address_json);
  const summary = order.summary || {};
  const rows = (order.items || []).map((item) => `
    <tr><td>${escapeHtml(item.product_name)}</td><td>${escapeHtml(item.sku || "—")}</td><td>${Number(item.quantity)}</td><td>${currency(item.unit_price, order.currency)}</td><td>${currency(item.total_amount, order.currency)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(order.order_code)}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#17221b}header{display:flex;justify-content:space-between;border-bottom:2px solid #159447;padding-bottom:18px}h1{margin:0;color:#087737}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:10px}.totals{margin:24px 0 0 auto;width:320px}.totals div{display:flex;justify-content:space-between;padding:6px}.total{font-size:18px;font-weight:bold;border-top:2px solid #17221b}</style></head><body><header><div><h1>SNA Sundaram</h1><p>Tax invoice</p></div><div><b>${escapeHtml(order.order_number || order.order_code)}</b><p>${formatDate(order.created_at)}</p></div></header><h3>Customer</h3><p>${escapeHtml(order.customer_details?.name || order.customer)}<br>${escapeHtml(fullAddress(address))}<br>${escapeHtml(order.customer_details?.phone || order.phone)}</p><table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><b>${currency(summary.subtotal ?? order.subtotal, order.currency)}</b></div><div><span>Discount</span><b>− ${currency(summary.discount ?? order.discount_amount, order.currency)}</b></div><div><span>Shipping</span><b>${currency(summary.shipping ?? order.shipping_amount, order.currency)}</b></div><div><span>Tax</span><b>${currency(summary.tax ?? order.tax_amount, order.currency)}</b></div><div class="total"><span>Grand total</span><b>${currency(summary.total ?? order.amount, order.currency)}</b></div></div></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.order_number || order.order_code}-invoice.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function safeJson(value) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value || {};
  } catch {
    return {};
  }
}
function filterLegacyOrders(orders, query) {
  const search = String(query.search || "").trim().toLocaleLowerCase();
  const from = query.from ? new Date(`${query.from}T00:00:00`) : null;
  const to = query.to ? new Date(`${query.to}T23:59:59.999`) : null;

  return orders.filter((order) => {
    if (query.scope === "current" && ["delivered", "cancelled", "returned", "refunded", "failed"].includes(order.status)) return false;
    if (query.scope === "unpaid" && ["paid", "refunded"].includes(order.payment_status)) return false;
    if (query.status && order.status !== query.status) return false;
    if (query.payment_status && order.payment_status !== query.payment_status) return false;
    const createdAt = order.created_at ? new Date(order.created_at) : null;
    if (from && (!createdAt || createdAt < from)) return false;
    if (to && (!createdAt || createdAt > to)) return false;
    if (search) {
      const text = [order.order_code, order.customer, order.phone]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });
}
function variantLabel(item) {
  return [item.variant_brand, item.variant_color, item.variant_size]
    .filter(Boolean)
    .join(" · ") || "Standard product";
}
function shortAddress(address) {
  return [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ") || "Not recorded";
}
function fullAddress(address) {
  return [
    address.address_line_1,
    address.address_line_2,
    address.landmark,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ].filter(Boolean).join(", ") || "Not recorded";
}
function deliveryDate(order) {
  return formatDateOnly(
    order.shipment?.delivered_at ||
      order.shipment?.estimated_delivery_at ||
      order.estimated_delivery_date,
  );
}
function label(value) {
  return String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatDate(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}
function formatDateOnly(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" })
    : "Not scheduled";
}
function currency(value, currencyCode = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode || "INR",
  }).format(Number(value || 0));
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
