import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { api, assetUrl } from "../api";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import { Dialog } from "../components/Dialog";
import ImagePreviewField from "../components/ImagePreviewField";
import VideoUploadField from "../components/VideoUploadField";

const configs = {
  Customers: {
    route: "customers",
    keys: [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "status",
      "created_at",
    ],
    statuses: ["active", "disabled", "locked", "pending_verification"],
  },
  Reviews: {
    route: "reviews",
    keys: [
      "id",
      "product_name",
      "customer",
      "customer_email",
      "customer_phone",
      "rating",
      "image_url",
      "video_url",
      "is_verified_purchase",
      "status",
      "created_at",
    ],
    statuses: ["pending", "approved", "rejected", "hidden"],
  },
  Returns: {
    route: "returns",
    keys: [
      "return_code",
      "order_code",
      "customer",
      "reason",
      "refund_amount",
      "status",
      "created_at",
    ],
    statuses: [
      "requested",
      "approved",
      "pickup_scheduled",
      "received",
      "inspection_pending",
      "inspection_passed",
      "refund_pending",
      "refunded",
      "completed",
      "rejected",
      "cancelled",
    ],
  },
  "Refund Records": {
    route: "refunds",
    keys: [
      "refund_reference",
      "return_code",
      "order_code",
      "refund_method",
      "refunded_amount",
      "status",
      "created_at",
    ],
    statuses: [
      "pending",
      "approved",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ],
  },
  "Support Tickets": {
    route: "tickets",
    keys: [
      "ticket_code",
      "customer",
      "subject",
      "priority",
      "status",
      "created_at",
    ],
    statuses: [
      "open",
      "in_progress",
      "waiting_for_customer",
      "resolved",
      "closed",
    ],
  },
  Coupons: {
    route: "coupons",
    keys: [
      "code",
      "discount_type",
      "discount_value",
      "minimum_order_value",
      "usage_count",
      "status",
      "ends_at",
    ],
    statuses: ["active", "inactive"],
  },
  Notifications: {
    route: "notifications",
    keys: [
      "id",
      "channel",
      "event",
      "recipient",
      "entity_type",
      "status",
      "attempt_count",
      "created_at",
    ],
    statuses: [
      "queued",
      "sent",
      "delivered",
      "read",
      "failed",
      "retrying",
      "skipped",
    ],
  },
};

export default function CommerceList({ type, onNotice }) {
  const config = configs[type],
    [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({
      page: 1,
      totalPages: 0,
      total: 0,
    }),
    [query, setQuery] = useState({
      search: "",
      status: "",
      page: 1,
      limit: 20,
      sort: "id",
      order: "desc",
    }),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false),
    [searchInput, setSearchInput] = useState("");
  const load = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(
        Object.entries(query).filter(([, value]) => value !== ""),
      );
      const response = await api(`/v1/admin/${config.route}?${params}`);
      setRows(response.data || []);
      setPagination(
        response.pagination || {
          page: 1,
          totalPages: 1,
          total: (response.data || []).length,
        },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config, query]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setQuery((current) => ({ ...current, search: searchInput, page: 1 })),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  if (!config) return null;
  const headers = [...config.keys.map(label), "Actions"];
  async function details(row) {
    setLoading(true);
    try {
      setModal({
        kind: "details",
        data: await api(`/v1/admin/${config.route}/${row.id}`),
        row,
      });
    } catch (err) {
      onNotice(err.message, "error");
    } finally {
      setLoading(false);
    }
  }
  function confirmAction(title, path, method = "PUT", body) {
    setModal({ kind: "confirm", title, path, method, body });
  }
  async function submitAction(event) {
    event?.preventDefault();
    setSaving(true);
    try {
      if (modal.kind === "form")
        await submitForm(new FormData(event.currentTarget));
      else
        await api(modal.path, {
          method: modal.method,
          headers: modal.idempotent
            ? { "Idempotency-Key": crypto.randomUUID() }
            : undefined,
          body: modal.body ? JSON.stringify(modal.body) : undefined,
        });
      setModal(null);
      onNotice?.("Operation completed successfully");
      await load();
    } catch (err) {
      onNotice?.(err.message, "error");
    } finally {
      setSaving(false);
    }
  }
  async function submitForm(form) {
    if (modal.formType === "review") {
      await api(modal.path, { method: modal.method || "POST", body: form });
      return;
    }
    const body = Object.fromEntries(form);
    let path = modal.path,
      method = modal.method || "POST",
      idempotent = modal.idempotent;
    for (const key of [
      "discount_value",
      "minimum_order_value",
      "maximum_discount",
      "refunded_amount",
    ])
      if (body[key] !== undefined && body[key] !== "")
        body[key] = Number(body[key]);
    for (const key of ["product_ids", "category_ids"])
      if (body[key] !== undefined)
        body[key] = String(body[key])
          .split(",")
          .map(Number)
          .filter(Number.isSafeInteger);
    if (modal.formType === "restock")
      body.items = (modal.data.items || [])
        .filter(
          (item) =>
            Number(item.accepted_quantity) > Number(item.restocked_quantity),
        )
        .map((item) => ({
          return_item_id: item.id,
          quantity:
            Number(item.accepted_quantity) - Number(item.restocked_quantity),
          disposition: body.disposition,
        }));
    if (modal.formType === "inspection")
      body.items = (modal.data.items || []).map((item) => ({
        return_item_id: item.id,
        accepted_quantity: body.result === "failed" ? 0 : Number(item.quantity),
      }));
    await api(path, {
      method,
      headers: idempotent
        ? { "Idempotency-Key": crypto.randomUUID() }
        : undefined,
      body: JSON.stringify(body),
    });
  }
  function actions(row) {
    const buttons = [
      <button
        className="action-btn edit"
        key="view"
        onClick={() => details(row)}
      >
        View
      </button>,
    ];
    if (type === "Customers")
      buttons.push(
        <button
          className="action-btn"
          key="status"
          onClick={() =>
            confirmAction(
              `${row.status === "active" ? "Deactivate" : "Activate"} customer`,
              `/v1/admin/customers/${row.id}/status`,
              "PUT",
              { status: row.status === "active" ? "disabled" : "active" },
            )
          }
        >
          {row.status === "active" ? "Deactivate" : "Activate"}
        </button>,
      );
    if (type === "Reviews") {
      buttons.push(
        <button
          className="action-btn edit"
          key="edit"
          onClick={async () => {
            try {
              const response = await api(`/v1/admin/reviews/${row.id}`);
              setModal({ kind: "form", formType: "review", title: "Edit review", path: `/v1/admin/reviews/${row.id}`, method: "PUT", data: response.data || response });
            } catch (err) {
              onNotice?.(err.message, "error");
            }
          }}
        >
          Edit
        </button>,
      );
      for (const status of ["approved", "rejected", "hidden"])
        buttons.push(
          <button
            className="action-btn"
            key={status}
            disabled={row.status === status}
            onClick={() =>
              confirmAction(
                `${label(status)} review`,
                `/v1/admin/reviews/${row.id}/status`,
                "PUT",
                { status },
              )
            }
          >
            {label(status)}
          </button>,
        );
      buttons.push(
        <button
          className="action-btn delete"
          key="delete"
          onClick={() =>
            confirmAction(
              "Delete review",
              `/v1/admin/reviews/${row.id}`,
              "DELETE",
            )
          }
        >
          Delete
        </button>,
      );
    }
    if (type === "Returns")
      buttons.push(
        <button
          className="action-btn"
          key="process"
          onClick={() => details(row)}
        >
          Process
        </button>,
      );
    if (type === "Refund Records" && row.status !== "completed")
      buttons.push(
        <button
          className="action-btn"
          key="complete"
          onClick={() =>
            confirmAction(
              "Complete refund record",
              `/v1/admin/refunds/${row.id}/status`,
              "PUT",
              { status: "completed" },
            )
          }
        >
          Complete
        </button>,
      );
    if (type === "Support Tickets") {
      buttons.push(
        <button
          className="action-btn"
          key="reply"
          onClick={() =>
            setModal({
              kind: "form",
              formType: "reply",
              title: "Reply to ticket",
              path: `/v1/admin/tickets/${row.id}/messages`,
            })
          }
        >
          Reply
        </button>,
      );
      buttons.push(
        <button
          className="action-btn"
          key="update"
          onClick={() =>
            setModal({
              kind: "form",
              formType: "ticket",
              title: "Update ticket",
              path: `/v1/admin/tickets/${row.id}/status`,
              method: "PUT",
              data: row,
            })
          }
        >
          Update
        </button>,
      );
    }
    if (type === "Coupons") {
      buttons.push(
        <button
          className="action-btn edit"
          key="edit"
          onClick={() =>
            setModal({ kind:"form",formType:"coupon",title:"Edit coupon",path:`/v1/admin/coupons/${row.id}`,method:"PUT",data:row })
          }
        >
          Edit
        </button>,
      );
      buttons.push(
        <button
          className="action-btn"
          key="toggle"
          onClick={() =>
            confirmAction(
              `${row.status === "active" ? "Deactivate" : "Activate"} coupon`,
              `/v1/admin/coupons/${row.id}/status`,
              "PUT",
              { status: row.status === "active" ? "inactive" : "active" },
            )
          }
        >
          {row.status === "active" ? "Deactivate" : "Activate"}
        </button>,
      );
      buttons.push(
        <button
          className="action-btn delete"
          key="delete"
          onClick={() =>
            confirmAction(
              "Delete coupon",
              `/v1/admin/coupons/${row.id}`,
              "DELETE",
            )
          }
        >
          Delete
        </button>,
      );
    }
    return buttons;
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>{type}</h2>
          <p>{pagination.total} server-authorized records</p>
        </div>
        {type === "Coupons" && (
          <button
            onClick={() =>
              setModal({
                kind: "form",
                formType: "coupon",
                title: "Create coupon",
                path: "/v1/admin/coupons",
              })
            }
          >
            + Add coupon
          </button>
        )}
        {type === "Reviews" && (
          <button onClick={() => setModal({ kind: "form", formType: "review", title: "Add review", path: "/v1/admin/reviews", method: "POST", data: {} })}>
            + Add review
          </button>
        )}
      </div>
      <div className="commerce-toolbar">
        <input
          aria-label={`Search ${type}`}
          placeholder="Search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          aria-label="Status filter"
          value={query.status}
          onChange={(e) =>
            setQuery({ ...query, status: e.target.value, page: 1 })
          }
        >
          <option value="">All statuses</option>
          {config.statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          aria-label="Page size"
          value={query.limit}
          onChange={(e) =>
            setQuery({ ...query, limit: Number(e.target.value), page: 1 })
          }
        >
          {[10, 20, 50, 100].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        {type === "Customers" && (
          <select aria-label="Verification filter" value={query.verified || ""} onChange={(e)=>setQuery({...query,verified:e.target.value,page:1})}>
            <option value="">All verification</option><option value="true">Verified</option><option value="false">Unverified</option>
          </select>
        )}
        {type === "Reviews" && (
          <select aria-label="Rating filter" value={query.rating || ""} onChange={(e)=>setQuery({...query,rating:e.target.value,page:1})}>
            <option value="">All ratings</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value} stars</option>)}
          </select>
        )}
        {type === "Support Tickets" && (
          <select aria-label="Priority filter" value={query.priority || ""} onChange={(e)=>setQuery({...query,priority:e.target.value,page:1})}>
            <option value="">All priorities</option>{["low","normal","high","urgent"].map(value=><option key={value}>{value}</option>)}
          </select>
        )}
        {["Customers", "Reviews"].includes(type) && <><input aria-label="From date" type="date" value={query.from || ""} onChange={(e)=>setQuery({...query,from:e.target.value,page:1})}/><input aria-label="To date" type="date" value={query.to || ""} onChange={(e)=>setQuery({...query,to:e.target.value,page:1})}/></>}
        <button onClick={load} disabled={loading}>
          Refresh
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!searchInput && !Object.entries(query).some(([key, value]) => !["page", "limit", "sort", "order", "search"].includes(key) && value)}
          onClick={() => {
            setSearchInput("");
            setQuery({ search: "", status: "", page: 1, limit: 20, sort: "id", order: "desc" });
          }}
        >
          <RotateCcw size={15} aria-hidden="true" /> Reset
        </button>
      </div>
      <DataTable
        headers={headers}
        label={type}
        loading={loading}
        error={error}
        emptyMessage={`No ${type.toLowerCase()} found.`}
      >
        {rows.map((row, index) => (
          <tr
            key={
              row.id || row.return_code || row.ticket_code || row.code || index
            }
          >
            {config.keys.map((key) => (
              <td key={key}>{formatCell(key, row[key])}</td>
            ))}
            <td>
              <div className="action-buttons">{actions(row)}</div>
            </td>
          </tr>
        ))}
      </DataTable>
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
      {modal && (
        <Dialog
          title={modal.title || `${type} details`}
          onClose={() => !saving && setModal(null)}
          size={modal.kind === "details" ? "large" : "medium"}
          tone={modal.method === "DELETE" ? "danger" : "default"}
        >
          {modal.kind === "details" ? (
            <DetailView type={type} response={modal.data} setModal={setModal} />
          ) : modal.kind === "form" ? (
            <ActionForm
              modal={modal}
              saving={saving}
              onSubmit={submitAction}
              onCancel={() => setModal(null)}
            />
          ) : (
            <form noValidate onInvalidCapture={(event) => event.preventDefault()} onSubmit={submitAction}>
              <p className="confirmation-copy">This action changes persisted data. Review the action before continuing.</p>
              <footer>
                <button type="button" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button disabled={saving}>
                  {saving ? "Saving…" : modal.title}
                </button>
              </footer>
            </form>
          )}
        </Dialog>
      )}
    </section>
  );
}

function DetailView({ type, response, setModal }) {
  const data = response?.data || response;
  return (
    <div>
      <dl className="commerce-detail">
        {Object.entries(data || {})
          .filter(([key, value]) => !isSensitiveKey(key) && !Array.isArray(value) && typeof value !== "object")
          .map(([key, value]) => (
            <div key={key}>
              <dt>{label(key)}</dt>
              <dd>{formatCell(key, value)}</dd>
            </div>
          ))}
      </dl>
      {type === "Returns" && (
        <div className="modal-actions">
          {(data.allowed_transitions || []).map((status) => (
            <button
              key={status}
              onClick={() =>
                setModal({
                  kind: "confirm",
                  title: `Move return to ${label(status)}`,
                  path: `/v1/admin/returns/${data.id}/status`,
                  method: "PUT",
                  body: { status },
                })
              }
            >
              {label(status)}
            </button>
          ))}
          {["received", "inspection_pending"].includes(data.status) && (
            <button
              onClick={() =>
                setModal({
                  kind: "form",
                  formType: "inspection",
                  title: "Record inspection",
                  path: `/v1/admin/returns/${data.id}/inspection`,
                  idempotent: true,
                  data,
                })
              }
            >
              Inspect
            </button>
          )}
          {[
            "inspection_passed",
            "refund_pending",
            "partially_refunded",
            "refunded",
            "completed",
          ].includes(data.status) && (
            <button
              onClick={() =>
                setModal({
                  kind: "form",
                  formType: "restock",
                  title: "Inventory disposition",
                  path: `/v1/admin/returns/${data.id}/restock`,
                  idempotent: true,
                  data,
                })
              }
            >
              Restock / disposition
            </button>
          )}
          {[
            "inspection_passed",
            "refund_pending",
            "partially_refunded",
            "refunded",
          ].includes(data.status) && (
            <button
              onClick={() =>
                setModal({
                  kind: "form",
                  formType: "refund",
                  title: "Record refund",
                  path: `/v1/admin/returns/${data.id}/refund-record`,
                  idempotent: true,
                  data,
                })
              }
            >
              Record refund
            </button>
          )}
        </div>
      )}
      {Object.entries(data || {})
        .filter(([key, value]) => !isSensitiveKey(key) && Array.isArray(value))
        .map(([key, value]) => (
          <div key={key}>
            <h3>{label(key)}</h3>
            <DetailCollection rows={value} />
          </div>
        ))}
      <footer>
        <button onClick={() => setModal(null)}>Close</button>
      </footer>
    </div>
  );
}
function ActionForm({ modal, saving, onSubmit, onCancel }) {
  return (
    <form noValidate onInvalidCapture={(event) => event.preventDefault()} onSubmit={onSubmit}>
      {modal.formType === "reply" && (
        <label>
          Message
          <textarea name="message" required maxLength="10000" />
        </label>
      )}
      {modal.formType === "review" && (
        <>
          <div className="row">
            <label>Customer ID<input name="user_id" type="number" min="1" defaultValue={modal.data?.user_id || ""} required /></label>
            <label>Product ID<input name="product_id" type="number" min="1" defaultValue={modal.data?.product_id || ""} required /></label>
          </div>
          <div className="row">
            <label>Rating<select name="rating" defaultValue={modal.data?.rating || 5}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} stars</option>)}</select></label>
            <label>Status<select name="status" defaultValue={modal.data?.status || "approved"}>{["pending","approved","rejected","hidden"].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label>Title<input name="title" maxLength="190" defaultValue={modal.data?.title || ""} /></label>
          <label>Review<textarea name="review_text" maxLength="5000" defaultValue={modal.data?.review_text || ""} required /></label>
          <label className="toggle-row"><input name="is_verified_purchase" type="checkbox" defaultChecked={Boolean(modal.data?.is_verified_purchase)} /><span><b>Verified purchase</b></span></label>
          <ImagePreviewField name="image" label="Review image" existingImage={modal.data?.image_url} removeFieldName="remove_image" />
          <VideoUploadField existingVideo={modal.data?.video_url} />
        </>
      )}
      {modal.formType === "coupon" && (
        <>
          <label>
            Code
            <input name="code" defaultValue={modal.data?.code || ""} required maxLength="80" />
          </label>
          <label>
            Discount type
            <select name="discount_type" defaultValue={modal.data?.discount_type || "percentage"}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </label>
          <label>
            Discount value
            <input
              name="discount_value"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={modal.data?.discount_value ?? ""}
            />
          </label>
          <label>
            Minimum order
            <input
              name="minimum_order_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={modal.data?.minimum_order_value ?? "0"}
            />
          </label>
          <label>
            Starts at
            <input name="starts_at" type="datetime-local" defaultValue={dateTimeLocal(modal.data?.starts_at)} />
          </label>
          <label>
            Ends at
            <input name="ends_at" type="datetime-local" defaultValue={dateTimeLocal(modal.data?.ends_at)} />
          </label>
          <label>Product IDs (comma separated)<input name="product_ids" defaultValue={jsonIds(modal.data?.product_restrictions)} /></label>
          <label>Category IDs (comma separated)<input name="category_ids" defaultValue={jsonIds(modal.data?.category_restrictions)} /></label>
        </>
      )}
      {modal.formType === "ticket" && (
        <>
          <label>Status<select name="status" defaultValue={modal.data?.status || "open"}>{["open","in_progress","waiting_for_customer","resolved","closed"].map(value=><option key={value}>{value}</option>)}</select></label>
          <label>Priority<select name="priority" defaultValue={modal.data?.priority || "normal"}>{["low","normal","high","urgent"].map(value=><option key={value}>{value}</option>)}</select></label>
        </>
      )}
      {modal.formType === "inspection" && (
        <>
          <label>
            Result
            <select name="result">
              <option value="passed">Passed</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" maxLength="5000" />
          </label>
        </>
      )}
      {modal.formType === "restock" && (
        <label>
          Disposition
          <select name="disposition">
            <option value="restocked">Restock all accepted items</option>
            <option value="no_restock">Do not restock</option>
            <option value="damaged">Damaged</option>
            <option value="expired">Expired</option>
            <option value="quality_rejected">Quality rejected</option>
          </select>
        </label>
      )}
      {modal.formType === "refund" && (
        <>
          <label>
            Refund method
            <select name="refund_method">
              <option value="cod_manual">COD manual</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="upi_manual">UPI manual</option>
              <option value="store_credit">Store credit</option>
              <option value="external_pending">
                External provider pending
              </option>
            </select>
          </label>
          <label>
            Amount
            <input
              name="refunded_amount"
              type="number"
              min="0.01"
              step="0.01"
              max={modal.data.refund_amount}
              required
            />
          </label>
          <label>
            Status
            <select name="status">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            Reference
            <input name="refund_reference" maxLength="190" />
          </label>
          <label>
            Notes
            <textarea name="notes" maxLength="5000" />
          </label>
        </>
      )}
      <footer>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </footer>
    </form>
  );
}
function label(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatCell(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "status" || key.endsWith("_status")) return <Badge value={value} />;
  if (key === "rating") return `${value} / 5`;
  if (key === "image_url") return <img src={assetUrl(value)} alt="Review" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6 }} />;
  if (key === "video_url") return <a href={assetUrl(value)} target="_blank" rel="noreferrer">View video</a>;
  if (["amount", "refund_amount", "refunded_amount", "discount_value", "minimum_order_value"].some((part) => key.includes(part))) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
  }
  if (key.endsWith("_at") || key === "created_at" || key === "updated_at") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }
  if (
    typeof value === "boolean" ||
    value === 0 ||
    (value === 1 && typeof value === "number")
  )
    return value ? "Yes" : "No";
  return String(value);
}

function DetailCollection({ rows }) {
  if (!rows.length) return <p className="compact-empty">No records.</p>;
  return (
    <div className="detail-collection">
      {rows.map((row, index) => (
        <article key={row?.id || index}>
          {row && typeof row === "object" ? Object.entries(row).filter(([key]) => !isSensitiveKey(key)).map(([key, value]) => (
            <div key={key}><span>{label(key)}</span><b>{typeof value === "object" ? "Structured data" : formatCell(key, value)}</b></div>
          )) : <span>{String(row)}</span>}
        </article>
      ))}
    </div>
  );
}

function isSensitiveKey(key) {
  return /(password|secret|token|otp|provider_response|raw_response|hash)/i.test(key);
}
function dateTimeLocal(value) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
function jsonIds(value) {
  if (!value) return "";
  try {
    return (typeof value === "string" ? JSON.parse(value) : value).join(",");
  } catch {
    return "";
  }
}
