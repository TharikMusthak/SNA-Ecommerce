# SNA API documentation guide

## Endpoint and versioning

Local base URL: `http://localhost:5000`. Stable commerce endpoints use `/api/v1`. Health is available at `/api/health`. Interactive documentation is available at `/api/docs` when `API_DOCS_ENABLED=true`; the raw OpenAPI document is `/api/docs/openapi.yaml`.

## Authentication and cookies

Customer and admin authentication use separate short-lived JWT access cookies and rotating refresh cookies. They are HTTP-only, `SameSite=Strict`, secure in production, and use `__Host-` names in production. JWTs are never stored in `localStorage`. Browser and API clients must send `credentials: 'include'` (Fetch) or `withCredentials: true` (Axios). Postman uses its cookie jar automatically.

```text
Browser → POST /api/v1/auth/login
Backend → validates credentials, creates access/refresh tokens, sets HTTP-only cookies
Browser → sends cookies automatically on protected requests
Backend → rotates the refresh token through /api/v1/auth/refresh-token
```

Admin login uses `POST /api/auth/login`; admin versioned resources are under `/api/v1/admin`. Mutating browser requests must come from an exact configured `FRONTEND_ORIGIN`. Provider webhooks bypass browser-origin checks and use provider signatures.

## Pagination, filtering, and sorting

Large list APIs accept `page` (minimum 1), `limit` (1–100), `search` (maximum 120 characters), `sort` (route whitelist), and `order` (`asc` or `desc`). Module-specific status, date, rating, customer, and product filters are documented in OpenAPI. Responses contain `data` and `pagination` with `page`, `limit`, `total`, `totalPages`, `hasNext`, and `hasPrevious`.

## Validation and common errors

Validation errors use HTTP 400 or 422 with `success:false`, a safe `message`, and optional field arrays in `errors`. Authentication is 401, authorization is 403, missing resources are 404, invalid state/idempotency conflicts are 409, throttling is 429, and disabled integrations are 503. Provider secrets, password hashes, refresh tokens, OTP hashes, and raw secret-bearing responses are never returned.

## Rate limiting, CORS, and CSRF posture

The API has a global rate limit and stricter authentication/OTP limits. Credentialed CORS accepts only `FRONTEND_ORIGIN`. SameSite cookies plus exact-origin checks protect state-changing browser requests. Deploy behind HTTPS and configure only a trusted reverse proxy.

## File uploads

Admin product and banner uploads accept JPG, PNG, or WEBP, maximum 5 MB per file. The server verifies MIME type, signature, extension, count, and resolved upload paths. Never trust a browser-provided filename or MIME type.

## COD checkout

Create an address, add available products to the cart, then call `POST /api/v1/orders/create` with `payment_method:"cod"` and a unique `Idempotency-Key` (8–190 characters). COD does not receive a reservation expiry and continues while online payments are disabled.

## Razorpay test-mode checkout

Create the internal order first with `POST /api/v1/orders/create`, using `payment_method:"razorpay"` and a unique `Idempotency-Key`. The server recalculates the cart total, reserves stock, and returns `payment_id`. Then call `POST /api/v1/payments/create-order` with `{ "payment_id": 123 }`. It returns `order_id`, `payment_id`, `razorpay_order_id`, `key_id`, `amount` (paise), and `currency`, which are the fields needed for Razorpay Checkout. The server saves the Razorpay order ID before responding and does not mark the order as paid.

Set `ONLINE_PAYMENTS_ENABLED=true`, `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID=rzp_test_...`, and `RAZORPAY_KEY_SECRET=...` only in the server environment. The secret is never returned. With the feature flag off, non-COD checkout and `/api/v1/payments` provider operations return HTTP 503 with `ONLINE_PAYMENTS_DISABLED`.

## Return and internal refund flow

Customers can return eligible quantities from paid delivered orders inside the 30-day window. Previously requested non-cancelled quantities are deducted. The state machine is `requested → approved → pickup_scheduled → picked_up → received → inspection_pending → inspection_passed|inspection_failed → refund_pending → partially_refunded|refunded → completed`, with rejection/cancellation only from permitted states. Invalid transitions return 409.

After inspection, Order Managers or Super Admins record a disposition for every accepted quantity: restocked, damaged, expired, quality rejected, or no-restock. Restocking is transactional and idempotent. Internal refund records support COD manual, bank transfer, UPI manual, store credit, and external-pending methods. The ledger cannot exceed inspected eligible value and does not claim a provider refund occurred.

## Order reservation expiry

`npm.cmd run orders:expire --prefix backend` runs a cron-safe pass. `npm.cmd run worker:orders --prefix backend` runs continuously and shuts down on SIGINT/SIGTERM. Only expired, pending, unpaid, non-COD reservations are selected. Row locks and `reservation_released_at` prevent double stock release.

## WATI notifications

Business modules queue normalized events; they do not call WATI inside order/return/refund transactions. `npm.cmd run notifications:process --prefix backend` processes queued deliveries. When `WATI_ENABLED=false`, events are recorded as skipped. Webhook URL: `POST /api/v1/webhooks/wati`; configure the shared HMAC secret and send the SHA-256 signature in `X-WATI-Signature`. Duplicate external event IDs are accepted idempotently.

## SMTP

Set `SMTP_ENABLED=true` only with the complete host, port, security, user, password, from name/email, and timeout configuration. Disabled SMTP records skipped delivery attempts without crashing APIs or exposing verification tokens in logs. Live delivery and bounce handling require external credentials and evidence.

## Postman

Import `docs/postman/SNA-Ecommerce.postman_collection.json` and `docs/postman/SNA-Local.postman_environment.json`, then select the **SNA Local — Synthetic Test Data** environment. The environment contains fake `example.invalid` identities, strong example-only passwords, test IDs, addresses, coupon values, and workflow variables. The registration request creates a unique synthetic customer email for every run, and successful create/list requests capture IDs for later requests.

Replace `adminEmail` and `adminPassword` with credentials for a dedicated local test administrator; the supplied values are deliberately non-production examples. Keep Postman's cookie jar enabled because access and refresh tokens are HTTP-only cookies. Run folders in numeric order, and run individual state transitions in valid business order. Seed at least one active in-stock product and create a delivered, paid fixture before review/return requests.

Do not run the complete collection against production: it includes create, update, delete, cancellation, restock, refund-record, and account-deletion examples. Deferred-payment requests are controlled negative feature-flag tests, not a live payment flow. WATI webhook examples require a valid test signature when webhook authentication is enabled.

## Verification and troubleshooting

Run `npm.cmd run docs:generate --prefix backend` after route changes and `npm.cmd run docs:verify --prefix backend` in CI. A 403 on a mutation usually means the request origin differs from `FRONTEND_ORIGIN`; a 401 means the relevant cookie expired; 409 indicates ownership, inventory, idempotency, amount, or state-machine conflict; 503 on payments is expected while deferred. Database readiness can be checked with `npm.cmd run db:verify --prefix backend`.
