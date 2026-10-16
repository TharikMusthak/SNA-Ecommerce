# SNA E-commerce

SNA customer storefront, administration dashboard, Express API, MySQL schema,
tests, and deployment documentation are kept in one clean project.

## Project structure

```text
SNA-Ecommerce/
├── frontend/   Customer-facing React + Vite website
├── admin/      React + Vite administration dashboard
├── backend/    Node.js + Express API, tests, migrations, and uploads
├── docs/       API, roles, Postman, fixes, and deployment notes
├── scripts/    Release packaging helper
├── package.json
└── README.md
```

Do not move the admin source into `frontend/`. It is a separate application;
only its production build is deployed under the `/sna/admin/` URL path.

## Local setup

Requirements: Node.js 20 or newer and MySQL 8 or newer.

```powershell
npm install
npm run install:all
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item admin\.env.example admin\.env
```

Generate a JWT secret and paste it into `backend/.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update the database values in `backend/.env`, import
`backend/database/sna_cms.sql`, and then run:

```powershell
npm run dev
```

Local services:

| Service | URL |
| --- | --- |
| Customer website | `http://localhost:5173/` |
| Admin dashboard | `http://localhost:5174/sna/admin/` |
| Backend API | `http://localhost:5000/api/` |
| Health check | `http://localhost:5000/api/health` |

The backend accepts both local frontend origins. Never commit real `.env`
files, database passwords, SMTP credentials, JWT secrets, or payment keys.

## Useful commands

```powershell
npm run dev
npm run build
npm run lint
npm test
npm run verify
npm run db:migrate
npm run db:verify
npm run create-admin
```

Backend integration tests require a disposable MySQL database named
`sna_cms_test` by default. Configure `TEST_DB_NAME` only with a database whose
name ends in `_test`, run `npm run db:test:setup --prefix backend`, and then run
`npm test`. Do not point the integration tests at the live database.

## Production layout

| Source | Build/output | Live location |
| --- | --- | --- |
| `frontend/` | `frontend/dist/` | `https://sna.hinttechnologies.com/` or the chosen storefront root |
| `admin/` | `admin/dist/` | `https://hinttechnologies.com/sna/admin/` |
| `backend/` | Node/Passenger app | `https://hinttechnologies.com/sna-api/` |

Build both web applications with `npm run build`. Upload the **contents** of
each `dist` directory to its matching document root. Backend deployment details
and environment settings are documented in `docs/LIVE_DEPLOYMENT.md`.
