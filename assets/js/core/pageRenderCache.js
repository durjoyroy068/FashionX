const RENDER_CACHE = new Map();
const MAX_ENTRIES = 20;

export function getRenderedPage(url) {
  return RENDER_CACHE.get(url) || null;
}

export function setRenderedPage(url, html) {
  if (!url || !html) return;
  if (RENDER_CACHE.size >= MAX_ENTRIES) {
    RENDER_CACHE.delete(RENDER_CACHE.keys().next().value);
  }
  RENDER_CACHE.set(url, html);
}

export function clearRenderedPages() {
  RENDER_CACHE.clear();
}
