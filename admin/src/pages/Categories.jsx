import { Pencil, Trash2 } from "lucide-react";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";

export default function Categories({ rows = [], onEdit, onDelete }) {
  return (
    <DataTable
      label="Categories"
      headers={[
        "Category",
        "Parent",
        "Products",
        "Status",
        "Sort",
        "Actions",
      ]}
      emptyMessage="No categories found."
    >
      {rows.map((category) => (
        <tr key={category.id}>
          <td>
            <b>{category.name}</b>
            <small>/{category.slug}</small>
          </td>
          <td>{category.parent_name || "Top level"}</td>
          <td>{category.product_count}</td>
          <td>
            <Badge value={category.status} />
          </td>
          <td>{category.sort_order}</td>
          <td>
            <div className="action-buttons">
              <button
                type="button"
                className="action-btn edit-btn"
                onClick={() => onEdit(category)}
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                type="button"
                className="action-btn delete-btn"
                onClick={() => onDelete(category.id)}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
