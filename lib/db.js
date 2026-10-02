const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

let mode = "memory";
let error = null;

function firstLink(text) {
    for (const line of String(text || "").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        return trimmed.replace(/^['"]|['"]$/g, "");
    }
    return "";
}

function readUri() {
    if (process.env.MONGO_URI && process.env.MONGO_URI.trim()) {
        return process.env.MONGO_URI.trim().replace(/^['"]|['"]$/g, "");
    }
    const file = path.join(__dirname, "..", "mongo.uri");
    try {
        return firstLink(fs.readFileSync(file, "utf8"));
    } catch {
        return "";
    }
}

async function init() {
    const uri = readUri();
    if (!uri) {
        mode = "memory";
        error = null;
        return;
    }
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
        mode = "memory";
        error = "mongo.uri needs a mongodb:// or mongodb+srv:// link";
        return;
    }
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
        mode = "mongodb";
        error = null;
    } catch (err) {
        mode = "memory";
        error = err.message || "Could not connect to MongoDB";
    }
}

module.exports = {
    init,
    getMode: () => mode,
    getError: () => error
};
