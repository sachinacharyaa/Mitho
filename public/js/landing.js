App.viewLanding = async function viewLanding() {
    App.title("Food, delivered");
    let restaurants = [];
    try {
        const [health, rows] = await Promise.all([API.get("/api/health"), API.get("/api/restaurants")]);
        App.state.health = health;
        App.state.restaurants = rows;
        restaurants = rows;
    } catch (error) {
        return `<div class="center-screen"><div class="panel" style="padding:28px;max-width:460px">
          <h1>The kitchen is offline</h1>
          <p class="muted" style="margin:10px 0 16px">${App.esc(error.message)}</p>
          <p class="small">From the project folder run <strong>npm start</strong>, then open http://localhost:3000</p>
        </div></div>`;
    }
    const user = App.state.user;
    const browse = user?.role === "customer" ? "#/app" : "#/browse";
    const cuisines = [...new Set(restaurants.map((row) => row.cuisine).filter(Boolean))];
    return `${App.dbBanner()}
      <header class="topbar"><div class="wrap topbar-inner">
        <a href="#/">${App.logo()}</a>
        <nav>
          <a href="#/signup/restaurant">For kitchens</a>
          <a href="${user ? App.homeFor(user.role) : "#/login/customer"}">${user ? "Continue" : "Log in"}</a>
          ${user ? "" : `<a class="btn btn-primary btn-small" href="#/signup/customer">Sign up</a>`}
        </nav>
      </div></header>
      <section class="hero wrap hero-grid">
        <div>
          <p class="eyebrow">Kathmandu · delivery & pickup</p>
          <h1>The whole city's kitchen, one order away.</h1>
          <p class="lede">Order from local kitchens, or run your own. Customers and restaurants share one order from the stove to the door.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${browse}">Find food</a>
            <a class="btn btn-line" href="#/signup/restaurant">Open your kitchen</a>
          </div>
        </div>
        <div class="hero-stage">
          <article class="float-card a">${App.photo(restaurants[0]?.coverImage, "🥟", "photo-lg")}<strong>Jhol momo</strong><span class="muted small">Momo House · Rs. 260</span></article>
          <article class="float-card b">${App.photo(restaurants.find((r) => r.cuisine === "Thakali")?.coverImage, "🍛")}<strong>Dal bhat</strong><span class="muted small">Thakali Kitchen · Rs. 420</span></article>
          <article class="float-card c">${App.photo(restaurants.find((r) => r.cuisine === "Japanese")?.coverImage, "🍣")}<strong>Salmon nigiri</strong><span class="muted small">Nori Room · Rs. 480</span></article>
        </div>
      </section>
      <section class="section wrap" id="kitchens">
        <div class="spread">
          <div><h2>Kitchens on Mitho</h2><p class="muted">${restaurants.length} kitchens around the valley.</p></div>
          <a class="btn btn-line" href="${browse}">See all</a>
        </div>
        <div class="chips" style="margin-top:16px">
          ${cuisines.map((cuisine) => `<button class="chip" type="button" data-action="browse-cuisine" data-cuisine="${App.esc(cuisine)}">${App.esc(cuisine)}</button>`).join("")}
        </div>
        <div class="r-grid">${restaurants.slice(0, 4).map(App.restaurantCard).join("")}</div>
      </section>
      <section class="section wrap">
        <h2>How it works</h2>
        <p class="muted" style="margin-bottom:16px">One order, two sides — the table and the kitchen.</p>
        <div class="how two">
          <article class="how-card"><em>01</em><strong>Customer</strong><p class="muted">Browse a kitchen, pay with eSewa, Khalti, card, or cash, and track the plate.</p></article>
          <article class="how-card"><em>02</em><strong>Restaurant</strong><p class="muted">Confirm the ticket, cook, and mark it ready for pickup or delivery.</p></article>
        </div>
      </section>
      <section class="section wrap">
        <h2>Choose your door</h2>
        <div class="portal-grid two" style="margin-top:16px">
          <a class="portal" href="#/login/customer"><em>Eat</em><strong>Customer</strong><p class="muted">Order from open kitchens.</p></a>
          <a class="portal" href="#/login/restaurant"><em>Cook</em><strong>Restaurant</strong><p class="muted">Run the menu and the tickets.</p></a>
        </div>
      </section>
      <footer class="site-foot">${App.dbFooter()}</footer>`;
};

App.actions["browse-cuisine"] = function browseCuisine(el) {
    App.state.cuisine = el.dataset.cuisine || "All";
    location.hash = "#/browse";
};
