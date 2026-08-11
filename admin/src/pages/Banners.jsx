import { Pencil, Trash2 } from "lucide-react";
import { assetUrl } from "../api";
import Badge from "../components/Badge";
import DataTable, { TableImage } from "../components/DataTable";

export default function Banners({ rows = [], onEdit, onDelete }) {
  return (
    <DataTable
      label="Banners"
      headers={["Image", "Banner", "Status", "Actions"]}
      emptyMessage="No banners found."
      minWidth={760}
    >
      {rows.map((banner) => (
        <tr key={banner.id}>
          <td>
            <TableImage
              src={banner.image ? assetUrl(banner.image) : ""}
              alt={banner.title}
            />
          </td>
          <td>
            <b>{banner.title}</b>
            <small>{banner.subtitle}</small>
          </td>
          <td>
            <Badge value={banner.status} />
          </td>
          <td>
            <div className="action-buttons">
              <button
                type="button"
                className="action-btn edit-btn"
                onClick={() => onEdit(banner)}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                className="action-btn delete-btn"
                onClick={() => onDelete(banner.id)}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
