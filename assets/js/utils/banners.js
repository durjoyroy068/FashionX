import apiClient from "../api/client.js";
import { API_CONFIG } from "../config/constants.js";

export async function loadStorefrontBanners() {
  if (API_CONFIG.USE_MOCK) return [];
  const res = await apiClient.get("/banners");
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data;
}

export function applyHeroBanner(banners) {
  if (!banners.length) return;

  const hero = banners.find((b) => b.position === "home" || b.position === "hero") || banners[0];
  const heroBg = document.querySelector(".hero-bg");
  if (hero?.image && heroBg) {
    heroBg.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url("${hero.image}")`;
    heroBg.style.backgroundSize = "cover";
    heroBg.style.backgroundPosition = "center";
  }

  const content = document.querySelector(".hero-content");
  if (content && hero) {
    const label = content.querySelector(".hero-label");
    const h1 = content.querySelector("h1");
    const p = content.querySelector("p:not(.hero-label)");
    if (label && hero.subtitle) label.textContent = hero.subtitle;
    if (h1 && hero.title) h1.textContent = hero.title;
    if (p && hero.link) {
      p.innerHTML = `Discover authenticated luxury. <a href="${hero.link}" class="btn btn-outline" style="margin-left:0.5rem">Shop Now</a>`;
    }
  }

  const promo = banners.find((b) => b.position === "promo") || banners[1];
  const promoEl = document.querySelector(".promo-banner-content");
  if (promo && promoEl) {
    const h2 = promoEl.querySelector("h2");
    const label = promoEl.querySelector(".section-label");
    if (h2 && promo.title) h2.textContent = promo.title;
    if (label && promo.subtitle) label.textContent = promo.subtitle;
    const promoSection = document.querySelector(".promo-banner");
    if (promo.image && promoSection) {
      promoSection.style.backgroundImage = `linear-gradient(90deg, rgba(10,10,10,0.92), rgba(10,10,10,0.4)), url("${promo.image}")`;
      promoSection.style.backgroundSize = "cover";
    }
  }
}

export default loadStorefrontBanners;
