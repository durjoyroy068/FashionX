/** Central config — swap BASE_URL when connecting backend */
export const API_CONFIG = {
  /** Laravel: php artisan serve → http://127.0.0.1:8000/api/v1 */
  BASE_URL: "http://127.0.0.1:8000/api/v1",
  /** Set false after running: php artisan migrate --seed */
  USE_MOCK: false,
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
