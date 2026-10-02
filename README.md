# Mitho

**Mitho** is a food delivery web application for Kathmandu-style ordering: customers browse kitchens and place orders; restaurants manage menus and order tickets. The UI is plain HTML, CSS, and JavaScript. The backend is Node.js + Express with MongoDB (Mongoose).

One shared order moves from the customer tray → kitchen → ready (pickup or delivery). Payments, notifications, and reviews sit on that same order.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & run](#installation--run)
- [MongoDB setup](#mongodb-setup)
- [Demo accounts](#demo-accounts)
- [Roles & order flow](#roles--order-flow)
- [Data models](#data-models)
- [API overview](#api-overview)
- [Frontend routes](#frontend-routes)
- [Configuration](#configuration)
- [Design](#design)
- [License](#license)

---

## Features

### Customer

- Browse kitchens (search, cuisine filter, open-now, sort by rating or ETA)
- View menu, cart (“tray”), delivery or pickup checkout
- Pay with **eSewa**, **Khalti**, **Card**, or **Cash on Delivery** (demo checkout — no real charge)
- Track order status on a timeline
- Cancel early orders, reorder, rate delivered kitchens
- Profile, password change, and in-app alerts

### Restaurant (kitchen desk)

- Separate signup / login from customers
- Open / closed toggle
- Live order tickets: confirm → cook → ready (pickup or waiting for delivery)
- Full menu CRUD (name, price, category, availability, image URL)
- Kitchen settings (fee, ETA, address, cuisine)
- Alerts for new and updated orders

### Shared product behavior

- Seeded demo kitchens and dishes on first empty database
- Password hashing (`bcryptjs`) and signed session tokens
- Works with MongoDB when configured; otherwise falls back to **in-memory** data (resets on restart)
- Notifications for order / payment / pickup updates

> **Note:** Rider and admin APIs and seed data still exist in the backend for the full delivery pipeline, but **login and UI for rider/admin are not exposed** in the current frontend. The public app is customer + restaurant only.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| UI | HTML, CSS, vanilla JavaScript (hash routing SPA) |
| Server | Node.js, Express |
| Database | MongoDB via Mongoose |
| Auth | bcryptjs + HMAC-signed bearer tokens |
| Payments | Demo methods only (status updated in DB) |

---

## Architecture

```
Browser (public/)  --JSON-->  Express API (/api)  -->  repository
                                                      ├─ MongoDB (if mongo.uri / MONGO_URI)
                                                      └─ in-memory store (fallback)
```

- **`public/`** — single-page app: shells for landing, customer, and kitchen; talks to `/api` via `fetch`.
- **`server.js`** — static files + REST API + auth middleware.
- **`lib/service.js`** — business rules (orders, menus, status transitions).
- **`lib/repository.js`** — same CRUD API for MongoDB or memory.
- **`models/index.js`** — Mongoose schemas (aligned with `Db.md`, plus fields needed for logins, images, reviews).
- **`lib/seed.js`** — demo data when the customers collection is empty; always ensures a bootstrap admin in the DB (not shown in UI).

---

## Project structure

```
foodwebApp/
├── server.js              # Express entry: API + static hosting
├── package.json
├── mongo.uri              # Local Mongo link (gitignored — do not commit)
├── Db.md                  # Original schema notes
├── food_delivery_design.png
├── models/
│   └── index.js           # Mongoose models
├── lib/
│   ├── db.js              # Connect / memory mode
│   ├── auth.js            # Hash + token sign/verify
│   ├── repository.js      # Data access layer
│   ├── service.js         # Domain logic
│   └── seed.js            # Demo kitchens & orders
└── public/
    ├── index.html
    ├── css/styles.css
    ├── favicon.svg
    └── js/
        ├── api.js         # fetch helper + token header
        ├── ui.js          # shared UI helpers, cart, shells
        ├── landing.js     # marketing home
        ├── auth.js        # customer / restaurant login & signup
        ├── customer.js    # browse, cart, checkout, orders
        ├── kitchen.js     # restaurant desk
        ├── main.js        # router & boot
        ├── rider.js       # unused by current UI (legacy)
        └── admin.js       # unused by current UI (legacy)
```

---

## Prerequisites

- **Node.js** 18+ (tested with recent Node)
- **npm**
- Optional: **MongoDB Atlas** (or local MongoDB) for persistence

---

## Installation & run

```bash
git clone https://github.com/sachinacharyaa/Mitho.git
cd Mitho
npm install
npm start
```

Open **http://localhost:3000**

There is no `dev` script — use `npm start` (`node server.js`).

Default port is `3000`. Override with:

```bash
PORT=4000 npm start
```

---

## MongoDB setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (or use local Mongo).
2. Create a database user and allow your IP under **Network Access** (or `0.0.0.0/0` for local testing).
3. Put the connection string in a file named **`mongo.uri`** in the project root (one line, no quotes):

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/mitho?retryWrites=true&w=majority
```

Or set an environment variable:

```bash
export MONGO_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/mitho?retryWrites=true&w=majority"
npm start
```

4. Restart the server. Startup log should say `Database: MongoDB connected`.

**Without MongoDB:** the app still runs using temporary in-memory data. Everything is wiped when the process stops.

`mongo.uri` is listed in `.gitignore` so credentials are not pushed to GitHub.

---

## Demo accounts

On first seed (empty customer collection), demo data is created. Shared password:

| Role | Email | Password |
|------|--------|----------|
| Customer | `aarav@mitho.com` | `mitho123` |
| Restaurant | `kitchen@momohouse.com` | `mitho123` |

Other seeded kitchens (e.g. Thakali, Biryani Darbar) use the same password pattern for their emails if you need them.

You can also **sign up** as a new customer or restaurant from the UI.

---

## Roles & order flow

### Who uses the UI

| Role | Login UI | Main routes |
|------|----------|-------------|
| Customer | Yes | `#/app`, `#/browse`, `#/r/:id`, `#/cart`, `#/checkout` |
| Restaurant | Yes | `#/kitchen`, `#/kitchen/orders`, `#/kitchen/menu`, `#/kitchen/settings` |
| Rider / Admin | No (removed from UI) | Backend APIs only |

### Order statuses

```
pending → confirmed → preparing → ready_for_pickup
                                    ├─ (pickup) → delivered
                                    └─ (delivery) → out_for_delivery → delivered
Any early stage can also → cancelled
```

Typical kitchen path: **Confirm → Start cooking → Ready for pickup / Ready for rider**.

### Payments (demo)

| Method | Behavior |
|--------|----------|
| eSewa / Khalti / Card | Marked `paid` immediately on place order |
| Cash on Delivery | Stays `pending` until order is `delivered` |
| Cancel after paid | Payment marked `refunded` |

---

## Data models

Defined in `models/index.js` (see also `Db.md`):

| Model | Purpose |
|-------|---------|
| `user` | Customer accounts |
| `restaurant` | Kitchen profile + login |
| `foodItem` | Menu dishes |
| `order` / `orderItem` | Orders and line items |
| `payment` | Payment method & status |
| `delivery` | Rider assignment (backend) |
| `notification` | Per-audience alerts |
| `review` | Post-delivery ratings |
| `rider` / `admin` | Present in DB/API; not in public login UI |

---

## API overview

Base path: **`/api`**. Authenticated routes need:

```http
Authorization: Bearer <token>
```

### Public & auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ ok, db, error }` |
| POST | `/auth/signup` | Roles: `customer`, `restaurant` (`admin` signup blocked) |
| POST | `/auth/login` | Returns `{ token, user }` |
| GET | `/auth/me` | Current user |
| GET | `/restaurants` | List kitchens |
| GET | `/restaurants/:id` | Kitchen detail |
| GET | `/restaurants/:id/menu` | Menu |
| GET | `/restaurants/:id/reviews` | Reviews |

### Customer

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/orders` | List / place order |
| GET | `/orders/:id` | Order detail |
| POST | `/orders/:id/cancel` | Cancel if still early |
| POST | `/orders/:id/review` | Rate after delivery |
| PATCH | `/me` | Update profile |
| POST | `/me/password` | Change password |
| GET | `/notifications` | Inbox |
| POST | `/notifications/read-all` | Mark all read |
| PATCH | `/notifications/:id/read` | Mark one read |

### Kitchen

| Method | Path | Description |
|--------|------|-------------|
| GET | `/kitchen` | Profile + orders |
| PATCH | `/kitchen` | Settings / open-closed |
| POST | `/kitchen/orders/:id/status` | Advance ticket |
| POST/PATCH/DELETE | `/kitchen/menu[/:id]` | Menu CRUD |

### Backend-only (no public UI)

- `/api/ride/*` — rider jobs and delivery status  
- `/api/admin/*` — overview, users, kitchens, riders, orders, payments  

---

## Frontend routes

Hash-based SPA (`public/js/main.js`):

| Hash | Screen |
|------|--------|
| `#/` | Landing |
| `#/browse` | Public kitchen list |
| `#/login/customer` · `#/signup/customer` | Customer auth |
| `#/login/restaurant` · `#/signup/restaurant` | Kitchen auth |
| `#/r/:id` | Restaurant menu |
| `#/cart` · `#/checkout` | Tray & checkout |
| `#/app` · `#/app/orders` · `#/app/profile` | Customer app |
| `#/kitchen` · `#/kitchen/orders` · `#/kitchen/menu` · `#/kitchen/settings` | Kitchen desk |

---

## Configuration

| Item | Purpose |
|------|---------|
| `mongo.uri` / `MONGO_URI` | MongoDB connection string |
| `PORT` | HTTP port (default `3000`) |
| `AUTH_SECRET` | Optional secret for signing tokens (has a local default) |

---

## Design

![Mitho design reference](./food_delivery_design.png)

UI direction: warm cream surfaces, chili accent, Fraunces + Outfit typography, kitchen-first browsing and a dark sidebar for the restaurant workspace.

---

## License

Private project (`"private": true` in `package.json`). Repository: [sachinacharyaa/Mitho](https://github.com/sachinacharyaa/Mitho).
