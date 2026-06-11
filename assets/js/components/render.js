import { formatPrice } from "../utils/format.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";
import { getAuctionImage, getProductImage, imageFallbackAttr } from "../utils/media.js";
import { getPagePath } from "../utils/format.js";
import wishlist from "../modules/wishlist.js";

export function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += "★";
    else if (i === full && half) stars += "½";
    else stars += "☆";
  }
  return `<span class="stars" aria-label="${rating} out of 5 stars">${stars}</span>`;
}

export function renderProductCard(product, options = {}) {
  const productHref = `${getPagePath("product")}?id=${encodeURIComponent(product.id)}`;
  const price = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const inWishlist = wishlist.has(product.id);
  const badges = (product.badges || [])
    .map((b) => `<span class="badge badge-gold">${escapeHtml(b)}</span>`)
    .join("");

  const stockBadge =
    product.stock === 0
      ? '<span class="badge badge-error">Sold Out</span>'
      : product.stock < 5
        ? '<span class="badge badge-dark">Low Stock</span>'
        : "";

  return `
    <article class="card product-card hover-lift reveal" data-product-id="${escapeAttr(product.id)}">
      <a href="${productHref}" class="product-card__link">
        <div class="product-card__media">
          <img src="${escapeAttr(getProductImage(product))}" alt="${escapeAttr(product.name)}" loading="lazy" width="400" height="533" ${imageFallbackAttr()}>
          <div class="product-card__badges">${badges}${stockBadge}</div>
          <div class="product-card__actions">
            <button type="button" class="icon-btn wishlist-btn ${inWishlist ? "active" : ""}" 
              data-product-id="${product.id}" aria-label="${inWishlist ? "Remove from" : "Add to"} wishlist" title="Wishlist">
              ♥
            </button>
            <button type="button" class="icon-btn quick-view-btn" data-product-id="${product.id}" 
              aria-label="Quick view" title="Quick View">👁</button>
            <button type="button" class="icon-btn add-cart-btn" data-product-id="${product.id}" 
              aria-label="Add to cart" title="Add to Cart" ${product.stock === 0 ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="product-card__body">
          <p class="product-card__brand">${escapeHtml(product.brand)}</p>
          <h3 class="product-card__title">${escapeHtml(product.name)}</h3>
          <div class="product-card__price">
            <span class="price-current">${formatPrice(price)}</span>
            ${hasDiscount ? `<span class="price-original">${formatPrice(product.price)}</span>` : ""}
          </div>
          <div class="product-card__rating">
            ${renderStars(product.rating)}
            <span>(${product.reviewCount})</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

export function renderProductGrid(products, container, options = {}) {
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-state__icon">◇</div>
        <h2>No Products Found</h2>
        <p>Try adjusting your filters or search terms.</p>
        <a href="${getPagePath("shop")}" class="btn btn-primary">Browse Collection</a>
      </div>
    `;
    return;
  }
  container.innerHTML = products
    .map((p) => renderProductCard(p, options))
    .join("");
  initReveal(container);
}

export function renderAuctionCard(auction) {
  const auctionHref = `${getPagePath("bidDetail")}?id=${encodeURIComponent(auction.id)}`;
  const img = getAuctionImage(auction);
  return `
    <article class="card auction-card hover-lift reveal" data-auction-id="${escapeAttr(auction.id)}">
      <a href="${auctionHref}">
        <div class="product-card__media">
          <img src="${escapeAttr(img)}" alt="${escapeAttr(auction.title)}" loading="lazy" ${imageFallbackAttr()}>
          <div class="product-card__badges">
            <span class="live-pulse">Live</span>
          </div>
        </div>
        <div class="product-card__body">
          <p class="product-card__brand">${escapeHtml(auction.brand)}</p>
          <h3 class="product-card__title">${escapeHtml(auction.title)}</h3>
          <div class="product-card__price">
            <span class="price-current" data-current-bid="${auction.id}">
              ${formatPrice(auction.currentBid || auction.startingBid)}
            </span>
          </div>
          <div class="auction-countdown compact" data-countdown="${auction.endTime}" data-auction-id="${auction.id}">
            <span class="countdown-text">Loading...</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

export function initReveal(root = document) {
  const reveals = root.querySelectorAll(".reveal:not(.visible)");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
  );
  const viewportH = window.innerHeight || document.documentElement.clientHeight;
  reveals.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < viewportH && rect.bottom > 0) {
      el.classList.add("visible");
      return;
    }
    observer.observe(el);
  });
}

export function showSkeletonGrid(container, count = 8) {
  container.innerHTML = Array(count)
    .fill(
      `<div class="card"><div class="skeleton" style="aspect-ratio:3/4"></div>
       <div style="padding:1rem"><div class="skeleton" style="height:12px;width:40%;margin-bottom:8px"></div>
       <div class="skeleton" style="height:16px;width:80%;margin-bottom:8px"></div>
       <div class="skeleton" style="height:14px;width:30%"></div></div></div>`
    )
    .join("");
}
