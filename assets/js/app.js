import { renderHeader } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { initReveal } from "./components/render.js";
import modal from "./ui/modal.js";
import dataService from "./api/dataService.js";
import cart from "./modules/cart.js";
import wishlist from "./modules/wishlist.js";
import toast from "./ui/toast.js";
import { getProductImage, imageFallbackAttr } from "./utils/media.js";
import { runPageInit } from "./core/pageLoader.js";
import { initNavigation } from "./core/navigation.js";
import { setRenderedPage } from "./core/pageRenderCache.js";
import loadSiteSettings from "./utils/siteSettings.js";
import auth from "./modules/auth.js";
import { API_CONFIG } from "./config/constants.js";

const CART_SYNC_KEY = "fx_cart_sync_ts";
const CART_SYNC_INTERVAL = 30000;

let bootstrapped = false;
let globalHandlersReady = false;

function scheduleIdleWork(callback) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 1200 });
    return;
  }
  setTimeout(callback, 16);
}

function shouldSyncCart() {
  if (!auth.isLoggedIn() || API_CONFIG.USE_MOCK) return false;
  try {
    const last = Number(sessionStorage.getItem(CART_SYNC_KEY) || 0);
    if (Date.now() - last < CART_SYNC_INTERVAL) return false;
    sessionStorage.setItem(CART_SYNC_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function syncCartInBackground() {
  if (!shouldSyncCart()) return;
  void Promise.all([cart.loadFromApi(), wishlist.loadFromApi()]);
}

window.addEventListener("apiError", (e) => {
  toast.error(e.detail || "Could not reach the server. Is Laravel running on port 8000?");
});

window.addEventListener("authChanged", (e) => {
  void renderHeader();
  if (auth.isLoggedIn() && !API_CONFIG.USE_MOCK && !e.detail?.loggedOut) {
    try {
      sessionStorage.removeItem(CART_SYNC_KEY);
    } catch (_) {}
    syncCartInBackground();
  }
});

function ensureGlobalHandlers() {
  if (globalHandlersReady) return;
  globalHandlersReady = true;
  initRippleButtons();
  initProductActions();
}

function hydrateCurrentPage(page) {
  const main = document.querySelector(".page-main");
  return runPageInit(page).then(() => {
    if (main) {
      initReveal(main);
      if (main.innerHTML.trim()) {
        setRenderedPage(window.location.href, main.innerHTML);
      }
    }
  });
}

async function initApp() {
  const main = document.querySelector(".page-main");
  if (main) {
    main.id = "main-content";
    main.setAttribute("role", "main");
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  }

  const page = document.body.dataset.page;

  renderFooter();
  modal.init();
  ensureGlobalHandlers();
  initNavigation({ refreshHeader: renderHeader });

  void renderHeader();
  void loadSiteSettings();
  syncCartInBackground();
  void dataService.warmCatalog();

  if (!bootstrapped) {
    bootstrapped = true;
    void hydrateCurrentPage(page);
    return;
  }

  void hydrateCurrentPage(page);
}

function initRippleButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

function initProductActions() {
  document.addEventListener("click", async (e) => {
    const wishBtn = e.target.closest(".wishlist-btn");
    const cartBtn = e.target.closest(".add-cart-btn");
    const qvBtn = e.target.closest(".quick-view-btn");

    if (wishBtn) {
      e.preventDefault();
      e.stopPropagation();
      const product = await dataService.getProductById(wishBtn.dataset.productId);
      if (product) {
        const added = await wishlist.toggle(product);
        wishBtn.classList.toggle("active", added);
        toast.success(added ? "Added to wishlist" : "Removed from wishlist");
      }
    }

    if (cartBtn && !cartBtn.disabled) {
      e.preventDefault();
      e.stopPropagation();
      const product = await dataService.getProductById(cartBtn.dataset.productId);
      if (product) {
        await cart.add(product);
        document.getElementById("cart-icon")?.classList.add("cart-bounce");
        setTimeout(() => document.getElementById("cart-icon")?.classList.remove("cart-bounce"), 500);
        toast.success("Added to cart");
      }
    }

    if (qvBtn) {
      e.preventDefault();
      e.stopPropagation();
      const product = await dataService.getProductById(qvBtn.dataset.productId);
      if (product) openQuickView(product);
    }
  });
}

function openQuickView(product) {
  let overlay = document.getElementById("quick-view-modal");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "quick-view-modal";
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-label", "Quick view");
    document.body.appendChild(overlay);
  }

  const price = product.discountPrice || product.price;
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Quick View</h2>
        <button class="modal-close" data-modal-close aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="quick-view-grid">
          <img src="${getProductImage(product)}" alt="${product.name}" style="border-radius:8px;width:100%" ${imageFallbackAttr()}>
          <div>
            <p class="product-card__brand">${product.brand}</p>
            <h3>${product.name}</h3>
            <p class="price-current" style="font-size:1.5rem;margin:1rem 0">${new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(price)}</p>
            <p style="color:var(--color-text-muted);margin-bottom:1.5rem">${product.description.slice(0, 150)}...</p>
            <a href="${getProductLink(product.id)}" class="btn btn-primary">View Details</a>
            <button class="btn btn-outline qv-add-cart" data-id="${product.id}" style="margin-left:0.5rem">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  overlay.querySelector("[data-modal-close]")?.addEventListener("click", () => closeQuickView(overlay));
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) closeQuickView(overlay); });
  overlay.querySelector(".qv-add-cart")?.addEventListener("click", async () => {
    await cart.add(product);
    toast.success("Added to cart");
    closeQuickView(overlay);
  });
}

function closeQuickView(overlay) {
  overlay.classList.remove("active");
  overlay.setAttribute("aria-hidden", "true");
}

function getProductLink(id) {
  const path = window.location.pathname;
  const base = path.includes("/pages/") || path.includes("/bid/") ? ".." : ".";
  return `${base}/pages/product.html?id=${id}`;
}

document.addEventListener("DOMContentLoaded", initApp);
