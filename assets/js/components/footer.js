export function renderFooter() {
  const footerEl = document.getElementById("site-footer");
  if (!footerEl) return;

  const base = "";

  footerEl.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="${base}/index.html" class="logo">Fashion<span>X</span></a>
          <p>The world's premier multi-vendor luxury fashion marketplace. Curated collections from verified designers and heritage brands.</p>
          <div class="footer-social">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">IG</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">X</a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">P</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">in</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Shop</h4>
          <a href="${base}/pages/shop.html">All Products</a>
          <a href="${base}/pages/categories.html">Categories</a>
          <a href="${base}/pages/shop.html?badge=Limited">Limited Edition</a>
          <a href="${base}/pages/shop.html?sort=newest">New Arrivals</a>
        </div>
        <div class="footer-col">
          <h4>FashionX Bid</h4>
          <a href="${base}/bid/index.html">Live Auctions</a>
          <a href="${base}/bid/submit.html">Submit Item</a>
          <a href="${base}/bid/history.html">Bid History</a>
          <a href="${base}/bid/seller-dashboard.html">Seller Auctions</a>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <a href="${base}/pages/faq.html">FAQ</a>
          <a href="${base}/pages/contact.html">Contact</a>
          <a href="${base}/pages/tracking.html">Order Tracking</a>
          <a href="${base}/pages/terms.html">Terms</a>
          <a href="${base}/pages/privacy.html">Privacy</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} FashionX. All rights reserved.</span>
        <span>Luxury Redefined</span>
      </div>
    </div>
  `;
}
