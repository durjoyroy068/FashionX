import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import Storage from "../utils/storage.js";

/**
 * Unified API client for FashionX Laravel backend.
 */
class ApiClient {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.useMock = API_CONFIG.USE_MOCK;
    this._token = null;
    const session = Storage.get(STORAGE_KEYS.SESSION, null);
    if (session?.token) this._token = session.token;
  }

  setToken(token) {
    this._token = token || null;
  }

  clearToken() {
    this._token = null;
  }

  _getToken(options = {}) {
    if (options.token) return options.token;
    if (this._token) return this._token;
    const session = Storage.get(STORAGE_KEYS.SESSION, null);
    return session?.token || null;
  }

  _handleAuthFailure(status) {
    if (status === 401) {
      this.clearToken();
      Storage.remove(STORAGE_KEYS.USER);
      Storage.remove(STORAGE_KEYS.SESSION);
      window.dispatchEvent(new CustomEvent("authChanged", { detail: { sessionExpired: true } }));
      if (!window.location.pathname.includes("login")) {
        const base = window.location.pathname.includes("/pages/") || window.location.pathname.includes("/bid/")
          ? "../pages/login.html"
          : "./pages/login.html";
        window.location.href = `${base}?session=expired`;
      }
    }
  }

  async request(method, endpoint, body = null, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

    if (this.useMock && options.mockHandler) {
      return options.mockHandler();
    }

    const token = this._getToken(options);
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };

    if (body && method !== "GET") {
      config.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    config.signal = controller.signal;

    try {
      const res = await fetch(url, config);
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this._handleAuthFailure(res.status);
        return {
          success: false,
          error: data.message || data.errors || res.statusText,
          errors: data.errors,
          status: res.status
        };
      }
      return { success: true, data: data.data ?? data, meta: data.meta, status: res.status };
    } catch (err) {
      clearTimeout(timeout);
      const msg = err.name === "AbortError" ? "Request timed out" : err.message || "Network error";
      return { success: false, error: msg };
    }
  }

  get(endpoint, options) {
    return this.request("GET", endpoint, null, options);
  }

  post(endpoint, body, options) {
    return this.request("POST", endpoint, body, options);
  }

  put(endpoint, body, options) {
    return this.request("PUT", endpoint, body, options);
  }

  patch(endpoint, body, options) {
    return this.request("PATCH", endpoint, body, options);
  }

  delete(endpoint, options) {
    return this.request("DELETE", endpoint, null, options);
  }

  async upload(endpoint, formData, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const token = this._getToken(options);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this._handleAuthFailure(res.status);
        return { success: false, error: data.message || res.statusText, status: res.status };
      }
      return { success: true, data: data.data ?? data, status: res.status };
    } catch (err) {
      return { success: false, error: err.message || "Network error" };
    }
  }

  unwrapList(res) {
    if (!res?.success) return [];
    const d = res.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }
}

export const apiClient = new ApiClient();
export default apiClient;
