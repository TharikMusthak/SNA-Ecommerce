import DataTable from "../components/DataTable";

export default function Orders({ rows = [], onStageChange }) {
  const stages = ["Pending", "Confirmed", "Processing", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Returned"];
  return (
    <DataTable
      label="Orders"
      headers={["Order", "Customer", "Product", "Amount", "Stage"]}
      emptyMessage="No orders found."
    >
      {rows.map((order) => (
        <tr key={order.id}>
          <td>
            <b>{order.order_code}</b>
          </td>
          <td>
            {order.customer}
            <small>{order.phone}</small>
          </td>
          <td>{order.product}</td>
          <td>₹{order.amount}</td>
          <td>
            <select
              value={order.stage}
              onChange={(event) =>
                onStageChange(order.id, event.target.value)
              }
            >
              {stages.map((label, index) => (
                <option key={index} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
