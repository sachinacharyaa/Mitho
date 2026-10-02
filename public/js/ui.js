const App = window.App = {
    state: {
        user: null,
        health: null,
        restaurants: [],
        q: "",
        cuisine: "All",
        openOnly: false,
        sort: "rating",
        cart: null,
        currentRestaurant: null
    },
    actions: {},
    forms: {},
    inputs: {},
    STATUS: {
        pending: ["Placed", "wait"],
        confirmed: ["Confirmed", "info"],
        preparing: ["Cooking", "cook"],
        ready_for_pickup: ["Ready", "ready"],
        out_for_delivery: ["On the way", "go"],
        delivered: ["Delivered", "done"],
        cancelled: ["Cancelled", "stop"]
    },
    DEMOS: {
        customer: ["aarav@mitho.com", "mitho123"],
        restaurant: ["kitchen@momohouse.com", "mitho123"]
    }
};

try {
    App.state.cart = JSON.parse(localStorage.getItem("mitho_cart")) || null;
} catch {
    App.state.cart = null;
}

App.esc = function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
};

App.npr = function npr(value) {
    return "Rs. " + Math.round(Number(value) || 0).toLocaleString("en-IN");
};

App.title = function title(text) {
    document.title = text ? `${text} · Mitho` : "Mitho";
};

App.toast = function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(App._toast);
    App._toast = setTimeout(() => { el.hidden = true; }, 2800);
};

App.homeFor = function homeFor(role) {
    if (role === "restaurant") return "#/kitchen";
    return "#/app";
};

App.cartCount = function cartCount() {
    return (App.state.cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
};

App.cartTotal = function cartTotal() {
    return (App.state.cart?.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
};

App.saveCart = function saveCart() {
    if (!App.state.cart?.items?.length) {
        App.state.cart = null;
        localStorage.removeItem("mitho_cart");
    } else {
        localStorage.setItem("mitho_cart", JSON.stringify(App.state.cart));
    }
    const badge = document.getElementById("cart-count");
    if (!badge) return;
    const count = App.cartCount();
    badge.textContent = count;
    badge.hidden = count === 0;
};

App.mark = function mark() {
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#D6452C"/><path d="M8 14h16c0 6.2-3.6 10-8 10s-8-3.8-8-10z" fill="#fff"/><path d="M11.5 13.2c1.4-3 7.6-3 9 0" fill="none" stroke="#E6A23C" stroke-width="1.7" stroke-linecap="round"/></svg>`;
};

App.logo = function logo() {
    return `<span class="brand">${App.mark()}<span>mitho</span></span>`;
};

App.initial = function initial(name) {
    return App.esc((name || "?").trim().charAt(0).toUpperCase());
};

App.when = function when(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-NP", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

App.timeAgo = function timeAgo(value) {
    const seconds = (Date.now() - new Date(value).getTime()) / 1000;
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} d ago`;
};

App.pill = function pill(status) {
    const meta = App.STATUS[status] || [status, "wait"];
    return `<span class="pill tone-${meta[1]}">${App.esc(meta[0])}</span>`;
};

App.payPill = function payPill(status) {
    const map = { pending: ["Due", "wait"], paid: ["Paid", "done"], failed: ["Failed", "stop"], refunded: ["Refunded", "info"] };
    const meta = map[status] || [status, "wait"];
    return `<span class="pill tone-${meta[1]}">${App.esc(meta[0])}</span>`;
};

App.emojiFor = function emojiFor(text) {
    const name = String(text || "").toLowerCase();
    if (name.includes("momo") || name.includes("dumpling")) return "🥟";
    if (name.includes("pizza")) return "🍕";
    if (name.includes("burger")) return "🍔";
    if (name.includes("sushi") || name.includes("nigiri") || name.includes("maki") || name.includes("roll") || name.includes("japanese")) return "🍣";
    if (name.includes("biryani") || name.includes("indian") || name.includes("thakali") || name.includes("dal")) return "🍛";
    if (name.includes("tea") || name.includes("chiya") || name.includes("cafe") || name.includes("coffee")) return "🍵";
    if (name.includes("noodle") || name.includes("thukpa")) return "🍜";
    if (name.includes("cake") || name.includes("dessert") || name.includes("tiramisu")) return "🍰";
    return "🍽️";
};

App.safeImage = function safeImage(src) {
    try {
        const url = new URL(src);
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
};

App.photo = function photo(src, emoji, className = "") {
    const safe = App.safeImage(src);
    return `<div class="photo ${className}" data-emoji="${App.esc(emoji)}">${safe ? `<img alt="" src="${App.esc(safe)}" data-fallback="1" />` : ""}</div>`;
};

App.accent = function accent(value) {
    return /^#[0-9A-Fa-f]{6}$/.test(value || "") ? ` style="--card-accent:${value}"` : "";
};

App.restaurantCard = function restaurantCard(restaurant) {
    const closed = restaurant.status !== "open";
    return `<a class="r-card ${closed ? "is-closed" : ""}" href="#/r/${restaurant.id}">
      <div class="photo photo-lg"${App.accent(restaurant.accent)} data-emoji="${App.emojiFor(restaurant.cuisine)}">
        ${App.safeImage(restaurant.coverImage || restaurant.image) ? `<img alt="" src="${App.esc(restaurant.coverImage || restaurant.image)}" data-fallback="1" />` : ""}
      </div>
      <div class="r-card-body">
        <div class="r-card-top"><h3>${App.esc(restaurant.name)}</h3><span class="rating">★ ${Number(restaurant.rating || 0).toFixed(1)}</span></div>
        <p class="muted small">${App.esc(restaurant.cuisine || "Kitchen")} · ${App.esc(restaurant.address)}</p>
        <div class="r-meta">
          <span class="small">${restaurant.etaMinutes || 30} min</span>
          <span class="small">${restaurant.deliveryFee ? App.npr(restaurant.deliveryFee) + " delivery" : "Free delivery"}</span>
          <span class="pill ${closed ? "tone-stop" : "tone-done"}">${closed ? "Closed" : "Open"}</span>
        </div>
      </div>
    </a>`;
};

App.timeline = function timeline(order) {
    if (order.status === "cancelled") return `<div>${App.pill("cancelled")}</div>`;
    const steps = order.deliveryType === "pickup"
        ? [["pending", "Placed"], ["confirmed", "Confirmed"], ["preparing", "Cooking"], ["ready_for_pickup", "Ready"], ["delivered", "Picked up"]]
        : [["pending", "Placed"], ["confirmed", "Confirmed"], ["preparing", "Cooking"], ["ready_for_pickup", "Ready"], ["out_for_delivery", "On the way"], ["delivered", "Delivered"]];
    const index = steps.findIndex((step) => step[0] === order.status);
    return `<div class="timeline">${steps.map((step, i) => `<div class="step ${i <= index ? "on" : ""}">${App.esc(step[1])}</div>`).join("")}</div>`;
};

App.empty = function empty(emoji, title, text, action = "") {
    return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${App.esc(title)}</h3><p class="muted">${App.esc(text)}</p><div style="margin-top:14px">${action}</div></div>`;
};

App.dbBanner = function dbBanner() {
    const health = App.state.health;
    if (!health?.error) return "";
    return `<div class="banner warn">MongoDB didn’t connect (${App.esc(health.error)}). This server is using temporary data.</div>`;
};

App.dbFooter = function dbFooter() {
    const health = App.state.health;
    if (health?.db === "mongodb") return "Database · MongoDB";
    return "Database · temporary memory · paste a MongoDB link into mongo.uri and restart";
};

App.publicShell = function publicShell(content, extra = {}) {
    const banner = extra.banner ? `<div class="banner">${App.esc(extra.banner)} <a href="${extra.href}">${App.esc(extra.label || "Continue")}</a></div>` : "";
    return `${App.dbBanner()}${banner}
      <header class="topbar"><div class="wrap topbar-inner">
        <a href="#/">${App.logo()}</a>
        <nav>
          <a href="#/browse">Browse</a>
          <a href="#/login/customer">Log in</a>
          <a class="btn btn-primary btn-small" href="#/signup/customer">Sign up</a>
        </nav>
      </div></header>
      <main class="wrap page">${content}</main>
      <footer class="site-foot">${App.dbFooter()}</footer>`;
};

App.customerShell = function customerShell(active, content, unread = 0) {
    const user = App.state.user;
    const count = App.cartCount();
    const link = (id, href, label, extra = "") => `<a href="${href}" class="${active === id ? "on" : ""}">${label}${extra}</a>`;
    return `${App.dbBanner()}
      <header class="topbar"><div class="wrap topbar-inner">
        <a href="#/app">${App.logo()}</a>
        <nav>
          ${link("home", "#/app", "<span>Kitchens</span>")}
          ${link("orders", "#/app/orders", "<span>Orders</span>")}
          ${link("notifications", "#/app/notifications", `<span>Alerts</span>${unread ? `<i class="badge">${unread}</i>` : ""}`)}
          <a href="#/cart"><span>Tray</span>${count ? `<i class="badge" id="cart-count">${count}</i>` : `<i class="badge" id="cart-count" hidden>0</i>`}</a>
          <a href="#/app/profile" class="avatar" title="${App.esc(user?.name || "")}">${App.initial(user?.name)}</a>
          <button class="btn btn-line btn-small" type="button" data-action="logout">Sign out</button>
        </nav>
      </div></header>
      <main class="wrap page">${content}</main>
      <footer class="site-foot">${App.dbFooter()}</footer>`;
};

App.marketShell = function marketShell(active, content, unread = 0) {
    const role = App.state.user?.role;
    if (!role) return App.publicShell(content);
    if (role === "customer") return App.customerShell(active, content, unread);
    return App.publicShell(content, {
        banner: `You're signed in as ${App.state.user.name}.`,
        href: App.homeFor(role),
        label: "Back to your desk"
    });
};

App.workspace = function workspace({ active, links, content }) {
    const user = App.state.user || {};
    return `${App.dbBanner()}<div class="workspace">
      <aside class="side">
        <a href="${links[0].href}">${App.logo()}</a>
        <nav>${links.map((link) => `<a class="navitem ${link.id === active ? "active" : ""}" href="${link.href}">${App.esc(link.label)}</a>`).join("")}</nav>
        <div class="side-user">
          <strong>${App.esc(user.name || "")}</strong>
          <span class="small">${App.esc(user.email || "")}</span>
          <button class="btn btn-line btn-small" type="button" data-action="logout">Sign out</button>
        </div>
      </aside>
      <div class="workspace-main"><div class="workspace-content">${content}</div></div>
    </div>`;
};

App.passwordForm = function passwordForm() {
    return `<form class="form-stack" data-form="password" novalidate>
      <h3>Change password</h3>
      <label class="field"><span>Current password</span><input name="currentPassword" type="password" required /></label>
      <label class="field"><span>New password</span><input name="newPassword" type="password" required minlength="6" /></label>
      <p class="form-error"></p>
      <button class="btn btn-dark" type="submit">Update password</button>
    </form>`;
};

App.openModal = function openModal(html) {
    document.getElementById("modal-root").innerHTML = `<div class="overlay">${html}</div>`;
    document.body.classList.add("modal-open");
    const focus = document.querySelector("#modal-root input, #modal-root select, #modal-root textarea, #modal-root button");
    if (focus) focus.focus();
};

App.closeModal = function closeModal(result) {
    if (App._ask) {
        const resolve = App._ask;
        App._ask = null;
        resolve(result === true);
    }
    document.getElementById("modal-root").innerHTML = "";
    document.body.classList.remove("modal-open");
};

App.ask = function ask(title, text, confirmLabel = "Confirm") {
    return new Promise((resolve) => {
        App._ask = resolve;
        App.openModal(`<div class="sheet" data-stop>
          <h3>${App.esc(title)}</h3>
          <p class="muted" style="margin:8px 0 16px">${App.esc(text)}</p>
          <div class="row-actions">
            <button class="btn btn-line" type="button" data-action="ask-no">Cancel</button>
            <button class="btn btn-primary" type="button" data-action="ask-yes">${App.esc(confirmLabel)}</button>
          </div>
        </div>`);
    });
};

App.formError = function formError(form, message) {
    const el = form.querySelector(".form-error");
    if (el) el.textContent = message || "";
};

App.actions["ask-yes"] = () => App.closeModal(true);
App.actions["ask-no"] = () => App.closeModal(false);
App.actions["logout"] = () => {
    localStorage.removeItem("mitho_token");
    App.state.user = null;
    location.hash = "#/";
    App.toast("Signed out");
};

App.filteredRestaurants = function filteredRestaurants() {
    const query = App.state.q.trim().toLowerCase();
    let rows = App.state.restaurants.slice();
    if (App.state.cuisine !== "All") rows = rows.filter((row) => row.cuisine === App.state.cuisine);
    if (App.state.openOnly) rows = rows.filter((row) => row.status === "open");
    if (query) {
        rows = rows.filter((row) => `${row.name} ${row.cuisine} ${row.address}`.toLowerCase().includes(query));
    }
    rows.sort((a, b) => {
        if (App.state.sort === "time") return (a.etaMinutes || 99) - (b.etaMinutes || 99);
        return (b.rating || 0) - (a.rating || 0);
    });
    return rows;
};
