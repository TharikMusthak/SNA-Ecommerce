import { useCallback, useEffect, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { api } from "../api";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import { Dialog } from "../components/Dialog";

const statuses = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"];

export default function Orders({ onStageChange }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState({ search: "", status: "", payment_status: "", from: "", to: "", page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery((current) => ({ ...current, search, page: 1 })), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== ""));
      const response = await api(`/v1/admin/orders?${params}`);
      setRows(response.data || []);
      setPagination(response.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  async function openDetails(id) {
    setLoading(true);
    try {
      const response = await api(`/v1/admin/orders/${id}`);
      setSelected(response.data || response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

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

  const hasFilters = Object.entries(query).some(([key, value]) => !["page", "limit"].includes(key) && value) || search;
  return (
    <section>
      <div className="section-heading"><div><h2>Orders</h2><p>{pagination.total} orders</p></div></div>
      <div className="commerce-toolbar">
        <input type="search" aria-label="Search orders" placeholder="Order number, customer or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Order status" value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value, page: 1 })}><option value="">All order statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
        <select aria-label="Payment status" value={query.payment_status} onChange={(event) => setQuery({ ...query, payment_status: event.target.value, page: 1 })}><option value="">All payment statuses</option>{["pending", "authorized", "paid", "failed", "refunded", "partially_refunded"].map((status) => <option key={status}>{status}</option>)}</select>
        <input aria-label="From date" type="date" value={query.from} onChange={(event) => setQuery({ ...query, from: event.target.value, page: 1 })} />
        <input aria-label="To date" type="date" value={query.to} onChange={(event) => setQuery({ ...query, to: event.target.value, page: 1 })} />
        <button className="secondary-button" type="button" disabled={!hasFilters} onClick={() => { setSearch(""); setQuery({ search: "", status: "", payment_status: "", from: "", to: "", page: 1, limit: 20 }); }}><RotateCcw size={15} /> Reset</button>
      </div>
      <DataTable label="Orders" headers={["Order #", "Customer", "Date", "Amount", "Payment", "Order status", "Actions"]} loading={loading} error={error} emptyMessage="No orders match these filters." minWidth={980}>
        {rows.map((order) => <tr key={order.id}><td><b>{order.order_code}</b></td><td>{order.customer}<small>{order.phone}</small></td><td>{formatDate(order.created_at)}</td><td>{currency(order.amount)}</td><td><Badge value={order.payment_status} /></td><td><select aria-label={`Status for ${order.order_code}`} value={order.status || "pending"} disabled={saving || ["delivered", "cancelled", "returned"].includes(order.status)} onChange={(event) => changeStatus(order, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></td><td><button className="action-btn edit-btn" type="button" onClick={() => openDetails(order.id)}><Eye size={14} /> View</button></td></tr>)}
      </DataTable>
      <div className="commerce-pagination"><button disabled={loading || pagination.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button><span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span><button disabled={loading || !pagination.hasNext} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button></div>
      {selected && <OrderDialog order={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function OrderDialog({ order, onClose }) {
  const address = safeJson(order.shipping_address_json);
  return (
    <Dialog title={`Order ${order.order_code}`} description={`${formatDate(order.created_at)} · ${order.customer}`} onClose={onClose} size="large">
      <div className="order-detail-grid">
        <section><h3>Order summary</h3><dl className="commerce-detail"><div><dt>Status</dt><dd><Badge value={order.status} /></dd></div><div><dt>Payment</dt><dd><Badge value={order.payment_status} /></dd></div><div><dt>Customer</dt><dd>{order.customer}<small>{order.phone}</small></dd></div><div><dt>Delivery</dt><dd>{[address.address_line_1, address.city, address.state, address.postal_code].filter(Boolean).join(", ") || "Not recorded"}</dd></div></dl></section>
        <section><h3>Price breakdown</h3><dl className="price-breakdown"><div><dt>Subtotal</dt><dd>{currency(order.subtotal ?? order.amount)}</dd></div><div><dt>Discount</dt><dd>− {currency(order.discount_amount)}</dd></div><div><dt>Shipping</dt><dd>{currency(order.shipping_amount)}</dd></div><div><dt>Tax</dt><dd>{currency(order.tax_amount)}</dd></div><div className="price-total"><dt>Grand total</dt><dd>{currency(order.amount)}</dd></div></dl></section>
      </div>
      <section><h3>Products</h3>{order.items?.length ? <div className="detail-items">{order.items.map((item) => <div key={item.id}><span><b>{item.product_name || item.product || `Product #${item.product_id}`}</b><small>Quantity {item.quantity}</small></span><b>{currency(item.line_total ?? Number(item.unit_price || 0) * Number(item.quantity || 0))}</b></div>)}</div> : <p className="compact-empty">No line items recorded.</p>}</section>
      <section><h3>Order timeline</h3><div className="timeline">{(order.history || []).map((item, index) => <div key={item.id || index}><i /><span><b>{label(item.status)}</b><small>{formatDate(item.created_at)}{item.note ? ` · ${item.note}` : ""}</small></span></div>)}</div></section>
      <footer className="modal-actions-footer"><button className="secondary-button" type="button" onClick={onClose}>Close</button></footer>
    </Dialog>
  );
}

function safeJson(value) { try { return typeof value === "string" ? JSON.parse(value) : value || {}; } catch { return {}; } }
function label(value) { return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function formatDate(value) { return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"; }
function currency(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0)); }
