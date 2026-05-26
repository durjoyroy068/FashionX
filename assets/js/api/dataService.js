import Storage from "../utils/storage.js";
import apiClient from "./client.js";
import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import { getCachedCategories, setCachedCategories } from "../utils/catalogCache.js";

const CACHE_KEY = STORAGE_KEYS.DATA_CACHE;
const CACHE_TTL = 3600000;
/** Bump when JSON assets change (e.g. fixed image URLs) */
const CACHE_FILE_VERSION = 3;

class DataService {
  constructor() {
    this.cache = {};
    this.inFlight = {};
    this.basePath = this._resolveBase();
  }

  clearCache() {
    this.cache = {};
    Storage.remove(CACHE_KEY);
    this.inFlight = {};
  }

  peekProducts() {
    return this.cache.products || null;
  }

  peekBrands() {
    return this.cache.brands || null;
  }

  peekCategories() {
    return this.cache.categories || getCachedCategories() || null;
  }

  warmCatalog() {
    return Promise.all([this.getProducts(), this.getCategories(), this.getBrands()]);
  }

  _withInFlight(key, producer) {
    if (this.inFlight[key]) return this.inFlight[key];
    this.inFlight[key] = Promise.resolve(producer()).finally(() => {
      delete this.inFlight[key];
    });
    return this.inFlight[key];
  }

  _resolveBase() {
    const path = window.location.pathname;
    if (path.includes("/pages/") || path.includes("/bid/")) return "../assets/data";
    return "./assets/data";
  }

  async _fetchJSON(file) {
    const cache = Storage.get(CACHE_KEY, {});
    const cacheEntry = `v${CACHE_FILE_VERSION}:${file}`;
    const cached = cache[cacheEntry];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }
    const res = await fetch(`${this.basePath}/${file}`);
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    const data = await res.json();
    cache[cacheEntry] = { data, ts: Date.now() };
    Storage.set(CACHE_KEY, cache);
    return data;
  }

  async getProducts() {
    if (!API_CONFIG.USE_MOCK) {
      const res = await this._withInFlight("products", () => apiClient.get("/products"));
      if (res.success) {
        this.cache.products = Array.isArray(res.data) ? res.data : res.data?.data || [];
        return this.cache.products;
      }
      window.dispatchEvent(new CustomEvent("apiError", { detail: res.error || "Failed to load products" }));
      return this.cache.products || [];
    }
    if (!API_CONFIG.USE_MOCK) return [];
    if (!this.cache.products) {
      this.cache.products = await this._fetchJSON("products.json");
    }
    return this.cache.products;
  }

  async getProductById(id) {
    if (!API_CONFIG.USE_MOCK) {
      const res = await apiClient.get(`/products/${id}`);
      if (res.success) return res.data;
    }
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  }

  async getBrands() {
    if (!API_CONFIG.USE_MOCK) {
      const res = await this._withInFlight("brands", () => apiClient.get("/brands"));
      if (res.success) {
        this.cache.brands = res.data;
        return this.cache.brands;
      }
      if (!API_CONFIG.USE_MOCK) return [];
    }
    if (!this.cache.brands) {
      this.cache.brands = await this._fetchJSON("brands.json");
    }
    return this.cache.brands;
  }

  async getBrandById(id) {
    const brands = await this.getBrands();
    return brands.find((b) => b.id === id) || null;
  }

  async getCategories() {
    const sessionCached = getCachedCategories();
    if (sessionCached?.length) {
      this.cache.categories = sessionCached;
      return sessionCached;
    }
    if (!API_CONFIG.USE_MOCK) {
      const res = await this._withInFlight("categories", () => apiClient.get("/categories"));
      if (res.success) {
        this.cache.categories = res.data;
        setCachedCategories(this.cache.categories);
        return this.cache.categories;
      }
      if (!API_CONFIG.USE_MOCK) return getCachedCategories() || [];
    }
    if (!this.cache.categories) {
      this.cache.categories = await this._fetchJSON("categories.json");
      setCachedCategories(this.cache.categories);
    }
    return this.cache.categories;
  }

  async getSellers() {
    if (!API_CONFIG.USE_MOCK) {
      const res = await this._withInFlight("sellers", () => apiClient.get("/sellers"));
      if (res.success) {
        this.cache.sellers = res.data;
        return this.cache.sellers;
      }
      if (!API_CONFIG.USE_MOCK) return [];
    }
    if (!this.cache.sellers) {
      this.cache.sellers = await this._fetchJSON("sellers.json");
    }
    return this.cache.sellers;
  }

  async getSellerById(id) {
    const sellers = await this.getSellers();
    return sellers.find((s) => s.id === id) || null;
  }

  async getAuctions() {
    if (!API_CONFIG.USE_MOCK) {
      const res = await this._withInFlight("auctions", () => apiClient.get("/auctions"));
      if (res.success) {
        this.cache.auctions = res.data;
        return this.cache.auctions;
      }
      if (!API_CONFIG.USE_MOCK) return [];
    }
    if (!this.cache.auctions) {
      this.cache.auctions = await this._fetchJSON("auctions.json");
    }
    return this.cache.auctions;
  }

  async getAuctionById(id) {
    if (!API_CONFIG.USE_MOCK) {
      const res = await apiClient.get(`/auctions/${id}`);
      if (res.success) return res.data;
    }
    const auctions = await this.getAuctions();
    return auctions.find((a) => a.id === id) || null;
  }

  async searchProducts(query, filters = {}) {
    let products = await this.getProducts();
    const q = (query || "").toLowerCase().trim();

    if (q) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (filters.category) {
      products = products.filter((p) => p.category === filters.category);
    }
    if (filters.brand) {
      products = products.filter((p) => p.brandId === filters.brand || p.brand === filters.brand);
    }
    if (filters.minPrice != null) {
      products = products.filter((p) => (p.discountPrice || p.price) >= filters.minPrice);
    }
    if (filters.maxPrice != null) {
      products = products.filter((p) => (p.discountPrice || p.price) <= filters.maxPrice);
    }
    if (filters.inStock) {
      products = products.filter((p) => p.stock > 0);
    }
    if (filters.badge) {
      products = products.filter((p) => p.badges?.includes(filters.badge));
    }

    const sort = filters.sort || "featured";
    products = [...products].sort((a, b) => {
      const priceA = a.discountPrice || a.price;
      const priceB = b.discountPrice || b.price;
      switch (sort) {
        case "price-asc": return priceA - priceB;
        case "price-desc": return priceB - priceA;
        case "rating": return b.rating - a.rating;
        case "newest": return new Date(b.createdAt) - new Date(a.createdAt);
        case "name": return a.name.localeCompare(b.name);
        default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
    });

    return products;
  }

  /** Switch to live API: set API_CONFIG.USE_MOCK = false */
  async fetchProducts() {
    if (!API_CONFIG.USE_MOCK) {
      return apiClient.get("/products", { token: null });
    }
    return { success: true, data: await this.getProducts() };
  }

  async fetchProduct(id) {
    if (!API_CONFIG.USE_MOCK) {
      return apiClient.get(`/products/${id}`);
    }
    const product = await this.getProductById(id);
    return product ? { success: true, data: product } : { success: false, error: "Not found" };
  }
}

export const dataService = new DataService();
export default dataService;
