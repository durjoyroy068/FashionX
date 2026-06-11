import { registerPage } from "../core/registry.js";
import cart from "../modules/cart.js";
import auth from "../modules/auth.js";
import Storage from "../utils/storage.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { mapShippingForm, mapPaymentForm, formatShippingDisplay } from "../utils/formData.js";
import { formatPrice } from "../utils/format.js";
import { formatCardNumber, validateCardNumber, validateCvv } from "../utils/cardValidation.js";

let step = 1;

registerPage("checkout", async () => {
  if (!auth.requireAuth()) return;
  await cart.loadFromApi();
  if (!cart.getItems().length) {
    window.location.href = "cart.html";
    return;
  }
  render(auth.getUser());
});

function render(user) {
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  const discount = cart.getDiscount();
  main.innerHTML = `
    <div class="container page-hero"><h1>Checkout</h1></div>
    <div class="container checkout-container">
      <div class="checkout-steps">
        <div class="checkout-step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}"><span class="step-number">1</span> Shipping</div>
        <div class="checkout-step ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}"><span class="step-number">2</span> Payment</div>
        <div class="checkout-step ${step >= 3 ? "active" : ""}"><span class="step-number">3</span> Review</div>
      </div>
      <div class="checkout-layout">
        <div id="step-content"></div>
        <div class="cart-summary checkout-summary">
          <div class="summary-row"><span>Subtotal</span><span>${formatPrice(cart.getSubtotal())}</span></div>
          ${discount > 0 ? `<div class="summary-row"><span>Discount</span><span>-${formatPrice(discount)}</span></div>` : ""}
          <div class="summary-row"><span>Shipping</span><span>${cart.getShipping() === 0 ? "Complimentary" : formatPrice(cart.getShipping())}</span></div>
          <div class="summary-row total"><span>Total</span><span>${formatPrice(cart.getTotal())}</span></div>
        </div>
      </div>
    </div>`;
  renderStep(user);
}

function setCardFieldsRequired(required) {
  ["card_number", "expiry", "cvv"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.required = required;
  });
}

function validatePaymentForm(form) {
  const method = form.querySelector('input[name="payment_method"]:checked')?.value || "card";
  if (method === "paypal") return true;

  const cardResult = validateCardNumber(form.card_number?.value || "");
  if (!cardResult.valid) {
    form.card_number?.setCustomValidity(cardResult.message);
    form.card_number?.reportValidity();
    return false;
  }
  form.card_number?.setCustomValidity("");

  const expiry = form.expiry?.value || "";
  if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry)) {
    form.expiry?.setCustomValidity("Use MM/YY format");
    form.expiry?.reportValidity();
    return false;
  }
  form.expiry?.setCustomValidity("");

  const cvvResult = validateCvv(form.cvv?.value || "", cardResult.type);
  if (!cvvResult.valid) {
    form.cvv?.setCustomValidity(cvvResult.message);
    form.cvv?.reportValidity();
    return false;
  }
  form.cvv?.setCustomValidity("");
  return true;
}

function renderStep(user) {
  const el = document.getElementById("step-content");
  const saved = Storage.get(STORAGE_KEYS.CHECKOUT_SHIPPING, {});

  if (step === 1) {
    el.innerHTML = `
      <form id="shipping-form" class="card checkout-form-card" novalidate>
        <h3>Shipping Details</h3>
        <div class="grid-2">
          <div class="form-group"><label class="form-label" for="first_name">First Name</label>
            <input class="form-input" id="first_name" name="first_name" value="${saved.first_name || user?.firstName || ""}" required minlength="2"></div>
          <div class="form-group"><label class="form-label" for="last_name">Last Name</label>
            <input class="form-input" id="last_name" name="last_name" value="${saved.last_name || user?.lastName || ""}" required></div>
        </div>
        <div class="form-group"><label class="form-label" for="email">Email</label>
          <input type="email" class="form-input" id="email" name="email" value="${saved.email || user?.email || ""}" required></div>
        <div class="form-group"><label class="form-label" for="line1">Address</label>
          <input class="form-input" id="line1" name="line1" value="${saved.line1 || saved.address || ""}" required></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label" for="city">City</label>
            <input class="form-input" id="city" name="city" value="${saved.city || ""}" required></div>
          <div class="form-group"><label class="form-label" for="postal_code">Postal Code</label>
            <input class="form-input" id="postal_code" name="postal_code" value="${saved.postal_code || saved.zip || ""}" required pattern="[A-Za-z0-9\\s-]{3,12}"></div>
        </div>
        <div class="form-group"><label class="form-label" for="country_code">Country</label>
          <select class="form-select" id="country_code" name="country_code" required>
            <option value="US" ${(saved.country_code || saved.country) === "US" || saved.country === "United States" ? "selected" : ""}>United States</option>
            <option value="GB" ${saved.country === "United Kingdom" ? "selected" : ""}>United Kingdom</option>
            <option value="FR" ${saved.country === "France" ? "selected" : ""}>France</option>
            <option value="AE" ${saved.country === "UAE" ? "selected" : ""}>UAE</option>
          </select></div>
        <button type="submit" class="btn btn-primary">Continue to Payment</button>
      </form>`;
    el.querySelector("#shipping-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
      Storage.set(STORAGE_KEYS.CHECKOUT_SHIPPING, mapShippingForm(new FormData(e.target)));
      Storage.set(STORAGE_KEYS.CHECKOUT_PENDING, true);
      step = 2;
      render(user);
    });
  } else if (step === 2) {
    el.innerHTML = `
      <form id="payment-form" class="card checkout-form-card" novalidate>
        <h3>Payment Method</h3>
        <label class="filter-option"><input type="radio" name="payment_method" value="card" checked> Credit / Debit Card</label>
        <label class="filter-option"><input type="radio" name="payment_method" value="paypal"> PayPal</label>
        <div id="card-fields">
          <div class="form-group"><label class="form-label" for="card_number">Card Number</label>
            <input class="form-input" id="card_number" name="card_number" inputmode="numeric" autocomplete="cc-number"
              maxlength="19" placeholder="4242 4242 4242 4242 or Amex 3782 822463 10005"></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label" for="expiry">Expiry</label>
              <input class="form-input" id="expiry" name="expiry" autocomplete="cc-exp" placeholder="MM/YY"></div>
            <div class="form-group"><label class="form-label" for="cvv">CVV</label>
              <input class="form-input" id="cvv" name="cvv" autocomplete="cc-csc" maxlength="4" inputmode="numeric"></div>
          </div>
          <p class="form-hint">Card details are never stored — only payment_method and last4 are saved for your API.</p>
        </div>
        <div class="checkout-form-actions">
          <button type="button" class="btn btn-ghost" id="back-1">Back</button>
          <button type="submit" class="btn btn-primary">Review Order</button>
        </div>
      </form>`;
    document.getElementById("back-1").onclick = () => { step = 1; render(user); };

    const cardInput = document.getElementById("card_number");
    cardInput?.addEventListener("input", (e) => {
      e.target.value = formatCardNumber(e.target.value);
    });

    const togglePayment = () => {
      const isCard = document.querySelector('input[name="payment_method"]:checked')?.value === "card";
      document.getElementById("card-fields").style.display = isCard ? "block" : "none";
      setCardFieldsRequired(isCard);
    };

    document.querySelectorAll('input[name="payment_method"]').forEach((r) => {
      r.addEventListener("change", togglePayment);
    });
    togglePayment();

    el.querySelector("#payment-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      if (!validatePaymentForm(form)) return;
      Storage.set(STORAGE_KEYS.CHECKOUT_PAYMENT, mapPaymentForm(new FormData(form)));
      step = 3;
      render(user);
    });
  } else {
    const shipping = Storage.get(STORAGE_KEYS.CHECKOUT_SHIPPING, {});
    el.innerHTML = `
      <div class="card checkout-form-card">
        <h3>Review Order</h3>
        <p class="checkout-review-address">Ship to: ${formatShippingDisplay(shipping)}</p>
        <ul class="checkout-review-items">${cart.getItems().map((i) =>
          `<li>${i.name} × ${i.quantity} — ${formatPrice((i.unit_price || i.price) * i.quantity)}</li>`
        ).join("")}</ul>
        <div class="checkout-form-actions">
          <button type="button" class="btn btn-ghost" id="back-2">Back</button>
          <button type="button" class="btn btn-primary" id="place-order">Place Order</button>
        </div>
      </div>`;
    document.getElementById("back-2").onclick = () => { step = 2; render(user); };
    document.getElementById("place-order").onclick = () => {
      window.location.href = "payment.html";
    };
  }
}
