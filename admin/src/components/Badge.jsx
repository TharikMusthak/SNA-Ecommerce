export default function Badge({ value }) {
  const modifier = String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return <span className={`badge badge--${modifier}`}>{value}</span>;
}
