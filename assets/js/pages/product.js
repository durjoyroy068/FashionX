import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import cart from "../modules/cart.js";
import wishlist from "../modules/wishlist.js";
import recentlyViewed from "../modules/recentlyViewed.js";
import { renderProductGrid, renderStars } from "../components/render.js";
import { formatPrice } from "../utils/format.js";
import { imagesForProduct, getProductImage, imageFallbackAttr } from "../utils/media.js";
import toast from "../ui/toast.js";
import apiClient from "../api/client.js";
import { API_CONFIG } from "../config/constants.js";
import auth from "../modules/auth.js";

registerPage("product", () => {
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  main.innerHTML = `
    <div class="container product-detail">
      <div class="skeleton" style="height:24px;width:40%;margin-bottom:1.5rem"></div>
      <div class="skeleton" style="aspect-ratio:1/1;max-height:480px;margin-bottom:1.5rem"></div>
      <div class="skeleton" style="height:32px;width:70%;margin-bottom:1rem"></div>
      <div class="skeleton" style="height:16px;width:90%"></div>
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
  const seller = await dataService.getSellerById(product.sellerId);
  const related = (await dataService.getProducts()).filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const price = product.discountPrice || product.price;
  let selectedVariant = product.variants?.[0];
  let qty = 1;
  const galleryImages = product.images?.length ? product.images : imagesForProduct(product);

  main.innerHTML = `
    <div class="container product-detail">
      <nav class="breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><span aria-current="page">${product.name}</span></nav>
      <div>
        <div class="gallery-main" id="gallery-main"><img src="${getProductImage(product)}" alt="${product.name}" id="main-image" ${imageFallbackAttr()}></div>
        <div class="gallery-thumbs" id="gallery-thumbs">${galleryImages.map((img, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-img="${img}"><img src="${img}" alt="" ${imageFallbackAttr()}></button>`).join("")}</div>
      </div>
      <div>
        <p class="section-label">${product.brand}</p>
        <h1>${product.name}</h1>
        <div class="product-card__rating" style="margin:1rem 0">${renderStars(product.rating)} <span>(${product.reviewCount} reviews)</span></div>
        <div class="product-card__price" style="margin-bottom:1.5rem">
          <span class="price-current" style="font-size:2rem">${formatPrice(price)}</span>
          ${product.discountPrice ? `<span class="price-original">${formatPrice(product.price)}</span>` : ""}
        </div>
        <p style="color:var(--color-text-muted);margin-bottom:1.5rem">${product.description}</p>
        ${product.variants?.length ? `<div><span class="form-label">Select Option</span><div class="variant-options" id="variants">${product.variants.map((v) => `<button type="button" class="variant-btn ${v === selectedVariant ? "active" : ""}" data-v="${v}" ${product.stock === 0 ? "disabled" : ""}>${v}</button>`).join("")}</div></div>` : ""}
        <div style="margin:1.5rem 0;display:flex;align-items:center;gap:1rem">
          <span class="form-label" style="margin:0">Quantity</span>
          <div class="qty-selector"><button type="button" id="qty-minus">−</button><input type="number" id="qty-input" value="1" min="1" max="${product.stock}" readonly><button type="button" id="qty-plus">+</button></div>
          ${product.stock === 0 ? '<span class="badge badge-error">Out of Stock</span>' : product.stock < 5 ? '<span class="badge badge-dark">Only ' + product.stock + ' left</span>' : ""}
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem">
          <button class="btn btn-primary" id="add-cart" ${product.stock === 0 ? "disabled" : ""}>Add to Cart</button>
          <button class="btn btn-outline" id="add-wishlist">♥ Wishlist</button>
        </div>
        <div class="share-buttons">${["Share", "Pin", "Post"].map((s) => `<button class="share-btn" type="button" aria-label="${s}">${s[0]}</button>`).join("")}</div>
        <p style="margin-top:1rem;color:var(--color-text-muted)">Estimated delivery: <strong>${product.deliveryDays} business days</strong></p>
        <div class="tabs" style="margin-top:2rem">
          <button class="tab-btn active" data-tab="materials">Materials</button>
          <button class="tab-btn" data-tab="packaging">Packaging</button>
          <button class="tab-btn" data-tab="brand">Brand</button>
          <button class="tab-btn" data-tab="delivery">Delivery</button>
        </div>
        <div class="tab-panel active" id="tab-materials"><p style="color:var(--color-text-muted);padding:1rem 0">${product.materials}</p></div>
        <div class="tab-panel" id="tab-packaging"><p style="color:var(--color-text-muted);padding:1rem 0">${product.packaging}</p></div>
        <div class="tab-panel" id="tab-brand"><p style="color:var(--color-text-muted);padding:1rem 0">${product.brand} — Verified luxury seller ${seller ? `<a href="seller-profile.html?id=${seller.id}">${seller.name}</a>` : ""}</p></div>
        <div class="tab-panel" id="tab-delivery"><p style="color:var(--color-text-muted);padding:1rem 0">Complimentary insured shipping on orders over $500. White-glove delivery available.</p></div>
      </div>
    </div>
    <section class="section"><div class="container"><h2 class="section-title">Related Products</h2><div class="grid-4" id="related-products"></div></div></section>
    <section class="section" style="background:var(--color-bg-elevated)"><div class="container"><h2 class="section-title">Customer Reviews</h2><div id="reviews">Loading reviews…</div>
    ${auth.isLoggedIn() ? `<form id="review-form" class="card" style="padding:1.5rem;margin-top:1.5rem;max-width:520px">
      <h3 style="margin-bottom:1rem">Write a Review</h3>
      <div class="form-group"><label class="form-label">Rating</label><select class="form-input" name="rating" required><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></div>
      <div class="form-group"><label class="form-label">Comment</label><textarea class="form-textarea" name="body" rows="3" style="width:100%"></textarea></div>
      <button type="submit" class="btn btn-primary">Submit Review</button></form>` : ""}</div></section>
    <div class="zoom-overlay" id="zoom-overlay"><img src="" alt="" id="zoom-img"></div>
  `;

  renderProductGrid(related, document.getElementById("related-products"), { basePath: ".." });
  await loadProductReviews(id, product);

  document.getElementById("review-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const res = await apiClient.post("/reviews", {
      product_id: id,
      rating: Number(fd.rating),
      body: fd.body
    });
    if (res.success) {
      toast.success("Review submitted for approval");
      e.target.reset();
    } else toast.error(res.error || "Failed to submit");
  });

  document.querySelectorAll("#gallery-thumbs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("main-image").src = btn.dataset.img;
      document.querySelectorAll("#gallery-thumbs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
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
      document.querySelectorAll("#variants .variant-btn").forEach((b) => b.classList.toggle("active", b === btn));
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

async function loadProductReviews(productId, product) {
  const el = document.getElementById("reviews");
  if (!el) return;
  if (!API_CONFIG.USE_MOCK) {
    const res = await apiClient.get(`/products/${productId}/reviews`);
    if (res.success && Array.isArray(res.data) && res.data.length) {
      el.innerHTML = res.data.map((r) => `
        <div class="review-item">
          <div class="review-header"><span class="review-author">${r.author || "Customer"}</span>${renderStars(r.rating)}</div>
          <p style="color:var(--color-text-muted)">${r.body || r.title || ""}</p>
        </div>`).join("");
      return;
    }
  }
  el.innerHTML = `<p style="color:var(--color-text-muted)">No approved reviews yet. Be the first to review.</p>`;
}
