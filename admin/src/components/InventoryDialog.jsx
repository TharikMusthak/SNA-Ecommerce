import { useState } from "react";
import { Dialog } from "./Dialog";

export default function InventoryDialog({ item, mode, onClose, onSubmit }) {
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      await onSubmit({
        quantity: Number(form.get("quantity")),
        threshold: Number(form.get("threshold")),
        reason: String(form.get("reason") || "").trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const restocking = mode === "restock";
  return (
    <Dialog
      title={restocking ? `Restock ${item.name}` : `Update ${item.name}`}
      description={
        restocking
          ? "Add received inventory and keep a clear audit note."
          : "Set the exact available quantity and low-stock alert level."
      }
      onClose={saving ? () => {} : onClose}
      size="small"
    >
      <form className="dialog-form" noValidate onInvalidCapture={(event) => event.preventDefault()} onSubmit={submit}>
        <label>
          {restocking ? "Quantity to add" : "Available quantity"}
          <input
            name="quantity"
            type="number"
            min={restocking ? "1" : "0"}
            step="1"
            defaultValue={restocking ? 1 : item.stock}
            required
            autoFocus
          />
        </label>
        {!restocking && (
          <label>
            Low-stock level
            <input
              name="threshold"
              type="number"
              min="0"
              step="1"
              defaultValue={item.low_stock_threshold}
              required
            />
          </label>
        )}
        <label>
          Reason / reference
          <textarea
            name="reason"
            maxLength="500"
            placeholder={restocking ? "Example: Supplier delivery GRN-1042" : "Why is this adjustment needed?"}
            required
          />
        </label>
        <footer className="modal-actions-footer">
          <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving}>
            {saving ? "Saving…" : restocking ? "Add stock" : "Update stock"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
