import { useEffect, useState } from "react";
import { menuIcons } from "../constants/navigation";
import snaLogo from "../assets/SNA Logo.svg";

export default function Dashboard({ data, admin, setView }) {
  const [welcome, setWelcome] = useState(() => getWelcomeMessage(new Date()));
  const summary = data.dashboardSummary || {};
  const revenue =
    summary.order_value ??
    data.orders.reduce(
      (total, order) => total + Number(order.amount),
      0,
    );
  const canManageContent = admin?.role !== "Order Manager";
  const canManageOrders = admin?.role !== "Product Manager";
  const quickActions =
    admin?.role === "Order Manager"
      ? ["Orders"]
      : ["Products", "Categories", "Inventory", "Banners"];

  useEffect(() => {
    const updateWelcome = () => setWelcome(getWelcomeMessage(new Date()));
    const timer = window.setInterval(updateWelcome, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="hero">
        <div aria-live="polite">
          <small>{welcome.greeting}</small>
          <h2>{welcome.headline}</h2>
          <p>{welcome.description}</p>
        </div>
        <div className="hero-logo">
          <img src={snaLogo} alt="SNA Sundaram logo" />
        </div>
      </div>
      <div className="stats">
        {canManageContent && (
          <>
            <Card
              title="Products"
              value={summary.products ?? data.products.length}
            />
            <Card
              title="Categories"
              value={summary.categories ?? data.categories.length}
            />
            <Card title="Low stock" value={summary.low_stock ?? 0} />
          </>
        )}
        {canManageOrders && (
          <>
            <Card
              title="Orders"
              value={summary.orders ?? data.orders.length}
            />
            <Card
              title="Order value"
              value={`₹${revenue.toLocaleString("en-IN")}`}
            />
          </>
        )}
      </div>
      <div className="panel quick">
        <h3>Quick actions</h3>
        {quickActions.map((item) => (
          <button key={item} onClick={() => setView(item)}>
            {menuIcons[item]} Manage {item} <span>→</span>
          </button>
        ))}
      </div>
    </>
  );
}

function getWelcomeMessage(date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good morning",
      headline: "Start the day with your store in perfect order.",
      description:
        "Review products, inventory and today’s orders from one workspace.",
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good afternoon",
      headline: "Keep your store moving smoothly.",
      description:
        "Manage products, stock, banners and incoming orders with ease.",
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      greeting: "Good evening",
      headline: "Your store, beautifully organised.",
      description:
        "Review products, variants, banners and orders in one workspace.",
    };
  }

  return {
    greeting: "Good night",
    headline: "Everything is ready for tomorrow.",
    description:
      "Check final updates and prepare your store for the next business day.",
  };
}

function Card({ title, value }) {
  return (
    <article>
      <small>{title}</small>
      <b>{value}</b>
      <span>Live database data</span>
    </article>
  );
}
