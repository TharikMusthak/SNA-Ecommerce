import { useMemo, useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { assetUrl } from "../api";
import Badge from "../components/Badge";
import DataTable, { TableImage } from "../components/DataTable";
import ModuleToolbar from "../components/ModuleToolbar";
import CustomSelect from "../components/CustomSelect";

export default function Products({ rows = [], onEdit, onDelete, onToggleFeatured }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => [...new Set(rows.map((row) => row.category).filter(Boolean))].sort(), [rows]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) =>
      (!term || [row.name, row.description, row.category].some((value) => String(value || "").toLowerCase().includes(term))) &&
      (!status || row.status === status) &&
      (!category || row.category === category),
    );
  }, [category, rows, search, status]);

  return (
    <section>
      <div className="section-heading"><div><h2>Product catalogue</h2><p>{filteredRows.length} of {rows.length} products</p></div></div>
      <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search products" status={status} statuses={["Active", "Draft"]} onStatusChange={setStatus} onReset={() => { setSearch(""); setStatus(""); setCategory(""); }}>
        <CustomSelect aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</CustomSelect>
      </ModuleToolbar>
      <DataTable label="Products" headers={["Image", "Product", "SKU", "Category", "Price", "Stock", "Rating", "Featured", "Status", "Updated", "Actions"]} emptyMessage={rows.length ? "No products match these filters." : "No products found."} minWidth={1260}>
        {filteredRows.map((product) => (
          <tr key={product.id}>
            <td><TableImage src={product.main_image ? assetUrl(product.main_image) : ""} alt={product.name} /></td>
            <td><b>{product.name}</b><small>{product.description}</small></td>
            <td>{product.sku || "—"}</td>
            <td>{product.category}</td>
            <td>{currency(product.sale_price ?? product.price)}{product.sale_price !== null && product.sale_price !== undefined && <small>Regular: {currency(product.price)}</small>}</td>
            <td><span className={Number(product.stock) <= Number(product.low_stock_threshold) ? "quantity-pill quantity-pill--low" : "quantity-pill"}>{product.stock}</span></td>
            <td><span className="rating-chip"><Star size={13} fill="currentColor" /> {Number(product.average_rating || 0).toFixed(1)}</span></td>
            <td><Badge value={Number(product.is_featured) === 1 ? "Featured" : "Standard"} /></td>
            <td><Badge value={product.status} /></td>
            <td>{product.updated_at ? new Date(product.updated_at).toLocaleDateString("en-IN") : "—"}</td>
            <td><div className="action-buttons"><button type="button" className="action-btn" onClick={() => onToggleFeatured(product)} aria-label={Number(product.is_featured) === 1 ? `Remove ${product.name} from featured products` : `Feature ${product.name}`}><Star size={13} fill={Number(product.is_featured) === 1 ? "currentColor" : "none"} /> {Number(product.is_featured) === 1 ? "Unfeature" : "Feature"}</button><button type="button" className="action-btn edit-btn" onClick={() => onEdit(product)}><Pencil size={13} /> Edit</button><button type="button" className="action-btn delete-btn" onClick={() => onDelete(product.id)}><Trash2 size={13} /> Delete</button></div></td>
          </tr>
        ))}
      </DataTable>
    </section>
  );
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
}
