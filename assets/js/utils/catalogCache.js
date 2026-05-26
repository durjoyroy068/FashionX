const CATEGORIES_KEY = "fx_categories";
const TTL_MS = 5 * 60 * 1000;

export function getCachedCategories() {
  try {
    const raw = sessionStorage.getItem(CATEGORIES_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) return null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedCategories(data) {
  try {
    sessionStorage.setItem(
      CATEGORIES_KEY,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch (_) {}
}

export function clearCatalogCache() {
  try {
    sessionStorage.removeItem(CATEGORIES_KEY);
  } catch (_) {}
}
