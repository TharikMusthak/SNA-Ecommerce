import { Pencil, Trash2 } from "lucide-react";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";

export default function Users({
  rows = [],
  currentId,
  onEdit,
  onDelete,
}) {
  return (
    <div className="users-section">
      <div className="panel users-note">
        <b>Admin Users</b>
        <span>
          Super Admin can create, edit, disable, reset passwords and delete
          users.
        </span>
      </div>
      <DataTable
        label="Users"
        headers={["User", "Role", "Status", "Created", "Actions"]}
        emptyMessage="No admin users found."
      >
        {rows.map((user) => (
          <tr key={user.id}>
            <td>
              <div className="user-cell">
                <span>{user.name?.[0]}</span>
                <div>
                  <b>
                    {user.name}
                    {user.id === currentId ? " (You)" : ""}
                  </b>
                  <small>{user.email}</small>
                </div>
              </div>
            </td>
            <td>
              <span className="role">{user.role}</span>
            </td>
            <td>
              <Badge value={user.status} />
            </td>
            <td>{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
            <td>
              <div className="action-buttons">
                <button
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => onEdit(user)}
                >
                  <Pencil size={14} /> Edit
                </button>
                {user.id !== currentId && (
                  <button
                    type="button"
                    className="action-btn delete-btn"
                    onClick={() => onDelete(user.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
