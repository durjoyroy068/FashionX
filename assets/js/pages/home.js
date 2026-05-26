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
    if (el && !el.innerHTML.trim()) showSkeletonGrid(el, 4);
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
    brandTrack.innerHTML = brands
      .map(
        (b) => `
      <div class="carousel-slide">
        <a href="./pages/brand.html?id=${b.id}" class="card" style="padding:2rem;text-align:center">
          <img src="${b.logo}" alt="${b.name}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 1rem;object-fit:cover">
          <h3 style="font-size:1.125rem">${b.name}</h3>
          <p style="color:var(--color-text-muted);font-size:0.875rem">${b.country}</p>
        </a>
      </div>`
      )
      .join("");
    initCarousel("brand-carousel");
  }

  initCarousel("testimonial-carousel");

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

function paintHomeGrids(products, auctions) {
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const trending = [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4);
  const bestsellers = products.filter((p) => p.badges?.includes("Bestseller")).slice(0, 4);

  renderProductGrid(featured, document.getElementById("featured-products"), { basePath: "." });
  renderProductGrid(trending, document.getElementById("trending-products"), { basePath: "." });
  renderProductGrid(bestsellers, document.getElementById("bestseller-products"), { basePath: "." });

  const bidGrid = document.getElementById("live-auctions");
  const live = auctions.filter((a) => a.status === "live" || a.status === "active").slice(0, 3);
  if (bidGrid && live.length) {
    bidGrid.innerHTML = live.map((a) => renderAuctionCard(a, ".")).join("");
    initCountdowns();
    initReveal(bidGrid);
  }
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

function initCarousel(id) {
  const carousel = document.getElementById(id);
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const slides = track?.children.length || 0;
  let index = 0;
  const prev = carousel.querySelector(".carousel-btn.prev");
  const next = carousel.querySelector(".carousel-btn.next");
  const update = () => {
    const perView = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
    const max = Math.max(0, slides - perView);
    index = Math.min(index, max);
    track.style.transform = `translateX(-${(index * 100) / perView}%)`;
  };
  prev?.addEventListener("click", () => { index = Math.max(0, index - 1); update(); });
  next?.addEventListener("click", () => { index++; update(); });
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
