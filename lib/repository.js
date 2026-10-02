const mongoose = require("mongoose");
const models = require("../models");
const db = require("./db");

const memory = {
    users: [],
    restaurants: [],
    admins: [],
    riders: [],
    foodItems: [],
    orders: [],
    orderItems: [],
    payments: [],
    deliveries: [],
    notifications: [],
    reviews: []
};

const mongoModels = {
    users: models.Usermodel,
    restaurants: models.Restaurantmodel,
    admins: models.Adminmodel,
    riders: models.Ridermodel,
    foodItems: models.FoodItemmodel,
    orders: models.Ordermodel,
    orderItems: models.OrderItemmodel,
    payments: models.Paymentmodel,
    deliveries: models.Deliverymodel,
    notifications: models.Notificationmodel,
    reviews: models.Reviewmodel
};

function usingMongo() {
    return db.getMode() === "mongodb";
}

function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
}

function plain(doc) {
    if (!doc) return null;
    const raw = doc.toObject ? doc.toObject({ versionKey: false }) : doc;
    return clone(raw);
}

function match(doc, query) {
    return Object.entries(query).every(([key, value]) => String(doc[key] ?? "") === String(value));
}

function normalizeError(error) {
    if (!error || error.status) return error;
    if (error.code === 11000) {
        const err = new Error("That email is already registered");
        err.status = 409;
        return err;
    }
    if (error.name === "ValidationError") {
        const message = Object.values(error.errors || {})[0]?.message || "Invalid data";
        const err = new Error(message);
        err.status = 400;
        return err;
    }
    return error;
}

function newId() {
    return new mongoose.Types.ObjectId().toString();
}

async function insert(collection, doc) {
    try {
        const row = { ...doc };
        if (!row.createdAt) row.createdAt = new Date().toISOString();
        if (!usingMongo()) {
            row._id = row._id || newId();
            memory[collection].push(clone(row));
            return clone(row);
        }
        const saved = await mongoModels[collection].create(row);
        return plain(saved);
    } catch (error) {
        throw normalizeError(error);
    }
}

async function find(collection, query = {}) {
    if (!usingMongo()) {
        return memory[collection].filter((doc) => match(doc, query)).map(clone);
    }
    const rows = await mongoModels[collection].find(query);
    return rows.map(plain);
}

async function findOne(collection, query) {
    const rows = await find(collection, query);
    return rows[0] || null;
}

async function findById(collection, id) {
    if (!id) return null;
    if (!usingMongo()) return findOne(collection, { _id: String(id) });
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const row = await mongoModels[collection].findById(id);
    return plain(row);
}

async function updateById(collection, id, patch) {
    try {
        const next = { ...patch };
        delete next._id;
        if (!usingMongo()) {
            const row = memory[collection].find((doc) => String(doc._id) === String(id));
            if (!row) return null;
            Object.assign(row, clone(next));
            return clone(row);
        }
        const row = await mongoModels[collection].findByIdAndUpdate(id, next, { new: true, runValidators: true });
        return plain(row);
    } catch (error) {
        throw normalizeError(error);
    }
}

async function deleteById(collection, id) {
    if (!usingMongo()) {
        const index = memory[collection].findIndex((doc) => String(doc._id) === String(id));
        if (index >= 0) memory[collection].splice(index, 1);
        return;
    }
    await mongoModels[collection].findByIdAndDelete(id);
}

async function count(collection, query = {}) {
    if (!usingMongo()) return memory[collection].filter((doc) => match(doc, query)).length;
    return mongoModels[collection].countDocuments(query);
}

module.exports = { insert, find, findOne, findById, updateById, deleteById, count };
