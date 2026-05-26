/**
 * One-time migration: write stable Pexels URLs into JSON data files.
 * Run: node scripts/migrate-images.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const p = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const S = {
  fashion: p(2983464),
  gown: p(1045547),
  gownAlt: p(15390081),
  watch: p(190819),
  watchAlt: p(2783873),
  perfume: p(3373719),
  perfumeAlt: p(965989),
  shoes: p(1598505),
  shoesAlt: p(298845),
  sunglasses: p(157627),
  sunglassesAlt: p(701877),
  handbag: p(1152077),
  jewelry: p(1926769),
  coat: p(1532452),
  blazer: p(1453005),
  scarf: p(3764531),
  sneakers: p(2526878),
  avatar: p(774909, 200),
  brandLogo: p(3184296, 200),
  accessories: p(1152077),
  limited: p(2526878)
};

const productImages = {
  prod_001: [S.gown, S.gownAlt],
  prod_002: [S.watch, S.watchAlt],
  prod_003: [S.perfume],
  prod_004: [S.shoes, S.shoesAlt],
  prod_005: [S.sunglasses],
  prod_006: [S.handbag],
  prod_007: [S.coat],
  prod_008: [S.watchAlt],
  prod_009: [S.perfumeAlt],
  prod_010: [S.shoesAlt],
  prod_011: [S.sunglassesAlt],
  prod_012: [S.jewelry],
  prod_013: [S.blazer],
  prod_014: [S.sneakers],
  prod_015: [S.shoes],
  prod_016: [S.perfume],
  prod_017: [S.watch],
  prod_018: [S.scarf]
};

const categoryImages = {
  "custom-fashion": S.gown,
  watches: S.watch,
  perfumes: S.perfume,
  shoes: S.shoes,
  sunglasses: S.sunglasses,
  accessories: S.handbag,
  "limited-edition": S.limited
};

const products = JSON.parse(fs.readFileSync(path.join(root, "assets/data/products.json"), "utf8"));
products.forEach((item) => {
  item.images = productImages[item.id] || [categoryImages[item.category] || S.fashion];
});
fs.writeFileSync(path.join(root, "assets/data/products.json"), JSON.stringify(products, null, 2) + "\n");
console.log("Updated products.json");

const auctions = JSON.parse(fs.readFileSync(path.join(root, "assets/data/auctions.json"), "utf8"));
auctions.forEach((a) => {
  const img = categoryImages[a.category] || S.fashion;
  a.image = img;
  a.images = [img];
});
fs.writeFileSync(path.join(root, "assets/data/auctions.json"), JSON.stringify(auctions, null, 2) + "\n");
console.log("Updated auctions.json");

const categories = JSON.parse(fs.readFileSync(path.join(root, "assets/data/categories.json"), "utf8"));
categories.forEach((c) => {
  c.image = categoryImages[c.slug] || S.fashion;
});
fs.writeFileSync(path.join(root, "assets/data/categories.json"), JSON.stringify(categories, null, 2) + "\n");
console.log("Updated categories.json");

const brands = JSON.parse(fs.readFileSync(path.join(root, "assets/data/brands.json"), "utf8"));
brands.forEach((b) => {
  b.logo = S.brandLogo;
});
fs.writeFileSync(path.join(root, "assets/data/brands.json"), JSON.stringify(brands, null, 2) + "\n");
console.log("Updated brands.json");

const sellers = JSON.parse(fs.readFileSync(path.join(root, "assets/data/sellers.json"), "utf8"));
sellers.forEach((s) => {
  s.avatar = S.avatar;
});
fs.writeFileSync(path.join(root, "assets/data/sellers.json"), JSON.stringify(sellers, null, 2) + "\n");
console.log("Updated sellers.json");

console.log("Done.");
