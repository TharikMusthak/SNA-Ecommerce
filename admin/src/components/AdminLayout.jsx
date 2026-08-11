import { useState } from "react";
import {
  addButtonLabels,
  getMenusForRole,
  menuIcons,
} from "../constants/navigation";
import myLogo from "../assets/SNA Logo.svg";

export default function AdminLayout({
  admin,
  view,
  onViewChange,
  onLogout,
  onAdd,
  children,
}) {
  const menus = getMenusForRole(admin?.role);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <img className="brand-logo" src={myLogo} alt="SNA Logo" />
        </div>

        <nav aria-label="CMS sections">
          {menus.map((menu) => (
            <button
              type="button"
              className={view === menu ? "active" : ""}
              onClick={() => onViewChange(menu)}
              key={menu}
              aria-current={view === menu ? "page" : undefined}
            >
              <i aria-hidden="true">{menuIcons[menu] || "•"}</i>
              {menu}
            </button>
          ))}
        </nav>

        <div className="account">
          {showLogoutMenu && (
            <div className="account-dropdown" role="menu">
              <button type="button" onClick={onLogout} role="menuitem">
                <i
                  className="fas fa-sign-out-alt"
                  aria-hidden="true"
                ></i>{" "}
                Logout
              </button>
            </div>
          )}

          <button
            type="button"
            className="account-profile"
            onClick={() => setShowLogoutMenu((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={showLogoutMenu}
            aria-label="Open account menu"
          >
            <span className="account-avatar">
              {admin?.name?.[0] || "A"}
            </span>
            <span className="account-details">
              <b>{admin?.name || "Admin"}</b>
              <small>{admin?.role || "Administrator"}</small>
            </span>
            <i
              aria-hidden="true"
              className={`fas fa-chevron-up account-arrow ${
                showLogoutMenu ? "account-arrow-open" : ""
              }`}
            ></i>
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <small>SNA WORKSPACE</small>
            <h1>{view}</h1>
          </div>
          {addButtonLabels[view] && (
            <button type="button" onClick={onAdd}>
              {addButtonLabels[view]}
            </button>
          )}
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
