const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const pages = [
  { file: "pages/shop.html", page: "shop", title: "Shop — FashionX", scripts: ["../assets/js/pages/shop.js"] },
  { file: "pages/product.html", page: "product", title: "Product — FashionX", scripts: ["../assets/js/pages/product.js"] },
  { file: "pages/cart.html", page: "cart", title: "Cart — FashionX", scripts: ["../assets/js/pages/cart.js"] },
  { file: "pages/checkout.html", page: "checkout", title: "Checkout — FashionX", scripts: ["../assets/js/pages/checkout.js"] },
  { file: "pages/wishlist.html", page: "wishlist", title: "Wishlist — FashionX", scripts: ["../assets/js/pages/wishlist.js"] },
  { file: "pages/login.html", page: "login", title: "Sign In — FashionX", scripts: ["../assets/js/pages/auth-pages.js"], bodyClass: "auth-page" },
  { file: "pages/register.html", page: "register", title: "Register — FashionX", scripts: ["../assets/js/pages/auth-pages.js"], bodyClass: "auth-page" },
  { file: "pages/dashboard.html", page: "dashboard", title: "My Account — FashionX" },
  { file: "pages/seller-dashboard.html", page: "seller", title: "Seller Dashboard — FashionX" },
  { file: "pages/admin-dashboard.html", page: "admin", title: "Admin Panel — FashionX" },
  { file: "pages/about.html", page: "about", title: "About — FashionX" },
  { file: "pages/contact.html", page: "contact", title: "Contact — FashionX" },
  { file: "pages/order-success.html", page: "order-success", title: "Order Confirmed — FashionX" },
  { file: "pages/payment.html", page: "payment", title: "Payment — FashionX", scripts: ["../assets/js/pages/payment.js"] },
  { file: "pages/addresses.html", page: "addresses", title: "Addresses — FashionX" },
  { file: "pages/search.html", page: "search", title: "Search — FashionX" },
  { file: "pages/categories.html", page: "categories", title: "Categories — FashionX" },
  { file: "pages/brand.html", page: "brand", title: "Brand Store — FashionX" },
  { file: "pages/seller-profile.html", page: "seller-profile", title: "Seller — FashionX" },
  { file: "pages/faq.html", page: "faq", title: "FAQ — FashionX" },
  { file: "pages/terms.html", page: "terms", title: "Terms — FashionX" },
  { file: "pages/privacy.html", page: "privacy", title: "Privacy — FashionX" },
  { file: "pages/orders.html", page: "orders", title: "Orders — FashionX" },
  { file: "pages/tracking.html", page: "tracking", title: "Track Order — FashionX" },
  { file: "pages/notifications.html", page: "notifications", title: "Notifications — FashionX" },
  { file: "pages/404.html", page: "404", title: "Page Not Found — FashionX" },
  { file: "bid/index.html", page: "bid-home", title: "FashionX Bid — Live Luxury Auctions", scripts: ["../assets/js/pages/bid-home.js"] },
  { file: "bid/auction.html", page: "bid-auction", title: "Live Auction — FashionX Bid", scripts: ["../assets/js/pages/bid-auction.js"] },
  { file: "bid/submit.html", page: "bid-submit", title: "Submit Auction — FashionX Bid" },
  { file: "bid/payment-verify.html", page: "bid-payment", title: "Verify Payment — FashionX Bid" },
  { file: "bid/history.html", page: "bid-history", title: "Bid History — FashionX Bid" },
  { file: "bid/winning.html", page: "bid-winning", title: "You Won! — FashionX Bid" },
  { file: "bid/expired.html", page: "bid-expired", title: "Auction Ended — FashionX Bid" },
  { file: "bid/seller-dashboard.html", page: "bid-seller", title: "Auction Seller — FashionX Bid" }
];

function shell(p) {
  const isRoot = p.file === "index.html";
  const isBid = p.file.startsWith("bid/");
  const assetBase = isRoot ? "./assets" : "../assets";
  const siteBase = isRoot ? "." : "..";
  const css = `${assetBase}/css/main.css`;
  const app = `${assetBase}/js/app.js`;
  const scripts = (p.scripts || []).map((s) => `<script type="module" src="${s}"></script>`).join("\n  ");
  const bodyClass = p.bodyClass || "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FashionX - Premium luxury fashion marketplace">
  <title>${p.title}</title>
  <link rel="stylesheet" href="${css}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>FX</text></svg>">
</head>
<body data-page="${p.page}" class="${bodyClass}">
  <header class="site-header" id="site-header" data-base="${siteBase}"></header>
  <main class="page-main" id="main-content" role="main" tabindex="-1"></main>
  <footer class="site-footer" id="site-footer" data-base="${siteBase}"></footer>
  <script type="module" src="${app}"></script>
  ${scripts}
</body>
</html>`;
}

pages.forEach((p) => {
  if (p.file === "index.html") return;
  const out = path.join(root, p.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, shell(p));
  console.log("Created", p.file);
});

console.log("Done", pages.length, "pages");
