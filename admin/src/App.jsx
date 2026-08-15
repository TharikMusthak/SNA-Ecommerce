import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import Login from "./components/Login";
import AdminLayout from "./components/AdminLayout";
import { ConfirmDialog } from "./components/Dialog";
import Editor from "./components/Editor";
import InventoryDialog from "./components/InventoryDialog";
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
import Dispatch from "./pages/Dispatch";
import ShippingSettings from "./pages/ShippingSettings";
import {
  getMenusForRole,
  viewFromHash,
  viewToHash,
} from "./constants/navigation";

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
  const [sessionMessage, setSessionMessage] = useState("");
  const authenticatedRef = useRef(false);

  useEffect(() => {
    let active = true;

    localStorage.removeItem("sna_token");
    localStorage.removeItem("sna_admin");

    api("/auth/me")
      .then((data) => {
        if (active) {
          authenticatedRef.current = true;
          setAdmin(data.admin);
        }
      })
      .catch(() => {
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    const clearSession = () => {
      if (authenticatedRef.current) {
        setSessionMessage("Your session has expired. Please sign in again.");
      }
      authenticatedRef.current = false;
      setAdmin(null);
    };
    window.addEventListener("sna:unauthorized", clearSession);

    return () => {
      active = false;
      window.removeEventListener("sna:unauthorized", clearSession);
    };
  }, []);

  function handleLogin(newAdmin) {
    authenticatedRef.current = true;
    setSessionMessage("");
    setAdmin(newAdmin);
  }

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      authenticatedRef.current = false;
      setSessionMessage("");
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

  if (!admin) return <Login onLogin={handleLogin} initialMessage={sessionMessage} />;
  return <Cms admin={admin} onLogout={handleLogout} />;
}

function Cms({ admin, onLogout }) {
  const menus = getMenusForRole(admin?.role);
  const [view, setView] = useState(() => viewFromHash());
  const [data, setData] = useState(emptyData);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loadingViews, setLoadingViews] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState(null);
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

  const loadDashboard = useCallback(async (days = 30, summaryOnly = false) => {
    setLoadingViews((current) => ({ ...current, Dashboard: true }));
    try {
      const [dashboard, dashboardSummary] = await Promise.all([
        summaryOnly ? Promise.resolve(null) : api("/cms/dashboard"),
        api(`/dashboard/summary?days=${days}`),
      ]);
      setData((current) => ({
        ...current,
        ...(dashboard || {}),
        dashboardSummary,
      }));
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setLoadingViews((current) => ({ ...current, Dashboard: false }));
    }
  }, [showNotice]);

  const loadUsers = useCallback(async () => {
    setLoadingViews((current) => ({ ...current, Users: true }));
    try {
      const users = await api("/users");
      setData((current) => ({ ...current, users }));
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setLoadingViews((current) => ({ ...current, Users: false }));
    }
  }, [showNotice]);

  const loadCategories = useCallback(async () => {
    setLoadingViews((current) => ({ ...current, Categories: true }));
    try {
      const categories = await api("/categories");
      setData((current) => ({ ...current, categories }));
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setLoadingViews((current) => ({ ...current, Categories: false }));
    }
  }, [showNotice]);

  const loadInventory = useCallback(async () => {
    setLoadingViews((current) => ({ ...current, Inventory: true }));
    try {
      const inventory = await api("/inventory");
      setData((current) => ({ ...current, inventory }));
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setLoadingViews((current) => ({ ...current, Inventory: false }));
    }
  }, [showNotice]);

  const loadCmsPages = useCallback(async () => {
    setLoadingViews((current) => ({ ...current, "CMS Pages": true }));
    try {
      const cmsPages = await api("/cms/pages");
      setData((current) => ({ ...current, cmsPages }));
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setLoadingViews((current) => ({ ...current, "CMS Pages": false }));
    }
  }, [showNotice]);

  const loadViewData = useCallback(async (nextView) => {
    if (["Dashboard", "Products", "Attributes", "Banners", "FAQ"].includes(nextView)) {
      await loadDashboard();
    }
    if (nextView === "Users") await loadUsers();
    if (nextView === "Products" || nextView === "Categories" || nextView === "Banners") {
      await loadCategories();
    }
    if (nextView === "Inventory") await loadInventory();
    if (nextView === "CMS Pages") await loadCmsPages();
  }, [loadCategories, loadCmsPages, loadDashboard, loadInventory, loadUsers]);

  useEffect(() => {
    const allowedView = menus.includes(viewFromHash()) ? viewFromHash() : "Dashboard";
    if (view !== allowedView) setView(allowedView);
    if (window.location.hash !== viewToHash(allowedView)) {
      window.history.replaceState(null, "", viewToHash(allowedView));
    }

    function restoreRoute() {
      const nextView = viewFromHash();
      setView(menus.includes(nextView) ? nextView : "Dashboard");
    }

    window.addEventListener("popstate", restoreRoute);
    window.addEventListener("hashchange", restoreRoute);
    return () => {
      window.removeEventListener("popstate", restoreRoute);
      window.removeEventListener("hashchange", restoreRoute);
    };
  }, [menus, view]);

  useEffect(() => {
    void loadViewData(view);
  }, [loadViewData, view]);

  function openView(nextView) {
    if (!menus.includes(nextView)) return;
    if (view !== nextView) {
      window.history.pushState(null, "", viewToHash(nextView));
    }
    setView(nextView);
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

  function remove(route, id, refreshTarget = "dashboard") {
    const entity = route.split("/").at(-1)?.replace(/s$/, "") || "item";
    setConfirmation({
      title: `Delete ${entity}`,
      description: "This action permanently removes the record and cannot be undone.",
      confirmLabel: `Delete ${entity}`,
      danger: true,
      action: async () => {
        await api(`/${route}/${id}`, { method: "DELETE" });
        showNotice("Deleted successfully");
        if (refreshTarget === "users") await loadUsers();
        else if (refreshTarget === "categories") {
          await Promise.all([loadCategories(), loadDashboard()]);
        } else await loadDashboard();
      },
    });
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

  async function toggleFeaturedProduct(product) {
    const isFeatured = Number(product.is_featured) === 1;
    try {
      await api(`/products/${product.id}/featured`, {
        method: "PUT",
        body: JSON.stringify({ is_featured: !isFeatured }),
      });
      showNotice(
        isFeatured
          ? "Product removed from featured products"
          : "Product added to featured products",
      );
      await loadDashboard();
    } catch (error) {
      showNotice(error.message, "error");
    }
  }

  function setInventoryStock(item) {
    setInventoryDialog({ item, mode: "set" });
  }

  function restockInventory(item) {
    setInventoryDialog({ item, mode: "restock" });
  }

  async function submitInventory({ quantity, threshold, reason }) {
    const { item, mode } = inventoryDialog;
    try {
      await api(
        `/inventory/${item.product_id}/${mode === "restock" ? "restock" : "stock"}`,
        {
          method: mode === "restock" ? "POST" : "PUT",
          body: JSON.stringify(
            mode === "restock"
              ? { quantity, note: reason }
              : { stock: quantity, low_stock_threshold: threshold, note: reason },
          ),
        },
      );
      showNotice(mode === "restock" ? "Product restocked successfully" : "Stock updated successfully");
      await Promise.all([loadInventory(), loadDashboard()]);
    } catch (error) {
      showNotice(error.message, "error");
      throw error;
    }
  }

  async function runConfirmation() {
    if (!confirmation || confirming) return;
    setConfirming(true);
    try {
      await confirmation.action();
      setConfirmation(null);
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setConfirming(false);
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
        <Dashboard
          data={data}
          admin={admin}
          setView={openView}
          loading={loadingViews.Dashboard}
          onRangeChange={(days) => loadDashboard(days, true)}
        />
      )}
      {view === "Products" && (
        <Products
          rows={data.products}
          onEdit={(item) => openEditor("product", item)}
          onDelete={(id) => remove("products", id)}
          onToggleFeatured={toggleFeaturedProduct}
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
      {view === "Dispatch" && <Dispatch onNotice={showNotice} />}
      {view === "Shipping Settings" && (
        <ShippingSettings onNotice={showNotice} />
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
      {confirmation && (
        <ConfirmDialog
          {...confirmation}
          busy={confirming}
          onClose={() => !confirming && setConfirmation(null)}
          onConfirm={runConfirmation}
        />
      )}
      {inventoryDialog && (
        <InventoryDialog
          {...inventoryDialog}
          onClose={() => setInventoryDialog(null)}
          onSubmit={submitInventory}
        />
      )}
    </AdminLayout>
  );
}
