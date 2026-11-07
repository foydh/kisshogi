// Minimal JSON API client with the per-process token.

function appToken() {
  return document.querySelector('meta[name="kisshogi-token"]')?.getAttribute("content") || "";
}

export class ApiError extends Error {
  constructor(message, code = "api_error", status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export async function request(path, { method = "GET", body, raw = false } = {}) {
  const headers = { "X-Kisshogi-Token": appToken() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let payload = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    const err = payload?.error;
    throw new ApiError(err?.message || `HTTP ${response.status}`, err?.code || "api_error", response.status);
  }
  if (raw) return response;
  const type = response.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) return response;
  return response.json();
}

export const api = {
  config: () => request("/api/config"),
  saveConfig: (config) => request("/api/config", { method: "PUT", body: config }),
  heartbeat: () => request("/api/heartbeat", { method: "POST", body: {} }),
  nativeReady: () => request("/api/native-ready", { method: "POST", body: {} }),
  pagehide: () => request("/api/pagehide", { method: "POST", body: {} }),
  quit: () => request("/api/quit", { method: "POST", body: {} }),
  engineStatus: () => request("/api/engine/status"),
  probe: (path, args = []) => request("/api/engine/probe", { method: "POST", body: { path, args } }),
  startEngine: (role, path, options, args = []) =>
    request("/api/engine/start", { method: "POST", body: { role, path, options, args } }),
  stopEngine: (role) => request("/api/engine/stop", { method: "POST", body: { role } }),
  newGameEngine: (role) => request("/api/engine/newgame", { method: "POST", body: { role } }),
  setOption: (role, name, value = null) =>
    request("/api/engine/setoption", { method: "POST", body: { role, name, value } }),
  go: (role, payload) => request("/api/engine/go", { method: "POST", body: { role, ...payload } }),
  ponderhit: (role) => request("/api/engine/ponderhit", { method: "POST", body: { role } }),
  stopThinking: (role) => request("/api/engine/stop-thinking", { method: "POST", body: { role } }),
  events: (role, since) =>
    request(`/api/engine/events?role=${encodeURIComponent(role)}&since=${since}`),
  encode: async (text, encoding) => {
    const response = await request("/api/encode", {
      method: "POST",
      body: { text, encoding },
      raw: true,
    });
    return response.arrayBuffer();
  },
};
