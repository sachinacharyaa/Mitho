const path = require("path");
const express = require("express");
const db = require("./lib/db");
const { seedIfEmpty } = require("./lib/seed");
const { verify } = require("./lib/auth");
const service = require("./lib/service");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});
app.use(express.json({ limit: "1mb" }));

function asyncRoute(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function auth(roles) {
    return (req, res, next) => {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        const session = verify(token);
        if (!session) return res.status(401).json({ error: "Please sign in" });
        if (roles && !roles.includes(session.role)) {
            return res.status(403).json({ error: "You don't have access to that" });
        }
        req.auth = session;
        next();
    };
}

const api = express.Router();

api.get("/health", (req, res) => {
    res.json({ ok: true, db: db.getMode(), error: db.getError() });
});

api.post("/auth/signup", asyncRoute(async (req, res) => {
    res.status(201).json(await service.signup(req.body || {}));
}));
api.post("/auth/login", asyncRoute(async (req, res) => {
    res.json(await service.login(req.body || {}));
}));
api.get("/auth/me", auth(), asyncRoute(async (req, res) => {
    res.json({ user: await service.me(req.auth) });
}));

api.get("/restaurants", asyncRoute(async (req, res) => {
    res.json(await service.listRestaurants());
}));
api.get("/restaurants/:id", asyncRoute(async (req, res) => {
    res.json(await service.getRestaurant(req.params.id));
}));
api.get("/restaurants/:id/menu", asyncRoute(async (req, res) => {
    res.json(await service.listMenu(req.params.id));
}));
api.get("/restaurants/:id/reviews", asyncRoute(async (req, res) => {
    res.json(await service.listReviews(req.params.id));
}));

api.get("/orders", auth(["customer"]), asyncRoute(async (req, res) => {
    res.json(await service.listCustomerOrders(req.auth.id));
}));
api.post("/orders", auth(["customer"]), asyncRoute(async (req, res) => {
    res.status(201).json(await service.placeOrder(req.auth.id, req.body || {}));
}));
api.get("/orders/:id", auth(), asyncRoute(async (req, res) => {
    res.json(await service.getOrder(req.auth, req.params.id));
}));
api.post("/orders/:id/cancel", auth(["customer"]), asyncRoute(async (req, res) => {
    res.json(await service.cancelOrder(req.auth.id, req.params.id));
}));
api.post("/orders/:id/review", auth(["customer"]), asyncRoute(async (req, res) => {
    res.status(201).json(await service.addReview(req.auth.id, req.params.id, req.body || {}));
}));

api.patch("/me", auth(["customer"]), asyncRoute(async (req, res) => {
    res.json({ user: await service.updateCustomer(req.auth.id, req.body || {}) });
}));
api.post("/me/password", auth(), asyncRoute(async (req, res) => {
    res.json(await service.changePassword(req.auth, req.body || {}));
}));

api.get("/notifications", auth(), asyncRoute(async (req, res) => {
    res.json(await service.listNotifications(req.auth));
}));
api.post("/notifications/read-all", auth(), asyncRoute(async (req, res) => {
    res.json(await service.readAll(req.auth));
}));
api.patch("/notifications/:id/read", auth(), asyncRoute(async (req, res) => {
    res.json(await service.markRead(req.auth, req.params.id));
}));

api.get("/kitchen", auth(["restaurant"]), asyncRoute(async (req, res) => {
    const [user, orders] = await Promise.all([
        service.me(req.auth),
        service.listRestaurantOrders(req.auth.id)
    ]);
    res.json({ user, orders });
}));
api.patch("/kitchen", auth(["restaurant"]), asyncRoute(async (req, res) => {
    res.json({ user: await service.updateRestaurant(req.auth.id, req.body || {}) });
}));
api.post("/kitchen/orders/:id/status", auth(["restaurant"]), asyncRoute(async (req, res) => {
    res.json(await service.restaurantSetStatus(req.auth.id, req.params.id, (req.body || {}).status));
}));
api.post("/kitchen/menu", auth(["restaurant"]), asyncRoute(async (req, res) => {
    res.status(201).json(await service.addMenuItem(req.auth.id, req.body || {}));
}));
api.patch("/kitchen/menu/:id", auth(["restaurant"]), asyncRoute(async (req, res) => {
    res.json(await service.updateMenuItem(req.auth.id, req.params.id, req.body || {}));
}));
api.delete("/kitchen/menu/:id", auth(["restaurant"]), asyncRoute(async (req, res) => {
    res.json(await service.deleteMenuItem(req.auth.id, req.params.id));
}));

api.get("/ride", auth(["rider"]), asyncRoute(async (req, res) => {
    res.json(await service.riderSummary(req.auth.id));
}));
api.patch("/ride", auth(["rider"]), asyncRoute(async (req, res) => {
    res.json({ user: await service.updateRider(req.auth.id, req.body || {}) });
}));
api.get("/ride/jobs", auth(["rider"]), asyncRoute(async (req, res) => {
    res.json(await service.listAvailableJobs());
}));
api.get("/ride/deliveries", auth(["rider"]), asyncRoute(async (req, res) => {
    res.json(await service.listRiderDeliveries(req.auth.id));
}));
api.post("/ride/jobs/:orderId/accept", auth(["rider"]), asyncRoute(async (req, res) => {
    res.json(await service.riderAccept(req.auth.id, req.params.orderId));
}));
api.post("/ride/orders/:orderId/status", auth(["rider"]), asyncRoute(async (req, res) => {
    res.json(await service.riderAdvance(req.auth.id, req.params.orderId, (req.body || {}).status));
}));

api.get("/admin/overview", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminOverview());
}));
api.get("/admin/customers", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminCustomers());
}));
api.patch("/admin/customers/:id", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminPatchCustomer(req.params.id, req.body || {}, req.auth.id));
}));
api.get("/admin/restaurants", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminRestaurants());
}));
api.patch("/admin/restaurants/:id", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminPatchRestaurant(req.params.id, req.body || {}, req.auth.id));
}));
api.get("/admin/riders", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminRiders());
}));
api.patch("/admin/riders/:id", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminPatchRider(req.params.id, req.body || {}, req.auth.id));
}));
api.get("/admin/orders", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminOrders());
}));
api.post("/admin/orders/:id/status", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminSetOrderStatus(req.params.id, (req.body || {}).status));
}));
api.get("/admin/payments", auth(["admin"]), asyncRoute(async (req, res) => {
    res.json(await service.adminPayments());
}));

app.use("/api", api);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? "Something went wrong" : err.message });
});

async function main() {
    await db.init();
    await seedIfEmpty();
    const server = app.listen(port, () => {
        const where = db.getMode() === "mongodb" ? "MongoDB connected" : "in-memory";
        console.log(`Mitho is serving at http://localhost:${port}`);
        console.log(`Database: ${where}`);
        if (db.getError()) console.log(`MongoDB note: ${db.getError()}`);
        if (db.getMode() !== "mongodb") {
            console.log("Paste a MongoDB link into mongo.uri and restart to persist data.");
        }
    });
    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") console.error(`Port ${port} is already in use.`);
        else console.error(error);
        process.exit(1);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
