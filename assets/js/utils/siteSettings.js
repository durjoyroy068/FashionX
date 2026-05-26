import apiClient from "../api/client.js";
import { API_CONFIG } from "../config/constants.js";

const CACHE_KEY = "fx_site_settings";
const TTL_MS = 10 * 60 * 1000;
let cached = null;

export function clearSiteSettingsCache() {
  cached = null;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (_) {}
}

function readPersisted() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function persist(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
}

export async function loadSiteSettings() {
  if (cached) {
    applyToDocument(cached);
    return cached;
  }
  const persisted = readPersisted();
  if (persisted) {
    cached = persisted;
    applyToDocument(cached);
    return cached;
  }
  if (API_CONFIG.USE_MOCK) return null;
  const res = await apiClient.get("/settings/public");
  if (res.success) {
    cached = res.data;
    persist(cached);
    applyToDocument(cached);
    return cached;
  }
  return null;
}

function applyToDocument(settings) {
  if (!settings) return;
  const site = settings.site || {};
  const seo = settings.seo || {};
  if (site.name && document.title.includes("FashionX")) {
    document.title = document.title.replace("FashionX", site.name);
  }
  if (seo.description) {
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", seo.description);
  }
  if (site.tagline) {
    document.querySelectorAll("[data-site-tagline]").forEach((el) => {
      el.textContent = site.tagline;
    });
  }
  document.querySelectorAll("[data-site-email]").forEach((el) => {
    if (site.contact_email) el.textContent = site.contact_email;
  });
  document.querySelectorAll("[data-site-phone]").forEach((el) => {
    if (site.contact_phone) el.textContent = site.contact_phone;
  });
}

export default loadSiteSettings;
