const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function formatCurrency(value) {
  return formatter.format(Number(value || 0));
}
