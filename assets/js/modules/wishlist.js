import Storage from "../utils/storage.js";
import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import apiClient from "../api/client.js";
import auth from "./auth.js";

const WISHLIST_KEY = STORAGE_KEYS.WISHLIST;

class WishlistManager {
  constructor() {
    this.items = Storage.get(WISHLIST_KEY, []);
  }

  _useApi() {
    return !API_CONFIG.USE_MOCK && auth.isLoggedIn();
  }

  async loadFromApi() {
    if (!this._useApi()) return this.items;
    const res = await apiClient.get("/wishlist");
    if (res.success && Array.isArray(res.data)) {
      this.items = res.data.map((p) => ({
        productId: p.id,
        name: p.name,
        brand: p.brand,
        image: p.images?.[0],
        price: p.discountPrice || p.price,
        originalPrice: p.price,
        addedAt: new Date().toISOString()
      }));
      this._saveLocal();
    }
    return this.items;
  }

  getItems() {
    return this.items;
  }

  getCount() {
    return this.items.length;
  }

  _saveLocal() {
    Storage.set(WISHLIST_KEY, this.items);
    window.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.items }));
  }

  async add(product) {
    if (this.has(product.id)) return this.items;
    this.items.push({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: product.images?.[0],
      price: product.discountPrice || product.price,
      originalPrice: product.price,
      addedAt: new Date().toISOString()
    });
    if (this._useApi()) {
      const res = await apiClient.post("/wishlist", { product_id: product.id });
      if (!res.success) {
        this.items = this.items.filter((i) => i.productId !== product.id);
        return { success: false, error: res.error };
      }
      await this.loadFromApi();
    } else {
      this._saveLocal();
    }
    return { success: true, items: this.items };
  }

  async remove(productId) {
    this.items = this.items.filter((i) => i.productId !== productId);
    if (this._useApi()) {
      const res = await apiClient.delete(`/wishlist/${productId}`);
      if (!res.success) {
        await this.loadFromApi();
        return { success: false, error: res.error };
      }
      await this.loadFromApi();
    } else {
      this._saveLocal();
    }
    return { success: true };
  }

  has(productId) {
    return this.items.some((i) => i.productId === productId);
  }

  async toggle(product) {
    if (this.has(product.id)) {
      await this.remove(product.id);
      return false;
    }
    await this.add(product);
    return true;
  }

  clear() {
    this.items = [];
    this._saveLocal();
  }
}

export const wishlist = new WishlistManager();
export default wishlist;
