import { registerPage } from "../core/registry.js";
import cart from "../modules/cart.js";
import dataService from "../api/dataService.js";
import wishlist from "../modules/wishlist.js";
import Storage from "../utils/storage.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { formatPrice } from "../utils/format.js";
import toast from "../ui/toast.js";
import { imageFallbackAttr } from "../utils/media.js";

let eventsBound = false;

registerPage("cart", async () => {
  await cart.loadFromApi();
  render();
  if (!eventsBound) {
    eventsBound = true;
    window.addEventListener("cartUpdated", render);
    bindDelegatedEvents();
  }
});

async function render() {
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  const items = cart.getItems();

  if (!items.length) {
    main.innerHTML = `
      <div class="container page-hero"><h1>Shopping Cart</h1></div>
      <div class="container empty-state">
        <div class="empty-state__icon">🛒</div>
        <h2>Your Cart is Empty</h2>
        <p>Discover our curated luxury collections and find something extraordinary.</p>
        <a href="shop.html" class="btn btn-primary">Explore Collection</a>
      </div>`;
    return;
  }

  const saved = Storage.get(STORAGE_KEYS.SAVED_FOR_LATER, []);

  main.innerHTML = `
    <div class="container page-hero"><h1>Shopping Cart</h1><p>${cart.getCount()} items</p></div>
    <div class="container cart-layout" id="cart-root">
        <div>
          <div class="card table-responsive">
            <table class="cart-table">
              <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
              <tbody id="cart-items">${items.map(renderRow).join("")}</tbody>
            </table>
          </div>
          ${saved.length ? `<section style="margin-top:2rem"><h3 style="margin-bottom:1rem">Saved for Later</h3>
            <div id="saved-items">${saved.map((s) => `
              <div class="card" style="padding:1rem;margin-bottom:0.5rem;display:flex;gap:1rem;align-items:center">
                <img src="${s.image}" alt="${s.name}" class="cart-item-img" style="width:60px;height:75px" ${imageFallbackAttr()}>
                <div style="flex:1"><strong>${s.name}</strong><br><span class="price-current">${formatPrice(s.price || s.unit_price)}</span></div>
                <button type="button" class="btn btn-sm btn-outline restore-saved" data-pid="${s.product_id || s.productId}">Move to Cart</button>
              </div>`).join("")}</div></section>` : ""}
        </div>
        <div class="cart-summary">
          <h3 style="margin-bottom:1.5rem">Order Summary</h3>
          <div class="coupon-input"><input type="text" class="form-input" id="coupon-code" placeholder="Coupon code"><button type="button" class="btn btn-outline btn-sm" id="apply-coupon">Apply</button></div>
          <div id="coupon-display">${cart.coupon ? `<div class="coupon-applied"><span>${cart.coupon.label} applied</span><button type="button" id="remove-coupon">✕</button></div>` : ""}</div>
          <div class="summary-row"><span>Subtotal</span><span id="subtotal">${formatPrice(cart.getSubtotal())}</span></div>
          <div class="summary-row"><span>Discount</span><span id="discount">-${formatPrice(cart.getDiscount())}</span></div>
          <div class="summary-row"><span>Shipping</span><span id="shipping">${cart.getShipping() === 0 ? "Complimentary" : formatPrice(cart.getShipping())}</span></div>
          <div class="summary-row total"><span>Total</span><span id="total">${formatPrice(cart.getTotal())}</span></div>
          <a href="checkout.html" class="btn btn-primary btn-block" style="margin-top:1.5rem">Proceed to Checkout</a>
          <a href="shop.html" class="btn btn-ghost btn-block" style="margin-top:0.75rem">Continue Shopping</a>
        </div>
    </div>`;
}

function renderRow(item) {
  return `
    <tr data-id="${item.id}">
      <td><div style="display:flex;gap:1rem;align-items:center"><img src="${item.image}" alt="${item.name}" class="cart-item-img" ${imageFallbackAttr()}><div><strong>${item.name}</strong><br><small style="color:var(--color-text-muted)">${item.brand}${item.variant ? " · " + item.variant : ""}</small></div></div></td>
      <td>${formatPrice(item.price)}</td>
      <td><div class="qty-selector"><button type="button" class="qty-dec" aria-label="Decrease">−</button><input value="${item.quantity}" readonly><button type="button" class="qty-inc" aria-label="Increase">+</button></div></td>
      <td>${formatPrice(item.price * item.quantity)}</td>
      <td><button type="button" class="btn btn-ghost btn-sm remove-item">Remove</button> <button type="button" class="btn btn-ghost btn-sm save-later">Save</button></td>
    </tr>`;
}

function bindDelegatedEvents() {
  document.addEventListener("click", async (e) => {
    const root = e.target.closest("#cart-root");
    if (!root) return;

    const row = e.target.closest("tr[data-id]");
    const rowId = row?.dataset?.id;

    if (e.target.closest(".qty-dec") && rowId) {
      const item = cart.getItems().find((i) => i.id === rowId);
      await cart.updateQuantity(rowId, item.quantity - 1);
      await render();
      return;
    }
    if (e.target.closest(".qty-inc") && rowId) {
      const item = cart.getItems().find((i) => i.id === rowId);
      await cart.updateQuantity(rowId, item.quantity + 1);
      await render();
      return;
    }
    if (e.target.closest(".remove-item") && rowId) {
      await cart.remove(rowId);
      toast.info("Item removed");
      await render();
      return;
    }
    if (e.target.closest(".save-later") && rowId) {
      await cart.moveToSaved(rowId);
      toast.success("Saved for later");
      await render();
      return;
    }
    if (e.target.closest(".restore-saved")) {
      const btn = e.target.closest(".restore-saved");
      const p = await dataService.getProductById(btn.dataset.pid);
      if (p) {
        await cart.add(p);
        const list = Storage.get(STORAGE_KEYS.SAVED_FOR_LATER, []).filter(
          (i) => (i.product_id || i.productId) !== btn.dataset.pid
        );
        Storage.set(STORAGE_KEYS.SAVED_FOR_LATER, list);
        toast.success("Moved to cart");
        await render();
      }
      return;
    }
    if (e.target.id === "apply-coupon" || e.target.closest("#apply-coupon")) {
      const code = document.getElementById("coupon-code")?.value;
      const result = await cart.applyCoupon(code);
      if (result.success) {
        toast.success("Coupon applied");
        await render();
      } else toast.error(result.message);
      return;
    }
    if (e.target.id === "remove-coupon" || e.target.closest("#remove-coupon")) {
      cart.removeCoupon();
      await render();
    }
  });
}
