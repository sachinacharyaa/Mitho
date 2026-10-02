App.riderLinks = [
    { id: "home", href: "#/ride", label: "Today" },
    { id: "jobs", href: "#/ride/jobs", label: "Jobs" },
    { id: "history", href: "#/ride/history", label: "History" },
    { id: "notifications", href: "#/ride/notifications", label: "Alerts" }
];

function jobCard(order, canAccept) {
    return `<article class="order-card">
      <div class="spread"><strong>${App.esc(order.orderNumber)}</strong><span class="pill tone-ready">${App.npr(order.deliveryFee)} fee</span></div>
      <p><strong>${App.esc(order.restaurant?.name || "")}</strong><br><span class="muted">${App.esc(order.restaurant?.address || "")}</span></p>
      <p><strong>Drop</strong><br><span class="muted">${App.esc(order.deliveryAddress || "")}</span></p>
      <p class="small muted">${(order.items || []).map((item) => `${item.quantity} × ${item.itemName}`).join(" · ")}</p>
      ${canAccept ? `<button class="btn btn-primary" type="button" data-action="accept-job" data-id="${order.id}">Accept job</button>` : `<p class="small">Finish your current delivery before taking another.</p>`}
    </article>`;
}

function activeCard(order) {
    if (!order) return "";
    const next = order.status === "ready_for_pickup"
        ? `<button class="btn btn-primary" type="button" data-action="ride-status" data-id="${order.id}" data-status="out_for_delivery">Picked up</button>`
        : order.status === "out_for_delivery"
            ? `<button class="btn btn-primary" type="button" data-action="ride-status" data-id="${order.id}" data-status="delivered">Delivered</button>`
            : "";
    return `<article class="order-card">
      <div class="spread"><strong>${App.esc(order.orderNumber)} · ${App.esc(order.restaurant?.name || "")}</strong>${App.pill(order.status)}</div>
      ${App.timeline(order)}
      <p><strong>Pickup</strong> ${App.esc(order.restaurant?.address || "")}</p>
      <p><strong>Drop</strong> ${App.esc(order.deliveryAddress || "")} · ${App.esc(order.customer?.name || "")} · ${App.esc(order.customer?.phone || "")}</p>
      <div class="row-actions">${next}</div>
    </article>`;
}

App.viewRide = async function viewRide() {
    App.title("Rider");
    const summary = await API.get("/api/ride");
    App.state.user = summary.user;
    const content = `<div class="page-head"><div><p class="eyebrow">${App.esc(summary.user.zone || "Kathmandu")}</p><h1>${App.esc(summary.user.name)}</h1></div></div>
      <div class="stats">
        <article class="stat"><b>${App.npr(summary.earned)}</b><span>Delivery fees earned</span></article>
        <article class="stat"><b>${summary.done}</b><span>Delivered</span></article>
        <article class="stat"><b>${App.esc(summary.user.vehicleType || "—")}</b><span>${App.esc(summary.user.vehicleNumber || "")}</span></article>
        <article class="stat"><b>${App.esc(summary.user.status)}</b><span>Current status</span></article>
      </div>
      <div class="row-actions" style="margin-bottom:16px">
        ${["available", "offline"].map((status) => `<button class="btn ${summary.user.status === status ? "btn-dark" : "btn-line"} btn-small" type="button" data-action="rider-mode" data-status="${status}">${status[0].toUpperCase()}${status.slice(1)}</button>`).join("")}
      </div>
      <h2 style="margin-bottom:10px">Current delivery</h2>
      <div id="active-job">${summary.active ? activeCard(summary.active) : App.empty("🛵", "No active delivery", "Open jobs when a kitchen marks an order ready.", `<a class="btn btn-primary" href="#/ride/jobs">See jobs</a>`)}</div>
      <div class="split" style="margin-top:18px">
        <form class="panel form-stack" style="position:static" data-form="rider-settings" novalidate>
          <h3>Your details</h3>
          <label class="field"><span>Name</span><input name="name" value="${App.esc(summary.user.name)}" required /></label>
          <label class="field"><span>Phone</span><input name="phone" value="${App.esc(summary.user.phone)}" required /></label>
          <label class="field"><span>Vehicle</span><input name="vehicleType" value="${App.esc(summary.user.vehicleType)}" required /></label>
          <label class="field"><span>Number</span><input name="vehicleNumber" value="${App.esc(summary.user.vehicleNumber)}" required /></label>
          <label class="field"><span>Zone</span><input name="zone" value="${App.esc(summary.user.zone || "")}" /></label>
          <p class="form-error"></p>
          <button class="btn btn-primary" type="submit">Save</button>
        </form>
        <div class="panel" style="position:static">${App.passwordForm()}</div>
      </div>`;
    return App.workspace({ active: "home", links: App.riderLinks, content });
};

App.viewRideJobs = async function viewRideJobs() {
    App.title("Jobs");
    const [jobs, summary] = await Promise.all([API.get("/api/ride/jobs"), API.get("/api/ride")]);
    const canAccept = summary.user.status === "available";
    const content = `<div class="page-head"><div><p class="eyebrow">Ready for pickup</p><h1>Jobs</h1></div></div>
      <div class="order-list" id="job-list">${jobs.length ? jobs.map((job) => jobCard(job, canAccept)).join("") : App.empty("📦", "Nothing ready", "When a kitchen finishes a delivery order, it shows up here.")}</div>`;
    return App.workspace({ active: "jobs", links: App.riderLinks, content });
};

App.viewRideHistory = async function viewRideHistory() {
    App.title("Deliveries");
    const rows = await API.get("/api/ride/deliveries");
    const content = `<div class="page-head"><div><p class="eyebrow">Past trips</p><h1>History</h1></div></div>
      <div class="order-list">${rows.length ? rows.map((order) => `<article class="order-card"><div class="spread"><strong>${App.esc(order.orderNumber)}</strong>${App.pill(order.status)}</div><p class="muted">${App.esc(order.restaurant?.name || "")} → ${App.esc(order.deliveryAddress || "")}</p><strong>${App.npr(order.deliveryFee)}</strong></article>`).join("") : App.empty("🛣️", "No trips yet", "Accepted jobs will be listed here.")}</div>`;
    return App.workspace({ active: "history", links: App.riderLinks, content });
};

App.actions["rider-mode"] = async (el) => {
    const result = await API.patch("/api/ride", { status: el.dataset.status });
    App.state.user = result.user;
    App.toast(`You are ${result.user.status}`);
    App.render();
};

App.actions["accept-job"] = async (el) => {
    await API.post(`/api/ride/jobs/${el.dataset.id}/accept`);
    App.toast("Job accepted");
    location.hash = "#/ride";
};

App.actions["ride-status"] = async (el) => {
    await API.post(`/api/ride/orders/${el.dataset.id}/status`, { status: el.dataset.status });
    App.toast(el.dataset.status === "delivered" ? "Marked delivered" : "On the way");
    App.render();
};

App.forms["rider-settings"] = async function saveRider(form) {
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
        const result = await API.patch("/api/ride", Object.fromEntries(new FormData(form)));
        App.state.user = result.user;
        App.toast("Details saved");
    } catch (error) {
        App.formError(form, error.message);
    } finally {
        button.disabled = false;
    }
};
