import Storage from "../utils/storage.js";

import { generateId } from "../utils/format.js";

import { API_CONFIG, STORAGE_KEYS, ROLES, ROUTES } from "../config/constants.js";

import apiClient from "../api/client.js";

import clearSessionData from "../utils/session.js";

import { clearCatalogCache } from "../utils/catalogCache.js";

import { getPagePath } from "../utils/format.js";



class AuthManager {

  constructor() {

    this._logoutInProgress = false;

    this._sessionValidated = false;

    this._loadSession();

  }



  _loadSession() {

    this.user = Storage.get(STORAGE_KEYS.USER, null);

    this.session = Storage.get(STORAGE_KEYS.SESSION, null);

    if (this.session?.expiresAt && Date.now() > this.session.expiresAt) {

      void this.logout({ silent: true });

      return;

    }

    if (!API_CONFIG.USE_MOCK && this.session?.token) {

      apiClient.setToken(this.session.token);

      void this._validateSessionInBackground();

    }

  }



  async _validateSessionInBackground() {

    if (this._logoutInProgress || this._sessionValidated) return;

    const res = await apiClient.get("/auth/me");

    if (this._logoutInProgress) return;

    if (res.success) {
      this.user = this._normalizeUser(res.data);
      Storage.set(STORAGE_KEYS.USER, this.user);
      this._sessionValidated = true;

    } else if (res.status === 401) {

      await this.logout({ silent: true });

    }

  }



  isLoggedIn() {

    if (!this.session?.token) return false;

    if (this.session.expiresAt && Date.now() > this.session.expiresAt) {

      void this.logout({ silent: true });

      return false;

    }

    return true;

  }



  getUser() {

    return this.user;

  }



  getToken() {

    return this.session?.token || null;

  }



  getDashboardPath(role = null) {
    const r = role || this.user?.role || ROLES.BUYER;
    const routeKey = r === ROLES.ADMIN ? "admin" : r === ROLES.SELLER ? "seller" : "dashboard";
    return getPagePath(routeKey);
  }

  redirectToLogin() {
    window.location.href = `${getPagePath("login")}?redirect=${encodeURIComponent(window.location.href)}`;
  }



  validateEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  }



  validatePassword(password) {

    return password.length >= 8 &&

      /[A-Z]/.test(password) &&

      /[a-z]/.test(password) &&

      /[0-9]/.test(password);

  }



  _hashPassword(password) {
    // WARNING: This is mock-only. Real auth uses Laravel's bcrypt via API.
    // btoa is encoding, not hashing — never use this pattern in production.
    return btoa(unescape(encodeURIComponent(password)));
  }



  _checkCredentials(email, password) {

    const creds = Storage.get(STORAGE_KEYS.AUTH_CREDENTIALS, {});

    const hash = this._hashPassword(password);

    if (creds[email] === hash) return true;

    const users = Storage.get(STORAGE_KEYS.REGISTERED_USERS, []);

    const legacy = users.find((u) => u.email === email && u.password === password);

    if (legacy) {

      creds[email] = hash;

      Storage.set(STORAGE_KEYS.AUTH_CREDENTIALS, creds);

      const { password: _, ...safe } = legacy;

      return safe;

    }

    return null;

  }



  async login(email, password, remember = false) {

    await this._revokeAndClearBeforeAuth();



    if (!API_CONFIG.USE_MOCK) {

      const res = await apiClient.post("/auth/login", { email, password });

      if (!res.success) {

        return { success: false, message: res.error || res.errors || "Login failed" };

      }

      const payload = res.data;

      return await this._createSession(this._normalizeUser(payload.user), remember, payload.token);

    }



    // ============================================================
    // MOCK MODE — for local development only (USE_MOCK: true)
    // All credentials below are demo accounts that DO NOT exist
    // in any real database. Set USE_MOCK: false for production.
    // ============================================================

    await this._simulateDelay();

    if (email === "demo@fashionx.com" && password === "FashionX1!") {

      return await this._createSession({

        id: "user_demo",

        email,

        first_name: "Alexandra",

        last_name: "Chen",

        firstName: "Alexandra",

        lastName: "Chen",

        role: ROLES.BUYER,

        avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200"

      }, remember);

    }



    if (email === "seller@fashionx.com" && password === "FashionX1!") {

      return await this._createSession({

        id: "user_seller_demo",

        email,

        first_name: "Marcus",

        last_name: "Bellini",

        firstName: "Marcus",

        lastName: "Bellini",

        role: ROLES.SELLER,

        seller_id: "sel_001"

      }, remember);

    }



    if (email === "admin@fashionx.com" && password === "FashionX1!") {

      return await this._createSession({

        id: "user_admin_demo",

        email,

        first_name: "Admin",

        last_name: "FashionX",

        firstName: "Admin",

        lastName: "FashionX",

        role: ROLES.ADMIN

      }, remember);

    }



    const found = this._checkCredentials(email, password);

    if (found === true) {

      const users = Storage.get(STORAGE_KEYS.REGISTERED_USERS, []);

      const user = users.find((u) => u.email === email);

      if (user) {

        const { password: _, ...safeUser } = user;

        return await this._createSession(this._normalizeUser(safeUser), remember);

      }

    }

    if (found && typeof found === "object") {

      return await this._createSession(this._normalizeUser(found), remember);

    }



    return { success: false, message: "Invalid email or password" };

  }



  async register(data) {

    await this._revokeAndClearBeforeAuth();



    if (!API_CONFIG.USE_MOCK) {

      const role = data.role === ROLES.SELLER ? "seller" : "buyer";

      const res = await apiClient.post("/auth/register", {

        first_name: data.first_name || data.firstName,

        last_name: data.last_name || data.lastName,

        email: data.email,

        password: data.password,

        role

      });

      if (!res.success) {
        return {
          success: false,
          message: res.error || "Registration failed",
          status: res.status,
          errors: res.errors
        };
      }

      const payload = res.data;

      return this._createSession(
        this._normalizeUser({ ...payload.user, seller_pending: payload.seller_pending }),
        false,
        payload.token
      );

    }



    await this._simulateDelay();

    const users = Storage.get(STORAGE_KEYS.REGISTERED_USERS, []);



    if (users.some((u) => u.email === data.email)) {

      return { success: false, message: "Email already registered" };

    }



    const user = {

      id: generateId("user"),

      email: data.email,

      first_name: data.first_name || data.firstName,

      last_name: data.last_name || data.lastName,

      firstName: data.first_name || data.firstName,

      lastName: data.last_name || data.lastName,

      role: data.role || ROLES.BUYER,

      created_at: new Date().toISOString()

    };



    if (user.role === ROLES.SELLER) {

      user.seller_id = generateId("sel");

      user.sellerId = user.seller_id;

    }



    users.push(user);

    Storage.set(STORAGE_KEYS.REGISTERED_USERS, users);



    const creds = Storage.get(STORAGE_KEYS.AUTH_CREDENTIALS, {});

    creds[data.email] = this._hashPassword(data.password);

    Storage.set(STORAGE_KEYS.AUTH_CREDENTIALS, creds);



    return await this._createSession(this._normalizeUser(user), false);

  }



  _normalizeUser(user) {
    return {
      ...user,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      first_name: user.first_name || user.firstName,
      last_name: user.last_name || user.lastName,
      seller_pending: Boolean(user.seller_pending),
      created_at: user.created_at || user.createdAt || null
    };
  }

  isSellerPending() {
    return Boolean(this.user?.seller_pending) && this.user?.role !== "seller";
  }



  async _revokeAndClearBeforeAuth() {

    const token = this.session?.token;

    if (!API_CONFIG.USE_MOCK && token) {

      try {

        await apiClient.post("/auth/logout", null, { token });

      } catch (_) {}

    }

    await clearSessionData();

    clearCatalogCache();

    this.user = null;

    this.session = null;

    this._sessionValidated = false;

    apiClient.clearToken();

  }



  async logout(options = {}) {

    if (this._logoutInProgress) return;

    this._logoutInProgress = true;



    const token = this.session?.token;

    try {

      if (!API_CONFIG.USE_MOCK && token && !options.skipApi) {

        await apiClient.post("/auth/logout", null, { token });

      }

    } catch (_) {}



    this.user = null;

    this.session = null;

    this._sessionValidated = false;

    apiClient.clearToken();

    await clearSessionData();

    clearCatalogCache();



    if (!options.silent) {

      window.dispatchEvent(new CustomEvent("authChanged", { detail: { loggedOut: true } }));

    }



    this._logoutInProgress = false;

  }



  async logoutAndRedirect(url) {

    await this.logout();

    window.location.replace(url);

  }



  async _createSession(user, remember, apiToken = null) {

    this.user = user;

    const expiresAt = remember

      ? Date.now() + 30 * 24 * 60 * 60 * 1000

      : Date.now() + 24 * 60 * 60 * 1000;

    this.session = {

      token: apiToken || generateId("token"),

      expires_at: expiresAt,

      expiresAt

    };

    this._sessionValidated = true;

    Storage.set(STORAGE_KEYS.USER, this.user);

    Storage.set(STORAGE_KEYS.SESSION, this.session);

    apiClient.setToken(this.session.token);

    try {
      await this._syncSessionData();
    } catch (_) {
      /* Login should succeed even if cart/wishlist sync fails */
    }

    window.dispatchEvent(new CustomEvent("authChanged", { detail: { loggedIn: true, user: this.user } }));

    return { success: true, user: this.user };

  }



  async _syncSessionData() {

    if (API_CONFIG.USE_MOCK || !this.session?.token) return;

    const [{ default: cart }] = await Promise.all([import("./cart.js")]);

    const localCart = Storage.get(STORAGE_KEYS.CART, []);

    if (localCart.length) {

      await apiClient.post("/cart/sync", {

        items: localCart.map((i) => ({

          product_id: i.product_id || i.productId,

          quantity: i.quantity

        }))

      });

    }

    await cart.loadFromApi();

    const { default: wishlist } = await import("./wishlist.js");

    await wishlist.loadFromApi();

  }



  async updateProfile(updates) {

    if (!this.user) return { success: false, message: "Not logged in" };

    if (!API_CONFIG.USE_MOCK) {

      const res = await apiClient.put("/auth/profile", {

        first_name: updates.first_name || updates.firstName,

        last_name: updates.last_name || updates.lastName,

        phone: updates.phone,

        avatar: updates.avatar

      });

      if (res.success) {

        this.user = this._normalizeUser(res.data);

        Storage.set(STORAGE_KEYS.USER, this.user);

        window.dispatchEvent(new CustomEvent("authChanged", { detail: { user: this.user } }));

        return { success: true };

      }

      return { success: false, message: res.error || "Profile update failed" };

    }

    const normalized = {

      ...updates,

      first_name: updates.first_name || updates.firstName,

      last_name: updates.last_name || updates.lastName,

      firstName: updates.first_name || updates.firstName,

      lastName: updates.last_name || updates.lastName

    };

    this.user = { ...this.user, ...normalized };

    Storage.set(STORAGE_KEYS.USER, this.user);

    const users = Storage.get(STORAGE_KEYS.REGISTERED_USERS, []);

    const idx = users.findIndex((u) => u.id === this.user.id);

    if (idx >= 0) {

      users[idx] = { ...users[idx], ...normalized };

      delete users[idx].password;

      Storage.set(STORAGE_KEYS.REGISTERED_USERS, users);

    }

    window.dispatchEvent(new CustomEvent("authChanged", { detail: { user: this.user } }));

    return { success: true };

  }



  requireAuth() {

    if (!this.isLoggedIn()) {

      this.redirectToLogin();

      return false;

    }

    return true;

  }



  requireRole(...roles) {

    if (!this.requireAuth()) return false;

    const role = (this.user?.role || "").toLowerCase();

    if (!roles.map((r) => r.toLowerCase()).includes(role)) {

      window.location.href = this.getDashboardPath();

      return false;

    }

    return true;

  }



  async _simulateDelay() {

    return new Promise((r) => setTimeout(r, 400));

  }

}



export const auth = new AuthManager();

export default auth;

