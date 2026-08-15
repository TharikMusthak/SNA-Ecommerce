import { useMemo, useState } from "react";
import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { assetUrl } from "../api";
import DataTable, { TableImage } from "../components/DataTable";
import ModuleToolbar from "../components/ModuleToolbar";

export default function Inventory({ rows = [], onSetStock, onRestock }) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const stockState = Number(row.stock) === 0 ? "Out of stock" : Number(row.is_low_stock) ? "Low stock" : "In stock";
      return (!term || [row.name, row.category, row.sku].some((value) => String(value || "").toLowerCase().includes(term))) && (!state || stockState === state);
    });
  }, [rows, search, state]);
  return (
    <section>
      <div className="section-heading"><div><h2>Inventory</h2><p>{filteredRows.length} stock records</p></div></div>
      <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search inventory" status={state} statuses={["In stock", "Low stock", "Out of stock"]} onStatusChange={setState} onReset={() => { setSearch(""); setState(""); }} />
      <DataTable label="Inventory" headers={["Product", "Variant / SKU", "Current stock", "Low-stock level", "State", "Actions"]} emptyMessage={rows.length ? "No stock records match these filters." : "No inventory records found."}>
        {filteredRows.map((item) => {
          const stockState = Number(item.stock) === 0 ? "Out of stock" : Number(item.is_low_stock) ? "Low stock" : "In stock";
          return <tr key={item.product_id}><td><div className="inventory-product"><TableImage src={item.main_image ? assetUrl(item.main_image) : ""} alt={item.name} /><span><b>{item.name}</b><small>{item.category}</small></span></div></td><td>{item.sku || "Default"}</td><td><b>{item.stock}</b></td><td>{item.low_stock_threshold}</td><td><span className={`stock-state ${stockState === "In stock" ? "healthy" : "low"}`}>{stockState}</span></td><td><div className="action-buttons"><button type="button" className="action-btn edit-btn" onClick={() => onSetStock(item)}><SlidersHorizontal size={14} /> Adjust</button><button type="button" className="action-btn restock-btn" onClick={() => onRestock(item)}><PackagePlus size={14} /> Restock</button></div></td></tr>;
        })}
      </DataTable>
    </section>
  );
}
