import { useMemo, useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { assetUrl } from "../api";
import Badge from "../components/Badge";
import DataTable, { TableImage } from "../components/DataTable";
import ModuleToolbar from "../components/ModuleToolbar";
import CustomSelect from "../components/CustomSelect";

export default function Banners({ rows = [], onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [position, setPosition] = useState("");
  const positions = useMemo(() => [...new Set(rows.map((row) => row.display_position).filter(Boolean))], [rows]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => (!term || [row.name, row.title, row.product_name, row.category_name].some((value) => String(value || "").toLowerCase().includes(term))) && (!status || row.status === status) && (!position || row.display_position === position));
  }, [position, rows, search, status]);
  return (
    <section>
      <div className="section-heading"><div><h2>Store banners</h2><p>{filteredRows.length} promotional placements</p></div></div>
      <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search banners" status={status} statuses={["Active", "Draft"]} onStatusChange={setStatus} onReset={() => { setSearch(""); setStatus(""); setPosition(""); }}>
        <CustomSelect aria-label="Banner position" value={position} onChange={(event) => setPosition(event.target.value)}><option value="">All positions</option>{positions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</CustomSelect>
      </ModuleToolbar>
      <DataTable label="Banners" headers={["Preview", "Banner", "Position", "Redirect", "Target", "Start", "End", "Status", "Actions"]} emptyMessage={rows.length ? "No banners match these filters." : "No banners found."} minWidth={1180}>
        {filteredRows.map((banner) => (
          <tr key={banner.id}><td><TableImage src={banner.image ? assetUrl(banner.image) : ""} alt={banner.title} /></td><td><b>{banner.name || banner.title}</b><small>{banner.title}</small></td><td>{label(banner.display_position || "home_hero")}</td><td>{label(banner.redirect_type || "none")}</td><td><b>{banner.product_name || banner.category_name || "—"}</b><small>{banner.redirect_url || ""}</small></td><td>{formatDate(banner.start_at)}</td><td>{formatDate(banner.end_at)}</td><td><Badge value={banner.status} /></td><td><div className="action-buttons">{banner.redirect_url && <a className="action-btn" href={banner.redirect_url} target="_blank" rel="noreferrer" aria-label={`Open target for ${banner.title}`}><ExternalLink size={13} /></a>}<button type="button" className="action-btn edit-btn" onClick={() => onEdit(banner)}><Pencil size={13} /> Edit</button><button type="button" className="action-btn delete-btn" onClick={() => onDelete(banner.id)}><Trash2 size={13} /> Delete</button></div></td></tr>
        ))}
      </DataTable>
    </section>
  );
}

function label(value) { return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString("en-IN") : "Always"; }
