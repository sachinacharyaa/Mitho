const mongoose = require("mongoose");
const { Schema } = mongoose;

// Based on Db.md. Extra fields are marked so each role can sign in
// and the product can run (images, fees, order numbers, reviews).

const userSchema = new Schema({
    userId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer"], default: "customer" },
    address: String,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const restaurantSchema = new Schema({
    restaurantId: { type: String, unique: true, required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "user" },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: String,
    cuisine: String,
    status: { type: String, enum: ["open", "closed"], default: "open" },
    rating: { type: Number, default: 0 },
    // Added so the kitchen has its own login.
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    ownerName: String,
    image: String,
    coverImage: String,
    deliveryFee: { type: Number, default: 60 },
    etaMinutes: { type: Number, default: 30 },
    accent: String,
    ratingCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const adminSchema = new Schema({
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    role: { type: String, default: "admin" },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const riderSchema = new Schema({
    riderId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    vehicleType: String,
    vehicleNumber: String,
    status: { type: String, enum: ["available", "busy", "offline"], default: "available" },
    // Added so the rider has their own login.
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    zone: { type: String, default: "Kathmandu" },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const foodItemSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: "restaurant", required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    available: { type: Boolean, default: true },
    image: String
}, { versionKey: false });

const orderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "restaurant", required: true },
    orderDate: { type: Date, default: Date.now },
    deliveryType: { type: String, enum: ["delivery", "pickup"], required: true },
    deliveryAddress: String,
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"],
        default: "pending"
    },
    orderNumber: { type: String, unique: true },
    note: String
}, { versionKey: false });

const orderItemSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "order", required: true },
    foodItemId: { type: Schema.Types.ObjectId, ref: "foodItem", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    itemName: String
}, { versionKey: false });

const paymentSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["eSewa", "Khalti", "Card", "Cash on Delivery"], required: true },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    paymentDate: Date,
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const deliverySchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "order", required: true },
    riderId: { type: Schema.Types.ObjectId, ref: "rider", required: true },
    pickupLocation: String,
    deliveryLocation: String,
    status: {
        type: String,
        enum: ["assigned", "preparing", "out_for_delivery", "delivered", "cancelled"],
        default: "assigned"
    },
    trackingStatus: String,
    createdAt: { type: Date, default: Date.now },
    deliveredAt: Date
}, { versionKey: false });

const notificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "user" },
    orderId: { type: Schema.Types.ObjectId, ref: "order" },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["order_update", "pickup_ready", "delivery_update", "payment_update", "new_order"]
    },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    // So restaurants, riders, and admin get their own inbox.
    audience: { type: String, enum: ["customer", "restaurant", "rider", "admin"], required: true },
    audienceId: { type: Schema.Types.ObjectId, required: true }
}, { versionKey: false });

const reviewSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "restaurant", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "order", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    authorName: String,
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

function model(name, schema) {
    return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
    Usermodel: model("user", userSchema),
    Restaurantmodel: model("restaurant", restaurantSchema),
    Adminmodel: model("admin", adminSchema),
    Ridermodel: model("rider", riderSchema),
    FoodItemmodel: model("foodItem", foodItemSchema),
    Ordermodel: model("order", orderSchema),
    OrderItemmodel: model("orderItem", orderItemSchema),
    Paymentmodel: model("payment", paymentSchema),
    Deliverymodel: model("delivery", deliverySchema),
    Notificationmodel: model("notification", notificationSchema),
    Reviewmodel: model("review", reviewSchema)
};
