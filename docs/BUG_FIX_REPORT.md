# SNA Bug Fix Report

This audit records issue groups rather than counting every affected line as a separate bug.

## Audit status

- Total issue groups found: 24
- Fixed: 22
- Remaining or externally blocked: 2
- Critical: 4
- High: 13
- Medium: 7
- Low: 0

## Bug 1 — Migration parser split SQL inside strings and procedures

- Status: Fixed
- Severity: Critical
- Module: Database migrations
- Reproduction: The original parser split only on line endings and could mis-handle semicolons in quoted content or stored routines.
- Root cause: It did not track quote, comment, or delimiter state.
- Files changed: `backend/src/utils/sqlMigrationParser.js`, `backend/scripts/migrate.js`
- Fix: Added a quote/comment-aware parser and exact migration/statement failure reporting.
- Regression test: Migration containing quoted semicolons and a custom-delimiter procedure.
- Verification: Backend test suite passes.

## Bug 2 — E-commerce schema lacked intended constraints

- Status: Fixed
- Severity: High
- Module: MySQL schema
- Reproduction: Products had no unique slug/SKU index, orders lacked customer/address foreign keys and checkout idempotency, and nullable variant IDs allowed duplicate cart identities.
- Root cause: The first additive migration created columns without all relational guarantees.
- Files changed: `backend/database/migrations/002_stabilization_constraints.sql`
- Fix: Added idempotent columns, generated variant identity, deduplication, unique indexes, public-product index, and foreign keys.
- Regression test: Fresh `sna_cms_test` schema plus both migrations.
- Verification: Migration applied to development and test databases; database verifier confirms indexes and constraints.

## Bug 3 — No safe database verification or isolated integration setup

- Status: Fixed
- Severity: High
- Module: Database/QA
- Reproduction: Passing unit tests did not prove migrations or runtime queries worked, and integration testing risked development data.
- Root cause: No schema verifier or guarded test-database bootstrap existed.
- Files changed: `backend/scripts/verify-database.js`, `backend/scripts/setup-test-database.js`, `backend/package.json`
- Fix: Added guarded `_test` database creation, migration history/index/FK verification, and cleanup-safe integration fixtures.
- Regression test: `backend/test/ecommerce.integration.test.js`.
- Verification: MariaDB 10.4 reports 40 InnoDB tables, two migrations, and utf8mb4.

## Bug 4 — Production customer refresh cookie was rejected by browsers

- Status: Fixed
- Severity: Critical
- Module: Customer authentication
- Reproduction: The cookie used a `__Host-` name with `Path=/api/v1/auth`.
- Root cause: `__Host-` cookies require `Path=/`.
- Files changed: `backend/src/config/env.js`
- Fix: Customer refresh cookies now use the required root path while retaining HttpOnly, Secure-in-production, and SameSite=Strict.
- Regression test: Cookie invariant test.
- Verification: Backend tests pass.

## Bug 5 — Checkout retries could create duplicate orders

- Status: Fixed
- Severity: Critical
- Module: Checkout/orders
- Reproduction: A repeated request without a recoverable prior result reached a new random order code.
- Root cause: Idempotency existed only on the payment insert at the end of the transaction.
- Files changed: `backend/src/routes/v1/orders.js`, migration 002
- Fix: Require an 8–190 character `Idempotency-Key`, persist it on the order, lock/check before checkout, and return the original order on replay or a uniqueness race.
- Regression test: Same checkout request sent twice; the second returns the original order.
- Verification: Isolated lifecycle test passes.

## Bug 6 — Coupons were not safely revalidated during checkout

- Status: Fixed
- Severity: High
- Module: Cart/coupons
- Reproduction: Checkout trusted the cart's prior coupon state and could miss usage-limit or first-order changes.
- Root cause: Full coupon validation happened only when the coupon was initially applied.
- Files changed: `backend/src/services/cart.js`, `backend/src/routes/v1/orders.js`
- Fix: Revalidate dates, minimum, total/user limits and first-order rules under the checkout transaction and coupon row lock; reject stale coupons.
- Regression test: Covered by transactional cart/checkout integration flow.
- Verification: Backend tests pass.

## Bug 7 — Razorpay webhook could become permanently half-processed

- Status: Fixed
- Severity: Critical
- Module: Payments
- Reproduction: The event row was inserted before order/payment updates without one transaction; a later failure made retries look like duplicates.
- Root cause: Idempotency marker and business updates were not atomic.
- Files changed: `backend/src/routes/v1/payments.js`
- Fix: Require exact raw body, verify signature, lock the payment, validate amount/currency, insert event and update payment/order/history in one transaction, and handle failures atomically.
- Regression test: Exact raw-payload and tampered-signature tests.
- Verification: Signature tests pass; live provider calls remain externally blocked.

## Bug 8 — Frontend payment signature was treated as captured funds

- Status: Fixed
- Severity: High
- Module: Payments
- Reproduction: `/payments/verify` immediately marked the order paid after client-supplied checkout fields passed signature validation.
- Root cause: Authorization and provider capture were conflated.
- Files changed: `backend/src/routes/v1/payments.js`
- Fix: Checkout verification now records `authorized`; only the signed provider webhook marks payment/order paid. Failed webhooks release reserved stock once.
- Regression test: Signature verification and idempotent lifecycle tests.
- Verification: Backend tests pass.

## Bug 9 — OTP verification was replayable under concurrency

- Status: Fixed
- Severity: High
- Module: Authentication/OTP
- Reproduction: Select and mark-used were separate autocommit statements using normal string comparison.
- Root cause: Missing row lock/transaction and non-constant-time hash comparison.
- Files changed: `backend/src/routes/v1/auth.js`, `backend/src/services/email.js`
- Fix: Validate destination/format, avoid storing OTPs for unknown users, invalidate older OTPs, lock and consume atomically, limit attempts, compare hashes in constant time, and email configured recipients.
- Regression test: OTP succeeds once and replay fails.
- Verification: Integration test passes.

## Bug 10 — Customer recovery emails were never delivered

- Status: Fixed
- Severity: High
- Module: Authentication/email
- Reproduction: Customer verification/reset tokens were stored but no customer email service was called; the older admin service logged reset URLs in development.
- Root cause: Upgrade routes were not integrated with the mail service.
- Files changed: `backend/src/services/email.js`, `backend/src/routes/v1/auth.js`, `backend/src/config/env.js`, `.env.example`
- Fix: Added customer verification/reset/OTP mail functions, removed token logging, and fail-fast production SMTP validation.
- Regression test: Development token flows execute without SMTP; production requirements are validated at startup.
- Verification: API integration passes; live SMTP remains externally unverified.

## Bug 11 — Equivalent Indian phone formats bypassed uniqueness

- Status: Fixed
- Severity: Medium
- Module: Validation/authentication
- Reproduction: `+919876543210` and `9876543210` could be stored as distinct values.
- Root cause: Validation accepted both formats without canonicalization.
- Files changed: `backend/src/validators/customer.js`, `backend/src/routes/v1/auth.js`
- Fix: Canonicalize Indian numbers to ten digits for registration, profile/address storage and login.
- Regression test: Integration registers with `+91` and authenticates successfully.
- Verification: Integration suite passes.

## Bug 12 — New admin commerce pages crashed on navigation

- Status: Fixed
- Severity: High
- Module: React admin UI
- Reproduction: Opening Customers passed `columns`/`rows` to `DataTable`, which requires `headers` and row children; `headers.length` crashed.
- Root cause: Component contract mismatch introduced during the upgrade.
- Files changed: `admin/src/pages/CommerceList.jsx`
- Fix: Render proper headers, rows, keys and empty states using the established component contract.
- Regression test: Browser login and Customers navigation.
- Verification: Page renders “No customers found” with no browser console errors.

## Bug 13 — Admin role navigation did not match backend grants

- Status: Fixed
- Severity: Medium
- Module: Frontend authorization UX
- Reproduction: Product Managers were allowed review/coupon APIs but could not navigate to them; new menu icons rendered blank.
- Root cause: Navigation mapping was not updated with the backend permission expansion.
- Files changed: `admin/src/constants/navigation.js`, `admin/src/components/AdminLayout.jsx`, role/route documentation
- Fix: Added allowed menus and a safe icon fallback. Backend remains authoritative.
- Regression test: Order Manager API denial and Super Admin browser navigation.
- Verification: Integration and browser smoke tests pass.

## Bug 14 — Product slugs and public visibility rules were incomplete

- Status: Fixed
- Severity: High
- Module: Products/catalog
- Reproduction: New admin products could have no slug; future products and products under inactive categories/brands could appear publicly; bestsellers returned newest products.
- Root cause: Legacy CRUD was not synchronized with new catalog columns and filters.
- Files changed: `backend/src/routes/products.js`, `backend/src/routes/v1/catalog.js`, migration 002
- Fix: Generate collision-safe slugs, enforce unique indexes, filter publish/category/brand status, and calculate bestsellers from paid delivered order items.
- Regression test: Admin creates a product and retrieves it through its public slug.
- Verification: Integration suite passes.

## Bug 15 — Legacy order stages and e-commerce status diverged

- Status: Fixed
- Severity: High
- Module: Admin orders/inventory
- Reproduction: Admin stage changes updated only `stage`, so tracking, reviews, returns, COD payment state, and inventory restoration disagreed.
- Root cause: The legacy UI and new lifecycle fields were not synchronized.
- Files changed: `backend/src/routes/cms.js`, `admin/src/pages/Orders.jsx`
- Fix: Map named stages to lifecycle statuses in a transaction, record history, mark delivered COD paid, restore stock on first cancellation, and block terminal-state reversal.
- Regression test: Lifecycle integration plus transaction queries.
- Verification: Tests pass.

## Bug 16 — Return eligibility used order creation time and allowed unsafe inputs

- Status: Fixed
- Severity: High
- Module: Returns
- Reproduction: The return window started at order creation, unpaid orders could qualify, duplicate item IDs were accepted until SQL failure, and refund total lacked an order cap.
- Root cause: Eligibility did not use delivery/payment history.
- Files changed: `backend/src/routes/v1/returns.js`
- Fix: Require paid/delivered ownership, use delivered history timestamp, reject duplicate/invalid quantities, and cap eligible value at paid order amount inside one transaction.
- Regression test: Paid delivered partial-item return in isolated integration flow.
- Verification: Integration suite passes.

## Bug 17 — Upload UI advertised files the backend rejects

- Status: Fixed
- Severity: Medium
- Module: React uploads
- Reproduction: The form advertised GIF and 8 MB while backend security accepts only JPG/PNG/WebP up to 5 MB.
- Root cause: Frontend help text and accept list were stale.
- Files changed: `admin/src/components/ImagePreviewField.jsx`
- Fix: Align accepted MIME types and size guidance; remove stale state-reset effect.
- Regression test: Frontend lint/build.
- Verification: Build passes.

## Bug 18 — Operational stability and reporting defects

- Status: Fixed
- Severity: Medium
- Module: API client, dashboard, tooling, docs
- Reproduction: Cancelled/failed orders inflated revenue; network failures surfaced as “Failed to fetch”; customer logout-equivalent operations left cookies; `/api/v1` and the advertised docs URL returned 404; frontend had no real lint command; an unused root React dependency was installed.
- Root cause: Upgrade plumbing was incomplete.
- Files changed: dashboard query, frontend API client, customer user routes, `app.js`, dependency manifests, ESLint configuration, docs.
- Fix: Correct revenue rules, request timeout/error normalization, cookie clearing, API discovery/docs serving, actual frontend linting, dependency cleanup, centralized environment validation, UTC DB sessions, and route permission audit.
- Regression test: Full lint/test/build/audit plus browser/API smoke checks.
- Verification: All local checks pass.

## Unresolved 1 — Live online-payment provider certification

- Status: External configuration required
- Severity: High
- Module: Payments/refunds
- Evidence: Online payments are deliberately disabled with `ONLINE_PAYMENTS_ENABLED=false`; no live provider credentials or test account are configured.
- Risk: Provider creation, capture, webhooks, and refunds are not certified. COD remains operational.

## Follow-up 19 — Abandoned online-payment reservation expiry

- Status: Fixed
- Severity: High
- Module: Inventory/jobs
- Evidence: A one-shot command and graceful continuous worker now claim expired reservations with row locks, release inventory exactly once, and record order, inventory, and audit history.
- Verification: Concurrent execution, exclusions, rollback, and duplicate-release tests pass.

## Follow-up 20 — Full admin refund/restock workflow

- Status: Fixed
- Severity: High
- Module: Returns/refunds
- Evidence: The admin workflow now includes inspections, selected/all/no-restock dispositions, transactional inventory history, internal refund records, amount reconciliation, audit logs, and idempotency.
- Verification: Return, restock, partial/full refund, excess amount, state transition, and permission tests pass. Provider execution remains explicitly deferred.

## Unresolved 2 — Live SMTP and WATI delivery

- Status: External configuration required
- Severity: Medium
- Module: Notifications
- Evidence: Real SMTP and WATI credentials are not configured locally.
- Risk: Disabled, queue, timeout, retry, webhook, and failure paths are verified, but real delivery/read/bounce behavior requires provider evidence.

## Follow-up 21 — Commerce admin UI mutation controls and pagination

- Status: Fixed
- Severity: Medium
- Module: React admin UI
- Evidence: Newer commerce pages now expose applicable details, moderation/mutation controls, reusable dialogs, loading/error/empty states, validated filters, sorting, and server-side pagination.
- Verification: Frontend lint/build and live admin browser smoke pass.

## Follow-up 22 — Exhaustive API and permission documentation

- Status: Fixed
- Severity: Medium
- Module: OpenAPI/Postman documentation
- Evidence: The generated OpenAPI contract and Postman collection each cover all 169 registered API operations; the versioned admin permission audit covers all 72 enforced admin routes.
- Verification: Documentation generation, structural validation, exact route/method comparison, and Postman parse/coverage checks pass.

## Verification summary

- Dependencies installed: Passed
- Backend tests: 26/26 passed
- Database migration: 001 through 005 applied to development and fresh test database
- Database verification: Passed
- Browser smoke: Admin login/dashboard, commerce controls, notifications/refunds navigation, and Swagger UI passed
- OpenAPI structural validation: Passed
- OpenAPI/Postman route coverage: Exhaustive — 169/169 registered operations
- External SMTP/WATI/online payments: Not configured; not claimed as live-verified
