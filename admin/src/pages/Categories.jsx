import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import ModuleToolbar from "../components/ModuleToolbar";

export default function Categories({ rows = [], onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => (!term || [row.name, row.slug, row.parent_name].some((value) => String(value || "").toLowerCase().includes(term))) && (!status || row.status === status));
  }, [rows, search, status]);
  return (
    <section>
      <div className="section-heading"><div><h2>Categories</h2><p>{filteredRows.length} catalogue groups</p></div></div>
      <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search categories" status={status} statuses={["Active", "Draft"]} onStatusChange={setStatus} onReset={() => { setSearch(""); setStatus(""); }} />
      <DataTable label="Categories" headers={["Category", "Parent", "Products", "Status", "Sort", "Updated", "Actions"]} emptyMessage={rows.length ? "No categories match these filters." : "No categories found."}>
        {filteredRows.map((category) => (
          <tr key={category.id}><td><b>{category.name}</b><small>/{category.slug}</small></td><td>{category.parent_name || "Top level"}</td><td>{category.product_count}</td><td><Badge value={category.status} /></td><td>{category.sort_order}</td><td>{category.updated_at ? new Date(category.updated_at).toLocaleDateString("en-IN") : "—"}</td><td><div className="action-buttons"><button type="button" className="action-btn edit-btn" onClick={() => onEdit(category)}><Pencil size={13} /> Edit</button><button type="button" className="action-btn delete-btn" onClick={() => onDelete(category.id)}><Trash2 size={13} /> Delete</button></div></td></tr>
        ))}
      </DataTable>
    </section>
  );
}
