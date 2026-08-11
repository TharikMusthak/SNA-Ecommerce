import DataTable from "../components/DataTable";
import { Pencil, Trash2 } from "lucide-react";

export default function Attributes({ rows = [], onEdit, onDelete }) {
  return (
    <DataTable
      label="Attributes"
      headers={[
        "Product",
        "Brand",
        "Colour",
        "Size",
        "SKU",
        "Price",
        "Stock",
        "Actions",
      ]}
      emptyMessage="No product attributes found."
    >
      {rows.map((variant) => (
        <tr key={variant.id}>
          <td>
            <b>{variant.product_name}</b>
          </td>
          <td>{variant.brand}</td>
          <td>{variant.color || "-"}</td>
          <td>{variant.size || "-"}</td>
          <td>
            <code>{variant.sku}</code>
          </td>
          <td>₹{variant.price}</td>
          <td>{variant.stock}</td>
          <td>
            <div className="action-buttons">
              <button type="button" className="action-btn edit-btn" onClick={() => onEdit(variant)}>
                <Pencil size={12} /> Edit
              </button>
              <button type="button" className="action-btn delete-btn" onClick={() => onDelete(variant.id)}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
