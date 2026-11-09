# AgriLogiX — Frontend Prototype (React + Vite + Tailwind CSS)

AgriLogiX is a role-based agricultural supply chain platform connecting **Farmers**, **Customers/Buyers**, **Transporters** and **Storage Owners** in one farm-to-buyer workflow.

This repository is the **frontend prototype**. There is no backend: all data lives in a central mock data layer persisted in the browser's local storage. **Login, payments and shipment tracking are simulated** and do not provide real security, payment processing or GPS tracking.


---

## Tech stack
- React 19 + Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- React Router v7
- Lucide React icons
- No backend; mock API in `src/data/actions.js`, state in React context, persistence in `localStorage`

## Quick start
```bash
cd "c:\Study\IT\Sem 7\Major Project\agrilogix-web"
npm install
npm run dev        # web app (5173) + OTP mail server (5174)
```
Registration emails a 6-digit OTP before the account is created. Copy the `SMTP_*` lines from `.env.example` into `.env`
(for Gmail, use an App Password). Without SMTP settings the server prints the code in its console instead.
`npm run dev:web` starts only the web app, so registration cannot send codes.

Payments are explained in [docs/PAYMENTS.md](docs/PAYMENTS.md). Try them with `sagar@`/`arjun@` (customers with unpaid orders), `procurement@` (an order in escrow), `ramesh@` (farmer with a storage fee to pay), `lakshmi@` (farmer wallet and bank account), `karthik@` (transporter with a pending withdrawal) and `admin@` (open dispute and withdrawal to process). Test card `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined, and a UPI id ending `@fail` is declined.

Other scripts:
```bash
npm run build                       # production build into dist/
npm run lint                        # oxlint
node scripts/check-flows.mjs        # business-logic checks (orders, transport, storage, payments, integrity)
node scripts/smoke-render.mjs       # renders every route for every role and checks the access guards
```

## Demo accounts
Every account uses the password **`demo123`**. On the login page, pick a role tab and click a demo account to fill the form. You can also register new users of any role.

| Role | Name | Email |
| --- | --- | --- |
| Farmer | Ramesh Patil (Nashik) | ramesh@agrilogix.demo |
| Farmer | Gurpreet Singh (Ludhiana) | gurpreet@agrilogix.demo |
| Farmer | Lakshmi Reddy, Suresh Yadav, Anita Deshmukh, Mohan Das | lakshmi@ / suresh@ / anita@ / mohan@agrilogix.demo |
| Customer | Priya Menon (Bengaluru) | priya@agrilogix.demo |
| Customer | FreshKart Retail (Mumbai) | procurement@agrilogix.demo |
| Customer | Arjun Mehta, Hotel Sagar Group | arjun@ / sagar@agrilogix.demo |
| Transporter | Vikram Shinde (Shinde Logistics) | vikram@agrilogix.demo |
| Transporter | Harjit Kaur, Karthik Raj, Rahul Verma | harjit@ / karthik@ / rahul@agrilogix.demo |
| Storage Owner | Dinesh Kulkarni (Nashik) | dinesh@agrilogix.demo |
| Storage Owner | Baljit Sandhu, Neha Joshi | baljit@ / neha@agrilogix.demo |
| **Admin** | Platform Admin | **admin@agrilogix.demo** (choose the *Admin* tab on the login page) |

Accounts for trying the KYC and suspension features: `kavita@` (farmer, KYC under review), `rajesh@` (farmer, KYC rejected), `deepak@` (farmer, KYC not submitted), `greenleaf@` (customer, under review), `imran@` (transporter, under review), `meera@` (storage owner, under review) and `quickmart@` (customer, **suspended**: cannot log in). All end in `agrilogix.demo`.

The sidebar has **Reset demo data**, which restores the original seed data and logs you out.

## Routes

| Area | Path | Page |
| --- | --- | --- |
| Public | `/` | Landing page |
| Public | `/login`, `/register` | Role-based login and registration |
| Farmer | `/farmer` | Dashboard |
| | `/farmer/listings` | Create, edit, delete listings |
| | `/farmer/orders` | Orders and enquiries; accept, reject, reply, request transport |
| | `/farmer/storage` | **Storage portal**: post storage requests with your price, compare offers, choose a provider |
| | `/farmer/transport` | **Transport portal**: post transport requests with your price, compare offers, choose a transporter |
| | `/farmer/payments` | **Payments**: pay transporters and storage, wallet, withdrawals, disputes |
| | `/farmer/profile`, `/farmer/preview/:id` | Edit profile; preview public page |
| | `/farmer/track/:trackingId` | Shipment tracking |
| Customer | `/customer` | **Marketplace homepage** with listings, search, filters |
| | `/customer/farmers`, `/customer/farmers/:id` | Farmer directory and farmer profile with that farmer's listings |
| | `/customer/listings/:id` | Listing detail, place order, send enquiry |
| | `/customer/orders` | Orders, pay, confirm receipt, report a problem, receipts, enquiries |
| | `/customer/payments` | **Payments**: dues, transaction history, receipts, disputes |
| | `/customer/track/:trackingId` | Shipment tracking |
| Transporter | `/transport` | Dashboard |
| | `/transport/vehicles` | Add, edit, remove vehicles; availability |
| | `/transport/requests` | Open requests from farmers: accept the farmer's price or counter; track your responses |
| | `/transport/shipments` | Update shipment status |
| | `/transport/track/:trackingId` | Tracking page |
| Admin | `/admin` | Platform overview: key figures, items needing attention, charts, latest activity |
| | `/admin/analytics` | Marketplace, Transport and Storage analytics (charts with table views) |
| | `/admin/users` | All users: search, filter by role, KYC and account state; details; suspend or reactivate |
| | `/admin/kyc` | KYC queue: approve or reject with a reason |
| | `/admin/activity` | Activity log of orders, shipments, requests, bookings and account decisions |
| Storage Owner | `/storage` | Dashboard |
| | `/storage/facilities` | Add, edit, remove facilities; availability |
| | `/storage/requests` | Open requests from farmers: accept the farmer's price or counter; bookings and completion |

Each role area is guarded: a logged-out visitor is sent to `/login`, and a user opening another role's URL is redirected to their own dashboard.

## Admin portal and KYC

The **Admin** role (log in with the *Admin* tab) sees the whole platform:

- **Overview** and **Analytics** are calculated live from the same data the other roles use: users by role and KYC state, order value and payment collection, top farmers, produce and buyers, fleet and shipment status, storage utilisation per facility, and how transport and storage requests turn into deals (responses per request, share who accept the farmer's price, counter-offer premium). Every chart has a *Table* switch.
- **Users** lists every account with search and filters. A detail view shows contact details, role-specific activity (orders, listings, vehicles, bookings), KYC state and history. The admin can **suspend** an account with a reason (the user is signed out at once, cannot log in, and a suspended farmer's listings are hidden from buyers) and reactivate it later.
- **KYC reviews** is the queue of submissions from all four roles. The admin approves, or rejects with a reason. Farmers submit documents from *My Profile* (or at registration); customers, transporters and storage owners submit their details as text. Every non-verified user sees a banner with their state; a rejected user sees the admin's reason and can resubmit. Approved users get a **Verified** mark.
- **Activity log** shows every event with search and type filter.

## How transport and storage booking works (bidding)

Transport and storage are negotiated, not booked directly:

1. **Farmer posts a request** in the Transport portal (for an accepted order: route, load, date, vehicle needed) or the Storage portal (quantity, days, start date, city, type) and names **their price**: a total in ₹ for a trip, or ₹ per tonne per day for storage. A **Recommended price** card (with a *Use this price* button) helps farmers who do not know what to offer: transport is estimated from approximate distance and listed per-km rates, storage from the listed prices of matching facilities in the city or state.
2. **Providers see the request** on their Open Requests screen, with the farmer's name, location and price. They respond with a vehicle or facility, and either **accept the farmer's price** or **suggest their own** (plus delivery days and a message).
3. **Farmer compares the responses** (cheapest is marked, each shows the difference from the farmer's offer, provider location, vehicle or facility details) and **selects one**. All other responses are declined.
4. **Farmer can change the price** of an open request at any time. Providers who had accepted the old price must re-confirm (their response shows as *Outdated* until they do); counter offers stay. The farmer can also cancel the request.
5. **On selection:** transport creates a shipment with the agreed price and a tracking ID and puts the vehicle on trip; storage reserves the capacity and links the farmer's listing to that facility, so buyers see it. The provider's phone number is released to the farmer (and the farmer's to the provider) only after selection.

Sidebar badges show what needs attention: new offers for farmers, requests not yet answered for providers.

## Project structure
```
src/
  data/
    seed.js          centralised seed data (users, listings, storage, vehicles, orders, ...)
    actions.js       mock API: every state change goes through here (orders, bids, bookings, shipments)
    integrity.js     referential-integrity checks
  context/           ToastContext, DataContext (db + persistence), AuthContext (session)
  components/        shared UI (common.jsx), request modals, landing sections, login/register forms
  layouts/AppLayout  shared navbar, role sidebar, footer and route guard
  pages/             farmer/, customer/, transport/, storage/, TrackingPage
  AppRoutes.jsx      all routes;  App.jsx  providers + router
scripts/             check-flows.mjs, smoke-render.mjs, mongo/ (schema + seed)
docs/                PAYMENTS.md
```

## What is simulated
- **Authentication:** credentials are checked against the mock user table; the session is a user id in local storage. Passwords are stored in plain text in local storage. This is not secure and is for demonstration only.
- **Payment gateway:** checkout, escrow, fees, receipts, refunds, disputes, wallets and withdrawals are all built (see [docs/PAYMENTS.md](docs/PAYMENTS.md)), but the gateway behind them is a simulator in `src/lib/gateway.js`. No money moves. Connecting a real gateway means replacing that one file plus a server-side webhook.
- **Tracking:** the tracking page shows stored shipment data and a placeholder map. No GPS or live location.
- **Document uploads at registration:** accepted in the form but not stored or verified.
- **Planned, not built:** bulk-order quotes, invoice download, market price feed, QR/blockchain traceability, SMS/push notifications, analytics beyond dashboard counts, administrator role.

## MongoDB Atlas database

The demo data can be loaded into a MongoDB Atlas cluster. The app itself still runs on the mock API; this is the database the future backend will use. Collections and fields match the mock API, with the prototype ids (`F1`, `L101`, `TQ4001`) kept as `_id`, and passwords stored as scrypt hashes (not plain text).

1. In Atlas: create a free (M0) cluster, a database user (Database Access) and allow your IP (Network Access).
2. Copy `.env.example` to `.env` and paste your connection string into `MONGODB_URI`. `.env` is git-ignored.
3. `npm run db:seed:dry` checks and converts the data without connecting. `npm run db:seed` creates 13 collections with validators and indexes and loads the data. Re-running replaces the demo data.

Files: `scripts/mongo/schema.mjs` (validators, indexes), `scripts/mongo/seed.mjs` (loader).
