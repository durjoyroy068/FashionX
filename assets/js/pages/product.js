import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import cart from "../modules/cart.js";
import wishlist from "../modules/wishlist.js";
import recentlyViewed from "../modules/recentlyViewed.js";
import { renderProductGrid, renderStars, initReveal } from "../components/render.js";
import { formatPrice, formatDate } from "../utils/format.js";
import { imagesForProduct, getProductImage, imageFallbackAttr } from "../utils/media.js";
import toast from "../ui/toast.js";
import apiClient from "../api/client.js";
import { API_CONFIG } from "../config/constants.js";
import auth from "../modules/auth.js";

registerPage("product", () => {
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  main.innerHTML = `
    <div class="container product-detail-skeleton">
      <div class="skeleton" style="height:24px;width:40%"></div>
      <div class="product-detail-skeleton__main">
        <div class="skeleton" style="aspect-ratio:3/4;max-height:500px;max-width:380px;width:100%"></div>
        <div>
          <div class="skeleton" style="height:32px;width:70%;margin-bottom:1rem"></div>
          <div class="skeleton" style="height:16px;width:90%"></div>
        </div>
      </div>
    </div>`;
  void loadProductPage();
});

async function loadProductPage() {
  const id = new URLSearchParams(location.search).get("id");
  const product = await dataService.getProductById(id);
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  if (!product) {
    main.innerHTML = `<div class="container error-page"><div class="error-code">404</div><h1>Product Not Found</h1><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>`;
    return;
  }

  recentlyViewed.add(product);
  const outOfStock = product.in_stock === false || product.stock === 0;
  const seller = await dataService.getSellerById(product.sellerId);
  const related = (await dataService.getProducts()).filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const price = product.discountPrice || product.price;
  let selectedVariant = product.variants?.[0];
  let qty = 1;
  const galleryImages = getGalleryImages(product);
  const hasMultipleImages = galleryImages.length > 1;
  const thumbsHtml = hasMultipleImages
    ? `<div class="gallery-thumbs" id="gallery-thumbs" role="tablist" aria-label="Product image thumbnails">
        ${galleryImages.map((img, i) => `<button type="button" role="tab" class="${i === 0 ? "active" : ""}" data-img="${img}" aria-label="View image ${i + 1}" aria-selected="${i === 0}"><img src="${img}" alt="" ${imageFallbackAttr()}></button>`).join("")}
      </div>`
    : "";
  const badges = product.badges?.length
    ? `<div class="product-detail__badges">${product.badges.map((b) => `<span class="badge badge-gold">${b}</span>`).join("")}</div>`
    : "";
  const stockBadge = product.stock === 0
    ? '<span class="badge badge-error">Out of Stock</span>'
    : product.stock < 5
      ? `<span class="badge badge-dark">Only ${product.stock} left</span>`
      : "";

  main.innerHTML = `
    <div class="container product-detail">
      <nav class="breadcrumb product-detail__breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><span aria-current="page">${product.name}</span>
      </nav>
      <div class="product-detail__main">
        <aside class="product-detail__gallery${hasMultipleImages ? "" : " product-detail__gallery--single"}" aria-label="Product images">
          <div class="gallery-main" id="gallery-main">
            <img src="${galleryImages[0]}" alt="${product.name}" id="main-image" ${imageFallbackAttr()}>
          </div>
          ${thumbsHtml}
        </aside>
        <div class="product-detail__info">
        <p class="section-label">${product.brand}</p>
        ${badges}
        <h1 class="product-detail__title">${product.name}</h1>
        <div class="product-detail__rating">${renderStars(product.rating)} <span>(${product.reviewCount} reviews)</span></div>
        <div class="product-detail__price">
          <span class="price-current">${formatPrice(price)}</span>
          ${product.discountPrice ? `<span class="price-original">${formatPrice(product.price)}</span>` : ""}
        </div>
        <p class="product-detail__desc">${product.description}</p>
        ${product.variants?.length ? `<div class="product-detail__variants"><span class="form-label">Select Option</span><div class="variant-options" id="variants" role="group" aria-label="Product options">${product.variants.map((v) => `<button type="button" class="variant-btn variant-btn--${variantSlug(v)}${v === selectedVariant ? " active" : ""}" data-v="${v}" aria-pressed="${v === selectedVariant}" ${product.stock === 0 ? "disabled" : ""}><span class="variant-btn__swatch" aria-hidden="true"></span><span class="variant-btn__label">${v}</span></button>`).join("")}</div></div>` : ""}
        <div class="product-detail__purchase">
          <span class="form-label">Quantity</span>
          <div class="qty-selector"><button type="button" id="qty-minus" aria-label="Decrease quantity">−</button><input type="number" id="qty-input" value="1" min="1" max="${product.stock}" readonly aria-label="Quantity"><button type="button" id="qty-plus" aria-label="Increase quantity">+</button></div>
          ${stockBadge}
        </div>
        <div class="product-detail__actions">
          <button class="btn btn-primary btn-lg" id="add-cart" ${outOfStock ? "disabled" : ""}>${outOfStock ? "Out of Stock" : "Add to Cart"}</button>
          <button class="btn btn-outline btn-lg" id="add-wishlist">♥ Wishlist</button>
        </div>
        <div class="product-detail__meta">
          <span>Estimated delivery: <strong>${product.deliveryDays} business days</strong></span>
          <span>Insured shipping included</span>
        </div>
        <div class="share-buttons" aria-label="Share product">${["Share", "Pin", "Post"].map((s) => `<button class="share-btn" type="button" aria-label="${s}">${s[0]}</button>`).join("")}</div>
        <div class="product-detail__tabs">
          <div class="tabs">
            <button class="tab-btn active" data-tab="materials" type="button">Materials</button>
            <button class="tab-btn" data-tab="packaging" type="button">Packaging</button>
            <button class="tab-btn" data-tab="brand" type="button">Brand</button>
            <button class="tab-btn" data-tab="delivery" type="button">Delivery</button>
          </div>
          <div class="tab-panel active" id="tab-materials"><p class="product-detail__desc">${product.materials}</p></div>
          <div class="tab-panel" id="tab-packaging"><p class="product-detail__desc">${product.packaging}</p></div>
          <div class="tab-panel" id="tab-brand"><p class="product-detail__desc">${product.brand} — Verified luxury seller ${seller ? `<a href="seller-profile.html?id=${seller.id}">${seller.name}</a>` : ""}</p></div>
          <div class="tab-panel" id="tab-delivery"><p class="product-detail__desc">Complimentary insured shipping on orders over $500. White-glove delivery available.</p></div>
        </div>
        </div>
      </div>
    </div>
    <section class="section product-related">
      <div class="container">
        <div class="section-header">
          <p class="section-label">You May Also Like</p>
          <h2 class="section-title">Related Products</h2>
        </div>
        <div class="grid-4" id="related-products"></div>
      </div>
    </section>
    <section class="section section--elevated product-reviews">
      <div class="container">
        <div class="product-reviews__header">
          <p class="section-label">Verified Buyers</p>
          <h2 class="section-title">Customer Reviews</h2>
          <p class="section-desc">Authenticated feedback from collectors who own this piece</p>
        </div>
        <div class="reviews-layout">
          <aside class="reviews-summary card" id="reviews-summary" aria-label="Review summary">
            <p class="reviews-summary__score">${product.rating.toFixed(1)}</p>
            <div class="reviews-summary__stars">${renderStars(product.rating)}</div>
            <p class="reviews-summary__count">Based on ${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"}</p>
            <div class="reviews-bars" id="reviews-bars" aria-hidden="true"></div>
          </aside>
          <div class="reviews-content">
            <div class="reviews-list" id="reviews">
              <div class="reviews-loading">Loading reviews…</div>
            </div>
            ${auth.isLoggedIn() ? `<form id="review-form" class="card review-form-card">
              <h3>Write a Review</h3>
              <p class="review-form-card__hint">Share your experience with this piece. Reviews are moderated before publishing.</p>
              <div class="form-group">
                <span class="form-label">Your Rating</span>
                <div class="star-picker" id="review-star-input" role="radiogroup" aria-label="Rating">
                  ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-picker__star${n <= 5 ? " active" : ""}" data-rating="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
                </div>
                <input type="hidden" name="rating" value="5" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="review-title">Headline (optional)</label>
                <input class="form-input" id="review-title" name="title" type="text" maxlength="255" placeholder="Summarize your experience">
              </div>
              <div class="form-group">
                <label class="form-label" for="review-body">Your Review</label>
                <textarea class="form-textarea" id="review-body" name="body" rows="4" placeholder="Tell us about quality, fit, and delivery…"></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Submit Review</button>
            </form>` : `<div class="card review-login-prompt">
              <h3>Share Your Experience</h3>
              <p>Sign in to leave a review for this piece.</p>
              <a href="login.html" class="btn btn-outline">Sign In to Review</a>
            </div>`}
          </div>
        </div>
      </div>
    </section>
    <div class="zoom-overlay" id="zoom-overlay"><img src="" alt="" id="zoom-img"></div>
  `;

  renderProductGrid(related, document.getElementById("related-products"), { basePath: ".." });
  await loadProductReviews(id, product);

  initReviewForm(id);
  initReveal(main);

  document.querySelectorAll("#gallery-thumbs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mainImage = document.getElementById("main-image");
      mainImage.src = btn.dataset.img;
      document.querySelectorAll("#gallery-thumbs button").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
    });
  });

  document.getElementById("gallery-main")?.addEventListener("click", () => {
    const overlay = document.getElementById("zoom-overlay");
    document.getElementById("zoom-img").src = document.getElementById("main-image").src;
    overlay.classList.add("active");
  });
  document.getElementById("zoom-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "zoom-overlay") e.currentTarget.classList.remove("active");
  });

  document.querySelectorAll("#variants .variant-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedVariant = btn.dataset.v;
      document.querySelectorAll("#variants .variant-btn").forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
  });

  document.getElementById("qty-minus")?.addEventListener("click", () => { qty = Math.max(1, qty - 1); document.getElementById("qty-input").value = qty; });
  document.getElementById("qty-plus")?.addEventListener("click", () => { qty = Math.min(product.stock, qty + 1); document.getElementById("qty-input").value = qty; });

  document.getElementById("add-cart")?.addEventListener("click", async () => {
    const res = await cart.add(product, qty, selectedVariant);
    if (res?.success === false) {
      toast.error(res.error || "Could not add to cart");
      return;
    }
    toast.success("Added to cart");
  });

  const wishBtn = document.getElementById("add-wishlist");
  wishBtn.textContent = wishlist.has(product.id) ? "♥ In Wishlist" : "♥ Wishlist";
  wishBtn.addEventListener("click", async () => {
    const added = await wishlist.toggle(product);
    wishBtn.textContent = added ? "♥ In Wishlist" : "♥ Wishlist";
    toast.success(added ? "Added to wishlist" : "Removed");
  });

  document.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = window.location.href;
      const text = `${product.name} — ${product.brand}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: product.name, text, url });
        } catch {
          /* user cancelled */
        }
      } else {
        await navigator.clipboard?.writeText(url);
        const { default: toast } = await import("../ui/toast.js");
        toast.success("Link copied to clipboard");
      }
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });
}

function getGalleryImages(product) {
  const raw = product.images?.length ? product.images : imagesForProduct(product);
  return [...new Set((raw || []).filter(Boolean))];
}

function variantSlug(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function reviewAuthorInitials(name) {
  return (name || "Customer")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderRatingBars(reviews) {
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
    const pct = Math.round((count / total) * 100);
    return `<div class="reviews-bar-row">
      <span class="reviews-bar-row__label">${star}★</span>
      <div class="reviews-bar-row__track"><div class="reviews-bar-row__fill" style="width:${pct}%"></div></div>
      <span class="reviews-bar-row__count">${count}</span>
    </div>`;
  }).join("");
}

function renderReviewCard(review) {
  const author = review.author || "Verified Customer";
  const date = review.date ? `<time class="review-card__date" datetime="${review.date}">${formatDate(review.date)}</time>` : "";
  const title = review.title ? `<h4 class="review-card__title">${review.title}</h4>` : "";
  const body = review.body ? `<p class="review-card__body">${review.body}</p>` : "";

  return `
    <article class="review-card">
      <div class="review-card__header">
        <div class="review-card__avatar" aria-hidden="true">${reviewAuthorInitials(author)}</div>
        <div class="review-card__meta">
          <div class="review-card__author-row">
            <strong class="review-author">${author}</strong>
            <span class="review-card__badge">Verified</span>
          </div>
          ${date}
        </div>
        <div class="review-card__stars">${renderStars(review.rating)}</div>
      </div>
      ${title}
      ${body}
    </article>`;
}

function updateReviewsSummary(product, reviews) {
  const summary = document.getElementById("reviews-summary");
  const bars = document.getElementById("reviews-bars");
  if (!summary) return;

  const count = reviews.length || product.reviewCount || 0;
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
    : product.rating;

  summary.querySelector(".reviews-summary__score").textContent = avg.toFixed(1);
  summary.querySelector(".reviews-summary__stars").innerHTML = renderStars(avg);
  summary.querySelector(".reviews-summary__count").textContent = `Based on ${count} review${count === 1 ? "" : "s"}`;

  if (bars) {
    bars.innerHTML = reviews.length ? renderRatingBars(reviews) : "";
    bars.setAttribute("aria-hidden", reviews.length ? "false" : "true");
  }
}

async function loadProductReviews(productId, product) {
  const el = document.getElementById("reviews");
  if (!el) return;

  let reviews = [];
  if (!API_CONFIG.USE_MOCK) {
    const res = await apiClient.get(`/products/${productId}/reviews`);
    if (res.success && Array.isArray(res.data)) {
      reviews = res.data;
    }
  }

  updateReviewsSummary(product, reviews);

  if (reviews.length) {
    el.innerHTML = reviews.map((r) => renderReviewCard(r)).join("");
    return;
  }

  el.innerHTML = `
    <div class="reviews-empty">
      <div class="reviews-empty__icon" aria-hidden="true">✦</div>
      <p class="section-label">No Reviews Yet</p>
      <h3>Be the First to Share Your Experience</h3>
      <p>Verified buyers can leave detailed feedback after delivery. Your review helps other collectors shop with confidence.</p>
    </div>`;
}

function initReviewForm(productId) {
  const form = document.getElementById("review-form");
  if (!form) return;

  const ratingInput = form.querySelector('input[name="rating"]');
  const starButtons = form.querySelectorAll(".star-picker__star");
  let selectedRating = 5;

  const paintStars = (rating) => {
    starButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.rating) <= rating);
    });
  };

  starButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRating = Number(btn.dataset.rating);
      ratingInput.value = String(selectedRating);
      paintStars(selectedRating);
    });
    btn.addEventListener("mouseenter", () => paintStars(Number(btn.dataset.rating)));
  });

  form.querySelector(".star-picker")?.addEventListener("mouseleave", () => paintStars(selectedRating));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const res = await apiClient.post("/reviews", {
      product_id: productId,
      rating: Number(fd.rating),
      title: fd.title?.trim() || undefined,
      body: fd.body?.trim() || undefined
    });
    if (res.success) {
      toast.success("Review submitted for approval");
      e.target.reset();
      selectedRating = 5;
      ratingInput.value = "5";
      paintStars(5);
    } else {
      toast.error(res.error || "Failed to submit");
    }
  });
}
