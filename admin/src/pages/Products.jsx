import Badge from "../components/Badge";
import DataTable, { TableImage } from "../components/DataTable";
import { assetUrl } from "../api";
import { Pencil, Trash2 } from "lucide-react";

export default function Products({ rows = [], onEdit, onDelete }) {
  return (
    <DataTable
      label="Products"
      headers={["Image", "Product", "Category", "Price", "Stock", "Status", "Actions"]}
      emptyMessage="No products found."
    >
      {rows.map((product) => (
        <tr key={product.id}>
          <td>
            <TableImage
              src={product.main_image ? assetUrl(product.main_image) : ""}
              alt={product.name}
            />
          </td>
          <td>
            <b>{product.name}</b>
            <small>{product.description}</small>
          </td>
          <td>{product.category}</td>
          <td>₹{product.price}</td>
          <td>{product.stock}</td>
          <td>
            <Badge value={product.status} />
          </td>
          <td>
            <div className="action-buttons">
              <button type="button" className="action-btn edit-btn" onClick={() => onEdit(product)}>
                <Pencil size={12} /> Edit
              </button>
              <button type="button" className="action-btn delete-btn" onClick={() => onDelete(product.id)}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
