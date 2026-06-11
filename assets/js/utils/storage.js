import { API_CONFIG } from "../config/constants.js";

const SENSITIVE_KEYS = ["auth_credentials"];

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`fashionx_${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      if (SENSITIVE_KEYS.some((k) => key.includes(k)) && !API_CONFIG?.USE_MOCK) {
        console.warn(`[Storage] Skipping sensitive key "${key}" in API mode`);
        return false;
      }
      localStorage.setItem(`fashionx_${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[Storage] write failed:", e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(`fashionx_${key}`);
  }
};

export default Storage;
