import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import { ConfirmDialog, Dialog } from "../components/Dialog";

const statuses = ["pending", "confirmed", "processing", "packed", "ready_to_dispatch", "shipment_created", "awb_assigned", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "rto_initiated", "rto_delivered", "cancelled"];

export default function Dispatch({ onNotice }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState({ search: "", status: "", from: "", to: "", sort: "created_at", order: "desc", page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0, hasNext: false, hasPrevious: false });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [cancelShipment, setCancelShipment] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== ""));
      const response = await api(`/v1/admin/dispatch?${params}`);
      const nextPagination = response.pagination || { page: 1, limit: query.limit, totalPages: 1, total: 0, hasNext: false, hasPrevious: false };
      const totalPages = Math.max(Number(nextPagination.totalPages) || 1, 1);
      if (Number(query.page) > totalPages) {
        setQuery((current) => ({ ...current, page: totalPages }));
        return;
      }
      setRows(response.data || []);
      setPagination({ ...nextPagination, page: Number(nextPagination.page) || 1, totalPages, hasNext: Boolean(nextPagination.hasNext), hasPrevious: Boolean(nextPagination.hasPrevious) });
    } catch (error) { onNotice?.(error.message, "error"); }
    finally { setLoading(false); }
  }, [onNotice, query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery((current) => ({ ...current, search: searchInput, page: 1 })), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function openDetails(orderId) {
    setLoading(true);
    try {
      const response = await api(`/v1/admin/dispatch/${orderId}`);
      setSelected(response.data || response);
    } catch (error) { onNotice?.(error.message, "error"); }
    finally { setLoading(false); }
  }

  async function runAction(path, body) {
    setSaving(true);
    try {
      await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      onNotice?.("Dispatch operation completed");
      await load();
      if (selected?.order?.id) await openDetails(selected.order.id);
    } catch (error) { onNotice?.(error.message, "error"); }
    finally { setSaving(false); }
  }

  return (
    <section>
      <div className="section-heading"><div><h2>Dispatch</h2><p>{pagination.total} orders in the dispatch queue</p></div></div>
      <div className="commerce-toolbar">
        <input aria-label="Search dispatch orders" placeholder="Order, customer, AWB, courier or pincode" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        <select aria-label="Shipment status" value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value, page: 1 })}>
          <option value="">All shipment statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <input aria-label="From date" type="date" value={query.from} onChange={(event) => setQuery({ ...query, from: event.target.value, page: 1 })} />
        <input aria-label="To date" type="date" value={query.to} onChange={(event) => setQuery({ ...query, to: event.target.value, page: 1 })} />
        <select aria-label="Sort dispatch orders" value={`${query.sort}:${query.order}`} onChange={(event) => { const [sort, order] = event.target.value.split(":"); setQuery({ ...query, sort, order, page: 1 }); }}>
          <option value="created_at:desc">Newest</option><option value="created_at:asc">Oldest</option><option value="amount:desc">Highest amount</option><option value="status:asc">Shipment status</option>
        </select>
        <button disabled={loading} onClick={load}>Refresh</button>
        <button className="secondary-button" disabled={!searchInput && !query.status && !query.from && !query.to} onClick={() => { setSearchInput(""); setQuery({ search: "", status: "", from: "", to: "", sort: "created_at", order: "desc", page: 1, limit: 10 }); }}>Reset</button>
      </div>
      <DataTable label="Dispatch" headers={["Order", "Customer", "Destination", "Amount", "Payment", "Shipping", "Shipment", "Courier / AWB", "Created", "Actions"]} loading={loading} emptyMessage="No orders are waiting for dispatch." minWidth={1400}>
        {rows.map((row) => (
          <tr key={row.order_id}>
            <td><b>{row.order_code}</b><small>{formatDate(row.created_at)}</small></td>
            <td>{row.customer}<small>{row.phone}</small></td>
            <td>{destination(row.shipping_address_json)}<small>{row.delivery_pincode || addressPincode(row.shipping_address_json) || "—"}</small></td>
            <td>₹{Number(row.amount).toFixed(2)}</td>
            <td><Badge value={row.payment_status} /></td>
            <td>₹{Number(row.shipping_amount || 0).toFixed(2)}</td>
            <td><Badge value={row.shipment_status} /></td>
            <td>{row.courier_name || "Not assigned"}<small>{row.awb_code || "No AWB"}</small></td>
            <td>{formatDate(row.created_at)}</td>
            <td><button className="action-btn edit" onClick={() => openDetails(row.order_id)}>Manage</button></td>
          </tr>
        ))}
      </DataTable>
      <div className="commerce-pagination">
        <button disabled={loading || !pagination.hasPrevious} onClick={() => setQuery((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}>Previous</button>
        <span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
        <button disabled={loading || !pagination.hasNext} onClick={() => setQuery((current) => ({ ...current, page: Math.min(current.page + 1, pagination.totalPages) }))}>Next</button>
      </div>
      {selected && <DispatchModal data={selected} saving={saving} onClose={() => setSelected(null)} onAction={runAction} onRequestCancel={(shipmentId) => setCancelShipment(shipmentId)} />}
      {cancelShipment && <ConfirmDialog title="Cancel shipment" description="The courier cancellation will be requested and the dispatch record will be updated. This cannot be reversed from this screen." confirmLabel="Cancel shipment" danger busy={saving} onClose={() => !saving && setCancelShipment(null)} onConfirm={async () => { await runAction(`/v1/admin/shipments/${cancelShipment}/cancel`); setCancelShipment(null); }} />}
    </section>
  );
}

function DispatchModal({ data, saving, onClose, onAction, onRequestCancel }) {
  const { order, shipment, tracking, shiprocketEnabled, suggestedPackage = {} } = data;
  const shipmentId = shipment?.id;
  const [parcel, setParcel] = useState({
    weight_grams: suggestedPackage.weight_grams || 500,
    length_cm: suggestedPackage.length_cm || 10,
    width_cm: suggestedPackage.width_cm || 10,
    height_cm: suggestedPackage.height_cm || 10,
  });
  return (
    <Dialog title={`Dispatch ${order.order_code}`} description="Shipment, courier and tracking controls" onClose={saving ? () => {} : onClose} size="large">
        {!shiprocketEnabled && <p className="table-state--error">Shiprocket is disabled. Configure live credentials before dispatching.</p>}
        <dl className="commerce-detail">
          <div><dt>Customer</dt><dd>{order.customer}</dd></div>
          <div><dt>Address</dt><dd>{order.delivery_address || order.address || "—"}</dd></div>
          <div><dt>Pincode</dt><dd>{order.delivery_pincode || "—"}</dd></div>
          <div><dt>Shipment status</dt><dd>{label(shipment?.status || "ready_to_dispatch")}</dd></div>
          <div><dt>Courier</dt><dd>{shipment?.courier_name || "Not assigned"}</dd></div>
          <div><dt>AWB</dt><dd>{shipment?.awb_code || "Not generated"}</dd></div>
        </dl>
        {!shipmentId && <form className="settings-form" onSubmit={(event) => { event.preventDefault(); onAction("/v1/admin/shipments", { order_id: order.id, ...parcel }); }}>
          <fieldset className="form-section settings-section">
            <legend><span>1</span><b>Packed parcel</b><small>Enter the final measurements after packing</small></legend>
            <div className="row"><label>Weight (grams)<input type="number" min="1" step="1" value={parcel.weight_grams} onChange={(event) => setParcel({ ...parcel, weight_grams: event.target.value })} required /></label><label>Length (cm)<input type="number" min="0.01" step="0.01" value={parcel.length_cm} onChange={(event) => setParcel({ ...parcel, length_cm: event.target.value })} required /></label></div>
            <div className="row"><label>Width (cm)<input type="number" min="0.01" step="0.01" value={parcel.width_cm} onChange={(event) => setParcel({ ...parcel, width_cm: event.target.value })} required /></label><label>Height (cm)<input type="number" min="0.01" step="0.01" value={parcel.height_cm} onChange={(event) => setParcel({ ...parcel, height_cm: event.target.value })} required /></label></div>
          </fieldset>
          <div className="modal-actions"><button disabled={saving || !shiprocketEnabled || !["packed", "ready_to_dispatch"].includes(order.status)}>{saving ? "Creating…" : "Create shipment"}</button></div>
        </form>}
        <div className="modal-actions">
          {shipmentId && !shipment.awb_code && <button disabled={saving} onClick={() => onAction(`/v1/admin/shipments/${shipmentId}/assign-courier`)}>Assign courier &amp; AWB</button>}
          {shipmentId && shipment.awb_code && shipment.status === "shipment_created" && <button disabled={saving} onClick={() => onAction(`/v1/admin/shipments/${shipmentId}/schedule-pickup`)}>Schedule pickup</button>}
          {shipmentId && <button disabled={saving} onClick={() => onAction(`/v1/admin/shipments/${shipmentId}/refresh`)}>Refresh tracking</button>}
          {shipmentId && !["delivered", "cancelled", "rto_delivered"].includes(shipment.status) && <button className="action-btn delete" disabled={saving} onClick={() => onRequestCancel(shipmentId)}>Cancel shipment</button>}
        </div>
        {tracking?.timeline?.length > 0 && <><h3>Tracking timeline</h3><div className="timeline">{tracking.timeline.map((event, index) => <div key={event.id || event.event_time || index}><i /><span><b>{label(event.status)}</b><small>{formatDate(event.event_time || event.created_at)}{event.location ? ` · ${event.location}` : ""}{event.description ? ` · ${event.description}` : ""}</small></span></div>)}</div></>}
        <footer className="modal-actions-footer"><button className="secondary-button" onClick={onClose}>Close</button></footer>
    </Dialog>
  );
}

function label(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function formatDate(value) { return value ? new Date(value).toLocaleString() : ""; }
function destination(value) {
  try {
    const address = typeof value === "string" ? JSON.parse(value) : value;
    return [address?.city, address?.state].filter(Boolean).join(", ") || "—";
  } catch { return "—"; }
}
function addressPincode(value) {
  try {
    const address = typeof value === "string" ? JSON.parse(value) : value;
    return address?.postal_code || address?.pincode || "";
  } catch { return ""; }
}
