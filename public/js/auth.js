const AUTH_FIELDS = {
    customer: [
        ["name", "Full name", "text"],
        ["email", "Email", "email"],
        ["phone", "Phone", "tel"],
        ["address", "Delivery address", "text", "full"],
        ["password", "Password", "password", "full"]
    ],
    restaurant: [
        ["ownerName", "Your name", "text"],
        ["name", "Restaurant name", "text"],
        ["email", "Email", "email"],
        ["phone", "Phone", "tel"],
        ["address", "Kitchen address", "text", "full"],
        ["cuisine", "Cuisine", "text"],
        ["password", "Password", "password"]
    ],
    rider: [
        ["name", "Full name", "text"],
        ["email", "Email", "email"],
        ["phone", "Phone", "tel"],
        ["vehicleType", "Vehicle", "select", "", ["Scooter", "Bike", "Cycle", "Car"]],
        ["vehicleNumber", "Vehicle number", "text"],
        ["zone", "Zone", "text"],
        ["password", "Password", "password", "full"]
    ]
};

const AUTH_COPY = {
    customer: ["Order as yourself", "A name, a phone, and an address. That's enough to eat."],
    restaurant: ["Open the kitchen", "Your menu, your tickets, your open sign."],
    rider: ["Deliver the valley", "Take jobs when you're free. Get paid the delivery fee."],
    admin: ["City desk", "Invite-only access. Sign in with the account you were given."]
};

App.viewAuth = function viewAuth(mode, role) {
    // Admin is invite-only: always the private gate at #/admin
    if (role === "admin") {
        location.hash = "#/admin";
        return `<div class="boot"><p>Opening admin…</p></div>`;
    }
    const roles = ["customer", "restaurant", "rider"];
    if (!roles.includes(role)) {
        location.hash = `#/${mode === "signup" ? "signup" : "login"}/customer`;
        return `<div class="boot"><p>Taking you to sign in…</p></div>`;
    }
    const signup = mode === "signup";
    App.title(signup ? "Create account" : "Sign in");
    const [headline, lede] = AUTH_COPY[role];
    const demo = App.DEMOS[role];
    const fields = signup ? AUTH_FIELDS[role] : [
        ["email", "Email", "email", "full"],
        ["password", "Password", "password", "full"]
    ];
    const inputs = fields.map((field) => {
        const [name, label, type, span, options] = field;
        if (type === "select") {
            return `<label class="field ${span || ""}"><span>${label}</span><select name="${name}" required>${options.map((option) => `<option>${App.esc(option)}</option>`).join("")}</select></label>`;
        }
        const value = name === "zone" ? "Kathmandu" : "";
        return `<label class="field ${span || ""}"><span>${label}</span><input name="${name}" type="${type}" ${value ? `value="${App.esc(value)}"` : ""} required /></label>`;
    }).join("");
    const confirm = signup ? `<label class="field full"><span>Confirm password</span><input name="confirmPassword" type="password" required /></label>` : "";
    return `<div class="auth-screen">
      <aside class="auth-art">
        <a href="#/" style="color:white">${App.logo()}</a>
        <div>
          <p class="eyebrow" style="color:#f6c7bc">Mitho</p>
          <h2>${App.esc(headline)}</h2>
          <p style="max-width:36ch;margin-top:12px">${App.esc(lede)}</p>
        </div>
        <p>Customers, kitchens, and riders share one app — each with their own login.</p>
      </aside>
      <section class="auth-panel">
        <div>
          <div class="role-tabs three">
            ${roles.map((item) => `<a class="${item === role ? "on" : ""}" href="#/${signup ? "signup" : "login"}/${item}">${item[0].toUpperCase()}${item.slice(1)}</a>`).join("")}
          </div>
          <h1 style="font-size:40px;margin-bottom:6px">${signup ? "Create your login" : "Welcome back"}</h1>
          <p class="muted" style="margin-bottom:16px">${signup ? "Already registered?" : "New here?"} <a href="#/${signup ? "login" : "signup"}/${role}" style="font-weight:700">${signup ? "Sign in" : "Create an account"}</a></p>
          ${signup || !demo ? "" : `<div class="demo-card"><div><strong>Demo ${App.esc(role)}</strong><div class="small">${App.esc(demo[0])} · ${App.esc(demo[1])}</div></div><button class="btn btn-small btn-dark" type="button" data-action="fill-demo" data-role="${role}">Use demo</button></div>`}
          <form class="form-grid" style="margin-top:16px" data-form="auth" data-mode="${signup ? "signup" : "login"}" novalidate>
            <input type="hidden" name="role" value="${role}" />
            ${inputs}
            ${confirm}
            <p class="form-error full"></p>
            <button class="btn btn-primary full" type="submit">${signup ? "Create account" : "Sign in"}</button>
          </form>
        </div>
      </section>
    </div>`;
};

/** Invite-only admin sign-in shown at #/admin when not authenticated. */
App.viewAdminInvite = function viewAdminInvite() {
    App.title("Admin");
    const [headline, lede] = AUTH_COPY.admin;
    return `<div class="auth-screen">
      <aside class="auth-art">
        <a href="#/" style="color:white">${App.logo()}</a>
        <div>
          <p class="eyebrow" style="color:#f6c7bc">Invite only</p>
          <h2>${App.esc(headline)}</h2>
          <p style="max-width:36ch;margin-top:12px">${App.esc(lede)}</p>
        </div>
        <p>This desk is not listed on the public site. Use the link you were given.</p>
      </aside>
      <section class="auth-panel">
        <div>
          <p class="eyebrow">Admin</p>
          <h1 style="font-size:40px;margin-bottom:6px">Sign in</h1>
          <p class="muted" style="margin-bottom:16px">No public signup. Accounts are created by the team.</p>
          <form class="form-grid" style="margin-top:16px" data-form="auth" data-mode="login" novalidate>
            <input type="hidden" name="role" value="admin" />
            <label class="field full"><span>Email</span><input name="email" type="email" required autocomplete="username" /></label>
            <label class="field full"><span>Password</span><input name="password" type="password" required autocomplete="current-password" /></label>
            <p class="form-error full"></p>
            <button class="btn btn-primary full" type="submit">Sign in</button>
          </form>
          <p class="small muted" style="margin-top:16px"><a href="#/">← Back to Mitho</a></p>
        </div>
      </section>
    </div>`;
};

App.actions["fill-demo"] = function fillDemo(el) {
    const form = el.closest(".auth-panel")?.querySelector("form") || document.querySelector("form[data-form=auth]");
    const demo = App.DEMOS[el.dataset.role];
    if (!form || !demo) return;
    form.email.value = demo[0];
    form.password.value = demo[1];
    form.password.focus();
};

App.forms.auth = async function submitAuth(form) {
    App.formError(form, "");
    const button = form.querySelector("[type=submit]");
    const data = Object.fromEntries(new FormData(form));
    const allowed = ["customer", "restaurant", "rider", "admin"];
    if (!allowed.includes(data.role)) {
        App.formError(form, "Choose a valid login.");
        return;
    }
    if (form.dataset.mode === "signup" && data.role === "admin") {
        App.formError(form, "Admin accounts can't be created here.");
        return;
    }
    if (form.dataset.mode === "signup" && !["customer", "restaurant", "rider"].includes(data.role)) {
        App.formError(form, "Choose customer, restaurant, or rider.");
        return;
    }
    for (const input of form.querySelectorAll("[required]")) {
        if (!String(input.value || "").trim()) {
            App.formError(form, "Please fill in all required fields.");
            input.focus();
            return;
        }
    }
    if (data.confirmPassword != null && data.password !== data.confirmPassword) {
        App.formError(form, "Passwords don't match.");
        return;
    }
    delete data.confirmPassword;
    button.disabled = true;
    button.textContent = "Please wait…";
    try {
        const result = await API.post(form.dataset.mode === "signup" ? "/api/auth/signup" : "/api/auth/login", data);
        localStorage.setItem("mitho_token", result.token);
        App.state.user = result.user;
        const next = sessionStorage.getItem("mitho_next");
        sessionStorage.removeItem("mitho_next");
        if (result.user.role === "admin") {
            location.hash = "#/admin";
        } else if (next && result.user.role === "customer") {
            location.hash = next;
        } else {
            location.hash = App.homeFor(result.user.role);
        }
        App.toast(form.dataset.mode === "signup" ? "Welcome to Mitho" : `Hello, ${result.user.name}`);
    } catch (error) {
        App.formError(form, error.message);
        button.disabled = false;
        button.textContent = form.dataset.mode === "signup" ? "Create account" : "Sign in";
    }
};

App.forms.password = async function submitPassword(form) {
    App.formError(form, "");
    const data = Object.fromEntries(new FormData(form));
    if ((data.newPassword || "").length < 6) {
        App.formError(form, "Use at least 6 characters.");
        return;
    }
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
        await API.post("/api/me/password", data);
        form.reset();
        App.toast("Password updated");
    } catch (error) {
        App.formError(form, error.message);
    } finally {
        button.disabled = false;
    }
};
