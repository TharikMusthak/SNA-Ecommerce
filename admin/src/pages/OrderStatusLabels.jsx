import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { api } from "../api";

export default function OrderStatusLabels({ onNotice }) {
  const [data, setData] = useState(null);
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/v1/admin/order-status-labels");
      const loaded = response.data || response;
      setData(loaded);
      setLabels(loaded.labels || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api("/v1/admin/order-status-labels", {
        method: "PUT",
        body: JSON.stringify({ labels }),
      });
      onNotice?.("Frontend order status labels updated");
      await load();
    } catch (requestError) {
      onNotice?.(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section><div className="section-heading"><div><h2>Order status labels</h2><p>Customer-facing tracking messages</p></div></div><div className="settings-skeleton skeleton-block" aria-label="Loading order status labels" /></section>;
  if (error) return <section><div className="section-heading"><div><h2>Order status labels</h2><p>Customer-facing tracking messages</p></div></div><div className="panel settings-error" role="alert"><AlertCircle size={24} /><div><b>Labels could not be loaded</b><p>{error}</p></div><button className="secondary-button" onClick={load}><RefreshCw size={15} /> Retry</button></div></section>;

  return (
    <section>
      <div className="section-heading"><div><h2>Order status labels</h2><p>Customize what customers see without changing backend order workflow</p></div></div>
      <form className="settings-form" onSubmit={save} aria-busy={saving}>
        <fieldset className="form-section settings-section">
          <legend><span>1</span><b>Frontend labels</b><small>Emoji and friendly messages are supported</small></legend>
          <div className="configuration-status configured">
            <span><b>Backend statuses remain unchanged</b><small>Only labels on the customer tracking page are modified.</small></span>
          </div>
          {(data.statuses || []).map((status) => (
            <label key={status}>
              {data.defaults?.[status] || status}
              <input
                value={labels[status] || ""}
                maxLength="120"
                required
                placeholder={`Example: ${example(status)}`}
                onChange={(event) => setLabels((current) => ({ ...current, [status]: event.target.value }))}
              />
              <small>Backend key: <code>{status}</code></small>
            </label>
          ))}
        </fieldset>
        <div className="settings-actions">
          <button type="button" className="secondary-button" disabled={saving} onClick={() => setLabels({ ...data.defaults })}>Restore defaults</button>
          <button className="primary-button" disabled={saving}>{saving ? "Saving changes…" : "Save frontend labels"}</button>
        </div>
      </form>
    </section>
  );
}

function example(status) {
  return ({
    pending: "We got your order 🎉",
    confirmed: "Your goodies are confirmed!",
    processing: "Our kitchen is working its magic ✨",
    packed: "Packed with care 📦",
    shipped: "Your order is on the move 🚚",
    out_for_delivery: "Almost at your doorstep!",
    delivered: "Delivered with love 💚",
    cancelled: "This order was cancelled",
    returned: "Your return reached us",
  })[status] || status;
}
