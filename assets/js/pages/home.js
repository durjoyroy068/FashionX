import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import { renderProductGrid, renderAuctionCard, initReveal, showSkeletonGrid } from "../components/render.js";
import auctionManager from "../modules/auction.js";
import toast from "../ui/toast.js";
import apiClient from "../api/client.js";
import { API_CONFIG } from "../config/constants.js";
import { loadStorefrontBanners, applyHeroBanner } from "../utils/banners.js";

registerPage("home", () => {
  ["featured-products", "trending-products", "bestseller-products"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.innerHTML.trim()) showSkeletonGrid(el, 5);
  });
  const bidGrid = document.getElementById("live-auctions");
  if (bidGrid && !bidGrid.innerHTML.trim()) showSkeletonGrid(bidGrid, 3);

  void hydrateHome();
});

async function hydrateHome() {
  const products = dataService.peekProducts();
  if (products?.length) {
    paintHomeGrids(products, []);
  }

  const [banners, freshProducts, auctions, brands] = await Promise.all([
    loadStorefrontBanners(),
    dataService.getProducts(),
    dataService.getAuctions(),
    dataService.getBrands()
  ]);

  applyHeroBanner(banners);
  paintHomeGrids(freshProducts, auctions);

  const brandTrack = document.getElementById("brand-track");
  if (brandTrack) {
    brandTrack.innerHTML = brands.map((b) => renderBrandSlide(b)).join("");
    initCarousel("brand-carousel", { perView: { mobile: 1, tablet: 2, desktop: 4 } });
  }

  initTestimonials();

  document.getElementById("newsletter-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector("input[type=email]").value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!API_CONFIG.USE_MOCK) {
        const res = await apiClient.post("/newsletter/subscribe", { email, source: "home" });
        if (!res.success) {
          toast.error(res.error || "Subscription failed");
          return;
        }
      }
      toast.success("Welcome to FashionX exclusive list");
      e.target.reset();
    } else toast.error("Please enter a valid email");
  });

  loadRecentlyViewed();
}

function takeProducts(list, count, fallback = []) {
  const picked = list.slice(0, count);
  if (picked.length >= count) return picked;
  const seen = new Set(picked.map((p) => p.id));
  for (const p of fallback) {
    if (picked.length >= count) break;
    if (!seen.has(p.id)) {
      picked.push(p);
      seen.add(p.id);
    }
  }
  return picked;
}

function paintHomeGrids(products, auctions) {
  const featured = takeProducts(products.filter((p) => p.featured), 5, products);
  const trending = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);
  const bestsellers = takeProducts(products.filter((p) => p.badges?.includes("Bestseller")), 5, products);

  renderProductGrid(featured, document.getElementById("featured-products"), { basePath: "." });
  renderProductGrid(trending, document.getElementById("trending-products"), { basePath: "." });
  renderProductGrid(bestsellers, document.getElementById("bestseller-products"), { basePath: "." });

  const bidGrid = document.getElementById("live-auctions");
  const live = auctions.filter((a) => a.status === "live" || a.status === "active").slice(0, 3);
  if (!bidGrid) return;

  if (live.length) {
    bidGrid.innerHTML = live.map((a) => renderAuctionCard(a)).join("");
    initCountdowns();
    initReveal(bidGrid);
    return;
  }

  bidGrid.innerHTML = `
    <div class="empty-state card">
      <p class="section-label">Coming Soon</p>
      <h2>No Live Auctions Right Now</h2>
      <p>New authenticated lots are added regularly. Explore the auction house or get notified first.</p>
      <a href="./bid/index.html" class="btn btn-primary">Browse Auction House</a>
    </div>`;
}

function initCountdowns() {
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    const end = el.dataset.countdown;
    const tick = () => {
      const t = auctionManager.getTimeRemaining(end);
      if (t.expired) {
        el.innerHTML = '<span class="countdown-text" style="color:var(--color-error)">Ended</span>';
        return;
      }
      el.innerHTML = `<span class="countdown-text">${t.hours}h ${t.minutes}m ${t.seconds}s</span>`;
    };
    tick();
    setInterval(tick, 1000);
  });
}

const TESTIMONIAL_WORD_LIMIT = 50;

function brandInitials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderBrandLogo(brand) {
  const initials = brandInitials(brand.name);
  if (brand.logo) {
    return `<div class="brand-card__logo brand-card__logo--image">
      <img src="${brand.logo}" alt="${brand.name}" loading="lazy" width="72" height="72">
    </div>`;
  }
  return `<div class="brand-card__logo" aria-hidden="true">${initials}</div>`;
}

function renderBrandSlide(brand) {
  const verified = brand.verified
    ? '<span class="brand-card__badge">Verified</span>'
    : "";
  const count = brand.productCount
    ? `<p class="brand-card__meta">${brand.productCount} curated pieces</p>`
    : "";

  return `
    <div class="carousel-slide">
      <a href="./pages/brand.html?id=${brand.id}" class="brand-card">
        ${renderBrandLogo(brand)}
        <div class="brand-card__body">
          <h3 class="brand-card__name">${brand.name}</h3>
          <p class="brand-card__country">${brand.country}</p>
          ${verified}
          ${count}
        </div>
      </a>
    </div>`;
}

function truncateWords(text, maxWords) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}\u2026`;
}

function initTestimonials() {
  document.querySelectorAll(".testimonials-grid blockquote").forEach((el) => {
    el.textContent = truncateWords(el.textContent, TESTIMONIAL_WORD_LIMIT);
  });
}

function getCarouselPerView(options) {
  const bp = options.perView || {};
  if (window.innerWidth >= 1024) return bp.desktop ?? 3;
  if (window.innerWidth >= 768) return bp.tablet ?? 2;
  return bp.mobile ?? 1;
}

function initCarousel(id, options = {}) {
  const carousel = document.getElementById(id);
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const slides = track?.children.length || 0;
  let index = 0;
  const prev = carousel.querySelector(".carousel-btn.prev");
  const next = carousel.querySelector(".carousel-btn.next");

  const update = () => {
    const perView = getCarouselPerView(options);
    const max = Math.max(0, slides - perView);
    index = Math.min(index, max);
    track.style.transform = `translateX(-${(index * 100) / perView}%)`;

    carousel.classList.toggle("carousel-static", max === 0);
    prev?.toggleAttribute("disabled", index <= 0);
    next?.toggleAttribute("disabled", index >= max);
  };

  prev?.addEventListener("click", () => {
    index = Math.max(0, index - 1);
    update();
  });
  next?.addEventListener("click", () => {
    index = Math.min(Math.max(0, slides - getCarouselPerView(options)), index + 1);
    update();
  });
  window.addEventListener("resize", update);
  update();
}

async function loadRecentlyViewed() {
  const { recentlyViewed } = await import("../modules/recentlyViewed.js");
  const items = recentlyViewed.getItems();
  const container = document.getElementById("recently-viewed");
  if (!container || !items.length) {
    document.getElementById("recently-section")?.remove();
    return;
  }
  const products = await Promise.all(items.map((i) => dataService.getProductById(i.productId)));
  renderProductGrid(products.filter(Boolean), container, { basePath: "." });
}
