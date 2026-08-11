# SNA Live Deployment

## Production URLs

- Customer storefront: `https://sna.hinttechnologies.com/`
- Admin frontend: `https://hinttechnologies.com/sna/admin/`
- Backend application URL: `https://hinttechnologies.com/sna-api`
- Health check: `https://hinttechnologies.com/sna-api/api/health`

The admin production build is configured for `/sna/admin/`. Its compiled API URL is `https://hinttechnologies.com/sna-api`.

## Customer storefront deployment

1. Run `npm.cmd run build --prefix frontend`.
2. Back up the current storefront files.
3. Upload the **contents** of `frontend/dist/` into the storefront document root.
4. Confirm that the generated `.htaccess` file was uploaded; file managers may hide dotfiles.
5. Do not upload `frontend/.env` or source maps.

## Admin frontend deployment

1. Run `npm.cmd run build --prefix admin`.
2. Back up the current live admin files.
3. Upload the **contents** of `admin/dist/` into `public_html/sna/admin/`.
4. Confirm that `public_html/sna/admin/.htaccess` was uploaded; file managers may hide dotfiles.
5. Do not upload `admin/.env` or source maps.

The `.htaccess` file preserves real assets and sends direct SPA paths, including password-reset links, to `index.html`.

## Backend deployment

Back up the live database, `backend/.env`, and uploaded files before replacing application code.

The Node application root must contain the contents of `backend/`, with `src/server.js` configured as the startup file and `/sna-api` configured as the application URL. Do not upload the local `.env`, `node_modules`, test database, or local uploads.

Install and migrate on the server:

```bash
npm install --omit=dev
npm run db:migrate
npm run db:verify
npm run docs:verify
```

Restart the Node application after the commands pass.

## Required backend production environment

```env
NODE_ENV=production
FRONTEND_ORIGIN=https://hinttechnologies.com,https://sna.hinttechnologies.com
ADMIN_RESET_URL=https://hinttechnologies.com/sna/admin/reset-password
CUSTOMER_RESET_URL=https://sna.hinttechnologies.com/reset-password
CUSTOMER_VERIFY_URL=https://sna.hinttechnologies.com/verify-email
TRUST_PROXY=1
DB_HOST=localhost
DB_PORT=3306
DB_USER=NON_ROOT_DATABASE_USER
DB_PASSWORD=STRONG_DATABASE_PASSWORD
DB_NAME=sna_cms
JWT_SECRET=AT_LEAST_64_RANDOM_CHARACTERS
ONLINE_PAYMENTS_ENABLED=false
PAYMENT_PROVIDER=cod
API_DOCS_ENABLED=false
WATI_ENABLED=false
SMTP_ENABLED=false
```

Use the hosting platform's assigned `PORT`; do not expose the Node port directly. Enable SMTP or WATI only after their complete production credentials have been configured.

`FRONTEND_ORIGIN` is an origin and therefore must not include `/sna/admin/`.

## Post-deployment verification

1. `GET https://hinttechnologies.com/sna-api/api/health` returns the new database-aware health response.
2. `https://hinttechnologies.com/sna/admin/` loads its JS and CSS from `/sna/admin/assets/`.
3. Login preflight includes `Access-Control-Allow-Origin: https://hinttechnologies.com` and `Access-Control-Allow-Credentials: true`.
4. Admin login, logout, refresh, and a protected list request succeed.
5. A direct request to `/sna/admin/reset-password?token=invalid` renders the admin application rather than a server 404.
6. Online-payment routes return `503 ONLINE_PAYMENTS_DISABLED`; COD remains available.

If any check fails, restore the backed-up storefront/admin files and backend application code. Database migrations are additive and should not be manually reversed without a reviewed rollback script.
