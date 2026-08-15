import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptIndianRupee,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tags,
  TicketPercent,
  Truck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import {
  addButtonLabels,
  getGroupForView,
  getMenusForRole,
  menuGroups,
} from "../constants/navigation";
import myLogo from "../assets/SNA Logo.svg";

const icons = {
  Dashboard: LayoutDashboard,
  Products: Package,
  Categories: Tags,
  Inventory: Warehouse,
  Attributes: SlidersHorizontal,
  Banners: Image,
  Reviews: Star,
  Coupons: TicketPercent,
  Orders: ShoppingBag,
  Dispatch: Truck,
  Returns: RotateCcw,
  "Refund Records": ReceiptIndianRupee,
  Customers: Users,
  "Support Tickets": MessageSquareText,
  Notifications: Bell,
  "CMS Pages": FileText,
  FAQ: CircleHelp,
  "Shipping Settings": Settings,
  Users: ShieldCheck,
};

export default function AdminLayout({
  admin,
  view,
  onViewChange,
  onLogout,
  onAdd,
  children,
}) {
  const menus = getMenusForRole(admin?.role);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sna_sidebar_collapsed") === "true",
  );
  const visibleGroups = useMemo(
    () =>
      menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => menus.includes(item)),
        }))
        .filter((group) => group.items.length),
    [menus],
  );

  useEffect(() => {
    localStorage.setItem("sna_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setShowAccountMenu(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function selectView(menu) {
    setMobileOpen(false);
    onViewChange(menu);
  }

  return (
    <div className={`shell${collapsed ? " shell--collapsed" : ""}`}>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={mobileOpen ? "sidebar--open" : ""}>
        <div className="brand">
          <img className="brand-logo" src={myLogo} alt="SNA Sundaram" />
          <button
            className="sidebar-mobile-close"
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Administration sections">
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((menu) => {
                const Icon = icons[menu] || Boxes;
                return (
                  <button
                    type="button"
                    className={view === menu ? "active" : ""}
                    onClick={() => selectView(menu)}
                    key={menu}
                    aria-current={view === menu ? "page" : undefined}
                    title={collapsed ? menu : undefined}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{menu}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="account">
          {showAccountMenu && (
            <div className="account-dropdown" role="menu">
              <button type="button" onClick={onLogout} role="menuitem">
                <LogOut size={17} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="account-profile"
            onClick={() => setShowAccountMenu((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={showAccountMenu}
          >
            <span className="account-avatar" aria-hidden="true">
              {admin?.name?.[0]?.toUpperCase() || "A"}
            </span>
            <span className="account-details">
              <b>{admin?.name || "Admin"}</b>
              <small>{admin?.role || "Administrator"}</small>
            </span>
            <ChevronDown
              size={17}
              aria-hidden="true"
              className={showAccountMenu ? "account-arrow-open" : ""}
            />
          </button>
        </div>
      </aside>

      <main>
        <header className="app-header">
          <div className="header-title-row">
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <button
              className="sidebar-collapse-button"
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div>
              <div className="breadcrumbs" aria-label="Breadcrumb">
                <span>SNA Admin</span>
                <span aria-hidden="true">/</span>
                <span>{getGroupForView(view)}</span>
              </div>
              <h1>{view}</h1>
            </div>
          </div>
          <div className="header-actions">
            <span className="header-role">{admin?.role}</span>
            {addButtonLabels[view] && (
              <button className="primary-button" type="button" onClick={onAdd}>
                <Plus size={18} aria-hidden="true" />
                <span>{addButtonLabels[view]}</span>
              </button>
            )}
          </div>
        </header>
        <section className="content" aria-label={`${view} content`}>
          {children}
        </section>
      </main>
    </div>
  );
}
