import { debounce } from "../utils/format.js";
import cart from "../modules/cart.js";
import wishlist from "../modules/wishlist.js";
import auth from "../modules/auth.js";
import dataService from "../api/dataService.js";
import Storage from "../utils/storage.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { getProductImage, imageFallbackAttr } from "../utils/media.js";
import { getCachedCategories } from "../utils/catalogCache.js";

let headerEventsBound = false;

function categoryLinksHtml(categories, base) {
  return (categories || [])
    .map((c) => `<a href="${base}/pages/shop.html?category=${c.slug}">${c.name}</a>`)
    .join("");
}

function paintHeader(headerEl, base, categories) {
  const user = auth.getUser();
  const accountHref = user ? auth.getDashboardPath() : `${base}/pages/login.html`;
  const categoryLinks = categoryLinksHtml(categories, base);

  const buyerDrawerLinks = `
    <a href="${base}/pages/dashboard.html" class="drawer-link">My Account</a>
    <a href="${base}/pages/orders.html" class="drawer-link">Orders</a>
    <a href="${base}/pages/wishlist.html" class="drawer-link">Wishlist</a>
    <a href="${base}/pages/addresses.html" class="drawer-link">Addresses</a>
    <a href="${base}/pages/notifications.html" class="drawer-link">Notifications</a>
    <a href="${base}/pages/tracking.html" class="drawer-link">Tracking</a>`;

  const panelLinks = user
    ? (user.role === "admin"
        ? `<a href="${base}/pages/admin-dashboard.html" class="drawer-link">Admin Panel</a>
           <a href="${base}/pages/seller-dashboard.html" class="drawer-link">Seller Panel</a>
           ${buyerDrawerLinks}
           <a href="${base}/bid/seller-dashboard.html" class="drawer-link">Auction Panel</a>`
        : user.role === "seller"
          ? `<a href="${base}/pages/seller-dashboard.html" class="drawer-link">Seller Panel</a>
             <a href="${base}/bid/seller-dashboard.html" class="drawer-link">Auction Panel</a>
             <a href="${base}/bid/submit.html" class="drawer-link">Submit Auction Item</a>
             ${buyerDrawerLinks}`
          : buyerDrawerLinks)
    : "";

  headerEl.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <div class="container header-inner">
      <button class="menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>

      <a href="${base}/index.html" class="logo" aria-label="FashionX Home">Fashion<span>X</span></a>

      <nav class="nav-desktop" aria-label="Main navigation">
        <a href="${base}/index.html" class="nav-link" data-page="home">Home</a>
        <div class="nav-item">
          <a href="${base}/pages/shop.html" class="nav-link" data-page="shop">Shop</a>
          <div class="mega-menu" role="menu">
            <div class="mega-menu-grid">
              <div>
                <h4>Categories</h4>
                <div id="header-category-links">${categoryLinks}</div>
              </div>
              <div>
                <h4>Collections</h4>
                <a href="${base}/pages/shop.html?badge=Limited">Limited Edition</a>
                <a href="${base}/pages/shop.html?sort=newest">New Arrivals</a>
                <a href="${base}/pages/shop.html?badge=Bestseller">Best Sellers</a>
              </div>
              <div>
                <h4>Brands</h4>
                <a href="${base}/pages/brand.html?id=br_001">Maison Élise</a>
                <a href="${base}/pages/brand.html?id=br_002">Velour Atelier</a>
                <a href="${base}/pages/brand.html?id=br_003">Chronos Elite</a>
              </div>
              <div>
                <h4>FashionX Bid</h4>
                <a href="${base}/bid/index.html">Live Auctions</a>
                <a href="${base}/bid/history.html">Bid History</a>
                <a href="${base}/bid/submit.html">Submit Item</a>
              </div>
            </div>
          </div>
        </div>
        <a href="${base}/bid/index.html" class="nav-link" data-page="bid">FashionX Bid</a>
        <a href="${base}/pages/categories.html" class="nav-link" data-page="categories">Categories</a>
        <a href="${base}/pages/about.html" class="nav-link" data-page="about">About</a>
      </nav>

      <div class="header-actions">
        <div class="search-box">
          <input type="search" id="header-search" placeholder="Search luxury..." 
            aria-label="Search products" autocomplete="off">
          <button type="button" aria-label="Search" id="search-btn">⌕</button>
          <div class="search-suggestions" id="search-suggestions" role="listbox"></div>
        </div>

        <button class="header-icon" id="theme-toggle" aria-label="Toggle theme">◐</button>

        <a href="${base}/pages/wishlist.html" class="header-icon" aria-label="Wishlist">
          ♥<span class="count" id="wishlist-count">${wishlist.getCount()}</span>
        </a>

        <a href="${base}/pages/cart.html" class="header-icon" aria-label="Shopping cart" id="cart-icon">
          🛒<span class="count" id="cart-count">${cart.getCount()}</span>
        </a>

        ${user
          ? `<a href="${accountHref}" class="header-icon" aria-label="Account dashboard">👤</a>`
          : `<a href="${base}/pages/login.html" class="btn btn-ghost btn-sm">Sign In</a>`
        }
      </div>
    </div>

    <div class="nav-drawer-overlay" id="drawer-overlay"></div>
    <nav class="nav-drawer" id="nav-drawer" aria-label="Mobile navigation">
      <div class="nav-drawer-header">
        <span class="logo">Fashion<span>X</span></span>
        <button class="modal-close" id="drawer-close" aria-label="Close menu">✕</button>
      </div>
      <div class="nav-drawer-body">
        <input type="search" class="form-input" id="mobile-search" placeholder="Search..." style="margin-bottom:1rem">
        <a href="${base}/index.html" class="drawer-link">Home</a>
        <a href="${base}/pages/shop.html" class="drawer-link">Shop</a>
        <div class="drawer-submenu" id="drawer-category-links">${categoryLinks}</div>
        <a href="${base}/bid/index.html" class="drawer-link">FashionX Bid</a>
        <a href="${base}/pages/wishlist.html" class="drawer-link">Wishlist</a>
        <a href="${base}/pages/cart.html" class="drawer-link">Cart</a>
        ${panelLinks}
        <a href="${base}/pages/about.html" class="drawer-link">About</a>
        <a href="${base}/pages/contact.html" class="drawer-link">Contact</a>
        ${user
          ? `<button class="btn btn-outline btn-block" id="drawer-logout" style="margin-top:1rem">Logout</button>`
          : `<a href="${base}/pages/login.html" class="btn btn-primary btn-block" style="margin-top:1rem">Sign In</a>`
        }
      </div>
    </nav>
  `;
}

function updateCategoryMenus(categories, base) {
  const html = categoryLinksHtml(categories, base);
  const headerLinks = document.getElementById("header-category-links");
  const drawerLinks = document.getElementById("drawer-category-links");
  if (headerLinks) headerLinks.innerHTML = html;
  if (drawerLinks) drawerLinks.innerHTML = html;
}

export function renderHeader() {
  const headerEl = document.getElementById("site-header");
  if (!headerEl) return Promise.resolve();

  const base = "";
  const initialCategories = dataService.peekCategories() || getCachedCategories() || [];
  paintHeader(headerEl, base, initialCategories);
  updateActiveNav();

  if (!headerEventsBound) {
    bindHeaderEvents();
    headerEventsBound = true;
  } else {
    updateCounts();
  }

  return dataService.getCategories().then((categories) => {
    if (categories?.length) updateCategoryMenus(categories, base);
  });
}

export function updateActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  const isBidSection = page.startsWith("bid");
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    const match =
      link.dataset.page === page ||
      (link.dataset.page === "bid" && isBidSection);
    link.classList.toggle("active", match);
  });
}

function getHeaderBase() {
  return document.getElementById("site-header")?.dataset.base || ".";
}

function bindHeaderEvents() {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("#menu-toggle");
    const closeBtn = e.target.closest("#drawer-close");
    const overlay = e.target.closest("#drawer-overlay");
    const drawer = document.getElementById("nav-drawer");
    const menuToggle = document.getElementById("menu-toggle");

    if (toggle) {
      menuToggle?.classList.add("active");
      drawer?.classList.add("active");
      document.getElementById("drawer-overlay")?.classList.add("active");
      document.body.classList.add("nav-open");
      menuToggle?.setAttribute("aria-expanded", "true");
    }

    if (closeBtn || overlay) {
      menuToggle?.classList.remove("active");
      drawer?.classList.remove("active");
      document.getElementById("drawer-overlay")?.classList.remove("active");
      document.body.classList.remove("nav-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    }

    if (e.target.closest("#drawer-logout")) {
      e.preventDefault();
      const base = getHeaderBase();
      void auth.logoutAndRedirect(`${base}/index.html`);
    }

    if (e.target.closest("#theme-toggle")) {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const next = isLight ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "");
      Storage.set(STORAGE_KEYS.THEME, next);
    }
  });

  const header = document.querySelector(".site-header");
  if (header && !header.dataset.scrollBound) {
    header.dataset.scrollBound = "1";
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 50);
    }, { passive: true });
  }

  const current = Storage.get(STORAGE_KEYS.THEME, "dark");
  document.documentElement.setAttribute("data-theme", current === "light" ? "light" : "");

  initSearch();
  updateCounts();
}

function updateCounts() {
  const cartCount = document.getElementById("cart-count");
  const wishCount = document.getElementById("wishlist-count");
  if (cartCount) cartCount.textContent = cart.getCount();
  if (wishCount) wishCount.textContent = wishlist.getCount();
}

function initSearch() {
  const input = document.getElementById("header-search");
  const suggestions = document.getElementById("search-suggestions");
  const mobileSearch = document.getElementById("mobile-search");

  const doSearch = (q) => {
    const base = getHeaderBase();
    if (q.trim()) {
      window.location.href = `${base}/pages/search.html?q=${encodeURIComponent(q.trim())}`;
    }
  };

  const showSuggestions = debounce(async (q) => {
    if (!q || q.length < 2) {
      suggestions?.classList.remove("active");
      return;
    }
    const products = await dataService.searchProducts(q);
    const limited = products.slice(0, 5);
    const base = getHeaderBase();
    if (!limited.length) {
      suggestions.innerHTML = `<div class="search-suggestion"><span>No results</span></div>`;
    } else {
      suggestions.innerHTML = limited
        .map(
          (p) => `
        <div class="search-suggestion" data-id="${p.id}" role="option">
          <img src="${getProductImage(p)}" alt="${p.name}" ${imageFallbackAttr()}>
          <div>
            <strong>${p.name}</strong>
            <small>${p.brand}</small>
          </div>
        </div>`
        )
        .join("");
    }
    suggestions?.classList.add("active");

    suggestions?.querySelectorAll(".search-suggestion[data-id]").forEach((el) => {
      el.addEventListener("click", () => {
        window.location.href = `${base}/pages/product.html?id=${el.dataset.id}`;
      });
    });
  }, 250);

  input?.addEventListener("input", (e) => showSuggestions(e.target.value));
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch(input.value);
  });
  document.getElementById("search-btn")?.addEventListener("click", () => doSearch(input?.value || ""));
  mobileSearch?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch(mobileSearch.value);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) suggestions?.classList.remove("active");
  });
}

window.addEventListener("cartUpdated", updateCounts);
window.addEventListener("wishlistUpdated", updateCounts);
