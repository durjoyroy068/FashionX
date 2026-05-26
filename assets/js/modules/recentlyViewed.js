import Storage from "../utils/storage.js";
import { STORAGE_KEYS } from "../config/constants.js";

const KEY = STORAGE_KEYS.RECENTLY_VIEWED;
const MAX = 8;

class RecentlyViewed {
  add(product) {
    let items = Storage.get(KEY, []);
    items = items.filter((i) => i.productId !== product.id);
    items.unshift({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: product.images[0],
      price: product.discountPrice || product.price,
      viewedAt: new Date().toISOString()
    });
    Storage.set(KEY, items.slice(0, MAX));
  }

  getItems() {
    return Storage.get(KEY, []);
  }
}

export const recentlyViewed = new RecentlyViewed();
export default recentlyViewed;
