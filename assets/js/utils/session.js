import Storage from "./storage.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { clearSiteSettingsCache } from "./siteSettings.js";
import { clearRenderedPages } from "../core/pageRenderCache.js";

const SESSION_KEYS = [
  STORAGE_KEYS.USER,
  STORAGE_KEYS.SESSION,
  STORAGE_KEYS.CART,
  STORAGE_KEYS.CART_META,
  STORAGE_KEYS.WISHLIST,
  STORAGE_KEYS.CHECKOUT_SHIPPING,
  STORAGE_KEYS.CHECKOUT_PAYMENT,
  STORAGE_KEYS.CHECKOUT_PENDING,
  STORAGE_KEYS.ORDERS,
  STORAGE_KEYS.ADDRESSES,
  STORAGE_KEYS.NOTIFICATIONS,
  STORAGE_KEYS.SAVED_FOR_LATER,
  STORAGE_KEYS.RECENTLY_VIEWED,
  STORAGE_KEYS.AUCTION_BIDS,
  STORAGE_KEYS.AUCTION_WATCHLIST,
  STORAGE_KEYS.AUCTION_WINS,
  STORAGE_KEYS.AUCTION_SUBMISSIONS
];

/**
 * Clears all user-bound client state so account switches never leak data.
 */
export async function clearSessionData() {
  SESSION_KEYS.forEach((key) => Storage.remove(key));
  clearSiteSettingsCache();
  clearRenderedPages();

  try {
    sessionStorage.removeItem("fx_categories");
    sessionStorage.removeItem("fx_site_settings");
  } catch (_) {}

  const [{ default: cart }, { default: wishlist }, { default: dataService }] = await Promise.all([
    import("../modules/cart.js"),
    import("../modules/wishlist.js"),
    import("../api/dataService.js")
  ]);

  cart.reset();
  wishlist.clear();
  dataService.clearCache?.();
}

export default clearSessionData;
