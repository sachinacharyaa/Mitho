const crypto = require("crypto");
const repository = require("./repository");
const { bcrypt, issue } = require("./auth");

const COL = {
    customer: "users",
    restaurant: "restaurants",
    rider: "riders",
    admin: "admins"
};

const ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"];
const PAYMENT_METHODS = ["eSewa", "Khalti", "Card", "Cash on Delivery"];
const NEXT = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["delivered", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: []
};

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function code(prefix) {
    return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function clip(value, max, label) {
    const text = String(value ?? "").trim();
    if (!text) fail(400, `${label} is required`);
    if (text.length > max) fail(400, `${label} is too long`);
    return text;
}

function optionalClip(value, max) {
    return String(value ?? "").trim().slice(0, max);
}

function normEmail(value, strict = true) {
    const email = String(value || "").trim().toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
        if (strict) fail(400, "Enter a valid email");
        return "";
    }
    return email;
}

function normPhone(value) {
    const phone = String(value || "").trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) fail(400, "Enter a valid phone number");
    return phone.slice(0, 20);
}

function money(value, label = "Price") {
    const amount = Math.round(Number(value));
    if (!Number.isFinite(amount) || amount < 0 || amount > 50000) fail(400, `Enter a valid ${label.toLowerCase()}`);
    return amount;
}

function qty(value) {
    const amount = Math.floor(Number(value));
    if (!Number.isFinite(amount) || amount < 1 || amount > 30) fail(400, "Quantity must be between 1 and 30");
    return amount;
}

function etaValue(value) {
    const amount = Math.round(Number(value));
    if (!Number.isFinite(amount) || amount < 5 || amount > 180) fail(400, "ETA should be between 5 and 180 minutes");
    return amount;
}

async function hashPassword(value) {
    const password = String(value || "");
    if (password.length < 6) fail(400, "Password must be at least 6 characters");
    return bcrypt.hash(password, 8);
}

function optionalImage(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
        const url = new URL(text);
        if (url.protocol !== "https:") fail(400, "Image link must start with https");
        return url.href.slice(0, 500);
    } catch {
        fail(400, "Image link must be a valid https URL");
    }
}

function present(doc) {
    if (!doc) return null;
    const copy = { ...doc };
    delete copy.password;
    delete copy.__v;
    copy.id = String(copy._id);
    return copy;
}

function accountDTO(role, doc) {
    const row = present(doc);
    if (role === "customer") {
        return {
            role, id: row.id, name: row.name, email: row.email, phone: row.phone,
            address: row.address || "", userId: row.userId, active: row.active !== false
        };
    }
    if (role === "restaurant") {
        return {
            role, id: row.id, name: row.name, ownerName: row.ownerName || "", email: row.email,
            phone: row.phone || "", address: row.address, cuisine: row.cuisine || "",
            status: row.status, rating: row.rating || 0, ratingCount: row.ratingCount || 0,
            deliveryFee: row.deliveryFee ?? 60, etaMinutes: row.etaMinutes || 30,
            restaurantId: row.restaurantId, active: row.active !== false,
            image: row.image || "", coverImage: row.coverImage || "", accent: row.accent || ""
        };
    }
    if (role === "rider") {
        return {
            role, id: row.id, name: row.name, email: row.email, phone: row.phone,
            vehicleType: row.vehicleType || "", vehicleNumber: row.vehicleNumber || "",
            status: row.status, zone: row.zone || "Kathmandu", riderId: row.riderId,
            active: row.active !== false
        };
    }
    const name = `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Admin";
    return {
        role, id: row.id, name, firstName: row.firstName || "", lastName: row.lastName || "",
        email: row.email, active: row.active !== false
    };
}

function publicRestaurant(doc) {
    if (!doc) return null;
    const row = present(doc);
    return {
        id: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        address: row.address,
        phone: row.phone || "",
        cuisine: row.cuisine || "",
        status: row.status,
        rating: row.rating || 0,
        ratingCount: row.ratingCount || 0,
        image: row.image || "",
        coverImage: row.coverImage || "",
        deliveryFee: row.deliveryFee ?? 0,
        etaMinutes: row.etaMinutes || 30,
        accent: row.accent || "",
        active: row.active !== false
    };
}

async function assertEmail(collection, email) {
    const existing = await repository.findOne(collection, { email });
    if (existing) fail(409, "An account with this email already exists");
}

async function signup(body) {
    const role = body.role;
    if (!COL[role]) fail(400, "Choose what you're signing up as");
    if (role === "admin") fail(403, "Admin accounts can't be created here");
    const email = normEmail(body.email);
    const password = await hashPassword(body.password);
    await assertEmail(COL[role], email);

    if (role === "customer") {
        const doc = await repository.insert("users", {
            userId: code("CUS"),
            name: clip(body.name, 80, "Name"),
            email,
            phone: normPhone(body.phone),
            password,
            role: "customer",
            address: clip(body.address, 200, "Address"),
            active: true
        });
        return { token: issue(role, doc._id), user: accountDTO(role, doc) };
    }

    if (role === "restaurant") {
        const doc = await repository.insert("restaurants", {
            restaurantId: code("RES"),
            name: clip(body.name, 80, "Restaurant name"),
            ownerName: clip(body.ownerName, 80, "Your name"),
            email,
            phone: normPhone(body.phone),
            password,
            address: clip(body.address, 200, "Address"),
            cuisine: clip(body.cuisine, 40, "Cuisine"),
            status: "open",
            rating: 0,
            ratingCount: 0,
            deliveryFee: 60,
            etaMinutes: 30,
            active: true
        });
        return { token: issue(role, doc._id), user: accountDTO(role, doc) };
    }

    if (role === "rider") {
        const doc = await repository.insert("riders", {
            riderId: code("RDR"),
            name: clip(body.name, 80, "Name"),
            email,
            phone: normPhone(body.phone),
            password,
            vehicleType: clip(body.vehicleType, 30, "Vehicle"),
            vehicleNumber: clip(body.vehicleNumber, 20, "Vehicle number"),
            zone: optionalClip(body.zone, 40) || "Kathmandu",
            status: "available",
            active: true
        });
        return { token: issue(role, doc._id), user: accountDTO(role, doc) };
    }

    const doc = await repository.insert("admins", {
        email,
        password,
        firstName: clip(body.firstName, 40, "First name"),
        lastName: optionalClip(body.lastName, 40),
        role: "admin",
        active: true
    });
    return { token: issue(role, doc._id), user: accountDTO(role, doc) };
}

async function login(body) {
    const role = body.role;
    if (!COL[role]) fail(400, "Choose a valid login");
    const email = normEmail(body.email, false);
    if (!email) fail(401, "Email or password is incorrect");
    const account = await repository.findOne(COL[role], { email });
    const matches = account && await bcrypt.compare(String(body.password || ""), account.password || "");
    if (!matches) fail(401, "Email or password is incorrect");
    if (account.active === false) fail(403, "This account has been disabled");
    return { token: issue(role, account._id), user: accountDTO(role, account) };
}

async function me(auth) {
    const doc = await repository.findById(COL[auth.role], auth.id);
    if (!doc) fail(401, "Please sign in");
    if (doc.active === false) fail(403, "This account has been disabled");
    return accountDTO(auth.role, doc);
}

async function listRestaurants() {
    const rows = await repository.find("restaurants", {});
    return rows
        .filter((row) => row.active !== false)
        .map(publicRestaurant)
        .sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.rating - a.rating);
}

async function getRestaurant(id) {
    const row = await repository.findById("restaurants", id);
    if (!row || row.active === false) fail(404, "We can't find that kitchen");
    return publicRestaurant(row);
}

async function listMenu(restaurantId) {
    await getRestaurant(restaurantId);
    const rows = await repository.find("foodItems", { restaurantId });
    return rows.map(present);
}

async function listReviews(restaurantId) {
    await getRestaurant(restaurantId);
    const rows = await repository.find("reviews", { restaurantId });
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return rows.map((row) => ({
        id: String(row._id),
        rating: row.rating,
        comment: row.comment || "",
        authorName: row.authorName || "Customer",
        createdAt: row.createdAt
    }));
}

async function activeDelivery(orderId) {
    const rows = await repository.find("deliveries", { orderId });
    return rows.find((row) => row.status !== "cancelled") || null;
}

async function hydrateOrder(order) {
    const [items, payment, delivery, restaurant, customer, review] = await Promise.all([
        repository.find("orderItems", { orderId: order._id }),
        repository.findOne("payments", { orderId: order._id }),
        activeDelivery(order._id),
        repository.findById("restaurants", order.restaurantId),
        repository.findById("users", order.userId),
        repository.findOne("reviews", { orderId: order._id })
    ]);
    const rider = delivery ? await repository.findById("riders", delivery.riderId) : null;
    return {
        ...present(order),
        items: items.map(present),
        payment: payment ? present(payment) : null,
        delivery: delivery ? present(delivery) : null,
        restaurant: publicRestaurant(restaurant),
        customer: customer ? {
            id: String(customer._id),
            name: customer.name,
            phone: customer.phone,
            address: customer.address || ""
        } : null,
        rider: rider ? {
            id: String(rider._id),
            name: rider.name,
            phone: rider.phone,
            vehicleType: rider.vehicleType || "",
            vehicleNumber: rider.vehicleNumber || ""
        } : null,
        review: review ? {
            id: String(review._id),
            rating: review.rating,
            comment: review.comment || "",
            authorName: review.authorName || "Customer"
        } : null
    };
}

async function listBy(collection, field, id) {
    const rows = await repository.find(collection, { [field]: id });
    const hydrated = [];
    for (const row of rows) hydrated.push(await hydrateOrder(row));
    hydrated.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    return hydrated;
}

function canSee(auth, order, full) {
    if (auth.role === "admin") return true;
    if (auth.role === "customer") return String(order.userId) === String(auth.id);
    if (auth.role === "restaurant") return String(order.restaurantId) === String(auth.id);
    if (auth.role === "rider") {
        if (full.rider && String(full.rider.id) === String(auth.id)) return true;
        if (order.deliveryType === "delivery" && order.status === "ready_for_pickup" && !full.rider) return true;
    }
    return false;
}

async function getOrder(auth, id) {
    const order = await repository.findById("orders", id);
    if (!order) fail(404, "Order not found");
    const full = await hydrateOrder(order);
    if (!canSee(auth, order, full)) fail(403, "You can't view this order");
    return full;
}

async function nextOrderNumber() {
    const count = await repository.count("orders");
    return `MTH-${10421 + count}`;
}

async function notify(entry) {
    await repository.insert("notifications", {
        audience: entry.audience,
        audienceId: entry.audienceId,
        userId: entry.userId || (entry.audience === "customer" ? entry.audienceId : undefined),
        orderId: entry.orderId,
        message: entry.message,
        type: entry.type,
        isRead: false
    });
}

async function notifyAdmins(order, message) {
    const admins = await repository.find("admins", {});
    for (const admin of admins) {
        if (admin.active === false) continue;
        await notify({
            audience: "admin",
            audienceId: admin._id,
            orderId: order._id,
            message,
            type: "new_order"
        });
    }
}

async function placeOrder(userId, body) {
    const user = await repository.findById("users", userId);
    if (!user || user.active === false) fail(401, "Please sign in");
    const restaurant = await repository.findById("restaurants", body.restaurantId);
    if (!restaurant || restaurant.active === false) fail(404, "We can't find that kitchen");
    if (restaurant.status !== "open") fail(400, "This kitchen is closed right now");
    if (!Array.isArray(body.items) || body.items.length === 0) fail(400, "Your cart is empty");
    if (body.items.length > 30) fail(400, "That's a lot of dishes for one order");
    if (!["delivery", "pickup"].includes(body.deliveryType)) fail(400, "Choose delivery or pickup");
    if (!PAYMENT_METHODS.includes(body.method)) fail(400, "Choose a payment method");
    const deliveryAddress = body.deliveryType === "delivery"
        ? clip(body.deliveryAddress, 200, "Delivery address")
        : optionalClip(body.deliveryAddress, 200);
    const note = optionalClip(body.note, 200);
    const menu = await repository.find("foodItems", { restaurantId: restaurant._id });
    let subtotal = 0;
    const lines = [];
    for (const raw of body.items) {
        const food = menu.find((item) => String(item._id) === String(raw.foodItemId));
        if (!food) fail(400, "A dish in your cart is no longer on the menu");
        if (!food.available) fail(400, `${food.name} just sold out`);
        const quantity = qty(raw.quantity);
        const totalPrice = food.price * quantity;
        subtotal += totalPrice;
        lines.push({ food, quantity, unitPrice: food.price, totalPrice });
    }
    const deliveryFee = body.deliveryType === "delivery" ? Number(restaurant.deliveryFee || 0) : 0;
    const totalAmount = subtotal + deliveryFee;
    const order = await repository.insert("orders", {
        userId: user._id,
        restaurantId: restaurant._id,
        orderDate: new Date().toISOString(),
        deliveryType: body.deliveryType,
        deliveryAddress,
        subtotal,
        deliveryFee,
        totalAmount,
        status: "pending",
        orderNumber: await nextOrderNumber(),
        note
    });
    for (const line of lines) {
        await repository.insert("orderItems", {
            orderId: order._id,
            foodItemId: line.food._id,
            itemName: line.food.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice
        });
    }
    const paidNow = body.method !== "Cash on Delivery";
    await repository.insert("payments", {
        orderId: order._id,
        userId: user._id,
        amount: totalAmount,
        method: body.method,
        status: paidNow ? "paid" : "pending",
        paymentDate: paidNow ? new Date().toISOString() : undefined
    });
    await notify({
        audience: "customer",
        audienceId: user._id,
        userId: user._id,
        orderId: order._id,
        message: `Order ${order.orderNumber} placed at ${restaurant.name} · ${body.method}.`,
        type: "new_order"
    });
    await notify({
        audience: "restaurant",
        audienceId: restaurant._id,
        orderId: order._id,
        message: `New order ${order.orderNumber} from ${user.name}.`,
        type: "new_order"
    });
    await notifyAdmins(order, `New order ${order.orderNumber} · ${restaurant.name} · Rs. ${totalAmount}.`);
    return hydrateOrder(order);
}

async function sendStatusNotifications(order, status) {
    const restaurant = await repository.findById("restaurants", order.restaurantId);
    const user = await repository.findById("users", order.userId);
    const delivery = await activeDelivery(order._id);
    const rider = delivery ? await repository.findById("riders", delivery.riderId) : null;
    const payment = await repository.findOne("payments", { orderId: order._id });
    const name = restaurant?.name || "The kitchen";
    const no = order.orderNumber;
    let message = `Update on ${no}.`;
    let type = "order_update";
    if (status === "confirmed") message = `${name} confirmed ${no}.`;
    if (status === "preparing") message = `${name} is cooking ${no}.`;
    if (status === "ready_for_pickup" && order.deliveryType === "pickup") {
        message = `${no} is ready for pickup at ${name}.`;
        type = "pickup_ready";
    }
    if (status === "ready_for_pickup" && order.deliveryType === "delivery") {
        message = `${no} is ready. A rider will pick it up shortly.`;
    }
    if (status === "out_for_delivery") {
        message = `${rider ? rider.name : "Your rider"} picked up ${no} and is on the way.`;
        type = "delivery_update";
    }
    if (status === "delivered") {
        message = `${no} was delivered. Enjoy your meal — a rating helps the kitchen.`;
        type = "delivery_update";
    }
    if (status === "cancelled") {
        message = payment?.status === "refunded"
            ? `${no} was cancelled. Your payment will be refunded.`
            : `${no} was cancelled.`;
    }
    if (user) {
        await notify({
            audience: "customer",
            audienceId: user._id,
            userId: user._id,
            orderId: order._id,
            message,
            type
        });
    }
    if (restaurant && status !== "pending") {
        await notify({
            audience: "restaurant",
            audienceId: restaurant._id,
            orderId: order._id,
            message: `${no} is now ${status.replaceAll("_", " ")}.`,
            type: "order_update"
        });
    }
    if (status === "ready_for_pickup" && order.deliveryType === "delivery") {
        const riders = await repository.find("riders", {});
        for (const person of riders) {
            if (person.status !== "available" || person.active === false) continue;
            await notify({
                audience: "rider",
                audienceId: person._id,
                orderId: order._id,
                message: `${name} has ${no} ready for pickup.`,
                type: "delivery_update"
            });
        }
    }
}

async function applyStatus(orderId, status) {
    const order = await repository.findById("orders", orderId);
    if (!order) fail(404, "Order not found");
    if (!ORDER_STATUSES.includes(status)) fail(400, "Unknown status");
    if (order.status === status) return hydrateOrder(order);
    await repository.updateById("orders", order._id, { status });
    const delivery = await activeDelivery(order._id);
    const rider = delivery ? await repository.findById("riders", delivery.riderId) : null;
    const deliveryMap = { out_for_delivery: "out_for_delivery", delivered: "delivered", cancelled: "cancelled" };
    if (delivery && deliveryMap[status]) {
        await repository.updateById("deliveries", delivery._id, {
            status: deliveryMap[status],
            trackingStatus: status === "delivered"
                ? "Delivered"
                : status === "cancelled"
                    ? "Cancelled"
                    : `${rider ? rider.name : "Rider"} picked up the order`,
            ...(status === "delivered" ? { deliveredAt: new Date().toISOString() } : {})
        });
    }
    const payment = await repository.findOne("payments", { orderId: order._id });
    if (payment && status === "cancelled") {
        await repository.updateById("payments", payment._id, {
            status: payment.status === "paid" ? "refunded" : "failed"
        });
    }
    if (payment && status === "delivered" && payment.method === "Cash on Delivery" && payment.status !== "paid") {
        await repository.updateById("payments", payment._id, {
            status: "paid",
            paymentDate: new Date().toISOString()
        });
    }
    if (rider && (status === "delivered" || status === "cancelled") && rider.status === "busy") {
        await repository.updateById("riders", rider._id, { status: "available" });
    }
    const fresh = await repository.findById("orders", order._id);
    await sendStatusNotifications(fresh, status);
    return hydrateOrder(fresh);
}

async function cancelOrder(userId, orderId) {
    const order = await repository.findById("orders", orderId);
    if (!order || String(order.userId) !== String(userId)) fail(403, "Not your order");
    if (!["pending", "confirmed"].includes(order.status)) {
        fail(400, "The kitchen has already started. This order can no longer be cancelled.");
    }
    return applyStatus(order._id, "cancelled");
}

async function addReview(userId, orderId, body) {
    const order = await repository.findById("orders", orderId);
    if (!order || String(order.userId) !== String(userId)) fail(403, "Not your order");
    if (order.status !== "delivered") fail(400, "You can rate a kitchen after delivery");
    const existing = await repository.findOne("reviews", { orderId: order._id });
    if (existing) fail(400, "You already rated this order");
    const stars = Math.round(Number(body.rating));
    if (stars < 1 || stars > 5) fail(400, "Choose a rating from 1 to 5");
    const user = await repository.findById("users", userId);
    const review = await repository.insert("reviews", {
        userId,
        restaurantId: order.restaurantId,
        orderId: order._id,
        rating: stars,
        comment: optionalClip(body.comment, 400),
        authorName: user?.name || "Customer"
    });
    const restaurant = await repository.findById("restaurants", order.restaurantId);
    const count = restaurant.ratingCount || 0;
    const nextCount = count + 1;
    const nextRating = Math.round((((restaurant.rating || 0) * count + stars) / nextCount) * 10) / 10;
    await repository.updateById("restaurants", restaurant._id, { rating: nextRating, ratingCount: nextCount });
    return present(review);
}

async function updateCustomer(userId, body) {
    const patch = {};
    if (body.name != null) patch.name = clip(body.name, 80, "Name");
    if (body.phone != null) patch.phone = normPhone(body.phone);
    if (body.address != null) patch.address = clip(body.address, 200, "Address");
    const row = await repository.updateById("users", userId, patch);
    return accountDTO("customer", row);
}

async function changePassword(auth, body) {
    const row = await repository.findById(COL[auth.role], auth.id);
    if (!row) fail(401, "Please sign in");
    const matches = await bcrypt.compare(String(body.currentPassword || ""), row.password || "");
    if (!matches) fail(400, "Current password is incorrect");
    const password = await hashPassword(body.newPassword);
    await repository.updateById(COL[auth.role], auth.id, { password });
    return { ok: true };
}

async function updateRestaurant(id, body) {
    const current = await repository.findById("restaurants", id);
    if (!current) fail(404, "Kitchen not found");
    const patch = {};
    if (body.name != null) patch.name = clip(body.name, 80, "Restaurant name");
    if (body.ownerName != null) patch.ownerName = clip(body.ownerName, 80, "Your name");
    if (body.phone != null) patch.phone = normPhone(body.phone);
    if (body.address != null) patch.address = clip(body.address, 200, "Address");
    if (body.cuisine != null) patch.cuisine = clip(body.cuisine, 40, "Cuisine");
    if (body.status != null) {
        if (!["open", "closed"].includes(body.status)) fail(400, "Status must be open or closed");
        patch.status = body.status;
    }
    if (body.deliveryFee != null) patch.deliveryFee = money(body.deliveryFee, "Delivery fee");
    if (body.etaMinutes != null) patch.etaMinutes = etaValue(body.etaMinutes);
    const row = await repository.updateById("restaurants", id, patch);
    return accountDTO("restaurant", row);
}

async function addMenuItem(restaurantId, body) {
    const item = await repository.insert("foodItems", {
        restaurantId,
        name: clip(body.name, 80, "Dish name"),
        description: optionalClip(body.description, 300),
        price: money(body.price),
        category: optionalClip(body.category, 40) || "Menu",
        available: body.available !== false,
        image: optionalImage(body.image)
    });
    return present(item);
}

async function updateMenuItem(restaurantId, itemId, body) {
    const item = await repository.findById("foodItems", itemId);
    if (!item || String(item.restaurantId) !== String(restaurantId)) fail(404, "Dish not found");
    const patch = {};
    if (body.name != null) patch.name = clip(body.name, 80, "Dish name");
    if (body.description != null) patch.description = optionalClip(body.description, 300);
    if (body.price != null) patch.price = money(body.price);
    if (body.category != null) patch.category = optionalClip(body.category, 40) || "Menu";
    if (typeof body.available === "boolean") patch.available = body.available;
    if (body.image != null) patch.image = optionalImage(body.image);
    return present(await repository.updateById("foodItems", itemId, patch));
}

async function deleteMenuItem(restaurantId, itemId) {
    const item = await repository.findById("foodItems", itemId);
    if (!item || String(item.restaurantId) !== String(restaurantId)) fail(404, "Dish not found");
    await repository.deleteById("foodItems", itemId);
    return { ok: true };
}

async function restaurantSetStatus(restaurantId, orderId, status) {
    const order = await repository.findById("orders", orderId);
    if (!order || String(order.restaurantId) !== String(restaurantId)) fail(403, "Not your order");
    if (status === "out_for_delivery") fail(400, "A rider marks the order as on the way");
    if (status === "delivered" && order.deliveryType !== "pickup") fail(400, "A rider marks delivery orders as delivered");
    if (!(NEXT[order.status] || []).includes(status)) fail(400, "That status change isn't available");
    return applyStatus(order._id, status);
}

async function updateRider(id, body) {
    const current = await repository.findById("riders", id);
    if (!current) fail(404, "Rider not found");
    const patch = {};
    if (body.name != null) patch.name = clip(body.name, 80, "Name");
    if (body.phone != null) patch.phone = normPhone(body.phone);
    if (body.vehicleType != null) patch.vehicleType = clip(body.vehicleType, 30, "Vehicle");
    if (body.vehicleNumber != null) patch.vehicleNumber = clip(body.vehicleNumber, 20, "Vehicle number");
    if (body.zone != null) patch.zone = optionalClip(body.zone, 40) || "Kathmandu";
    if (body.status != null) {
        if (!["available", "busy", "offline"].includes(body.status)) fail(400, "Unknown rider status");
        if (body.status === "offline" || body.status === "available") {
            const deliveries = await repository.find("deliveries", { riderId: id });
            const active = [];
            for (const delivery of deliveries) {
                if (["delivered", "cancelled"].includes(delivery.status)) continue;
                const order = await repository.findById("orders", delivery.orderId);
                if (order && !["delivered", "cancelled"].includes(order.status)) active.push(order);
            }
            if (active.length && body.status !== "busy") {
                fail(400, "Finish the current delivery before changing status");
            }
        }
        patch.status = body.status;
    }
    return accountDTO("rider", await repository.updateById("riders", id, patch));
}

async function riderSummary(riderId) {
    const rider = await repository.findById("riders", riderId);
    const deliveries = await repository.find("deliveries", { riderId });
    let earned = 0;
    let done = 0;
    let active = null;
    for (const delivery of deliveries) {
        const order = await repository.findById("orders", delivery.orderId);
        if (!order) continue;
        if (order.status === "delivered") {
            done += 1;
            earned += Number(order.deliveryFee || 0);
        }
        if (!["delivered", "cancelled"].includes(order.status) && delivery.status !== "cancelled") {
            active = await hydrateOrder(order);
        }
    }
    return { user: accountDTO("rider", rider), earned, done, active };
}

async function listAvailableJobs() {
    const orders = await repository.find("orders", {});
    const ready = orders.filter((order) => order.deliveryType === "delivery" && order.status === "ready_for_pickup");
    const jobs = [];
    for (const order of ready) {
        const delivery = await activeDelivery(order._id);
        if (delivery) continue;
        jobs.push(await hydrateOrder(order));
    }
    jobs.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
    return jobs;
}

async function riderAccept(riderId, orderId) {
    const rider = await repository.findById("riders", riderId);
    if (!rider || rider.active === false) fail(403, "This account has been disabled");
    if (rider.status !== "available") fail(400, "Switch to available before taking a job");
    const order = await repository.findById("orders", orderId);
    if (!order || order.deliveryType !== "delivery" || order.status !== "ready_for_pickup") {
        fail(400, "That job is no longer available");
    }
    if (await activeDelivery(order._id)) fail(400, "Another rider already took this");
    const restaurant = await repository.findById("restaurants", order.restaurantId);
    await repository.insert("deliveries", {
        orderId: order._id,
        riderId: rider._id,
        pickupLocation: restaurant?.address || "",
        deliveryLocation: order.deliveryAddress || "",
        status: "assigned",
        trackingStatus: `${rider.name} is heading to the kitchen`
    });
    await repository.updateById("riders", rider._id, { status: "busy" });
    const user = await repository.findById("users", order.userId);
    if (user) {
        await notify({
            audience: "customer",
            audienceId: user._id,
            userId: user._id,
            orderId: order._id,
            message: `${rider.name} is assigned to ${order.orderNumber}.`,
            type: "delivery_update"
        });
    }
    if (restaurant) {
        await notify({
            audience: "restaurant",
            audienceId: restaurant._id,
            orderId: order._id,
            message: `${rider.name} is coming for ${order.orderNumber}.`,
            type: "delivery_update"
        });
    }
    return hydrateOrder(await repository.findById("orders", order._id));
}

async function riderAdvance(riderId, orderId, status) {
    const order = await repository.findById("orders", orderId);
    const delivery = order ? await activeDelivery(order._id) : null;
    if (!order || !delivery || String(delivery.riderId) !== String(riderId)) fail(403, "This delivery isn't yours");
    if (status === "out_for_delivery" && order.status !== "ready_for_pickup") {
        fail(400, "Pick the order up once you're at the kitchen");
    }
    if (status === "delivered" && order.status !== "out_for_delivery") {
        fail(400, "Mark the order on the way before delivered");
    }
    if (!["out_for_delivery", "delivered"].includes(status)) fail(400, "That update isn't available");
    return applyStatus(order._id, status);
}

async function listNotifications(auth) {
    const rows = await repository.find("notifications", { audience: auth.role, audienceId: auth.id });
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return rows.map(present);
}

async function markRead(auth, id) {
    const note = await repository.findById("notifications", id);
    if (!note || note.audience !== auth.role || String(note.audienceId) !== String(auth.id)) {
        fail(404, "Notification not found");
    }
    return present(await repository.updateById("notifications", id, { isRead: true }));
}

async function readAll(auth) {
    const rows = await repository.find("notifications", { audience: auth.role, audienceId: auth.id });
    for (const row of rows) {
        if (!row.isRead) await repository.updateById("notifications", row._id, { isRead: true });
    }
    return { ok: true };
}

function localDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

async function adminOverview() {
    const [users, restaurants, riders, orders, payments] = await Promise.all([
        repository.find("users", {}),
        repository.find("restaurants", {}),
        repository.find("riders", {}),
        repository.find("orders", {}),
        repository.find("payments", {})
    ]);
    const today = localDay(new Date());
    const revenue = payments.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const sorted = orders.slice().sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)).slice(0, 6);
    const recent = [];
    for (const order of sorted) recent.push(await hydrateOrder(order));
    return {
        customers: users.length,
        restaurants: restaurants.length,
        riders: riders.length,
        orders: orders.length,
        openOrders: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
        deliveredToday: orders.filter((order) => order.status === "delivered" && localDay(order.orderDate) === today).length,
        revenue,
        recent
    };
}

async function adminOrders() {
    const orders = await repository.find("orders", {});
    const rows = [];
    for (const order of orders) rows.push(await hydrateOrder(order));
    rows.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    return rows;
}

async function adminPayments() {
    const payments = await repository.find("payments", {});
    const rows = [];
    for (const payment of payments) {
        const order = await repository.findById("orders", payment.orderId);
        const user = await repository.findById("users", payment.userId);
        rows.push({
            ...present(payment),
            orderNumber: order?.orderNumber || "",
            orderStatus: order?.status || "",
            customerName: user?.name || ""
        });
    }
    rows.sort((a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0));
    return rows;
}

async function adminPatch(collection, role, id, body, actorId) {
    const row = await repository.findById(collection, id);
    if (!row) fail(404, "Record not found");
    const patch = {};
    if (typeof body.active === "boolean") {
        if (role === "admin" && body.active === false && String(id) === String(actorId)) {
            fail(400, "You can't disable your own admin login");
        }
        patch.active = body.active;
    }
    if (body.status != null && role === "restaurant") {
        if (!["open", "closed"].includes(body.status)) fail(400, "Status must be open or closed");
        patch.status = body.status;
    }
    if (body.status != null && role === "rider") {
        if (!["available", "busy", "offline"].includes(body.status)) fail(400, "Unknown rider status");
        patch.status = body.status;
    }
    const saved = await repository.updateById(collection, id, patch);
    return role === "restaurant" || role === "rider" || role === "customer" || role === "admin"
        ? present(saved)
        : present(saved);
}

module.exports = {
    signup,
    login,
    me,
    listRestaurants,
    getRestaurant,
    listMenu,
    listReviews,
    placeOrder,
    listCustomerOrders: (userId) => listBy("orders", "userId", userId),
    listRestaurantOrders: (restaurantId) => listBy("orders", "restaurantId", restaurantId),
    getOrder,
    cancelOrder,
    addReview,
    updateCustomer,
    changePassword,
    updateRestaurant,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    restaurantSetStatus,
    updateRider,
    riderSummary,
    listAvailableJobs,
    listRiderDeliveries: async (riderId) => {
        const deliveries = await repository.find("deliveries", { riderId });
        const rows = [];
        for (const delivery of deliveries) {
            const order = await repository.findById("orders", delivery.orderId);
            if (order) rows.push(await hydrateOrder(order));
        }
        rows.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        return rows;
    },
    riderAccept,
    riderAdvance,
    listNotifications,
    markRead,
    readAll,
    adminOverview,
    adminOrders,
    adminPayments,
    adminCustomers: async () => (await repository.find("users", {})).map(present),
    adminRestaurants: async () => (await repository.find("restaurants", {})).map(present),
    adminRiders: async () => (await repository.find("riders", {})).map(present),
    adminPatchCustomer: (id, body, actorId) => adminPatch("users", "customer", id, body, actorId),
    adminPatchRestaurant: (id, body, actorId) => adminPatch("restaurants", "restaurant", id, body, actorId),
    adminPatchRider: (id, body, actorId) => adminPatch("riders", "rider", id, body, actorId),
    adminSetOrderStatus: (orderId, status) => applyStatus(orderId, status),
    decorateRestaurant: (id, patch) => repository.updateById("restaurants", id, patch)
};
