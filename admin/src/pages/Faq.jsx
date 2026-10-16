import { Pencil, Trash2 } from "lucide-react";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";

export default function Faq({ rows = [], onEdit, onDelete }) {
  return (
    <DataTable
      label="FAQ"
      headers={["Question", "Answer", "Status", "Actions"]}
      emptyMessage="No FAQs found."
      minWidth={820}
    >
      {rows.map((faq) => (
        <tr key={faq.id}>
          <td>
            <b>{faq.question}</b>
          </td>
          <td className="table-long-text">{faq.answer}</td>
          <td>
            <Badge value={faq.status} />
          </td>
          <td>
            <div className="action-buttons">
              <button
                type="button"
                className="action-btn edit-btn"
                onClick={() => onEdit(faq)}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                className="action-btn delete-btn"
                onClick={() => onDelete(faq.id)}
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
