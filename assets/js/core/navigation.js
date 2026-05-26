import { runPageInit, prefetchPageModule } from "./pageLoader.js";
import { updateActiveNav } from "../components/header.js";
import { initReveal } from "../components/render.js";
import { getRenderedPage, setRenderedPage } from "./pageRenderCache.js";

const PAGE_CACHE = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX = 24;
/** Pages that must always re-run JS init (auth, cart, dashboards). */
const NO_RENDER_CACHE = new Set([
  "dashboard",
  "admin",
  "cart",
  "checkout",
  "login",
  "register",
  "payment",
  "wishlist",
  "seller",
  "seller-profile"
]);
let currentBase = null;
let navigating = false;

function skipRenderCache(page) {
  return page && NO_RENDER_CACHE.has(page);
}

function getBaseFromPath(pathname) {
  if (pathname.includes("/pages/") || pathname.includes("/bid/")) return "..";
  return ".";
}

function resolveInternal(href) {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function shouldBypass(link) {
  if (!link?.href) return true;
  if (link.hasAttribute("download")) return true;
  if (link.target === "_blank") return true;
  if (link.dataset.nav === "full") return true;
  if (link.getAttribute("href")?.startsWith("#")) return true;
  if (link.getAttribute("href")?.startsWith("mailto:")) return true;
  if (link.getAttribute("href")?.startsWith("tel:")) return true;
  if (link.id?.includes("logout")) return true;
  return false;
}

function readCache(url) {
  const hit = PAGE_CACHE.get(url);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    PAGE_CACHE.delete(url);
    return null;
  }
  return hit.parsed;
}

function writeCache(url, parsed) {
  if (PAGE_CACHE.size >= CACHE_MAX) {
    PAGE_CACHE.delete(PAGE_CACHE.keys().next().value);
  }
  PAGE_CACHE.set(url, { parsed, ts: Date.now() });
}

async function fetchPageDocument(url) {
  const cached = readCache(url);
  if (cached) return cached;

  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "text/html" }
  });
  if (!res.ok) throw new Error(`Failed to load ${url}`);

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const parsed = {
    page: doc.body?.dataset?.page || "",
    title: doc.title || document.title,
    mainHtml: doc.querySelector(".page-main")?.innerHTML ?? "",
    bodyClass: doc.body?.className || "",
    base: getBaseFromPath(new URL(url).pathname)
  };

  writeCache(url, parsed);
  return parsed;
}

function applyDocumentMeta(parsed, url, replace) {
  document.title = parsed.title;
  document.body.dataset.page = parsed.page;
  document.body.className = parsed.bodyClass;

  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  if (header) header.dataset.base = parsed.base;
  if (footer) footer.dataset.base = parsed.base;

  if (replace) {
    history.replaceState({ fx: true, url }, "", url);
  } else {
    history.pushState({ fx: true, url }, "", url);
  }
}

function syncChromeBase(base, refreshHeader) {
  if (base !== currentBase) {
    currentBase = base;
    void refreshHeader();
  } else {
    updateActiveNav();
  }
}

function hydratePage(page, main, url) {
  return runPageInit(page).then(() => {
    initReveal(main);
    if (!skipRenderCache(page) && main.innerHTML.trim()) {
      setRenderedPage(url, main.innerHTML);
    }
  });
}

export async function navigateTo(url, { replace = false, refreshHeader } = {}) {
  if (navigating) return;
  navigating = true;

  try {
    const main = document.querySelector(".page-main");
    if (!main) {
      window.location.href = url;
      return;
    }

    const pageGuess = guessPageFromPath(new URL(url).pathname);
    const rendered = skipRenderCache(pageGuess) ? null : getRenderedPage(url);
    if (rendered) {
      const parsed = readCache(url) || {
        page: pageGuess,
        title: document.title,
        bodyClass: document.body.className,
        base: getBaseFromPath(new URL(url).pathname)
      };
      main.innerHTML = rendered;
      applyDocumentMeta(parsed, url, replace);
      syncChromeBase(parsed.base, refreshHeader);
      window.scrollTo(0, 0);
      void hydratePage(parsed.page, main, url);
      return;
    }

    const parsed = await fetchPageDocument(url);
    if (parsed.page) prefetchPageModule(parsed.page);

    main.innerHTML = parsed.mainHtml;
    applyDocumentMeta(parsed, url, replace);
    syncChromeBase(parsed.base, refreshHeader);
    window.scrollTo(0, 0);

    void hydratePage(parsed.page, main, url);
  } catch {
    window.location.href = url;
  } finally {
    navigating = false;
  }
}

function prefetchPage(url) {
  void fetchPageDocument(url).catch(() => {});
  try {
    const path = new URL(url).pathname;
    prefetchPageModule(guessPageFromPath(path));
  } catch (_) {}
}

function guessPageFromPath(pathname) {
  const file = pathname.split("/").pop() || "index.html";
  const map = {
    "index.html": pathname.includes("/bid/") ? "bid-home" : "home",
    "shop.html": "shop",
    "product.html": "product",
    "cart.html": "cart",
    "checkout.html": "checkout",
    "wishlist.html": "wishlist",
    "login.html": "login",
    "register.html": "register",
    "payment.html": "payment",
    "admin-dashboard.html": "admin",
    "auction.html": "bid-auction",
    "dashboard.html": "dashboard",
    "about.html": "about"
  };
  return map[file] || file.replace(".html", "");
}

export function initNavigation({ refreshHeader }) {
  window.__fxNavigate = (url, opts) => navigateTo(url, { ...opts, refreshHeader });
  currentBase = getBaseFromPath(window.location.pathname);

  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest("a[href]");
      if (!link || shouldBypass(link)) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const url = resolveInternal(link.href);
      if (!url || url === window.location.href) return;

      e.preventDefault();
      void navigateTo(url, { refreshHeader });
    },
    true
  );

  document.addEventListener(
    "mouseover",
    (e) => {
      const link = e.target.closest("a[href]");
      if (!link || shouldBypass(link)) return;
      const url = resolveInternal(link.href);
      if (url) prefetchPage(url);
    },
    { passive: true }
  );

  document.addEventListener(
    "touchstart",
    (e) => {
      const link = e.target.closest("a[href]");
      if (!link || shouldBypass(link)) return;
      const url = resolveInternal(link.href);
      if (url) prefetchPage(url);
    },
    { passive: true }
  );

  window.addEventListener("popstate", (e) => {
    const url = e.state?.url || window.location.href;
    void navigateTo(url, { replace: true, refreshHeader });
  });

  if (!history.state?.fx) {
    history.replaceState({ fx: true, url: window.location.href }, "", window.location.href);
  }
}
