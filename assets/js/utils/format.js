export function formatPrice(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(dateStr));
}

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getBasePath() {
  return "";
}

export function getPagePath(page) {
  const base = getBasePath();
  const routes = {
    home: `${base}/index.html`,
    shop: `${base}/pages/shop.html`,
    product: `${base}/pages/product.html`,
    cart: `${base}/pages/cart.html`,
    checkout: `${base}/pages/checkout.html`,
    wishlist: `${base}/pages/wishlist.html`,
    login: `${base}/pages/login.html`,
    register: `${base}/pages/register.html`,
    dashboard: `${base}/pages/dashboard.html`,
    seller: `${base}/pages/seller-dashboard.html`,
    about: `${base}/pages/about.html`,
    contact: `${base}/pages/contact.html`,
    orderSuccess: `${base}/pages/order-success.html`,
    payment: `${base}/pages/payment.html`,
    addresses: `${base}/pages/addresses.html`,
    search: `${base}/pages/search.html`,
    categories: `${base}/pages/categories.html`,
    brand: `${base}/pages/brand.html`,
    sellerProfile: `${base}/pages/seller-profile.html`,
    faq: `${base}/pages/faq.html`,
    terms: `${base}/pages/terms.html`,
    privacy: `${base}/pages/privacy.html`,
    orders: `${base}/pages/orders.html`,
    tracking: `${base}/pages/tracking.html`,
    notifications: `${base}/pages/notifications.html`,
    bidHome: `${base}/bid/index.html`,
    bidDetail: `${base}/bid/auction.html`,
    bidSubmit: `${base}/bid/submit.html`,
    bidPayment: `${base}/bid/payment-verify.html`,
    bidHistory: `${base}/bid/history.html`,
    bidWin: `${base}/bid/winning.html`,
    bidExpired: `${base}/bid/expired.html`,
    bidSeller: `${base}/bid/seller-dashboard.html`,
    admin: `${base}/pages/admin-dashboard.html`
  };
  return routes[page] || routes.home;
}
