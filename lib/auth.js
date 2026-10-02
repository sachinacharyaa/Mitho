const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const SECRET = process.env.AUTH_SECRET || "mitho-local-secret";

function sign(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
    return `${body}.${sig}`;
}

function verify(token) {
    try {
        if (!token || !token.includes(".")) return null;
        const [body, sig] = token.split(".");
        const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
        const data = JSON.parse(Buffer.from(body, "base64url").toString());
        if (!data.exp || Date.now() > data.exp) return null;
        return data;
    } catch {
        return null;
    }
}

function issue(role, id) {
    return sign({ role, id: String(id), exp: Date.now() + 1000 * 60 * 60 * 24 * 12 });
}

module.exports = { bcrypt, verify, issue };
