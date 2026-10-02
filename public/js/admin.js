App.adminLinks = [
    { id: "home", href: "#/admin", label: "Overview" },
    { id: "orders", href: "#/admin/orders", label: "Orders" },
    { id: "customers", href: "#/admin/customers", label: "Customers" },
    { id: "restaurants", href: "#/admin/restaurants", label: "Kitchens" },
    { id: "riders", href: "#/admin/riders", label: "Riders" },
    { id: "payments", href: "#/admin/payments", label: "Payments" },
    { id: "notifications", href: "#/admin/notifications", label: "Alerts" }
];

const ORDER_OPTIONS = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"];

function tableSearch() {
    return `<input data-input="filter-table" placeholder="Search this table" style="max-width:280px;margin-bottom:12px" />`;
}

App.inputs["filter-table"] = function filterTable(input) {
    const query = input.value.toLowerCase();
    const rows = input.closest(".workspace-content, .panel, body").querySelectorAll("tbody tr");
    const scope = input.parentElement.querySelector("tbody") || document.querySelector(".workspace-content tbody");
    (scope ? scope.querySelectorAll("tr") : rows).forEach((row) => {
        row.hidden = query && !row.textContent.toLowerCase().includes(query);
    });
};

App.viewAdmin = async function viewAdmin() {
    App.title("Admin");
    const data = await API.get("/api/admin/overview");
    const content = `<div class="page-head"><div><p class="eyebrow">City desk</p><h1>Overview</h1></div></div>
      <div class="stats">
        <article class="stat"><b>${data.customers}</b><span>Customers</span></article>
        <article class="stat"><b>${data.restaurants}</b><span>Kitchens</span></article>
        <article class="stat"><b>${data.riders}</b><span>Riders</span></article>
        <article class="stat"><b>${data.openOrders}</b><span>Open orders</span></article>
        <article class="stat"><b>${App.npr(data.revenue)}</b><span>Paid revenue</span></article>
        <article class="stat"><b>${data.deliveredToday}</b><span>Delivered today</span></article>
        <article class="stat"><b>${data.orders}</b><span>All orders</span></article>
      </div>
      <h2 style="margin-bottom:10px">Latest orders</h2>
      <div class="order-list">${data.recent.map((order) => `<article class="order-card"><div class="spread"><strong>${App.esc(order.orderNumber)}</strong>${App.pill(order.status)}</div><p class="muted">${App.esc(order.customer?.name || "")} · ${App.esc(order.restaurant?.name || "")} · ${App.npr(order.totalAmount)}</p></article>`).join("")}</div>`;
    return App.workspace({ active: "home", links: App.adminLinks, content });
};

App.viewAdminOrders = async function viewAdminOrders() {
    App.title("All orders");
    const orders = await API.get("/api/admin/orders");
    const content = `<div class="page-head"><div><p class="eyebrow">Every ticket</p><h1>Orders</h1></div></div>
      <div class="panel" style="position:static">${tableSearch()}<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Kitchen</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${orders.map((order) => `<tr><td>${App.esc(order.orderNumber)}<div class="small muted">${App.when(order.orderDate)}</div></td><td>${App.esc(order.customer?.name || "")}</td><td>${App.esc(order.restaurant?.name || "")}</td><td>${App.npr(order.totalAmount)}</td><td>${App.pill(order.status)}</td><td><select data-id="${order.id}" id="status-${order.id}">${ORDER_OPTIONS.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${(App.STATUS[status] || [status])[0]}</option>`).join("")}</select> <button class="btn btn-small btn-dark" type="button" data-action="admin-status" data-id="${order.id}">Update</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
    return App.workspace({ active: "orders", links: App.adminLinks, content });
};

App.viewAdminCustomers = async function viewAdminCustomers() {
    App.title("Customers");
    const rows = await API.get("/api/admin/customers");
    const content = `<div class="page-head"><div><p class="eyebrow">People</p><h1>Customers</h1></div></div>
      <div class="panel" style="position:static">${tableSearch()}<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th></th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${App.esc(row.name)}</td><td>${App.esc(row.email)}</td><td>${App.esc(row.phone)}</td><td>${App.esc(row.address || "")}</td><td><button class="btn btn-small ${row.active === false ? "btn-dark" : "btn-line"}" type="button" data-action="admin-active" data-kind="customers" data-id="${row.id}" data-active="${row.active === false ? "0" : "1"}">${row.active === false ? "Enable" : "Disable"}</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
    return App.workspace({ active: "customers", links: App.adminLinks, content });
};

App.viewAdminRestaurants = async function viewAdminRestaurants() {
    App.title("Kitchens");
    const rows = await API.get("/api/admin/restaurants");
    const content = `<div class="page-head"><div><p class="eyebrow">Partners</p><h1>Kitchens</h1></div></div>
      <div class="panel" style="position:static">${tableSearch()}<div class="table-wrap"><table><thead><tr><th>Kitchen</th><th>Cuisine</th><th>Phone</th><th>Rating</th><th>Door</th><th></th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${App.esc(row.name)}<div class="small muted">${App.esc(row.email)}</div></td><td>${App.esc(row.cuisine || "")}</td><td>${App.esc(row.phone || "")}</td><td>★ ${Number(row.rating || 0).toFixed(1)}</td><td><button class="btn btn-small btn-line" type="button" data-action="admin-door" data-id="${row.id}" data-status="${row.status}">${row.status === "open" ? "Open" : "Closed"}</button></td><td><button class="btn btn-small ${row.active === false ? "btn-dark" : "btn-line"}" type="button" data-action="admin-active" data-kind="restaurants" data-id="${row.id}" data-active="${row.active === false ? "0" : "1"}">${row.active === false ? "Enable" : "Disable"}</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
    return App.workspace({ active: "restaurants", links: App.adminLinks, content });
};

App.viewAdminRiders = async function viewAdminRiders() {
    App.title("Riders");
    const rows = await API.get("/api/admin/riders");
    const content = `<div class="page-head"><div><p class="eyebrow">Fleet</p><h1>Riders</h1></div></div>
      <div class="panel" style="position:static">${tableSearch()}<div class="table-wrap"><table><thead><tr><th>Rider</th><th>Phone</th><th>Vehicle</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${App.esc(row.name)}<div class="small muted">${App.esc(row.zone || "")}</div></td><td>${App.esc(row.phone)}</td><td>${App.esc(row.vehicleType || "")} · ${App.esc(row.vehicleNumber || "")}</td><td>${App.esc(row.status)}</td><td><button class="btn btn-small ${row.active === false ? "btn-dark" : "btn-line"}" type="button" data-action="admin-active" data-kind="riders" data-id="${row.id}" data-active="${row.active === false ? "0" : "1"}">${row.active === false ? "Enable" : "Disable"}</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
    return App.workspace({ active: "riders", links: App.adminLinks, content });
};

App.viewAdminPayments = async function viewAdminPayments() {
    App.title("Payments");
    const rows = await API.get("/api/admin/payments");
    const content = `<div class="page-head"><div><p class="eyebrow">Money</p><h1>Payments</h1></div></div>
      <div class="panel" style="position:static">${tableSearch()}<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${App.esc(row.orderNumber)}</td><td>${App.esc(row.customerName)}</td><td>${App.esc(row.method)}</td><td>${App.npr(row.amount)}</td><td>${App.payPill(row.status)}</td></tr>`).join("")}
      </tbody></table></div></div>`;
    return App.workspace({ active: "payments", links: App.adminLinks, content });
};

App.actions["admin-status"] = async (el) => {
    const status = document.getElementById(`status-${el.dataset.id}`)?.value;
    await API.post(`/api/admin/orders/${el.dataset.id}/status`, { status });
    App.toast("Order updated");
    App.render();
};

App.actions["admin-active"] = async (el) => {
    const active = el.dataset.active !== "1";
    await API.patch(`/api/admin/${el.dataset.kind}/${el.dataset.id}`, { active });
    App.toast(active ? "Enabled" : "Disabled");
    App.render();
};

App.actions["admin-door"] = async (el) => {
    const status = el.dataset.status === "open" ? "closed" : "open";
    await API.patch(`/api/admin/restaurants/${el.dataset.id}`, { status });
    App.toast(status === "open" ? "Kitchen opened" : "Kitchen closed");
    App.render();
};
