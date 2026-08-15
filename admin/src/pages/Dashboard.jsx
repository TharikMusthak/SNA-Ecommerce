import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  IndianRupee,
  MessageSquareText,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Star,
  Truck,
  UserPlus,
} from "lucide-react";
import Badge from "../components/Badge";

export default function Dashboard({
  data,
  admin,
  setView,
  loading = false,
  onRangeChange,
}) {
  const [welcome, setWelcome] = useState(() => getWelcomeMessage(new Date()));
  const [days, setDays] = useState(30);
  const summary = useMemo(() => data.dashboardSummary || {}, [data.dashboardSummary]);
  const insights = summary.insights || {};
  const canManageContent = admin?.role !== "Order Manager";
  const canManageOrders = admin?.role !== "Product Manager";
  const revenue = summary.order_value ?? 0;
  const kpis = useMemo(() => {
    const cards = [];
    if (canManageOrders) {
      cards.push(
        { label: "Today's orders", value: summary.today_orders ?? 0, icon: ShoppingBag, tone: "green" },
        { label: "Today's revenue", value: currency(summary.today_revenue), icon: IndianRupee, tone: "emerald" },
        { label: "Pending orders", value: summary.pending_orders ?? 0, icon: PackageCheck, tone: "amber", target: "Orders" },
        { label: "Ready to dispatch", value: summary.ready_to_dispatch ?? 0, icon: Truck, tone: "blue", target: "Dispatch" },
        { label: "New customers", value: summary.new_customers ?? 0, icon: UserPlus, tone: "violet", target: "Customers" },
        { label: "Pending returns", value: summary.pending_returns ?? 0, icon: RotateCcw, tone: "rose", target: "Returns" },
        { label: "Open tickets", value: summary.open_tickets ?? 0, icon: MessageSquareText, tone: "slate", target: "Support Tickets" },
      );
    }
    if (canManageContent) {
      cards.push({ label: "Low stock", value: summary.low_stock ?? 0, icon: AlertTriangle, tone: "amber", target: "Inventory" });
    }
    return cards;
  }, [canManageContent, canManageOrders, summary]);

  useEffect(() => {
    const updateWelcome = () => setWelcome(getWelcomeMessage(new Date()));
    const timer = window.setInterval(updateWelcome, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  function changeRange(event) {
    const next = Number(event.target.value);
    setDays(next);
    onRangeChange?.(next);
  }

  if (loading && !Object.keys(summary).length) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">{welcome.greeting}, {admin?.name?.split(" ")[0] || "Admin"}</span>
          <h2>{welcome.headline}</h2>
          <p>{welcome.description}</p>
        </div>
        <div className="dashboard-total">
          <span>Total recorded revenue</span>
          <strong>{currency(revenue)}</strong>
          <small>Based on eligible orders</small>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Store performance indicators">
        {kpis.map((card) => (
          <button
            className={`kpi-card kpi-card--${card.tone}`}
            key={card.label}
            type="button"
            disabled={!card.target}
            onClick={() => card.target && setView(card.target)}
          >
            <span className="kpi-icon"><card.icon size={20} aria-hidden="true" /></span>
            <span className="kpi-copy"><small>{card.label}</small><strong>{card.value}</strong></span>
            {card.target && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        ))}
      </section>

      {canManageOrders && (
        <section className="dashboard-grid dashboard-grid--charts">
          <article className="dashboard-card dashboard-card--wide">
            <header className="card-header">
              <div><span className="eyebrow">Sales performance</span><h3>Revenue trend</h3></div>
              <label className="compact-select">
                <span className="sr-only">Revenue date range</span>
                <select value={days} onChange={changeRange} disabled={loading}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </label>
            </header>
            <RevenueChart rows={insights.revenue_trend || []} />
          </article>
          <article className="dashboard-card">
            <header className="card-header"><div><span className="eyebrow">Workflow</span><h3>Orders by status</h3></div></header>
            <StatusBars rows={insights.orders_by_status || []} />
          </article>
        </section>
      )}

      <section className="dashboard-grid">
        {canManageOrders && (
          <DashboardList
            title="Recent orders"
            eyebrow="Latest activity"
            rows={insights.recent_orders}
            empty="No orders have been placed yet."
            onViewAll={() => setView("Orders")}
            render={(row) => (
              <><span><b>{row.order_code}</b><small>{row.customer}</small></span><span className="list-meta"><b>{currency(row.amount)}</b><Badge value={row.status || "pending"} /></span></>
            )}
          />
        )}
        {canManageContent && (
          <DashboardList
            title="Low stock products"
            eyebrow="Inventory attention"
            rows={insights.low_stock_products}
            empty="All products are above their low-stock levels."
            onViewAll={() => setView("Inventory")}
            render={(row) => (
              <><span><b>{row.name}</b><small>Alert at {row.low_stock_threshold}</small></span><span className="quantity-pill">{row.stock} left</span></>
            )}
          />
        )}
        {canManageOrders && (
          <DashboardList
            title="Recent customers"
            eyebrow="Customer growth"
            rows={insights.recent_customers}
            empty="No customer accounts yet."
            onViewAll={() => setView("Customers")}
            render={(row) => (
              <><span><b>{[row.first_name, row.last_name].filter(Boolean).join(" ")}</b><small>{row.email}</small></span><Badge value={row.status} /></>
            )}
          />
        )}
        {canManageOrders && (
          <DashboardList
            title="Pending returns"
            eyebrow="Requires action"
            rows={insights.pending_returns}
            empty="No returns currently need attention."
            onViewAll={() => setView("Returns")}
            render={(row) => (
              <><span><b>{row.return_code}</b><small>{row.order_code} · {row.customer}</small></span><Badge value={row.status} /></>
            )}
          />
        )}
        {canManageContent && (
          <DashboardList
            title="Recent reviews"
            eyebrow="Customer feedback"
            rows={insights.recent_reviews}
            empty="No reviews have been submitted."
            onViewAll={() => setView("Reviews")}
            render={(row) => (
              <><span><b>{row.product_name}</b><small>{row.customer}</small></span><span className="rating-chip"><Star size={14} fill="currentColor" /> {row.rating}</span></>
            )}
          />
        )}
        {canManageOrders && (
          <article className="dashboard-card">
            <header className="card-header"><div><span className="eyebrow">Fulfilment</span><h3>Dispatch status</h3></div><button className="text-button" onClick={() => setView("Dispatch")}>View queue</button></header>
            <StatusBars rows={insights.dispatch_status || []} />
          </article>
        )}
      </section>
    </div>
  );
}

function DashboardList({ title, eyebrow, rows = [], empty, render, onViewAll }) {
  return (
    <article className="dashboard-card">
      <header className="card-header">
        <div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>
        <button className="text-button" type="button" onClick={onViewAll}>View all</button>
      </header>
      {rows.length ? <div className="dashboard-list">{rows.map((row, index) => <div key={row.id || row.order_code || row.return_code || index}>{render(row)}</div>)}</div> : <div className="compact-empty"><Boxes size={24} /><span>{empty}</span></div>}
    </article>
  );
}

function RevenueChart({ rows }) {
  if (!rows.length) return <div className="compact-empty"><IndianRupee size={24} /><span>No eligible revenue in this period.</span></div>;
  const max = Math.max(...rows.map((row) => Number(row.value)), 1);
  return (
    <div className="revenue-chart" role="img" aria-label="Revenue trend chart">
      {rows.map((row) => (
        <div className="chart-column" key={row.date} title={`${row.date}: ${currency(row.value)}`}>
          <span style={{ height: `${Math.max((Number(row.value) / max) * 100, 4)}%` }} />
          <small>{new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>
        </div>
      ))}
    </div>
  );
}

function StatusBars({ rows }) {
  if (!rows.length) return <div className="compact-empty"><Boxes size={24} /><span>No status data available.</span></div>;
  const max = Math.max(...rows.map((row) => Number(row.total)), 1);
  return <div className="status-bars">{rows.slice(0, 7).map((row) => <div key={row.status}><span><b>{label(row.status)}</b><small>{row.total}</small></span><i><em style={{ width: `${(Number(row.total) / max) * 100}%` }} /></i></div>)}</div>;
}

function DashboardSkeleton() {
  return <div className="dashboard-page" aria-busy="true"><div className="dashboard-welcome skeleton-block" /><div className="kpi-grid">{Array.from({ length: 8 }, (_, index) => <div className="kpi-card skeleton-block" key={index} />)}</div><div className="dashboard-grid"><div className="dashboard-card skeleton-block" /><div className="dashboard-card skeleton-block" /></div></div>;
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function label(value) {
  return String(value || "Unknown").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getWelcomeMessage(date) {
  const hour = date.getHours();
  if (hour < 12) return { greeting: "Good morning", headline: "Your store at a glance", description: "Review today’s priorities and keep every order moving." };
  if (hour < 17) return { greeting: "Good afternoon", headline: "Keep commerce moving", description: "Monitor sales, inventory, customers and fulfilment from one place." };
  return { greeting: "Good evening", headline: "Close the day with clarity", description: "Resolve outstanding work and prepare the store for tomorrow." };
}
