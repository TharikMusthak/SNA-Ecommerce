const roleMenus = {
  "Super Admin": [
    "Dashboard",
    "Products",
    "Categories",
    "Inventory",
    "Attributes",
    "Banners",
    "Reviews",
    "Coupons",
    "Orders",
    "Dispatch",
    "Order Status Labels",
    "Returns",
    "Refund Records",
    "Customers",
    "Support Tickets",
    "Notifications",
    "CMS Pages",
    "FAQ",
    "Shipping Settings",
    "Users",
  ],
  "Product Manager": [
    "Dashboard",
    "Products",
    "Categories",
    "Inventory",
    "Attributes",
    "Banners",
    "Reviews",
    "Coupons",
    "CMS Pages",
    "FAQ",
  ],
  "Order Manager": [
    "Dashboard",
    "Orders",
    "Dispatch",
    "Order Status Labels",
    "Returns",
    "Refund Records",
    "Customers",
    "Support Tickets",
    "Shipping Settings",
  ],
};

export const menuGroups = [
  { label: "Overview", items: ["Dashboard"] },
  {
    label: "Commerce",
    items: [
      "Products",
      "Categories",
      "Inventory",
      "Attributes",
      "Banners",
      "Reviews",
      "Coupons",
    ],
  },
  {
    label: "Orders",
    items: ["Orders", "Dispatch", "Order Status Labels", "Returns", "Refund Records"],
  },
  {
    label: "Customers",
    items: ["Customers", "Support Tickets", "Notifications"],
  },
  { label: "Content", items: ["CMS Pages", "FAQ"] },
  { label: "System", items: ["Shipping Settings", "Users"] },
];

export function getMenusForRole(role) {
  return roleMenus[role] || ["Dashboard"];
}

export function getGroupForView(view) {
  return menuGroups.find((group) => group.items.includes(view))?.label || "Overview";
}

export function viewToHash(view) {
  return `#/${String(view || "Dashboard")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")}`;
}

export function viewFromHash(hash = window.location.hash) {
  const route = String(hash).replace(/^#\/?/, "");
  if (!route) return "Dashboard";
  return (
    Object.values(roleMenus)
      .flat()
      .find((view) => viewToHash(view) === `#/${route}`) || "Dashboard"
  );
}

export const addButtonLabels = {
  Products: "Add product",
  Categories: "Add category",
  Attributes: "Add variant",
  Banners: "Add banner",
  FAQ: "Add FAQ",
  Users: "Add admin user",
};
