/** Central config — override via window.__FASHIONX_* in HTML before scripts load */
export const API_CONFIG = {
  BASE_URL: window.__FASHIONX_API_URL__ || "http://127.0.0.1:8000/api/v1",
  USE_MOCK: window.__FASHIONX_USE_MOCK__ !== undefined
    ? window.__FASHIONX_USE_MOCK__
    : false,
  TIMEOUT_MS: 15000
};

export const STORAGE_KEYS = {
  USER: "user",
  SESSION: "session",
  CART: "cart",
  CART_META: "cart_meta",
  WISHLIST: "wishlist",
  ORDERS: "orders",
  CHECKOUT_SHIPPING: "checkout_shipping",
  CHECKOUT_PAYMENT: "checkout_payment",
  CHECKOUT_PENDING: "checkout_pending",
  ADDRESSES: "addresses",
  NOTIFICATIONS: "notifications",
  SAVED_FOR_LATER: "saved_for_later",
  RECENTLY_VIEWED: "recently_viewed",
  AUCTION_BIDS: "auction_bids",
  AUCTION_WATCHLIST: "auction_watchlist",
  AUCTION_WINS: "auction_wins",
  AUCTION_SUBMISSIONS: "auction_submissions",
  THEME: "theme",
  DATA_CACHE: "data_cache",
  AUTH_CREDENTIALS: "auth_credentials",
  REGISTERED_USERS: "registered_users"
};

export const ROLES = {
  BUYER: "buyer",
  SELLER: "seller",
  ADMIN: "admin"
};

export const ROUTES = {
  buyer: "pages/dashboard.html",
  seller: "pages/seller-dashboard.html",
  admin: "pages/admin-dashboard.html"
};
