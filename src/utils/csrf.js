const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export function getCookie(name) {
    const parts = document.cookie.split("; ").map(v => v.split("="));
    const found = parts.find(([k]) => k === name);
    return found ? (found[1] || "") : "";
}

export async function ensureCsrf() {
    return fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        },
    });
}
