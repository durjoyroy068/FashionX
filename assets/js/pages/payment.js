import { registerPage } from "../core/registry.js";
import cart from "../modules/cart.js";
import auth from "../modules/auth.js";
import Storage from "../utils/storage.js";
import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import apiClient from "../api/client.js";

registerPage("payment", async () => {
  if (!auth.requireAuth()) return;

  await cart.loadFromApi();

  if (!cart.getItems().length || !Storage.get(STORAGE_KEYS.CHECKOUT_PENDING)) {
    window.location.href = "cart.html";
    return;
  }

  const shipping = Storage.get(STORAGE_KEYS.CHECKOUT_SHIPPING);
  const payment = Storage.get(STORAGE_KEYS.CHECKOUT_PAYMENT);
  if (!shipping || !payment) {
    window.location.href = "checkout.html";
    return;
  }

  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  main.innerHTML = `<div class="container payment-processing">
    <div class="payment-spinner" aria-hidden="true"></div>
    <h2>Processing Payment</h2>
    <p style="color:var(--color-text-muted)">Securing your luxury order...</p>
  </div>`;

  const payload = cart.toOrderPayload(shipping, payment);

  if (!API_CONFIG.USE_MOCK) {
    const res = await apiClient.post("/checkout/cart", {
      shipping: payload.shipping || payload.shipping_address,
      payment_method: payload.payment_method,
      coupon_code: payload.coupon_code,
      card_last4: payload.card_last4
    });

    if (!res.success) {
      main.innerHTML = `<div class="container"><p class="error-msg">${res.error || "Payment failed"}</p>
        <a href="checkout.html" class="btn btn-primary">Back to Checkout</a></div>`;
      return;
    }

    await cart.clear();
    Storage.remove(STORAGE_KEYS.CHECKOUT_SHIPPING);
    Storage.remove(STORAGE_KEYS.CHECKOUT_PAYMENT);
    Storage.remove(STORAGE_KEYS.CHECKOUT_PENDING);

    const orderId = res.data?.id || res.data?.order_number;
    window.location.href = `order-success.html?id=${orderId}`;
    return;
  }

  await new Promise((r) => setTimeout(r, 2200));
  const { generateId } = await import("../utils/format.js");
  const order = {
    id: generateId("order"),
    user_id: auth.getUser()?.id,
    ...payload,
    status: "confirmed",
    payment_status: "paid",
    created_at: new Date().toISOString(),
    date: new Date().toISOString()
  };

  const orders = Storage.get(STORAGE_KEYS.ORDERS, []);
  orders.unshift(order);
  Storage.set(STORAGE_KEYS.ORDERS, orders);

  await cart.clear();
  Storage.remove(STORAGE_KEYS.CHECKOUT_SHIPPING);
  Storage.remove(STORAGE_KEYS.CHECKOUT_PAYMENT);
  Storage.remove(STORAGE_KEYS.CHECKOUT_PENDING);

  window.location.href = `order-success.html?id=${order.id}`;
});
