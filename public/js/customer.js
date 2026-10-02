function greeting() {
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `${hello}, ${App.state.user?.name?.split(" ")[0] || "there"}`;
}

function paintGrid() {
    const grid = document.getElementById("restaurant-grid");
    if (!grid) return;
    const rows = App.filteredRestaurants();
    grid.innerHTML = rows.length
        ? rows.map(App.restaurantCard).join("")
        : App.empty("🍽️", "No kitchens match", "Try another cuisine or clear the search.");
    document.querySelectorAll("[data-action=cuisine]").forEach((chip) => {
        chip.classList.toggle("on", chip.dataset.cuisine === App.state.cuisine);
    });
    const count = document.getElementById("result-count");
    if (count) count.textContent = `${rows.length} kitchen${rows.length === 1 ? "" : "s"}`;
}

App.viewExplore = async function viewExplore(personal) {
    App.title(personal ? "Kitchens" : "Browse");
    const [restaurants, notes, orders] = await Promise.all([
        API.get("/api/restaurants"),
        App.state.user?.role === "customer" ? API.get("/api/notifications") : Promise.resolve([]),
        personal ? API.get("/api/orders") : Promise.resolve([])
    ]);
    App.state.restaurants = restaurants;
    const unread = notes.filter((note) => !note.isRead).length;
    const live = orders.find((order) => !["delivered", "cancelled"].includes(order.status));
    const cuisines = ["All", ...new Set(restaurants.map((row) => row.cuisine).filter(Boolean))];
    const rows = App.filteredRestaurants();
    const content = `
      <div class="page-head">
        <div>
          <p class="eyebrow">${personal ? "Your table" : "Browse"}</p>
          <h1>${personal ? App.esc(greeting()) : "Find a kitchen"}</h1>
        </div>
        <p class="muted" id="result-count">${rows.length} kitchen${rows.length === 1 ? "" : "s"}</p>
      </div>
      ${live ? `<div class="live-banner"><div><strong>${App.esc(live.orderNumber)}</strong> from ${App.esc(live.restaurant?.name || "a kitchen")} · ${App.esc((App.STATUS[live.status] || [live.status])[0])}</div><a href="#/app/orders/${live.id}">Track</a></div>` : ""}
      <div class="searchbar">
        <input data-input="search" placeholder="Search kitchens, cuisines, neighborhoods" value="${App.esc(App.state.q)}" />
        <select data-change="sort">
          <option value="rating" ${App.state.sort === "rating" ? "selected" : ""}>Top rated</option>
          <option value="time" ${App.state.sort === "time" ? "selected" : ""}>Fastest</option>
        </select>
      </div>
      <div class="filter-row">
        <div class="chips">${cuisines.map((cuisine) => `<button class="chip ${App.state.cuisine === cuisine ? "on" : ""}" type="button" data-action="cuisine" data-cuisine="${App.esc(cuisine)}">${App.esc(cuisine)}</button>`).join("")}</div>
        <label class="check"><input type="checkbox" data-change="open-only" ${App.state.openOnly ? "checked" : ""} /> Open now</label>
      </div>
      <div class="r-grid three" id="restaurant-grid">${rows.length ? rows.map(App.restaurantCard).join("") : App.empty("🍽️", "No kitchens match", "Try another cuisine or clear the search.")}</div>`;
    return App.marketShell(personal ? "home" : "browse", content, unread);
};

App.inputs.search = function onSearch(input) {
    App.state.q = input.value;
    paintGrid();
};
App.inputs.sort = function onSort(input) {
    App.state.sort = input.value;
    paintGrid();
};
App.inputs["open-only"] = function onOpen(input) {
    App.state.openOnly = input.checked;
    paintGrid();
};
App.actions.cuisine = function onCuisine(el) {
    App.state.cuisine = el.dataset.cuisine;
    paintGrid();
};

function qtyInCart(foodId) {
    if (App.state.cart?.restaurantId !== App.state.currentRestaurant?.id) return 0;
    return App.state.cart.items.find((item) => item.foodItemId === foodId)?.quantity || 0;
}

function qtyControl(food) {
    const count = qtyInCart(food.id);
    if (App.state.currentRestaurant?.status !== "open") return `<span class="pill tone-stop">Closed</span>`;
    if (!food.available) return `<span class="pill tone-stop">Sold out</span>`;
    if (!count) return `<button class="icon-btn" type="button" data-action="add-cart" data-id="${food.id}" aria-label="Add ${App.esc(food.name)}">+</button>`;
    return `<div class="stepper">
      <button type="button" data-action="cart-dec" data-id="${food.id}">−</button>
      <span>${count}</span>
      <button type="button" data-action="cart-inc" data-id="${food.id}">+</button>
    </div>`;
}

function paintDish(foodId) {
    const cell = document.querySelector(`[data-qty-for="${foodId}"]`);
    const food = (App.state.menu || []).find((item) => item.id === foodId);
    if (cell && food) cell.innerHTML = qtyControl(food);
    const peek = document.getElementById("cart-peek");
    if (peek) peek.innerHTML = cartPeekInner();
    App.saveCart();
}

function cartPeekInner() {
    const restaurant = App.state.currentRestaurant;
    const cart = App.state.cart;
    if (!cart?.items?.length) return `<h3>Your tray</h3><p class="muted">Add a dish to start an order.</p>`;
    if (cart.restaurantId !== restaurant?.id) {
        return `<h3>Tray from ${App.esc(cart.restaurantName)}</h3><p class="muted">Finish that order, or start a new one here.</p><a class="btn btn-dark btn-block" href="#/cart" style="margin-top:12px">View tray</a>`;
    }
    const rows = cart.items.map((item) => `<div class="spread small"><span>${item.quantity} × ${App.esc(item.name)}</span><span>${App.npr(item.price * item.quantity)}</span></div>`).join("");
    return `<h3>Your tray</h3><div class="lines" style="margin:10px 0">${rows}</div><div class="spread"><strong>Subtotal</strong><strong>${App.npr(App.cartTotal())}</strong></div><a class="btn btn-primary btn-block" href="#/cart" style="margin-top:12px">Review order</a>`;
}

function ensureCart(restaurant) {
    if (!App.state.cart || App.state.cart.restaurantId === restaurant.id) {
        if (!App.state.cart) {
            App.state.cart = {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                deliveryFee: restaurant.deliveryFee || 0,
                items: []
            };
        }
        return true;
    }
    return false;
}

async function addLine(food, delta) {
    const restaurant = App.state.currentRestaurant;
    if (!restaurant || !food?.available) return;
    if (restaurant.status !== "open") return App.toast("This kitchen is closed right now");
    if (!ensureCart(restaurant)) {
        const ok = await App.ask("Start a new tray?", `Your tray has dishes from ${App.state.cart.restaurantName}. Replace them with ${restaurant.name}?`, "Replace tray");
        if (!ok) return;
        App.state.cart = null;
        ensureCart(restaurant);
    }
    const line = App.state.cart.items.find((item) => item.foodItemId === food.id);
    if (delta > 0) {
        if (line) line.quantity = Math.min(30, line.quantity + 1);
        else App.state.cart.items.push({ foodItemId: food.id, name: food.name, price: food.price, quantity: 1 });
        App.toast(`Added ${food.name}`);
    } else if (line) {
        line.quantity -= 1;
        if (line.quantity <= 0) App.state.cart.items = App.state.cart.items.filter((item) => item.foodItemId !== food.id);
    }
    App.saveCart();
    paintDish(food.id);
}

function changeCart(foodId, delta) {
    const cart = App.state.cart;
    if (!cart) return;
    const line = cart.items.find((item) => item.foodItemId === foodId);
    if (!line) return;
    line.quantity = delta > 0 ? Math.min(30, line.quantity + delta) : line.quantity + delta;
    if (line.quantity <= 0) cart.items = cart.items.filter((item) => item.foodItemId !== foodId);
    App.saveCart();
    const body = document.getElementById("cart-body");
    if (body) body.innerHTML = cartBody();
}

App.actions["add-cart"] = (el) => addLine((App.state.menu || []).find((item) => item.id === el.dataset.id), 1);
App.actions["cart-inc"] = (el) => {
    if (document.getElementById("cart-body")) return changeCart(el.dataset.id, 1);
    return addLine((App.state.menu || []).find((item) => item.id === el.dataset.id), 1);
};
App.actions["cart-dec"] = (el) => {
    if (document.getElementById("cart-body")) return changeCart(el.dataset.id, -1);
    return addLine((App.state.menu || []).find((item) => item.id === el.dataset.id), -1);
};
App.actions["cart-remove"] = (el) => changeCart(el.dataset.id, -999);

App.viewRestaurant = async function viewRestaurant(id) {
    let restaurant;
    let menu;
    let reviews;
    try {
        [restaurant, menu, reviews] = await Promise.all([
            API.get(`/api/restaurants/${id}`),
            API.get(`/api/restaurants/${id}/menu`),
            API.get(`/api/restaurants/${id}/reviews`)
        ]);
    } catch (error) {
        App.title("Kitchen");
        return App.marketShell("", App.empty("🍽️", "Kitchen not found", error.message, `<a class="btn btn-primary" href="#/browse">Browse kitchens</a>`));
    }
    App.state.currentRestaurant = restaurant;
    App.state.menu = menu;
    App.title(restaurant.name);
    const categories = [];
    menu.forEach((item) => {
        const category = item.category || "Menu";
        if (!categories.includes(category)) categories.push(category);
    });
    const closed = restaurant.status !== "open";
    const sections = categories.map((category) => {
        const dishes = menu.filter((item) => (item.category || "Menu") === category)
            .sort((a, b) => Number(b.available) - Number(a.available));
        return `<section id="cat-${App.esc(category)}"><h2 style="margin:18px 0 4px">${App.esc(category)}</h2>
          ${dishes.map((food) => `<article class="dish ${food.available ? "" : "is-sold"}">
            ${App.photo(food.image, App.emojiFor(food.name), "photo-sm")}
            <div><strong>${App.esc(food.name)}</strong><p class="muted small clamp">${App.esc(food.description || "")}</p></div>
            <div class="price-col"><div class="price">${App.npr(food.price)}</div><div data-qty-for="${food.id}">${qtyControl(food)}</div></div>
          </article>`).join("")}
        </section>`;
    }).join("");
    const content = `
      ${App.photo(restaurant.coverImage || restaurant.image, App.emojiFor(restaurant.cuisine), "cover-photo")}
      <div class="menu-layout" style="margin-top:18px">
        <div>
          <a class="small" href="${App.state.user?.role === "customer" ? "#/app" : "#/browse"}">← All kitchens</a>
          <div class="spread" style="margin-top:8px"><h1>${App.esc(restaurant.name)}</h1>${App.pill(closed ? "cancelled" : "delivered").replace("Cancelled", "Closed").replace("Delivered", "Open")}</div>
          <p class="muted">${App.esc(restaurant.cuisine)} · ${App.esc(restaurant.address)} · ★ ${Number(restaurant.rating).toFixed(1)} (${restaurant.ratingCount || 0})</p>
          <p class="small" style="margin:6px 0 10px">${restaurant.etaMinutes} min · ${restaurant.deliveryFee ? App.npr(restaurant.deliveryFee) + " delivery" : "Free delivery"} · ${App.esc(restaurant.phone || "")}</p>
          ${closed ? `<div class="note">This kitchen is closed. You can look, but not order.</div>` : ""}
          <div class="cat-bar">${categories.map((category) => `<button class="chip" type="button" data-action="jump-cat" data-target="cat-${App.esc(category)}">${App.esc(category)}</button>`).join("")}</div>
          ${menu.length ? sections : App.empty("🥘", "No menu yet", "This kitchen hasn't posted dishes.")}
          <h2 style="margin:28px 0 10px">Recent reviews</h2>
          ${reviews.length ? reviews.slice(0, 6).map((review) => `<article class="order-card" style="margin-bottom:10px"><strong>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</strong><p>${App.esc(review.comment || "No comment")}</p><p class="small muted">${App.esc(review.authorName)} · ${App.timeAgo(review.createdAt)}</p></article>`).join("") : `<p class="muted">No written reviews yet.</p>`}
        </div>
        <aside class="cart-peek" id="cart-peek">${cartPeekInner()}</aside>
      </div>`;
    const notes = App.state.user?.role === "customer" ? await API.get("/api/notifications") : [];
    return App.marketShell("", content, notes.filter((note) => !note.isRead).length);
};

App.actions["jump-cat"] = (el) => document.getElementById(el.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });

function cartBody() {
    const cart = App.state.cart;
    if (!cart?.items?.length) {
        return App.empty("🧺", "Your tray is empty", "Kitchens are waiting.", `<a class="btn btn-primary" href="${App.state.user?.role === "customer" ? "#/app" : "#/browse"}">Find food</a>`);
    }
    const rows = cart.items.map((item) => `<article class="dish">
      <div class="photo photo-sm" data-emoji="${App.emojiFor(item.name)}"></div>
      <div><strong>${App.esc(item.name)}</strong><p class="muted small">${App.npr(item.price)}</p></div>
      <div class="price-col">
        <div class="stepper">
          <button type="button" data-action="cart-dec" data-id="${item.foodItemId}">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="cart-inc" data-id="${item.foodItemId}">+</button>
        </div>
        <strong class="price">${App.npr(item.price * item.quantity)}</strong>
      </div>
    </article>`).join("");
    return `<div class="page-head"><div><p class="eyebrow">${App.esc(cart.restaurantName)}</p><h1>Your tray</h1></div><a href="#/r/${cart.restaurantId}">Add more</a></div>${rows}
      <div class="spread" style="margin-top:16px"><span>Subtotal</span><strong>${App.npr(App.cartTotal())}</strong></div>
      <a class="btn btn-primary" style="margin-top:16px" href="#/checkout">Continue to checkout</a>`;
}

App.viewCart = async function viewCart() {
    App.title("Tray");
    const notes = App.state.user?.role === "customer" ? await API.get("/api/notifications") : [];
    return App.marketShell("cart", `<div id="cart-body">${cartBody()}</div>`, notes.filter((note) => !note.isRead).length);
};

App.viewCheckout = async function viewCheckout() {
    App.title("Checkout");
    const cart = App.state.cart;
    if (!cart?.items?.length) return App.customerShell("cart", cartBody());
    const restaurant = await API.get(`/api/restaurants/${cart.restaurantId}`);
    App.state.cart.deliveryFee = restaurant.deliveryFee || 0;
    const closed = restaurant.status !== "open";
    const address = App.state.user?.address || "";
    const content = `<div class="page-head"><div><p class="eyebrow">${App.esc(restaurant.name)}</p><h1>Checkout</h1></div></div>
      ${closed ? `<div class="banner warn">This kitchen just closed. You can't place this order.</div>` : ""}
      <form class="checkout-grid" data-form="checkout" novalidate>
        <div class="panel" style="position:static">
          <h3>How should it arrive?</h3>
          <div class="seg" style="margin:12px 0">
            <label><input type="radio" name="deliveryType" value="delivery" checked data-change="delivery-type" /> Delivery</label>
            <label><input type="radio" name="deliveryType" value="pickup" data-change="delivery-type" /> Pickup</label>
          </div>
          <label class="field" id="address-field"><span>Delivery address</span><input name="deliveryAddress" value="${App.esc(address)}" /></label>
          <label class="field" style="margin-top:12px"><span>Note for the kitchen</span><textarea name="note" placeholder="No onion, extra achar, call on arrival…"></textarea></label>
          <h3 style="margin:18px 0 10px">Pay with</h3>
          <div class="pay-grid">
            ${[["eSewa", "#60bb46", "Wallet"], ["Khalti", "#5c2d91", "Wallet"], ["Card", "#1c1614", "Card"], ["Cash on Delivery", "#b45309", "Cash"]].map((method, index) => `<label class="pay-opt"><input type="radio" name="method" value="${method[0]}" ${index === 0 ? "checked" : ""} /><span class="pay-mark" style="background:${method[1]}">${method[0][0]}</span><span><strong>${method[0]}</strong><br><span class="small muted">${method[2]}</span></span></label>`).join("")}
          </div>
          <p class="small muted" style="margin-top:10px">Demo checkout — no real charge is made. Wallets and cards are marked paid immediately. Cash is collected on delivery.</p>
          <p class="form-error"></p>
        </div>
        <aside class="panel" id="summary">
          ${cart.items.map((item) => `<div class="spread small"><span>${item.quantity} × ${App.esc(item.name)}</span><span>${App.npr(item.price * item.quantity)}</span></div>`).join("")}
          <div class="totals">
            <div><span>Subtotal</span><span>${App.npr(App.cartTotal())}</span></div>
            <div><span>Delivery</span><span id="fee">${App.npr(restaurant.deliveryFee || 0)}</span></div>
            <div class="grand"><span>Total</span><span id="grand">${App.npr(App.cartTotal() + (restaurant.deliveryFee || 0))}</span></div>
          </div>
          <button class="btn btn-primary btn-block" type="submit" ${closed ? "disabled" : ""}>Place order</button>
        </aside>
      </form>`;
    return App.customerShell("cart", content);
};

App.inputs["delivery-type"] = function onDeliveryType() {
    const type = document.querySelector('input[name="deliveryType"]:checked')?.value;
    const fee = type === "delivery" ? Number(App.state.cart?.deliveryFee || 0) : 0;
    const feeEl = document.getElementById("fee");
    const grand = document.getElementById("grand");
    const address = document.getElementById("address-field");
    if (feeEl) feeEl.textContent = App.npr(fee);
    if (grand) grand.textContent = App.npr(App.cartTotal() + fee);
    if (address) address.hidden = type !== "delivery";
};

App.forms.checkout = async function submitCheckout(form) {
    App.formError(form, "");
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    button.textContent = "Placing order…";
    try {
        const order = await API.post("/api/orders", {
            restaurantId: App.state.cart.restaurantId,
            deliveryType: data.deliveryType,
            deliveryAddress: data.deliveryAddress,
            method: data.method,
            note: data.note,
            items: App.state.cart.items.map((item) => ({ foodItemId: item.foodItemId, quantity: item.quantity }))
        });
        App.state.cart = null;
        App.saveCart();
        location.hash = `#/app/orders/${order.id}/fresh`;
    } catch (error) {
        App.formError(form, error.message);
        button.disabled = false;
        button.textContent = "Place order";
    }
};

function orderCard(order, href) {
    const lines = (order.items || []).map((item) => `<div>${item.quantity} × ${App.esc(item.itemName || "Dish")}</div>`).join("");
    return `<a class="order-card" href="${href}">
      <div class="spread"><strong>${App.esc(order.orderNumber)}</strong>${App.pill(order.status)}</div>
      <div class="muted">${App.esc(order.restaurant?.name || "")} · ${App.esc(order.customer?.name || "")} · ${App.when(order.orderDate)}</div>
      <div class="lines">${lines}</div>
      <div class="spread"><span>${order.deliveryType === "pickup" ? "Pickup" : "Delivery"} · ${App.esc(order.payment?.method || "")}</span><strong>${App.npr(order.totalAmount)}</strong></div>
    </a>`;
}

App.viewOrders = async function viewOrders() {
    App.title("Orders");
    const [orders, notes] = await Promise.all([API.get("/api/orders"), API.get("/api/notifications")]);
    const content = `<div class="page-head"><div><p class="eyebrow">History</p><h1>Your orders</h1></div></div>
      ${orders.length ? `<div class="order-list">${orders.map((order) => orderCard(order, `#/app/orders/${order.id}`)).join("")}</div>` : App.empty("🧾", "No orders yet", "When you place one, it will live here.", `<a class="btn btn-primary" href="#/app">Find food</a>`)}`;
    return App.customerShell("orders", content, notes.filter((note) => !note.isRead).length);
};

App.viewOrder = async function viewOrder(id, fresh) {
    const order = await API.get(`/api/orders/${id}`);
    App.title(order.orderNumber);
    const canCancel = ["pending", "confirmed"].includes(order.status);
    const review = order.review
        ? `<div class="note"><strong>You rated ${order.review.rating}★</strong><p>${App.esc(order.review.comment || "")}</p></div>`
        : order.status === "delivered" ? `<form data-form="review" class="panel" style="position:static">
            <h3>Rate ${App.esc(order.restaurant?.name || "the kitchen")}</h3>
            <input type="hidden" name="orderId" value="${order.id}" />
            <input type="hidden" name="rating" value="5" />
            <div class="star-row" style="margin:8px 0">${[1, 2, 3, 4, 5].map((star) => `<button type="button" class="on" data-action="set-star" data-value="${star}">★</button>`).join("")}</div>
            <textarea name="comment" placeholder="How was it?"></textarea>
            <p class="form-error"></p>
            <button class="btn btn-primary" type="submit" style="margin-top:10px">Submit rating</button>
          </form>` : "";
    const content = `
      ${fresh ? `<div class="live-banner"><div><strong>Order placed.</strong> ${App.esc(order.restaurant?.name || "The kitchen")} has ${App.esc(order.orderNumber)}.</div></div>` : ""}
      <div class="page-head"><div><p class="eyebrow">${App.esc(order.restaurant?.name || "")}</p><h1>${App.esc(order.orderNumber)}</h1></div>${App.pill(order.status)}</div>
      ${App.timeline(order)}
      <div class="split" style="margin-top:18px">
        <div class="panel" style="position:static">
          <div class="lines">${(order.items || []).map((item) => `<div class="spread"><span>${item.quantity} × ${App.esc(item.itemName)}</span><span>${App.npr(item.totalPrice)}</span></div>`).join("")}</div>
          <div class="totals"><div><span>Subtotal</span><span>${App.npr(order.subtotal)}</span></div><div><span>Delivery</span><span>${App.npr(order.deliveryFee)}</span></div><div class="grand"><span>Total</span><span>${App.npr(order.totalAmount)}</span></div></div>
          ${order.note ? `<div class="note">Note: ${App.esc(order.note)}</div>` : ""}
        </div>
        <div class="panel" style="position:static">
          <p><strong>${order.deliveryType === "pickup" ? "Pickup" : "Delivery"}</strong></p>
          <p class="muted">${App.esc(order.deliveryType === "pickup" ? order.restaurant?.address : order.deliveryAddress)}</p>
          <p style="margin-top:8px">${App.esc(order.payment?.method || "")} ${order.payment ? App.payPill(order.payment.status) : ""}</p>
          ${order.rider ? `<p style="margin-top:8px"><strong>${App.esc(order.rider.name)}</strong><br><span class="muted">${App.esc(order.rider.phone)} · ${App.esc(order.rider.vehicleType)}</span></p>` : ""}
          ${order.delivery?.trackingStatus ? `<p class="small muted">${App.esc(order.delivery.trackingStatus)}</p>` : ""}
          <div class="row-actions" style="margin-top:12px">
            ${canCancel ? `<button class="btn btn-danger btn-small" type="button" data-action="cancel-order" data-id="${order.id}">Cancel order</button>` : ""}
            <button class="btn btn-line btn-small" type="button" data-action="reorder" data-id="${order.id}">Order again</button>
          </div>
        </div>
      </div>
      <div style="margin-top:16px">${review}</div>`;
    const notes = await API.get("/api/notifications");
    return App.customerShell("orders", content, notes.filter((note) => !note.isRead).length);
};

App.actions["set-star"] = function setStar(el) {
    const row = el.closest(".star-row");
    const value = Number(el.dataset.value);
    row.querySelectorAll("button").forEach((button) => button.classList.toggle("on", Number(button.dataset.value) <= value));
    const hidden = row.parentElement.querySelector("input[name=rating]");
    if (hidden) hidden.value = value;
};

App.forms.review = async function submitReview(form) {
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
        await API.post(`/api/orders/${data.orderId}/review`, { rating: Number(data.rating), comment: data.comment });
        App.toast("Thanks for the rating");
        App.render();
    } catch (error) {
        App.formError(form, error.message);
        button.disabled = false;
    }
};

App.actions["cancel-order"] = async function cancelOrder(el) {
    const ok = await App.ask("Cancel this order?", "The kitchen will be told, and a paid wallet or card payment is marked refunded.", "Cancel order");
    if (!ok) return;
    await API.post(`/api/orders/${el.dataset.id}/cancel`);
    App.toast("Order cancelled");
    App.render();
};

App.actions.reorder = async function reorder(el) {
    const order = await API.get(`/api/orders/${el.dataset.id}`);
    const menu = await API.get(`/api/restaurants/${order.restaurant.id}/menu`);
    const items = [];
    const missing = [];
    for (const line of order.items) {
        const food = menu.find((item) => item.id === line.foodItemId);
        if (!food || !food.available) missing.push(line.itemName);
        else items.push({ foodItemId: food.id, name: food.name, price: food.price, quantity: line.quantity });
    }
    if (!items.length) return App.toast("Those dishes are no longer available");
    App.state.cart = {
        restaurantId: order.restaurant.id,
        restaurantName: order.restaurant.name,
        deliveryFee: order.restaurant.deliveryFee || 0,
        items
    };
    App.saveCart();
    if (missing.length) App.toast(`Left out: ${missing.join(", ")}`);
    location.hash = "#/cart";
};

App.viewProfile = async function viewProfile() {
    App.title("Your details");
    const user = App.state.user;
    const notes = await API.get("/api/notifications");
    const content = `<div class="page-head"><div><p class="eyebrow">Account</p><h1>Your details</h1></div></div>
      <div class="split">
        <form class="panel form-stack" style="position:static" data-form="profile" novalidate>
          <label class="field"><span>Name</span><input name="name" value="${App.esc(user.name)}" required /></label>
          <label class="field"><span>Email</span><input value="${App.esc(user.email)}" disabled /></label>
          <label class="field"><span>Phone</span><input name="phone" value="${App.esc(user.phone)}" required /></label>
          <label class="field"><span>Address</span><input name="address" value="${App.esc(user.address || "")}" required /></label>
          <p class="form-error"></p>
          <button class="btn btn-primary" type="submit">Save details</button>
        </form>
        <div class="panel" style="position:static">${App.passwordForm()}</div>
      </div>`;
    return App.customerShell("profile", content, notes.filter((note) => !note.isRead).length);
};

App.forms.profile = async function saveProfile(form) {
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
        const result = await API.patch("/api/me", Object.fromEntries(new FormData(form)));
        App.state.user = result.user;
        App.toast("Details saved");
        App.render();
    } catch (error) {
        App.formError(form, error.message);
        button.disabled = false;
    }
};

App.viewNotifications = async function viewNotifications() {
    App.title("Alerts");
    const notes = await API.get("/api/notifications");
    const unread = notes.filter((note) => !note.isRead).length;
    const role = App.state.user.role;
    const hrefFor = (note) => {
        if (!note.orderId) return "";
        if (role === "customer") return `#/app/orders/${note.orderId}`;
        return "#/kitchen/orders";
    };
    const content = `<div class="page-head"><div><p class="eyebrow">Inbox</p><h1>Alerts</h1></div>
      ${unread ? `<button class="btn btn-line btn-small" type="button" data-action="read-all">Mark all read</button>` : ""}</div>
      ${notes.length ? `<div class="order-list">${notes.map((note) => {
          const href = hrefFor(note);
          const inner = `<div class="spread"><strong>${App.esc(note.message)}</strong>${note.isRead ? "" : `<span class="pill tone-wait">New</span>`}</div><p class="small muted">${App.timeAgo(note.createdAt)}</p>`;
          return href
              ? `<a class="order-card" href="${href}" data-action="mark-read" data-id="${note.id}">${inner}</a>`
              : `<article class="order-card">${inner}</article>`;
      }).join("")}</div>` : App.empty("🔔", "You're all caught up", "Order updates will land here.")}`;
    if (role === "customer") return App.customerShell("notifications", content, unread);
    return App.workspace({ active: "notifications", links: App.kitchenLinks, content });
};

App.actions["mark-read"] = async function markRead(el) {
    if (!el.dataset.id) return;
    API.patch(`/api/notifications/${el.dataset.id}/read`).catch(() => {});
};
App.actions["read-all"] = async function readAll() {
    await API.post("/api/notifications/read-all");
    App.render();
};
