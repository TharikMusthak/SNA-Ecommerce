# SNA role and permission matrix

The backend middleware is the authorization authority. Customer authentication and provider webhooks are separate security domains.

| Capability | Super Admin | Product Manager | Order Manager |
| --- | --- | --- | --- |
| Role-filtered dashboard | Yes | Product/inventory data | Order data |
| Products, categories, inventory, banners | Manage | Manage | No access |
| Reviews and coupons | Manage | Manage | No access |
| Orders and customers | Manage | No access | Manage |
| Returns, inspections, dispositions, internal refunds | Manage | No access | Manage |
| Support tickets and replies | Manage | No access | Manage |
| Notification delivery log and audit log | Manage | No access | No access |
| Administrators and roles | Manage | No access | No access |
| Own admin password | Change | Change | Change |
| Customer APIs | Separate customer session | Separate customer session | Separate customer session |

The detailed method/path matrix is generated in `docs/ROUTE_PERMISSION_AUDIT.md` and is verified against the mounted versioned routes.
