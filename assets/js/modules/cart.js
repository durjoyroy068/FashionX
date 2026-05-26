import Storage from "../utils/storage.js";
import { generateId } from "../utils/format.js";
import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import apiClient from "../api/client.js";
import auth from "./auth.js";

class CartManager {
  constructor() {
    this._load();
    this.shippingRate = 25;
    this.freeShippingThreshold = 500;
    this._busy = false;
  }

  _load() {
    this.items = Storage.get(STORAGE_KEYS.CART, []);
    const meta = Storage.get(STORAGE_KEYS.CART_META, {});
    this.coupon = meta.coupon || null;
  }

  _useApi() {
    return !API_CONFIG.USE_MOCK && auth.isLoggedIn();
  }

  async _syncToApi() {
    if (!this._useApi()) return { success: true };
    return apiClient.post("/cart/sync", {
      items: this.items.map((i) => ({
        product_id: i.product_id || i.productId,
        quantity: i.quantity
      }))
    });
  }

  async loadFromApi() {
    if (!this._useApi()) return this.items;
    const res = await apiClient.get("/cart");
    if (res.success && Array.isArray(res.data)) {
      this.items = res.data.map((row) => {
        const p = row.product || {};
        const imgs = p.images || [];
        return {
          id: row.product_id,
          product_id: row.product_id,
          productId: row.product_id,
          name: p.name,
          brand: p.brand,
          image: imgs[0],
          unit_price: row.price,
          price: row.price,
          quantity: row.quantity,
          stock: p.stock || 99
        };
      });
      this._saveLocal();
    }
    return this.items;
  }

  _saveLocal() {
    Storage.set(STORAGE_KEYS.CART, this.items);
    Storage.set(STORAGE_KEYS.CART_META, { coupon: this.coupon });
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.items }));
  }

  async _save() {
    this._saveLocal();
    if (this._useApi()) {
      return this._syncToApi();
    }
    return { success: true };
  }

  getItems() {
    return this.items;
  }

  getCount() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  async add(product, quantity = 1, variant = null) {
    const price = product.discountPrice || product.price;
    const variantKey = variant || product.variants?.[0] || null;
    const pid = product.id;
    const existing = this.items.find(
      (i) => (i.product_id || i.productId) === pid && i.variant === variantKey
    );

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, product.stock || 99);
    } else {
      this.items.push({
        id: generateId("cart"),
        product_id: pid,
        productId: pid,
        name: product.name,
        brand: product.brand,
        image: product.images?.[0],
        unit_price: price,
        price,
        quantity: Math.min(quantity, product.stock || 99),
        variant: variantKey,
        stock: product.stock
      });
    }

    if (this._useApi()) {
      const res = await apiClient.post("/cart", { product_id: pid, quantity: existing?.quantity || quantity });
      if (!res.success) {
        this._load();
        return { success: false, error: res.error };
      }
      await this.loadFromApi();
    } else {
      await this._save();
    }
    return { success: true, items: this.items };
  }

  async updateQuantity(cartItemId, quantity) {
    const item = this.items.find((i) => i.id === cartItemId || i.product_id === cartItemId);
    if (!item) return { success: false };
    const pid = item.product_id || item.productId;
    if (quantity <= 0) {
      return this.remove(cartItemId);
    }
    item.quantity = Math.min(quantity, item.stock || 99);
    if (this._useApi()) {
      const res = await apiClient.put(`/cart/${pid}`, { quantity });
      if (!res.success) return { success: false, error: res.error };
      await this.loadFromApi();
    } else {
      await this._save();
    }
    return { success: true };
  }

  async remove(cartItemId) {
    const item = this.items.find((i) => i.id === cartItemId || i.product_id === cartItemId);
    const pid = item?.product_id || item?.productId || cartItemId;
    this.items = this.items.filter((i) => i.id !== cartItemId && (i.product_id || i.productId) !== pid);
    if (this._useApi()) {
      const res = await apiClient.delete(`/cart/${pid}`);
      if (!res.success) return { success: false, error: res.error };
      await this.loadFromApi();
    } else {
      await this._save();
    }
    return { success: true };
  }

  async clear() {
    this.items = [];
    this.coupon = null;
    if (this._useApi()) {
      await apiClient.post("/cart/sync", { items: [] });
    }
    await this._save();
  }

  /** Reset in-memory cart without API (used on logout / account switch). */
  reset() {
    this.items = [];
    this.coupon = null;
    this._saveLocal();
  }

  async applyCoupon(code) {
    if (this._useApi()) {
      const res = await apiClient.post("/checkout/validate-coupon", {
        code,
        subtotal: this.getSubtotal()
      });
      if (!res.success) {
        return { success: false, message: res.error || "Invalid coupon" };
      }
      const subtotal = this.getSubtotal();
      this.coupon = {
        code: res.data.code,
        discount: subtotal > 0 ? res.data.discount / subtotal : 0,
        discountAmount: res.data.discount,
        label: res.data.label
      };
      this._saveLocal();
      return { success: true, coupon: this.coupon };
    }
    const coupons = {
      LUXURY10: { discount: 0.1, label: "10% off" },
      FASHIONX20: { discount: 0.2, label: "20% off" },
      VIP15: { discount: 0.15, label: "15% VIP discount" }
    };
    const coupon = coupons[code?.toUpperCase()];
    if (coupon) {
      this.coupon = { code: code.toUpperCase(), ...coupon };
      this._saveLocal();
      return { success: true, coupon: this.coupon };
    }
    return { success: false, message: "Invalid coupon code" };
  }

  removeCoupon() {
    this.coupon = null;
    this._saveLocal();
  }

  getSubtotal() {
    return this.items.reduce((sum, i) => sum + (i.unit_price || i.price) * i.quantity, 0);
  }

  getDiscount() {
    if (!this.coupon) return 0;
    if (this.coupon.discountAmount != null) {
      return this.coupon.discountAmount;
    }
    if (this.coupon.discount <= 1) {
      return this.getSubtotal() * this.coupon.discount;
    }
    return this.coupon.discount;
  }

  getShipping() {
    const subtotal = this.getSubtotal() - this.getDiscount();
    if (this.items.length === 0) return 0;
    if (subtotal >= this.freeShippingThreshold) return 0;
    return this.shippingRate;
  }

  getTotal() {
    return Math.max(0, this.getSubtotal() - this.getDiscount() + this.getShipping());
  }

  toOrderPayload(shipping, payment) {
    return {
      items: this.items.map((i) => ({
        product_id: i.product_id || i.productId,
        quantity: i.quantity,
        variant: i.variant,
        unit_price: i.unit_price || i.price
      })),
      shipping_address: shipping,
      shipping,
      payment,
      payment_method: payment?.method || payment?.payment_method || "card",
      coupon_code: this.coupon?.code || null,
      subtotal: this.getSubtotal(),
      discount: this.getDiscount(),
      shipping_cost: this.getShipping(),
      total: this.getTotal(),
      card_last4: payment?.card_last4 || null
    };
  }

  async moveToSaved(cartItemId) {
    const item = this.items.find((i) => i.id === cartItemId);
    if (!item) return;
    const saved = Storage.get(STORAGE_KEYS.SAVED_FOR_LATER, []);
    saved.push({ ...item, saved_at: new Date().toISOString() });
    Storage.set(STORAGE_KEYS.SAVED_FOR_LATER, saved);
    await this.remove(cartItemId);
  }
}

export const cart = new CartManager();
export default cart;
