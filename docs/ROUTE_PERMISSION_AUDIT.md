# SNA admin route permission audit

Generated from registered Express routes. Backend middleware is authoritative; frontend menu visibility is not authorization. “Role-filtered” means the route is available to every admin but its response omits domains outside that role.

| Method | Route | Authentication | Enforced permission | Super Admin | Product Manager | Order Manager |
| --- | --- | --- | --- | ---: | ---: | ---: |
| GET | `/api/v1/admin/audit-logs` | Admin cookie | `operations.audit` | Yes | No | No |
| GET | `/api/v1/admin/banners` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| POST | `/api/v1/admin/banners` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| DELETE | `/api/v1/admin/banners/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/banners/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/banners/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/banners/{id}/status` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/banners/public` | Public | `public` | No | No | No |
| GET | `/api/v1/admin/categories` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| POST | `/api/v1/admin/categories` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| DELETE | `/api/v1/admin/categories/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/categories/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/categories/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/categories/{id}/status` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/coupons` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| POST | `/api/v1/admin/coupons` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| DELETE | `/api/v1/admin/coupons/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/coupons/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/coupons/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/coupons/{id}/status` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/customers` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/customers/{id}` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/customers/{id}/status` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/dashboard/inventory` | Admin cookie | `dashboard.products` | Yes | Yes | No |
| GET | `/api/v1/admin/dashboard/products` | Admin cookie | `dashboard.products` | Yes | Yes | No |
| GET | `/api/v1/admin/dashboard/recent-activities` | Admin cookie | `dashboard.role_filtered` | Yes | Yes | Yes |
| GET | `/api/v1/admin/dashboard/summary` | Admin cookie | `dashboard.role_filtered` | Yes | Yes | Yes |
| GET | `/api/v1/admin/inventory` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| POST | `/api/v1/admin/inventory/{productId}/restock` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/inventory/{productId}/stock` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/inventory/history` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/inventory/low-stock` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/notifications` | Admin cookie | `operations.audit` | Yes | No | No |
| GET | `/api/v1/admin/orders` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/orders/{id}` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/products` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| POST | `/api/v1/admin/products` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| DELETE | `/api/v1/admin/products/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/products/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/products/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/products/{id}/images` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| POST | `/api/v1/admin/products/{id}/images` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/products/{id}/status` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| DELETE | `/api/v1/admin/products/{productId}/images/{imageId}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/products/{productId}/images/{imageId}/primary` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/refunds` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/refunds/{id}` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/refunds/{id}/status` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/returns` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/returns/{id}` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/returns/{id}/approve` | Admin cookie | `orders.manage` | Yes | No | Yes |
| POST | `/api/v1/admin/returns/{id}/inspection` | Admin cookie | `orders.manage` | Yes | No | Yes |
| POST | `/api/v1/admin/returns/{id}/refund-record` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/returns/{id}/reject` | Admin cookie | `orders.manage` | Yes | No | Yes |
| POST | `/api/v1/admin/returns/{id}/restock` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/returns/{id}/status` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/reviews` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| DELETE | `/api/v1/admin/reviews/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/reviews/{id}` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| PUT | `/api/v1/admin/reviews/{id}/status` | Admin cookie | `catalog.manage` | Yes | Yes | No |
| GET | `/api/v1/admin/tickets` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/tickets/{id}` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/tickets/{id}/assign` | Admin cookie | `orders.manage` | Yes | No | Yes |
| POST | `/api/v1/admin/tickets/{id}/messages` | Admin cookie | `orders.manage` | Yes | No | Yes |
| PUT | `/api/v1/admin/tickets/{id}/status` | Admin cookie | `orders.manage` | Yes | No | Yes |
| GET | `/api/v1/admin/users` | Admin cookie | `admins.manage` | Yes | No | No |
| POST | `/api/v1/admin/users` | Admin cookie | `admins.manage` | Yes | No | No |
| DELETE | `/api/v1/admin/users/{id}` | Admin cookie | `admins.manage` | Yes | No | No |
| GET | `/api/v1/admin/users/{id}` | Admin cookie | `admins.manage` | Yes | No | No |
| PUT | `/api/v1/admin/users/{id}` | Admin cookie | `admins.manage` | Yes | No | No |
| PUT | `/api/v1/admin/users/{id}/status` | Admin cookie | `admins.manage` | Yes | No | No |
| PUT | `/api/v1/admin/users/change-password` | Admin cookie | `admin.account.change_password` | Yes | Yes | Yes |

Customer routes use a distinct JWT audience, cookie names, token type, database table, and `requireCustomer` middleware. Admin and customer sessions are not interchangeable. WATI and payment webhooks use provider authentication rather than an admin/customer cookie.
