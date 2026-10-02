App.kitchenLinks = [
    { id: "home", href: "#/kitchen", label: "Overview" },
    { id: "orders", href: "#/kitchen/orders", label: "Orders" },
    { id: "menu", href: "#/kitchen/menu", label: "Menu" },
    { id: "notifications", href: "#/kitchen/notifications", label: "Alerts" },
    { id: "settings", href: "#/kitchen/settings", label: "Settings" }
];

function kitchenActions(order) {
    const id = order.id;
    const button = (status, label, danger) => `<button class="btn ${danger ? "btn-danger" : "btn-primary"} btn-small" type="button" data-action="kitchen-status" data-id="${id}" data-status="${status}">${label}</button>`;
    if (order.status === "pending") return button("confirmed", "Confirm") + button("cancelled", "Decline", true);
    if (order.status === "confirmed") return button("preparing", "Start cooking") + button("cancelled", "Cancel", true);
    if (order.status === "preparing") return button("ready_for_pickup", order.deliveryType === "pickup" ? "Ready for pickup" : "Ready for rider") + button("cancelled", "Cancel", true);
    if (order.status === "ready_for_pickup" && order.deliveryType === "pickup") return button("delivered", "Customer picked up");
    if (order.status === "ready_for_pickup" && order.rider) return `<p class="small muted">${App.esc(order.rider.name)} · ${App.esc(order.rider.phone)} is assigned.</p>`;
    if (order.status === "ready_for_pickup") return `<p class="small muted">Waiting for a rider.</p>`;
    if (order.status === "out_for_delivery" && order.rider) return `<p class="small muted">${App.esc(order.rider.name)} is on the way.</p>`;
    return "";
}

function kitchenOrderCard(order) {
    return `<article class="order-card" data-order="${order.id}">
      <div class="spread"><div><strong>${App.esc(order.orderNumber)}</strong><div class="small muted">${App.esc(order.customer?.name || "")} · ${App.esc(order.customer?.phone || "")} · ${App.timeAgo(order.orderDate)}</div></div>${App.pill(order.status)}</div>
      <div class="lines">${(order.items || []).map((item) => `<div>${item.quantity} × ${App.esc(item.itemName)}</div>`).join("")}</div>
      ${order.note ? `<div class="note">${App.esc(order.note)}</div>` : ""}
      <div class="spread"><span>${order.deliveryType === "pickup" ? "Pickup" : App.esc(order.deliveryAddress || "Delivery")} · ${App.esc(order.payment?.method || "")} ${order.payment ? App.payPill(order.payment.status) : ""}</span><strong>${App.npr(order.totalAmount)}</strong></div>
      <div class="row-actions">${kitchenActions(order)}</div>
    </article>`;
}

App.viewKitchen = async function viewKitchen() {
    App.title("Kitchen");
    const data = await API.get("/api/kitchen");
    App.state.user = data.user;
    const active = data.orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
    const revenue = data.orders.filter((order) => order.payment?.status === "paid").reduce((sum, order) => sum + order.totalAmount, 0);
    const content = `<div class="page-head"><div><p class="eyebrow">${App.esc(data.user.cuisine || "Kitchen")}</p><h1>${App.esc(data.user.name)}</h1></div>
      <button class="switch ${data.user.status === "open" ? "on" : ""}" type="button" data-action="kitchen-toggle" data-status="${data.user.status}"><i></i> ${data.user.status === "open" ? "Open for orders" : "Closed"}</button></div>
      <div class="stats">
        <article class="stat"><b>${active.length}</b><span>Open tickets</span></article>
        <article class="stat"><b>${data.orders.length}</b><span>All orders</span></article>
        <article class="stat"><b>${App.npr(revenue)}</b><span>Paid on these orders</span></article>
        <article class="stat"><b>★ ${Number(data.user.rating || 0).toFixed(1)}</b><span>${data.user.ratingCount || 0} ratings</span></article>
      </div>
      <h2 style="margin-bottom:12px">Needs you</h2>
      <div class="order-list" id="order-list">${active.length ? active.map(kitchenOrderCard).join("") : App.empty("🍳", "No live tickets", "New orders show up here.")}</div>`;
    return App.workspace({ active: "home", links: App.kitchenLinks, content });
};

App.viewKitchenOrders = async function viewKitchenOrders() {
    App.title("Orders");
    const data = await API.get("/api/kitchen");
    const content = `<div class="page-head"><div><p class="eyebrow">Tickets</p><h1>Orders</h1></div></div>
      <div class="order-list" id="order-list">${data.orders.length ? data.orders.map(kitchenOrderCard).join("") : App.empty("🧾", "No orders yet", "They'll appear as soon as someone orders.")}</div>`;
    return App.workspace({ active: "orders", links: App.kitchenLinks, content });
};

function menuForm(item) {
    const value = item || {};
    return `<form class="sheet form-stack" data-form="menu" data-stop novalidate>
      <h3>${item ? "Edit dish" : "Add a dish"}</h3>
      <input type="hidden" name="id" value="${App.esc(value.id || "")}" />
      <label class="field"><span>Name</span><input name="name" value="${App.esc(value.name || "")}" required /></label>
      <label class="field"><span>Description</span><textarea name="description">${App.esc(value.description || "")}</textarea></label>
      <label class="field"><span>Price (Rs.)</span><input name="price" type="number" min="1" value="${value.price ?? ""}" required /></label>
      <label class="field"><span>Category</span><input name="category" value="${App.esc(value.category || "")}" placeholder="Momo, Drinks, Mains" /></label>
      <label class="field"><span>Image link (https)</span><input name="image" value="${App.esc(value.image || "")}" placeholder="https://" /></label>
      <label class="check"><input type="checkbox" name="available" ${value.available === false ? "" : "checked"} /> Available</label>
      <p class="form-error"></p>
      <div class="row-actions"><button class="btn btn-line" type="button" data-action="ask-no">Close</button><button class="btn btn-primary" type="submit">Save dish</button></div>
    </form>`;
}

App.viewKitchenMenu = async function viewKitchenMenu() {
    App.title("Menu");
    const [user, menu] = await Promise.all([API.get("/api/auth/me"), API.get(`/api/restaurants/${App.state.user.id}/menu`)]);
    App.state.user = user.user;
    App.state.menu = menu;
    const content = `<div class="page-head"><div><p class="eyebrow">Dishes</p><h1>Menu</h1></div><button class="btn btn-primary" type="button" data-action="menu-new">Add dish</button></div>
      ${menu.length ? menu.map((food) => `<article class="dish">
        ${App.photo(food.image, App.emojiFor(food.name), "photo-sm")}
        <div><strong>${App.esc(food.name)}</strong><p class="muted small">${App.esc(food.category || "Menu")} · ${App.esc(food.description || "")}</p></div>
        <div class="price-col"><div class="price">${App.npr(food.price)}</div>
          <div class="row-actions">
            <button class="btn btn-line btn-small" type="button" data-action="menu-toggle" data-id="${food.id}" data-available="${food.available ? "1" : "0"}">${food.available ? "Mark sold out" : "Make available"}</button>
            <button class="btn btn-line btn-small" type="button" data-action="menu-edit" data-id="${food.id}">Edit</button>
            <button class="btn btn-danger btn-small" type="button" data-action="menu-delete" data-id="${food.id}">Remove</button>
          </div>
        </div>
      </article>`).join("") : App.empty("🥘", "The menu is empty", "Add the first dish so people can order.", `<button class="btn btn-primary" type="button" data-action="menu-new">Add dish</button>`)}`;
    return App.workspace({ active: "menu", links: App.kitchenLinks, content });
};

App.viewKitchenSettings = async function viewKitchenSettings() {
    App.title("Kitchen settings");
    const user = (await API.get("/api/auth/me")).user;
    App.state.user = user;
    const content = `<div class="page-head"><div><p class="eyebrow">Kitchen</p><h1>Settings</h1></div></div>
      <div class="split">
        <form class="panel form-stack" style="position:static" data-form="kitchen-settings" novalidate>
          <label class="field"><span>Restaurant name</span><input name="name" value="${App.esc(user.name)}" required /></label>
          <label class="field"><span>Your name</span><input name="ownerName" value="${App.esc(user.ownerName || "")}" required /></label>
          <label class="field"><span>Email</span><input value="${App.esc(user.email)}" disabled /></label>
          <label class="field"><span>Phone</span><input name="phone" value="${App.esc(user.phone || "")}" required /></label>
          <label class="field"><span>Address</span><input name="address" value="${App.esc(user.address || "")}" required /></label>
          <label class="field"><span>Cuisine</span><input name="cuisine" value="${App.esc(user.cuisine || "")}" required /></label>
          <label class="field"><span>Delivery fee</span><input name="deliveryFee" type="number" min="0" value="${user.deliveryFee ?? 60}" required /></label>
          <label class="field"><span>Typical ETA (minutes)</span><input name="etaMinutes" type="number" min="5" value="${user.etaMinutes || 30}" required /></label>
          <p class="form-error"></p>
          <button class="btn btn-primary" type="submit">Save kitchen</button>
        </form>
        <div class="panel" style="position:static">${App.passwordForm()}</div>
      </div>`;
    return App.workspace({ active: "settings", links: App.kitchenLinks, content });
};

App.actions["kitchen-toggle"] = async function toggleKitchen(el) {
    const status = el.dataset.status === "open" ? "closed" : "open";
    const result = await API.patch("/api/kitchen", { status });
    App.state.user = result.user;
    App.toast(status === "open" ? "You're open" : "You're closed");
    App.render();
};

App.actions["kitchen-status"] = async function kitchenStatus(el) {
    await API.post(`/api/kitchen/orders/${el.dataset.id}/status`, { status: el.dataset.status });
    App.toast("Order updated");
    const box = document.getElementById("order-list");
    if (!box) return App.render();
    const data = await API.get("/api/kitchen");
    const onHome = location.hash === "#/kitchen" || location.hash === "#/kitchen/home";
    const orders = onHome ? data.orders.filter((order) => !["delivered", "cancelled"].includes(order.status)) : data.orders;
    box.innerHTML = orders.length ? orders.map(kitchenOrderCard).join("") : App.empty("🍳", "No live tickets", "New orders show up here.");
};

App.actions["menu-new"] = () => App.openModal(menuForm());
App.actions["menu-edit"] = (el) => App.openModal(menuForm((App.state.menu || []).find((item) => item.id === el.dataset.id)));
App.actions["menu-toggle"] = async (el) => {
    await API.patch(`/api/kitchen/menu/${el.dataset.id}`, { available: el.dataset.available !== "1" });
    App.render();
};
App.actions["menu-delete"] = async (el) => {
    const ok = await App.ask("Remove this dish?", "It leaves the menu. Past orders keep their history.", "Remove");
    if (!ok) return;
    await API.del(`/api/kitchen/menu/${el.dataset.id}`);
    App.toast("Dish removed");
    App.render();
};

App.forms.menu = async function saveMenu(form) {
    const data = Object.fromEntries(new FormData(form));
    data.available = form.querySelector('[name="available"]').checked;
    data.price = Number(data.price);
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
        if (data.id) await API.patch(`/api/kitchen/menu/${data.id}`, data);
        else await API.post("/api/kitchen/menu", data);
        App.closeModal();
        App.toast("Dish saved");
        App.render();
    } catch (error) {
        App.formError(form, error.message);
        button.disabled = false;
    }
};

App.forms["kitchen-settings"] = async function saveKitchen(form) {
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    data.deliveryFee = Number(data.deliveryFee);
    data.etaMinutes = Number(data.etaMinutes);
    try {
        const result = await API.patch("/api/kitchen", data);
        App.state.user = result.user;
        App.toast("Kitchen saved");
    } catch (error) {
        App.formError(form, error.message);
    } finally {
        button.disabled = false;
    }
};
