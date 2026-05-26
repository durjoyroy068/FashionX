import { getPageModule } from "./registry.js";

/** Page-specific modules (dynamic import — smaller initial bundle) */
export const PAGE_MODULE_LOADERS = {
  home: () => import("../pages/home.js"),
  shop: () => import("../pages/shop.js"),
  product: () => import("../pages/product.js"),
  cart: () => import("../pages/cart.js"),
  checkout: () => import("../pages/checkout.js"),
  wishlist: () => import("../pages/wishlist.js"),
  login: () => import("../pages/auth-pages.js"),
  register: () => import("../pages/auth-pages.js"),
  payment: () => import("../pages/payment.js"),
  "bid-home": () => import("../pages/bid-home.js"),
  "bid-auction": () => import("../pages/bid-auction.js"),
  "bid-submit": () => import("../pages/bid-submit.js"),
  admin: () => import("../pages/admin-panel.js")
};

const loadedModules = new Set();

export function prefetchPageModule(page) {
  if (!page || loadedModules.has(page)) return;
  const load = PAGE_MODULE_LOADERS[page];
  if (load) void load().then(() => loadedModules.add(page));
}

export async function runPageInit(page) {
  if (!page) return;

  const load = PAGE_MODULE_LOADERS[page];
  if (load) {
    await load();
    loadedModules.add(page);
  } else {
    await import("../pages/static-pages.js");
  }

  const initFn = getPageModule(page);
  if (initFn) await initFn();
}
