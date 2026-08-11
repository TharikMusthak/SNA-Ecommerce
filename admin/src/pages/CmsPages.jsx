import { Pencil } from "lucide-react";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";

export default function CmsPages({ rows = [], onEdit }) {
  return (
    <DataTable
      label="CMS Pages"
      headers={["Page", "Slug", "Status", "Updated", "Actions"]}
      emptyMessage="No CMS pages found."
    >
      {rows.map((page) => (
        <tr key={page.id}>
          <td>
            <b>{page.title}</b>
            <small>{String(page.content || "").slice(0, 100)}</small>
          </td>
          <td>
            <code>{page.slug}</code>
          </td>
          <td>
            <Badge value={page.status} />
          </td>
          <td>{new Date(page.updated_at).toLocaleDateString("en-IN")}</td>
          <td>
            <div className="action-buttons">
              <button
                type="button"
                className="action-btn edit-btn"
                onClick={() => onEdit(page)}
              >
                <Pencil size={12} /> Edit content
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
