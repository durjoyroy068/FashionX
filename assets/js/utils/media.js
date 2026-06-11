/** Curated stable CDN images (Pexels) — category-matched fallbacks when API images are missing */
import { API_CONFIG } from "../config/constants.js";

const pexels = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const STOCK_IMAGES = {
  fashion: pexels(2983464),
  gown: pexels(16654108),
  gownAlt: pexels(32394174),
  watch: pexels(190819),
  watchAlt: pexels(2783873),
  watchDress: pexels(9978766),
  perfume: pexels(3373719),
  perfumeAlt: pexels(965989),
  perfumeSet: pexels(7282350),
  shoes: pexels(1598505),
  shoesAlt: pexels(29861017),
  boots: pexels(298845),
  loafer: pexels(3805985),
  sunglasses: pexels(15767525),
  sunglassesAlt: pexels(1690194),
  catEye: pexels(701877),
  handbag: pexels(1152077),
  jewelry: pexels(3266700),
  jewelryAlt: pexels(1454228),
  coat: pexels(9856687),
  blazer: pexels(1453005),
  scarf: pexels(3764531),
  sneakers: pexels(2526878),
  limited: pexels(2526878),
  editorial: pexels(2983464, 1200),
  hero: pexels(32394174, 1920),
  avatar: pexels(774909, 200),
  brandLogo: pexels(3184296, 200),
  accessories: pexels(1152077)
};

export const IMAGE_PLACEHOLDER = STOCK_IMAGES.fashion;

const CATEGORY_IMAGES = {
  "custom-fashion": [STOCK_IMAGES.gown, STOCK_IMAGES.gownAlt],
  watches: [STOCK_IMAGES.watch, STOCK_IMAGES.watchAlt],
  perfumes: [STOCK_IMAGES.perfume, STOCK_IMAGES.perfumeAlt],
  shoes: [STOCK_IMAGES.shoes, STOCK_IMAGES.boots],
  sunglasses: [STOCK_IMAGES.sunglasses, STOCK_IMAGES.catEye],
  accessories: [STOCK_IMAGES.handbag, STOCK_IMAGES.jewelry],
  "limited-edition": [STOCK_IMAGES.sneakers, STOCK_IMAGES.limited]
};

const PRODUCT_IMAGES = {
  prod_001: [STOCK_IMAGES.gown, STOCK_IMAGES.gownAlt],
  prod_002: [STOCK_IMAGES.watch, STOCK_IMAGES.watchDress],
  prod_003: [STOCK_IMAGES.perfume],
  prod_004: [STOCK_IMAGES.shoes, STOCK_IMAGES.shoesAlt],
  prod_005: [STOCK_IMAGES.sunglasses],
  prod_006: [STOCK_IMAGES.handbag],
  prod_007: [STOCK_IMAGES.coat],
  prod_008: [STOCK_IMAGES.watchAlt],
  prod_009: [STOCK_IMAGES.perfumeAlt],
  prod_010: [STOCK_IMAGES.boots],
  prod_011: [STOCK_IMAGES.sunglassesAlt],
  prod_012: [STOCK_IMAGES.jewelry],
  prod_013: [STOCK_IMAGES.blazer],
  prod_014: [STOCK_IMAGES.sneakers],
  prod_015: [STOCK_IMAGES.loafer],
  prod_016: [STOCK_IMAGES.perfumeSet],
  prod_017: [STOCK_IMAGES.watchDress],
  prod_018: [STOCK_IMAGES.scarf]
};

export function imagesForProduct(product) {
  if (product?.images?.length) {
    return product.images.map((url) => resolveStorageUrl(url) || url);
  }
  if (product?.id && PRODUCT_IMAGES[product.id]) {
    return PRODUCT_IMAGES[product.id];
  }
  const cat = product?.category;
  if (cat && CATEGORY_IMAGES[cat]) {
    return CATEGORY_IMAGES[cat];
  }
  return [IMAGE_PLACEHOLDER];
}

export function getProductImage(product, index = 0) {
  const list = imagesForProduct(product);
  return list[index] || list[0] || IMAGE_PLACEHOLDER;
}

export function getAuctionImage(auction) {
  if (auction?.images?.length) {
    return auction.images[0];
  }
  if (auction?.image) {
    return auction.image;
  }
  const cat = auction?.category;
  if (cat && CATEGORY_IMAGES[cat]) {
    return CATEGORY_IMAGES[cat][0];
  }
  return IMAGE_PLACEHOLDER;
}

export function imageFallbackAttr(fallback = IMAGE_PLACEHOLDER) {
  const safe = fallback.replace(/'/g, "%27");
  return `onerror="this.onerror=null;this.src='${safe}'"`;
}

const API_ORIGIN = (() => {
  try {
    return new URL(API_CONFIG.BASE_URL).origin;
  } catch {
    return "http://127.0.0.1:8000";
  }
})();

/** Turn Laravel /storage paths and relative URLs into absolute URLs for static frontend host. */
export function resolveStorageUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (/^javascript:/i.test(url) || /^vbscript:/i.test(url)) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/storage/${url.replace(/^storage\//, "")}`;
}
