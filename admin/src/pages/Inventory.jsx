import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { assetUrl } from "../api";
import DataTable, { TableImage } from "../components/DataTable";

export default function Inventory({
  rows = [],
  onSetStock,
  onRestock,
}) {
  return (
    <DataTable
      label="Inventory"
      headers={[
        "Product",
        "Category",
        "Stock",
        "Low-stock level",
        "State",
        "Actions",
      ]}
      emptyMessage="No inventory records found."
    >
      {rows.map((item) => (
        <tr key={item.product_id}>
          <td>
            <div className="inventory-product">
              <TableImage
                src={item.main_image ? assetUrl(item.main_image) : ""}
                alt={item.name}
              />
              <b>{item.name}</b>
            </div>
          </td>
          <td>{item.category}</td>
          <td>
            <b>{item.stock}</b>
          </td>
          <td>{item.low_stock_threshold}</td>
          <td>
            <span
              className={`stock-state ${
                Number(item.is_low_stock) ? "low" : "healthy"
              }`}
            >
              {Number(item.is_low_stock) ? "Low stock" : "Healthy"}
            </span>
          </td>
          <td>
            <div className="action-buttons">
              <button
                type="button"
                className="action-btn edit-btn"
                onClick={() => onSetStock(item)}
              >
                <SlidersHorizontal size={14} /> Set stock
              </button>
              <button
                type="button"
                className="action-btn restock-btn"
                onClick={() => onRestock(item)}
              >
                <PackagePlus size={14} /> Restock
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
