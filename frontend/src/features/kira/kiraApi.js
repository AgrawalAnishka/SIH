// kiraApi.js — the ONLY file that talks to the KIRA backend.
// Uses the same session cookie + CSRF pattern as the rest of the app (src/lib/api.js).

const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const csrf = getCookie("csrftoken");
  if (csrf && method !== "GET") headers["X-CSRFToken"] = csrf;
  const res = await fetch(`${BASE}/api/kira${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = new Error("KIRA request failed");
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const kiraApi = {
  listConversations: () => request("/conversations/"),
  getConversation: (id) => request(`/conversations/${id}/`),
  renameConversation: (id, title) =>
    request(`/conversations/${id}/`, { method: "PATCH", body: { title } }),
  deleteConversation: (id) =>
    request(`/conversations/${id}/`, { method: "DELETE" }),
  chat: ({ message, conversationId }) =>
    request("/chat/", {
      method: "POST",
      body: { message, conversation_id: conversationId || null },
    }),
  listMemories: () => request("/memories/"),
  deleteMemory: (key) =>
    request(`/memories/${encodeURIComponent(key)}/`, { method: "DELETE" }),
  clearMemories: () => request("/memories/", { method: "DELETE" }),
};
