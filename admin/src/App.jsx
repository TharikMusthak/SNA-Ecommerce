import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import Login from "./components/Login";
import AdminLayout from "./components/AdminLayout";
import Editor from "./components/Editor";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Inventory from "./pages/Inventory";
import Attributes from "./pages/Attributes";
import Banners from "./pages/Banners";
import CmsPages from "./pages/CmsPages";
import Orders from "./pages/Orders";
import Faq from "./pages/Faq";
import Users from "./pages/Users";
import CommerceList from "./pages/CommerceList";

const emptyData = {
  products: [],
  variants: [],
  banners: [],
  orders: [],
  faqs: [],
  users: [],
  categories: [],
  inventory: [],
  cmsPages: [],
  dashboardSummary: {},
  customers: [],
  reviews: [],
  returns: [],
  tickets: [],
  coupons: [],
  refunds: [],
  notifications: [],
};

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    localStorage.removeItem("sna_token");
    localStorage.removeItem("sna_admin");

    api("/auth/me")
      .then((data) => {
        if (active) setAdmin(data.admin);
      })
      .catch(() => {
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    const clearSession = () => setAdmin(null);
    window.addEventListener("sna:unauthorized", clearSession);

    return () => {
      active = false;
      window.removeEventListener("sna:unauthorized", clearSession);
    };
  }, []);

  function handleLogin(newAdmin) {
    setAdmin(newAdmin);
  }

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setAdmin(null);
    }
  }

  if (checkingSession) {
    return (
      <div className="sna-session-loader" role="status">
        <span>Checking secure session…</span>
      </div>
    );
  }

  if (!admin) return <Login onLogin={handleLogin} />;
  return <Cms admin={admin} onLogout={handleLogout} />;
}

function Cms({ admin, onLogout }) {
  const [view, setView] = useState("Dashboard");
  const [data, setData] = useState(emptyData);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);

  const showNotice = useCallback((message, type = "success") => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);

    setNotice({ id: Date.now(), message, type });
    noticeTimer.current = setTimeout(() => {
      setNotice(null);
      noticeTimer.current = null;
    }, 3500);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const loadDashboard = useCallback(async () => {
    try {
      const [dashboard, dashboardSummary] = await Promise.all([
        api("/cms/dashboard"),
        api("/dashboard/summary"),
      ]);
      setData((current) => ({
        ...current,
        ...dashboard,
        dashboardSummary,
      }));
    } catch (error) {
      showNotice(error.message, "error");
    }
  }, [showNotice]);

  async function loadUsers() {
    try {
      const users = await api("/users");
      setData((current) => ({ ...current, users }));
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function loadCategories() {
    try {
      const categories = await api("/categories");
      setData((current) => ({ ...current, categories }));
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function loadInventory() {
    try {
      const inventory = await api("/inventory");
      setData((current) => ({ ...current, inventory }));
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function loadCmsPages() {
    try {
      const cmsPages = await api("/cms/pages");
      setData((current) => ({ ...current, cmsPages }));
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function loadCommerce(nextView) {
    const routes = {
      Customers: ["customers", "customers"], Reviews: ["reviews", "reviews"],
      Returns: ["returns", "returns"], "Support Tickets": ["tickets", "tickets"],
      Coupons: ["coupons", "coupons"], "Refund Records": ["refunds", "refunds"], Notifications: ["notifications", "notifications"],
    };
    const target = routes[nextView];
    if (!target) return;
    try {
      const response = await api(`/v1/admin/${target[0]}`);
      setData((current) => ({ ...current, [target[1]]: response.data || [] }));
    } catch (error) { showNotice(error.message, "error"); }
  }

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function openView(nextView) {
    setView(nextView);
    if (nextView === "Users") await loadUsers();
    if (nextView === "Products" || nextView === "Categories") {
      await loadCategories();
    }
    if (nextView === "Inventory") await loadInventory();
    if (nextView === "CMS Pages") await loadCmsPages();
    await loadCommerce(nextView);
  }

  function openEditor(type, item = null) {
    setEditing(item);
    setModal(type);
  }

  function closeEditor() {
    setEditing(null);
    setModal(null);
  }

  async function save(type, form) {
    try {
      if (type === "cmsPage") {
        await api(`/cms/pages/${form.slug}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        closeEditor();
        showNotice("CMS page updated successfully");
        await loadCmsPages();
        return;
      }

      const route =
        type === "variant"
          ? "variants"
          : type === "user"
            ? "users"
            : type === "category"
              ? "categories"
              : "faqs";
      const prefix =
        type === "user" || type === "category" ? "" : "/cms";
      const method = editing ? "PUT" : "POST";
      const path = `${prefix}/${route}${editing ? `/${editing.id}` : ""}`;
      const wasEditing = Boolean(editing);

      await api(path, { method, body: JSON.stringify(form) });
      closeEditor();
      showNotice(wasEditing ? "Updated successfully" : "Saved successfully");
      if (type === "user") await loadUsers();
      else if (type === "category") {
        await Promise.all([loadCategories(), loadDashboard()]);
      }
      else await loadDashboard();
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function remove(route, id, refreshTarget = "dashboard") {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api(`/${route}/${id}`, { method: "DELETE" });
      showNotice("Deleted successfully");
      if (refreshTarget === "users") await loadUsers();
      else if (refreshTarget === "categories") {
        await Promise.all([loadCategories(), loadDashboard()]);
      } else await loadDashboard();
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function updateOrderStage(id, stage) {
    try {
      await api(`/cms/orders/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ stage }),
      });
      showNotice("Order stage updated");
      await loadDashboard();
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function setInventoryStock(item) {
    const stockInput = window.prompt(
      `${item.name} new stock quantity:`,
      String(item.stock),
    );
    if (stockInput === null) return;

    const thresholdInput = window.prompt(
      "Low-stock warning level:",
      String(item.low_stock_threshold),
    );
    if (thresholdInput === null) return;

    try {
      await api(`/inventory/${item.product_id}/stock`, {
        method: "PUT",
        body: JSON.stringify({
          stock: Number(stockInput),
          low_stock_threshold: Number(thresholdInput),
          note: "Updated from SNA Admin Panel",
        }),
      });
      showNotice("Stock updated successfully");
      await Promise.all([loadInventory(), loadDashboard()]);
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  async function restockInventory(item) {
    const quantityInput = window.prompt(
      `${item.name} restock quantity:`,
      "1",
    );
    if (quantityInput === null) return;

    try {
      await api(`/inventory/${item.product_id}/restock`, {
        method: "POST",
        body: JSON.stringify({
          quantity: Number(quantityInput),
          note: "Restocked from SNA Admin Panel",
        }),
      });
      showNotice("Product restocked successfully");
      await Promise.all([loadInventory(), loadDashboard()]);
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  return (
    <AdminLayout
      admin={admin}
      view={view}
      onViewChange={openView}
      onLogout={onLogout}
      onAdd={() => {
        const types = {
          Products: "product",
          Categories: "category",
          Attributes: "variant",
          Banners: "banner",
          FAQ: "faq",
          Users: "user",
        };
        openEditor(types[view]);
      }}
    >
      {notice && (
        <div
          key={notice.id}
          className={`toast ${notice.type}`}
          role="alert"
          aria-live="assertive"
        >
          {notice.message}
        </div>
      )}
      {view === "Dashboard" && (
        <Dashboard data={data} admin={admin} setView={openView} />
      )}
      {view === "Products" && (
        <Products
          rows={data.products}
          onEdit={(item) => openEditor("product", item)}
          onDelete={(id) => remove("products", id)}
        />
      )}
      {view === "Categories" && (
        <Categories
          rows={data.categories}
          onEdit={(item) => openEditor("category", item)}
          onDelete={(id) => remove("categories", id, "categories")}
        />
      )}
      {view === "Inventory" && (
        <Inventory
          rows={data.inventory}
          onSetStock={setInventoryStock}
          onRestock={restockInventory}
        />
      )}
      {view === "Attributes" && (
        <Attributes
          rows={data.variants}
          onEdit={(item) => openEditor("variant", item)}
          onDelete={(id) => remove("cms/variants", id)}
        />
      )}
      {view === "Banners" && (
        <Banners
          rows={data.banners}
          onEdit={(item) => openEditor("banner", item)}
          onDelete={(id) => remove("banners", id)}
        />
      )}
      {view === "CMS Pages" && (
        <CmsPages
          rows={data.cmsPages}
          onEdit={(item) => openEditor("cmsPage", item)}
        />
      )}
      {view === "Orders" && (
        <Orders rows={data.orders} onStageChange={updateOrderStage} />
      )}
      {view === "FAQ" && (
        <Faq
          rows={data.faqs}
          onEdit={(item) => openEditor("faq", item)}
          onDelete={(id) => remove("cms/faqs", id)}
        />
      )}
      {view === "Users" && (
        <Users
          rows={data.users || []}
          currentId={admin?.id}
          onEdit={(item) => openEditor("user", item)}
          onDelete={(id) => remove("users", id, "users")}
        />
      )}
      {["Customers", "Reviews", "Returns", "Refund Records", "Support Tickets", "Coupons", "Notifications"].includes(view) && (
        <CommerceList type={view} admin={admin} onNotice={showNotice} />
      )}

      {modal && (
        <Editor
          type={modal}
          item={editing}
          products={data.products}
          categories={data.categories}
          onClose={closeEditor}
          onSave={save}
          onError={(message) => showNotice(message, "error")}
          onNotice={showNotice}
          onBannerSaved={async () => {
            const wasEditing = Boolean(editing);
            closeEditor();
            showNotice(
              wasEditing
                ? "Banner updated successfully"
                : "Banner saved successfully",
            );
            await loadDashboard();
          }}
          onProductSaved={async () => {
            const wasEditing = Boolean(editing);
            closeEditor();
            showNotice(
              wasEditing
                ? "Product updated successfully"
                : "Product saved successfully",
            );
            await loadDashboard();
          }}
        />
      )}
    </AdminLayout>
  );
}
