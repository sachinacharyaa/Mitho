const API = {
    async request(path, options = {}) {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("mitho_token");
        if (token) headers.Authorization = "Bearer " + token;
        let response;
        try {
            response = await fetch(path, {
                method: options.method || "GET",
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch {
            const error = new Error("Can't reach Mitho. Start the server with npm start.");
            error.status = 0;
            throw error;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("mitho_token");
                if (window.App) window.App.state.user = null;
            }
            const error = new Error(data.error || "Something went wrong");
            error.status = response.status;
            throw error;
        }
        return data;
    },
    get(path) { return this.request(path); },
    post(path, body) { return this.request(path, { method: "POST", body }); },
    patch(path, body) { return this.request(path, { method: "PATCH", body }); },
    del(path) { return this.request(path, { method: "DELETE" }); }
};
