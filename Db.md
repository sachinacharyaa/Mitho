MONGO, SCHEMA AND MODEL 
const mongoose = require("mongoose");
const { Schema } = mongoose;


// ===============================
// 1. USER / CUSTOMER
// ===============================

const userSchema = new Schema({
    userId: {
        type: String,
        unique: true,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true
    },

    phone: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["customer"],
        default: "customer"
    },

    address: String,

    createdAt: {
        type: Date,
        default: Date.now
    }
});


// ===============================
// 2. RESTAURANT
// ===============================

const restaurantSchema = new Schema({
    restaurantId: {
        type: String,
        unique: true,
        required: true
    },

    ownerUserId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    name: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    phone: String,

    cuisine: String,

    status: {
        type: String,
        enum: ["open", "closed"],
        default: "open"
    },

    rating: {
        type: Number,
        default: 0
    }
});


// ===============================
// 3. ADMINISTRATOR
// ===============================

const adminSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    firstName: String,

    lastName: String,

    role: {
        type: String,
        default: "admin"
    }
});


// ===============================
// 4. RIDER
// ===============================

const riderSchema = new Schema({
    riderId: {
        type: String,
        unique: true,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    vehicleType: String,

    vehicleNumber: String,

    status: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "available"
    }
});


// ===============================
// 5. FOOD ITEM / MENU
// ===============================

const foodItemSchema = new Schema({
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },

    name: {
        type: String,
        required: true
    },

    description: String,

    price: {
        type: Number,
        required: true
    },

    category: String,

    available: {
        type: Boolean,
        default: true
    }
});


// ===============================
// 6. ORDER
// ===============================

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },

    orderDate: {
        type: Date,
        default: Date.now
    },

    deliveryType: {
        type: String,
        enum: ["delivery", "pickup"],
        required: true
    },

    deliveryAddress: String,

    subtotal: {
        type: Number,
        required: true
    },

    deliveryFee: {
        type: Number,
        default: 0
    },

    totalAmount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "confirmed",
            "preparing",
            "ready_for_pickup",
            "out_for_delivery",
            "delivered",
            "cancelled"
        ],
        default: "pending"
    }
});


// ===============================
// 7. ORDER ITEM
// ===============================

// Which food items belong to which order?

const orderItemSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "order",
        required: true
    },

    foodItemId: {
        type: Schema.Types.ObjectId,
        ref: "foodItem",
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    unitPrice: {
        type: Number,
        required: true
    },

    totalPrice: {
        type: Number,
        required: true
    }
});


// ===============================
// 8. PAYMENT
// ===============================

const paymentSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "order",
        required: true
    },

    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    method: {
        type: String,
        enum: [
            "eSewa",
            "Khalti",
            "Card",
            "Cash on Delivery"
        ],
        required: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "paid",
            "failed",
            "refunded"
        ],
        default: "pending"
    },

    paymentDate: {
        type: Date
    }
});


// ===============================
// 9. DELIVERY
// ===============================

const deliverySchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "order",
        required: true
    },

    riderId: {
        type: Schema.Types.ObjectId,
        ref: "rider",
        required: true
    },

    pickupLocation: String,

    deliveryLocation: String,

    status: {
        type: String,
        enum: [
            "assigned",
            "preparing",
            "out_for_delivery",
            "delivered",
            "cancelled"
        ],
        default: "assigned"
    },

    trackingStatus: String
});


// ===============================
// 10. NOTIFICATION
// ===============================

const notificationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    orderId: {
        type: Schema.Types.ObjectId,
        ref: "order"
    },

    message: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: [
            "order_update",
            "pickup_ready",
            "delivery_update",
            "payment_update"
        ]
    },

    isRead: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


// ===============================
// MODELS
// ===============================

const Usermodel = mongoose.model("user", userSchema);

const Restaurantmodel =
    mongoose.model("restaurant", restaurantSchema);

const Adminmodel =
    mongoose.model("admin", adminSchema);

const Ridermodel =
    mongoose.model("rider", riderSchema);

const FoodItemmodel =
    mongoose.model("foodItem", foodItemSchema);

const Ordermodel =
    mongoose.model("order", orderSchema);

const OrderItemmodel =
    mongoose.model("orderItem", orderItemSchema);

const Paymentmodel =
    mongoose.model("payment", paymentSchema);

const Deliverymodel =
    mongoose.model("delivery", deliverySchema);

const Notificationmodel =
    mongoose.model("notification", notificationSchema);


// ===============================
// EXPORT MODELS
// ===============================

module.exports = {
    Usermodel,
    Restaurantmodel,
    Adminmodel,
    Ridermodel,
    FoodItemmodel,
    Ordermodel,
    OrderItemmodel,
    Paymentmodel,
    Deliverymodel,
    Notificationmodel
};
