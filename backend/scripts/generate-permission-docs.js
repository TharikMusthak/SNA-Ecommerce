import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRoutes } from "./lib/discover-routes.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const routes=discoverRoutes().filter(route=>route.path.startsWith("/api/v1/admin/")).sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
const rows=routes.map(route=>{const access=permission(route);return`| ${route.method.toUpperCase()} | \`${route.path}\` | ${access.auth} | \`${access.permission}\` | ${yes(access.roles,"Super Admin")} | ${yes(access.roles,"Product Manager")} | ${yes(access.roles,"Order Manager")} |`;});
const document=`# SNA admin route permission audit

Generated from registered Express routes. Backend middleware is authoritative; frontend menu visibility is not authorization. “Role-filtered” means the route is available to every admin but its response omits domains outside that role.

| Method | Route | Authentication | Enforced permission | Super Admin | Product Manager | Order Manager |
| --- | --- | --- | --- | ---: | ---: | ---: |
${rows.join("\n")}

Customer routes use a distinct JWT audience, cookie names, token type, database table, and \`requireCustomer\` middleware. Admin and customer sessions are not interchangeable. WATI and payment webhooks use provider authentication rather than an admin/customer cookie.
`;
fs.writeFileSync(path.join(root,"docs/ROUTE_PERMISSION_AUDIT.md"),document);
console.log(`Generated permission audit for ${routes.length} versioned admin routes.`);

function permission(route){const value=route.path;if(value==="/api/v1/admin/banners/public")return{auth:"Public",permission:"public",roles:[]};if(value.endsWith("/users/change-password"))return all("admin.account.change_password");if(value.includes("/users"))return only("admins.manage",["Super Admin"]);if(value.includes("/notifications")||value.includes("/audit-logs"))return only("operations.audit",["Super Admin"]);if(value.includes("/dashboard")){if(/\/(products|inventory)$/.test(value))return product("dashboard.products");return all("dashboard.role_filtered");}if(/\/(products|categories|inventory|banners|reviews|coupons)(\/|$)/.test(value))return product("catalog.manage");if(/\/(orders|customers|returns|refunds|tickets)(\/|$)/.test(value))return order("orders.manage");return only("admin.authenticated",["Super Admin"]);}
function all(permission){return only(permission,["Super Admin","Product Manager","Order Manager"]);}function product(permission){return only(permission,["Super Admin","Product Manager"]);}function order(permission){return only(permission,["Super Admin","Order Manager"]);}function only(permission,roles){return{auth:"Admin cookie",permission,roles};}function yes(roles,role){return roles.includes(role)?"Yes":"No";}
