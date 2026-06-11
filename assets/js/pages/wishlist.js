import { registerPage } from "../core/registry.js";
import wishlist from "../modules/wishlist.js";
import cart from "../modules/cart.js";
import dataService from "../api/dataService.js";
import { formatPrice } from "../utils/format.js";
import toast from "../ui/toast.js";
import { getProductImage, imageFallbackAttr } from "../utils/media.js";

registerPage("wishlist", async () => {
  await wishlist.loadFromApi();
  render();
  window.addEventListener("wishlistUpdated", render);
});

async function render() {
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  const items = wishlist.getItems();

  if (!items.length) {
    main.innerHTML = `<div class="container page-hero"><h1>Wishlist</h1></div>
      <div class="container empty-state"><div class="empty-state__icon">♥</div><h2>Your Wishlist is Empty</h2>
      <p>Save your favorite luxury pieces for later.</p><a href="shop.html" class="btn btn-primary">Discover Products</a></div>`;
    return;
  }

  main.innerHTML = `<div class="container page-hero"><h1>Wishlist</h1><p>${items.length} saved items</p></div>
    <div class="container grid-3" id="wishlist-grid" style="padding-bottom:3rem"></div>`;

  const grid = document.getElementById("wishlist-grid");
  for (const item of items) {
    const product = await dataService.getProductById(item.productId);
    const card = document.createElement("div");
    card.className = "card";
    card.style.padding = "1.5rem";
    card.innerHTML = `
      <img src="${product ? getProductImage(product) : item.image}" alt="" style="aspect-ratio:3/4;object-fit:cover;border-radius:8px;margin-bottom:1rem" ${imageFallbackAttr()}>
      <p class="product-card__brand">${item.brand}</p>
      <h3 style="margin-bottom:0.5rem">${item.name}</h3>
      <p class="price-current">${formatPrice(item.price)}</p>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm move-cart" data-id="${item.productId}">Move to Cart</button>
        <button class="btn btn-ghost btn-sm remove-wish" data-id="${item.productId}">Remove</button>
        <a href="product.html?id=${item.productId}" class="btn btn-outline btn-sm">View</a>
      </div>`;
    grid.appendChild(card);
  }

  grid.querySelectorAll(".remove-wish").forEach((btn) => {
    btn.addEventListener("click", () => { wishlist.remove(btn.dataset.id); toast.info("Removed"); });
  });
  grid.querySelectorAll(".move-cart").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const p = await dataService.getProductById(btn.dataset.id);
      if (!p) return;
      const res = await cart.add(p);
      if (res?.success === false) {
        toast.error(res.error || "Could not add to cart");
        return;
      }
      wishlist.remove(btn.dataset.id);
      toast.success("Moved to cart");
    });
  });
}
