

const roleMenus = {
  "Super Admin": [
    "Dashboard",
    "Products",
    "Categories",
    "Inventory",
    "Attributes",
    "Banners",
    "CMS Pages",
    "Orders",
    "Customers",
    "Reviews",
    "Returns",
    "Refund Records",
    "Support Tickets",
    "Coupons",
    "Notifications",
    "FAQ",
    "Users",
  ],
  "Product Manager": [
    "Dashboard",
    "Products",
    "Categories",
    "Inventory",
    "Attributes",
    "Banners",
    "CMS Pages",
    "Reviews",
    "Coupons",
    "FAQ",
  ],
  "Order Manager": ["Dashboard", "Orders", "Customers", "Returns", "Refund Records", "Support Tickets"],
};

export function getMenusForRole(role) {
  return roleMenus[role] || ["Dashboard"];
}

export const menuIcons = {
  Dashboard: "🏠",
  Products: "📦",
  Categories: "📁",
  Inventory: "🏬",
  Attributes: "⚙",
  Banners: "🖼",
  "CMS Pages": "📄",
  Orders: "🛒",
  FAQ: "❓",
  Users: "👥",
  Customers: "🧑",
  Reviews: "⭐",
  Returns: "↩️",
  "Refund Records": "💵",
  "Support Tickets": "🎫",
  Coupons: "🏷️",
  Notifications: "🔔",
};

export const addButtonLabels = {
  Products: "+ Add product",
  Categories: "+ Add category",
  Attributes: "+ Add variant",
  Banners: "+ Add banner",
  FAQ: "+ Add FAQ",
  Users: "+ Add admin user",
};
