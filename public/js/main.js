let renderToken = 0;
let poll = null;

function stopPoll() {
    if (poll) clearInterval(poll);
    poll = null;
}

function requireRole(role) {
    const user = App.state.user;
    if (!user) {
        sessionStorage.setItem("mitho_next", location.hash || "#/app");
        const target = role === "admin" ? "#/admin" : `#/login/${role}`;
        if (location.hash !== target) location.hash = target;
        const error = new Error("REDIRECT");
        error.code = "REDIRECT";
        throw error;
    }
    if (user.role !== role) {
        App.toast("That desk belongs to another login.");
        const target = App.homeFor(user.role);
        if (location.hash !== target) location.hash = target;
        const error = new Error("REDIRECT");
        error.code = "REDIRECT";
        throw error;
    }
}

async function routeView() {
    const parts = location.hash.replace(/^#/, "").split("/").filter(Boolean);
    const [area, second, third, fourth] = parts;
    if (!area) return App.viewLanding();
    if (area === "login" || area === "signup") return App.viewAuth(area, second || "customer");
    if (area === "browse") return App.viewExplore(false);
    if (area === "r" && second) return App.viewRestaurant(second);
    if (area === "cart") return App.viewCart();
    if (area === "checkout") {
        requireRole("customer");
        return App.viewCheckout();
    }
    if (area === "app") {
        requireRole("customer");
        if (!second) return App.viewExplore(true);
        if (second === "orders" && third) return App.viewOrder(third, fourth === "fresh");
        if (second === "orders") return App.viewOrders();
        if (second === "profile") return App.viewProfile();
    }
    if (area === "kitchen") {
        requireRole("restaurant");
        if (!second) return App.viewKitchen();
        if (second === "orders") return App.viewKitchenOrders();
        if (second === "menu") return App.viewKitchenMenu();
        if (second === "settings") return App.viewKitchenSettings();
    }
    if (area === "ride") {
        requireRole("rider");
        if (!second) return App.viewRide();
        if (second === "jobs") return App.viewRideJobs();
        if (second === "history") return App.viewRideHistory();
    }
    if (area === "admin") {
        // Invite gate: #/admin works without being listed on the public site.
        if (!App.state.user) return App.viewAdminInvite();
        requireRole("admin");
        if (!second) return App.viewAdmin();
        if (second === "orders") return App.viewAdminOrders();
        if (second === "customers") return App.viewAdminCustomers();
        if (second === "restaurants") return App.viewAdminRestaurants();
        if (second === "riders") return App.viewAdminRiders();
        if (second === "payments") return App.viewAdminPayments();
    }
    App.title("Not found");
    return `<div class="center-screen"><div class="panel" style="padding:28px"><h1>That page isn't on the menu</h1><a class="btn btn-primary" href="#/" style="margin-top:12px">Back home</a></div></div>`;
}

App.render = async function render() {
    const token = ++renderToken;
    stopPoll();
    App.closeModal();
    const root = document.getElementById("app");
    try {
        const html = await routeView();
        if (token !== renderToken) return;
        root.innerHTML = html;
        window.scrollTo(0, 0);
        const hash = location.hash;
        const adminDesk = App.state.user?.role === "admin" && (hash === "#/admin" || hash.startsWith("#/admin/"));
        if (hash === "#/kitchen" || hash === "#/kitchen/orders" || hash === "#/ride/jobs" || hash.startsWith("#/app/orders/") || adminDesk) {
            poll = setInterval(() => {
                const active = document.activeElement;
                if (document.querySelector(".overlay")) return;
                if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
                App.render();
            }, 12000);
        }
    } catch (error) {
        if (error.code === "REDIRECT" || token !== renderToken) return;
        root.innerHTML = `<div class="center-screen"><div class="panel" style="padding:28px;max-width:460px"><h1>Something simmered over</h1><p class="muted" style="margin:10px 0 16px">${App.esc(error.message)}</p><a class="btn btn-primary" href="#/">Back home</a></div></div>`;
    }
};

document.addEventListener("click", async (event) => {
    if (event.target.classList?.contains("overlay")) {
        App.closeModal(false);
        return;
    }
    const el = event.target.closest("[data-action]");
    if (!el || !App.actions[el.dataset.action]) return;
    try {
        await App.actions[el.dataset.action](el, event);
    } catch (error) {
        App.toast(error.message || "Something went wrong");
    }
});

document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.form) return;
    event.preventDefault();
    try {
        await App.forms[form.dataset.form](form);
    } catch (error) {
        App.formError(form, error.message || "Something went wrong");
    }
});

document.addEventListener("input", (event) => {
    const name = event.target.dataset.input;
    if (name && App.inputs[name]) App.inputs[name](event.target, event);
});

document.addEventListener("change", (event) => {
    const name = event.target.dataset.change || event.target.dataset.input;
    if (name && App.inputs[name]) App.inputs[name](event.target, event);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") App.closeModal(false);
});

document.addEventListener("error", (event) => {
    const target = event.target;
    if (target && target.tagName === "IMG" && target.dataset.fallback) target.remove();
}, true);

window.addEventListener("hashchange", () => App.render());

async function boot() {
    const token = localStorage.getItem("mitho_token");
    if (token) {
        try {
            const data = await API.get("/api/auth/me");
            App.state.user = data.user;
        } catch {
            localStorage.removeItem("mitho_token");
            App.state.user = null;
        }
    }
    try {
        App.state.health = await API.get("/api/health");
    } catch {
        App.state.health = null;
    }
    await App.render();
}

boot();
