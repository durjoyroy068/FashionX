import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import { renderProductGrid } from "../components/render.js";
import Storage from "../utils/storage.js";
import auth from "../modules/auth.js";
import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import apiClient from "../api/client.js";
import { getPageMain } from "../utils/pageMain.js";
import { formatPrice, formatDate } from "../utils/format.js";
import toast from "../ui/toast.js";
import { STOCK_IMAGES, imageFallbackAttr } from "../utils/media.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";
import uploadImage from "../utils/upload.js";

const PLACEHOLDER_AVATAR = STOCK_IMAGES.avatar;
const PLACEHOLDER_BRAND = STOCK_IMAGES.brandLogo;

const pages = {
  about: () => `
    <div class="container page-hero"><h1>About FashionX</h1><p>The definitive luxury multi-vendor marketplace.</p></div>
    <section class="section"><div class="container" style="max-width:800px">
      <p style="color:var(--color-text-muted);line-height:1.9;margin-bottom:1.5rem">Founded in 2020, FashionX connects the world's most prestigious fashion houses with discerning collectors and style connoisseurs. Our platform hosts verified sellers offering authenticated luxury goods across apparel, watches, fragrances, footwear, and rare collectibles.</p>
      <p style="color:var(--color-text-muted);line-height:1.9;margin-bottom:1.5rem">Every seller undergoes rigorous verification. Every product is curated. Every experience is designed to reflect the standards of haute couture retail.</p>
      <div class="stat-cards" style="margin-top:2rem">
        <div class="stat-card"><h3>Verified Brands</h3><p class="value">120+</p></div>
        <div class="stat-card"><h3>Luxury Products</h3><p class="value">15K+</p></div>
        <div class="stat-card"><h3>Countries</h3><p class="value">48</p></div>
      </div>
    </div></section>`,

  terms: () => `<div class="container legal-content page-hero"><h1>Terms & Conditions</h1>
    <p>Last updated: January 2026</p><h2>1. Agreement</h2><p>By accessing FashionX you agree to these terms governing use of our luxury marketplace platform.</p>
    <h2>2. Authenticity</h2><p>All sellers must provide proof of authenticity. FashionX reserves the right to remove listings that fail verification.</p>
    <h2>3. Purchases</h2><p>Prices are listed in USD. Orders are binding upon payment confirmation. Returns follow our 14-day luxury return policy for eligible items.</p>
    <h2>4. FashionX Bid</h2><p>Auction bids are legally binding. Winning bidders must complete payment within 48 hours.</p></div>`,

  privacy: () => `<div class="container legal-content page-hero"><h1>Privacy Policy</h1>
    <p>We protect your personal data with industry-leading security measures.</p><h2>Data Collection</h2><p>We collect information necessary to process orders, verify identity, and personalize your experience.</p>
    <h2>Storage</h2><p>Payment data is processed through PCI-compliant partners. We never store full card numbers.</p>
    <h2>Your Rights</h2><p>Request data export or deletion via your dashboard settings or contact support.</p></div>`,

  "order-success": () => {
    const id = new URLSearchParams(location.search).get("id");
    return `<div class="container" style="padding:4rem 0;text-align:center">
      <div style="font-size:4rem;color:var(--color-success);margin-bottom:1rem">✓</div>
      <h1>Order Confirmed</h1>
      <p style="color:var(--color-text-muted);margin:1rem 0">Order #${escapeHtml(id || "FX-0000")}</p>
      <p style="color:var(--color-text-muted);max-width:500px;margin:0 auto 2rem">Thank you for your purchase. A confirmation email has been sent.</p>
      <div class="tracker-steps" style="max-width:600px;margin:2rem auto">
        <div class="tracker-step completed"><div class="dot">✓</div><label>Confirmed</label></div>
        <div class="tracker-step active"><div class="dot">2</div><label>Processing</label></div>
        <div class="tracker-step"><div class="dot">3</div><label>Shipped</label></div>
        <div class="tracker-step"><div class="dot">4</div><label>Delivered</label></div>
      </div>
      <a href="orders.html" class="btn btn-primary">View Orders</a>
      <a href="../index.html" class="btn btn-outline" style="margin-left:0.5rem">Continue Shopping</a>
    </div>`;
  },

  "bid-winning": () => {
    const id = new URLSearchParams(location.search).get("id");
    return `<div class="container" style="padding:4rem 0;text-align:center">
      <h1 style="color:var(--color-gold)">Congratulations!</h1>
      <p style="color:var(--color-text-muted);margin:1.5rem 0">You won auction ${escapeHtml(id || "")}</p>
      <a href="payment-verify.html${id ? `?id=${encodeURIComponent(id)}` : ""}" class="btn btn-primary">Complete Payment</a>
      <a href="index.html" class="btn btn-outline" style="margin-left:0.5rem">More Auctions</a>
    </div>`;
  },

  "bid-expired": () => `<div class="container empty-state" style="min-height:70vh">
    <div class="empty-state__icon">⏱</div>
    <h1>Auction Ended</h1>
    <p>This luxury auction has concluded. Explore other live auctions.</p>
    <a href="index.html" class="btn btn-primary">Live Auctions</a>
  </div>`,

  404: () => `<div class="container error-page">
    <div class="error-code">404</div>
    <h1>Page Not Found</h1>
    <p style="color:var(--color-text-muted);margin:1rem 0 2rem">The page you're looking for doesn't exist or has been moved.</p>
    <a href="../index.html" class="btn btn-primary">Return Home</a>
  </div>`
};

Object.keys(pages).forEach((name) => {
  registerPage(name, () => {
    getPageMain().innerHTML = pages[name]();
  });
});

function renderSalesChart(weeklySales = []) {
  const maxRevenue = Math.max(...weeklySales.map((d) => d.revenue || 0), 1);
  return weeklySales.map((day) => {
    const height = Math.max(8, Math.round(((day.revenue || 0) / maxRevenue) * 100));
    const title = `${day.label}: ${formatPrice(day.revenue || 0)}`;
    return `<div class="chart-bar-col" title="${title}">
      <div class="bar" style="height:${height}%"></div>
      <span class="chart-bar-label">${day.label || ""}</span>
    </div>`;
  }).join("");
}

async function initBidPaymentPage() {
  if (!auth.requireAuth()) return;

  const params = new URLSearchParams(location.search);
  const auctionId = params.get("id") || params.get("auction");
  const sslStatus = params.get("status");
  const main = getPageMain();

  let paymentStatus = null;
  if (!API_CONFIG.USE_MOCK) {
    const statusPath = auctionId
      ? `/auctions/payments/status?auction_id=${encodeURIComponent(auctionId)}`
      : "/auctions/payments/status";
    const statusRes = await apiClient.get(statusPath);
    if (statusRes.success) paymentStatus = statusRes.data;
  }

  if (paymentStatus?.verified) {
    main.innerHTML = `<div class="container" style="padding:4rem 0;text-align:center;max-width:560px;margin:0 auto">
      <div style="font-size:3rem;color:var(--color-success);margin-bottom:1rem">✓</div>
      <h1>Payment Verified</h1>
      <p style="color:var(--color-text-muted);margin:1rem 0 2rem">Your auction payment is confirmed${auctionId ? ` for ${auctionId}` : ""}.</p>
      <a href="index.html" class="btn btn-primary">Back to Auctions</a>
    </div>`;
    return;
  }

  const winningHint = paymentStatus?.winning_amount
    ? `<p class="form-hint">Winning bid amount: <strong>${formatPrice(paymentStatus.winning_amount)}</strong></p>`
    : "";

  main.innerHTML = `<div class="container page-hero"><h1>Payment Verification</h1>
    ${auctionId ? `<p style="color:var(--color-text-muted)">Auction: ${auctionId}</p>` : ""}</div>
    <div class="container" style="max-width:600px;padding-bottom:3rem">
      <form class="card" style="padding:2rem" id="verify-form">
        <p style="color:var(--color-text-muted);margin-bottom:1.5rem">Submit your transaction details to verify payment${auctionId ? " for your winning bid" : " and participate in high-value auctions"}.</p>
        ${winningHint}
        <div class="form-group"><label class="form-label">Transaction Reference</label><input class="form-input" name="ref" required placeholder="TXN-123456"></div>
        <div class="form-group"><label class="form-label">Amount Paid</label><input type="number" class="form-input" name="amount" min="0.01" step="0.01" required value="${paymentStatus?.winning_amount || ""}"></div>
        <button type="submit" class="btn btn-primary btn-block">Verify Payment</button>
      </form>
    </div>`;

  const autoVerifySsl = !API_CONFIG.USE_MOCK && (params.get("val_id") || sslStatus === "VALID");
  if (autoVerifySsl) {
    const amount = parseFloat(params.get("amount") || paymentStatus?.winning_amount || "0");
    const res = await apiClient.post("/auctions/payments/verify", {
      transaction_reference: params.get("tran_id") || params.get("bank_tran_id") || `ssl_${Date.now()}`,
      amount,
      auction_id: auctionId,
      provider: "sslcommerz",
      sslcommerz: Object.fromEntries(params.entries())
    });
    if (res.success) {
      toast.success("Payment verified via SSLCommerz");
      setTimeout(() => { window.location.href = auctionId ? `winning.html?id=${encodeURIComponent(auctionId)}` : "index.html"; }, 1200);
      return;
    }
    toast.error(res.error || "SSLCommerz verification failed");
  }

  document.getElementById("verify-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (API_CONFIG.USE_MOCK) {
      toast.success("Payment verified successfully");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
      return;
    }
    const res = await apiClient.post("/auctions/payments/verify", {
      transaction_reference: fd.get("ref"),
      amount: Number(fd.get("amount")),
      auction_id: auctionId,
      provider: "manual"
    });
    if (res.success) {
      toast.success("Payment verified successfully");
      setTimeout(() => { window.location.href = auctionId ? `winning.html?id=${encodeURIComponent(auctionId)}` : "index.html"; }, 1200);
    } else {
      toast.error(res.error || "Verification failed");
    }
  });
}

registerPage("bid-payment", () => {
  void initBidPaymentPage();
});

registerPage("search", async () => {
  const q = new URLSearchParams(location.search).get("q") || "";
  const products = await dataService.searchProducts(q);
  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>Search Results</h1><p>${products.length} results for "${escapeHtml(q)}"</p></div>
    <div class="container" style="padding-bottom:3rem"><div class="grid-4" id="search-grid"></div></div>`;
  renderProductGrid(products, document.getElementById("search-grid"), { basePath: ".." });
});

registerPage("categories", async () => {
  const categories = await dataService.getCategories();
  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>Categories</h1><p>Explore curated luxury collections</p></div>
    <div class="container category-hero-grid" style="padding-bottom:3rem">
      ${categories.map((c) => `
        <a href="shop.html?category=${c.slug}" class="category-tile card">
          <img src="${escapeAttr(c.image)}" alt="${escapeAttr(c.name)}" loading="lazy" ${imageFallbackAttr()}>
          <div class="category-tile-overlay"><h3>${escapeHtml(c.name)}</h3><span>${escapeHtml(c.count)} items</span></div>
        </a>`).join("")}
    </div>`;
});

registerPage("brand", async () => {
  const id = new URLSearchParams(location.search).get("id");
  const brand = await dataService.getBrandById(id);
  if (!brand) {
    getPageMain().innerHTML = `
      <div class="container empty-state"><h1>Brand Not Found</h1>
      <a href="shop.html" class="btn btn-primary">Browse Shop</a></div>`;
    return;
  }
  const products = (await dataService.getProducts()).filter((p) => p.brandId === id);
  getPageMain().innerHTML = `
    <div class="brand-hero"><img src="${brand.logo || PLACEHOLDER_BRAND}" alt="${brand.name} logo" class="brand-logo-large" ${imageFallbackAttr(PLACEHOLDER_BRAND)}>
    <h1>${brand.name}</h1><p style="color:var(--color-text-muted);max-width:600px;margin:1rem auto">${brand.description || ""}</p>
    <span class="verified-badge">✓ Verified Brand</span></div>
    <div class="container section"><div class="grid-4" id="brand-products"></div></div>`;
  renderProductGrid(products, document.getElementById("brand-products"), { basePath: ".." });
});

registerPage("contact", () => {
  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>Contact Us</h1><p>Our concierge team is here to assist</p></div>
    <div class="container contact-grid" style="padding-bottom:3rem">
      <div>
        <div class="grid-2" style="margin-bottom:2rem">
          <div class="contact-card"><div class="icon">✉</div><h3>Email</h3><p style="color:var(--color-text-muted)">concierge@fashionx.com</p></div>
          <div class="contact-card"><div class="icon">☎</div><h3>Phone</h3><p style="color:var(--color-text-muted)">+1 (888) 327-4899</p></div>
        </div>
        <form class="card" style="padding:2rem" id="contact-form">
          <div class="form-group"><label class="form-label">Name</label><input class="form-input" name="name" required></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email" required></div>
          <div class="form-group"><label class="form-label">Subject</label><input class="form-input" name="subject" required></div>
          <div class="form-group"><label class="form-label">Message</label><textarea class="form-textarea" name="message" rows="5" required style="width:100%;padding:0.875rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:8px;color:var(--color-text)"></textarea></div>
          <button type="submit" class="btn btn-primary">Send Message</button>
        </form>
      </div>
      <div class="map-ui"><div class="map-pin"><strong>FashionX HQ</strong><br>Paris · New York · Dubai</div></div>
    </div>`;
  document.getElementById("contact-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!API_CONFIG.USE_MOCK) {
      const fd = Object.fromEntries(new FormData(form));
      const res = await apiClient.post("/contact", {
        name: fd.name,
        email: fd.email,
        subject: fd.subject,
        message: fd.message
      });
      if (!res.success) {
        toast.error(res.error || "Could not submit message");
        return;
      }
    }
    toast.success("Message sent. We'll respond within 24 hours.");
    form.reset();
  });
});

registerPage("faq", () => {
  const faqs = [
    { q: "How do I verify product authenticity?", a: "Every item from verified sellers includes authentication documentation. Limited editions receive FashionX certification." },
    { q: "What is your return policy?", a: "Eligible items may be returned within 14 days in original condition with tags and packaging intact." },
    { q: "How does FashionX Bid work?", a: "Register, verify payment, and place bids on live auctions. Winning bids require payment within 48 hours." },
    { q: "Do you offer international shipping?", a: "Yes. We ship to 48 countries with full insurance and tracking on all luxury orders." }
  ];
  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>FAQ</h1></div>
    <div class="container" style="max-width:800px;padding-bottom:3rem">
      ${faqs.map((f, i) => `
        <div class="faq-item ${i === 0 ? "open" : ""}">
          <button class="faq-question" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}">${f.q}<span class="faq-icon">+</span></button>
          <div class="faq-answer" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div class="faq-answer-inner">${f.a}</div></div>
        </div>`).join("")}
    </div>`;
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  });
});

registerPage("orders", async () => {
  if (!auth.requireAuth()) return;
  const sellerView = new URLSearchParams(location.search).get("view") === "seller";
  const user = auth.getUser();
  const useSellerApi = sellerView && (user?.role === "seller" || user?.role === "admin");

  let orders = Storage.get(STORAGE_KEYS.ORDERS, []);
  let sellerRows = [];
  if (!API_CONFIG.USE_MOCK) {
    if (useSellerApi) {
      const res = await apiClient.get("/seller/orders");
      if (res.success) {
        sellerRows = apiClient.unwrapList(res).map((item) => ({
          id: item.order?.id || item.order_id,
          order_number: item.order?.order_number || item.order_id,
          date: item.order?.created_at || item.created_at,
          product: item.name,
          quantity: item.quantity,
          total: Number(item.unit_price || 0) * Number(item.quantity || 1),
          status: item.order?.status || "processing"
        }));
      }
    } else {
      const res = await apiClient.get("/orders");
      if (res.success) orders = apiClient.unwrapList(res);
    }
  }

  const pageTitle = useSellerApi ? "Seller Orders" : "Order History";
  const tableBody = useSellerApi
    ? (sellerRows.length
      ? sellerRows.map((row) => `<tr>
          <td>#${String(row.order_number || row.id).slice(-10)}</td>
          <td>${formatDate(row.date || Date.now())}</td>
          <td>${row.product} × ${row.quantity}</td>
          <td>${formatPrice(row.total)}</td>
          <td><span class="badge badge-success">${row.status}</span></td>
        </tr>`).join("")
      : `<tr><td colspan="5">No seller orders yet</td></tr>`)
    : (orders.length
      ? orders.map((o) => `<tr><td>#${(o.order_number || o.id || "").toString().slice(-10)}</td><td>${formatDate(o.date || o.created_at || Date.now())}</td><td>${formatPrice(o.total)}</td><td><span class="badge badge-success">${o.status}</span></td>
        <td><a href="tracking.html?id=${o.id}">Track</a> · <button class="btn btn-ghost btn-sm invoice-btn" data-id="${o.id}">Invoice</button></td></tr>`).join("")
      : "");

  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>${pageTitle}</h1>${useSellerApi ? `<p style="color:var(--color-text-muted)">Orders containing your products</p>` : ""}</div>
    <div class="container" style="padding-bottom:3rem">
      ${(useSellerApi ? sellerRows.length : orders.length)
        ? `<div class="table-responsive card" style="padding:1rem"><table class="data-table">
        <thead><tr>${useSellerApi
          ? "<th>Order</th><th>Date</th><th>Item</th><th>Total</th><th>Status</th>"
          : "<th>Order</th><th>Date</th><th>Total</th><th>Status</th><th></th>"}</tr></thead>
        <tbody>${tableBody}</tbody></table></div>
        ${useSellerApi ? `<a href="seller-dashboard.html" class="btn btn-outline" style="margin-top:1rem">← Back to Seller Dashboard</a>` : ""}`
        : `<div class="empty-state"><h2>No orders yet</h2><a href="shop.html" class="btn btn-primary">Start Shopping</a></div>`}
    </div>`;
  document.querySelectorAll(".invoice-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!API_CONFIG.USE_MOCK) {
        const res = await apiClient.get(`/orders/${id}/invoice`);
        if (res.success) {
          openInvoicePreview(res.data);
          return;
        }
        toast.error(res.error || "Could not load invoice");
        return;
      }
      toast.success("Invoice ready");
    });
  });
});

function openInvoicePreview(invoice) {
  const items = (invoice.items || [])
    .map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${formatPrice(item.unit_price)}</td><td>${formatPrice(item.unit_price * item.quantity)}</td></tr>`)
    .join("");
  const address = invoice.shipping_address
    ? `<p>${invoice.shipping_address.line1 || ""}<br>${invoice.shipping_address.city || ""}, ${invoice.shipping_address.country || ""}</p>`
    : "";
  const html = `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoice_number || ""}</title>
    <style>body{font-family:Georgia,serif;padding:2rem;color:#111}table{width:100%;border-collapse:collapse;margin-top:1rem}td,th{border-bottom:1px solid #ddd;padding:.5rem;text-align:left}h1{color:#a68b45}</style>
    </head><body>
    <h1>FashionX Invoice</h1>
    <p><strong>${invoice.invoice_number || ""}</strong> · ${formatDate(invoice.date || Date.now())}</p>
    ${address}
    <table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Line Total</th></tr></thead><tbody>${items}</tbody></table>
    <p style="margin-top:1.5rem"><strong>Total: ${formatPrice(invoice.total)}</strong></p>
    </body></html>`;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast.error("Allow pop-ups to view invoice");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function renderTrackingUI(container, data) {
  const steps = (data.tracking_steps || []).map((step) => `
    <div class="tracking-step ${step.done ? "completed" : ""}">
      <div class="step-icon">${step.done ? "✓" : "○"}</div>
      <div class="step-label">${step.label}</div>
    </div>`).join("");

  container.innerHTML = `
    <div class="container" style="padding:3rem 0;max-width:700px;margin:0 auto">
      <h1 style="margin-bottom:0.5rem">Order Tracking</h1>
      <p style="color:var(--color-text-muted)">Order ID: <strong>${data.id}</strong></p>
      <div class="tracking-steps" style="display:flex;gap:0;margin:2rem 0">${steps}</div>
      <p>Estimated Delivery: <strong>${data.estimated_delivery || "N/A"}</strong></p>
      <a href="orders.html" class="btn btn-outline" style="margin-top:1rem">← Back to Orders</a>
    </div>`;
}

async function renderTrackingPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");
  const main = getPageMain();

  if (!orderId) {
    main.innerHTML = `<div class="container" style="padding:4rem 0;text-align:center">
      <h2>No Order ID</h2>
      <p>Please check your order confirmation email for the tracking link.</p>
      <a href="orders.html" class="btn btn-primary" style="margin-top:1rem">My Orders</a>
    </div>`;
    return;
  }

  if (!auth.isLoggedIn()) {
    auth.redirectToLogin();
    return;
  }

  if (!API_CONFIG.USE_MOCK) {
    const res = await apiClient.get(`/orders/${orderId}/tracking`);
    if (!res.success) {
      main.innerHTML = `<div class="container" style="padding:4rem 0;text-align:center">
        <h2>Order Not Found</h2><p>${res.error || "Unable to load tracking info."}</p>
      </div>`;
      return;
    }
    renderTrackingUI(main, res.data);
    return;
  }

  renderTrackingUI(main, {
    id: orderId,
    status: "shipped",
    estimated_delivery: new Date(Date.now() + 3 * 86400000).toDateString(),
    tracking_steps: [
      { label: "Order Confirmed", done: true },
      { label: "Processing", done: true },
      { label: "Shipped", done: true },
      { label: "Delivered", done: false }
    ]
  });
}

registerPage("tracking", () => {
  void renderTrackingPage();
});

registerPage("notifications", async () => {
  if (!auth.requireAuth()) return;
  let notes = [];
  if (!API_CONFIG.USE_MOCK) {
    const res = await apiClient.get("/notifications");
    if (res.success) notes = res.data || [];
  }
  if (!notes.length) {
    notes = Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
  }
  const hasUnread = notes.some((n) => n.unread || !n.read_at);
  getPageMain().innerHTML = `
    <div class="container page-hero" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <h1>Notifications</h1>
      ${hasUnread && !API_CONFIG.USE_MOCK ? `<button type="button" class="btn btn-ghost btn-sm" id="mark-all-read">Mark all read</button>` : ""}
    </div>
    <div class="container card" style="padding:0;max-width:700px;margin-bottom:3rem" id="notifications-list">
      ${notes.length ? notes.map((n) => `
        <div class="notification-item ${n.unread || !n.read_at ? "unread" : ""}" data-id="${n.id || ""}">
          <div class="notification-icon">◆</div>
          <div><strong>${n.title}</strong><p style="color:var(--color-text-muted);font-size:0.875rem">${n.message || n.msg || n.body || ""}</p><small style="color:var(--color-text-dim)">${n.time || n.created_at || ""}</small></div>
        </div>`).join("")
        : `<div class="empty-state" style="padding:2rem"><p style="color:var(--color-text-muted)">No notifications yet.</p></div>`}
    </div>`;

  document.getElementById("mark-all-read")?.addEventListener("click", async () => {
    const res = await apiClient.post("/notifications/read-all");
    if (res.success) {
      toast.success("All notifications marked read");
      location.reload();
    } else {
      toast.error(res.error || "Could not update notifications");
    }
  });

  if (!API_CONFIG.USE_MOCK) {
    document.querySelectorAll(".notification-item[data-id]").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", async () => {
        const id = el.dataset.id;
        if (!id || !el.classList.contains("unread")) return;
        const res = await apiClient.patch(`/notifications/${id}/read`);
        if (res.success) {
          el.classList.remove("unread");
        }
      });
    });
  }
});

registerPage("addresses", async () => {
  if (!auth.requireAuth()) return;
  let addresses = [];
  if (!API_CONFIG.USE_MOCK) {
    const res = await apiClient.get("/addresses");
    if (res.success) addresses = res.data || [];
  }
  if (!addresses.length) {
    addresses = Storage.get(STORAGE_KEYS.ADDRESSES, []);
  }
  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>Address Book</h1></div>
    <div class="container" style="max-width:700px;padding-bottom:3rem">
      <div id="address-list">${addresses.length ? addresses.map((a) => `
        <div class="address-card ${a.default ? "default" : ""}" data-id="${a.id}">
          ${a.default ? '<span class="badge badge-gold default-badge">Default</span>' : ""}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
            <div>
              <h3>${a.name || a.label || "Address"}</h3>
              <p style="color:var(--color-text-muted)">${a.line1}, ${a.city} ${a.zip || a.postal_code || ""}</p>
            </div>
            ${!API_CONFIG.USE_MOCK ? `<button type="button" class="btn btn-ghost btn-sm delete-address" data-id="${a.id}" aria-label="Delete address">✕</button>` : ""}
          </div>
        </div>`).join("")
        : `<div class="empty-state" style="padding:1.5rem 0"><p style="color:var(--color-text-muted)">No saved addresses yet.</p></div>`}</div>
      <form class="card" style="padding:2rem;margin-top:2rem" id="add-address">
        <h3 style="margin-bottom:1rem">Add New Address</h3>
        <div class="form-group"><label class="form-label">Label</label><input class="form-input" name="name" required></div>
        <div class="form-group"><label class="form-label">Address</label><input class="form-input" name="line1" required></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">City</label><input class="form-input" name="city" required></div>
        <div class="form-group"><label class="form-label">ZIP</label><input class="form-input" name="zip" required></div></div>
        <button type="submit" class="btn btn-primary">Save Address</button>
      </form>
    </div>`;
  document.getElementById("add-address").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (!API_CONFIG.USE_MOCK) {
      const res = await apiClient.post("/addresses", {
        label: fd.name,
        line1: fd.line1,
        city: fd.city,
        postal_code: fd.zip,
        country_code: "US",
        is_default: addresses.length === 0
      });
      if (res.success) {
        toast.success("Address saved");
        location.reload();
        return;
      }
      toast.error(res.error);
      return;
    }
    const list = Storage.get(STORAGE_KEYS.ADDRESSES, []);
    list.push({ ...fd, id: Date.now(), default: false });
    Storage.set(STORAGE_KEYS.ADDRESSES, list);
    toast.success("Address saved");
    location.reload();
  });

  document.querySelectorAll(".delete-address").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!id || !confirm("Delete this address?")) return;
      const res = await apiClient.delete(`/addresses/${id}`);
      if (res.success) {
        toast.success("Address removed");
        location.reload();
      } else {
        toast.error(res.error || "Could not delete address");
      }
    });
  });
});

registerPage("seller-profile", async () => {
  const id = new URLSearchParams(location.search).get("id");
  const seller = await dataService.getSellerById(id);
  if (!seller) {
    getPageMain().innerHTML = `
      <div class="container empty-state"><h1>Seller Not Found</h1><a href="shop.html" class="btn btn-primary">Browse Shop</a></div>`;
    return;
  }
  const products = (await dataService.getProducts()).filter((p) => p.sellerId === id);
  getPageMain().innerHTML = `
    <div class="container page-hero" style="text-align:center">
      <img src="${seller.avatar || PLACEHOLDER_AVATAR}" alt="${seller.name} profile" style="width:100px;height:100px;border-radius:50%;margin:0 auto 1rem;border:2px solid var(--color-gold)" ${imageFallbackAttr(PLACEHOLDER_AVATAR)}>
      <h1>${seller.name}</h1>
      <span class="verified-badge">✓ Verified Seller</span>
      <p style="color:var(--color-text-muted);margin-top:1rem">${seller?.location || ""} · ${seller?.sales || 0} sales · ★ ${seller?.rating || 5}</p>
    </div>
    <div class="container section"><div class="grid-4" id="seller-products"></div></div>`;
  renderProductGrid(products, document.getElementById("seller-products"), { basePath: ".." });
});

registerPage("dashboard", async () => {
  if (!auth.requireAuth()) return;
  const user = auth.getUser();
  getPageMain().innerHTML = `
    <div class="container dashboard-layout dashboard-panel-page">
      <aside class="dashboard-sidebar">
        <div class="dashboard-sidebar-header">
          <div class="dashboard-sidebar-avatar">${(user.firstName || user.first_name || "U").charAt(0).toUpperCase()}</div>
          <div class="dashboard-sidebar-name">${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}</div>
          <div class="dashboard-sidebar-role">Buyer Account</div>
        </div>
        <nav class="dashboard-nav">
          <span class="dashboard-nav-label active">Profile</span>
          <a href="orders.html">Orders</a>
          <a href="wishlist.html">Wishlist</a>
          <a href="addresses.html">Addresses</a>
          <a href="notifications.html">Notifications</a>
          <a href="tracking.html">Tracking</a>
          <a href="#" id="dash-logout">Logout</a>
        </nav>
      </aside>
      <div>
        <div class="dashboard-panel-header">
          <div>
            <h1>Welcome back, ${user.firstName || user.first_name}</h1>
            <p>${user.email}</p>
          </div>
          <span class="verified-badge">Buyer Panel</span>
        </div>
        <div class="stat-cards">
          <div class="stat-card">
            <h3>Total Orders</h3>
            <span class="value" id="dash-orders">…</span>
            <span class="value-sub">Lifetime</span>
          </div>
          <div class="stat-card">
            <h3>Wishlist</h3>
            <span class="value" id="dash-wish">…</span>
            <span class="value-sub">Saved items</span>
          </div>
          <div class="stat-card">
            <h3>Member Since</h3>
            <span class="value">${(user.created_at || "").slice(0, 4) || "—"}</span>
            <span class="value-sub">Verified buyer</span>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">Profile Settings</h3>
          </div>
          <div class="admin-card-body">
            <form id="profile-form">
              <div class="grid-2">
                <div class="form-group"><label class="form-label">First Name</label><input class="form-input" name="firstName" value="${user.firstName || user.first_name || ""}"></div>
                <div class="form-group"><label class="form-label">Last Name</label><input class="form-input" name="lastName" value="${user.lastName || user.last_name || ""}"></div>
              </div>
              <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" value="${user.email || ""}" disabled></div>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;
  void Promise.all([
    (async () => {
      let count = 0;
      if (!API_CONFIG.USE_MOCK) {
        const res = await apiClient.get("/orders");
        if (res.success) count = apiClient.unwrapList(res).length;
      } else {
        count = Storage.get(STORAGE_KEYS.ORDERS, []).length;
      }
      const el = document.getElementById("dash-orders");
      if (el) el.textContent = count;
    })(),
    import("../modules/wishlist.js").then(async (m) => {
      await m.default.loadFromApi();
      const el = document.getElementById("dash-wish");
      if (el) el.textContent = m.default.getCount();
    })
  ]);
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await auth.updateProfile(Object.fromEntries(new FormData(e.target)));
    if (result?.success) toast.success("Profile updated");
    else toast.error(result?.message || "Update failed");
  });
  document.getElementById("dash-logout")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.logoutAndRedirect("../index.html");
  });
});

registerPage("seller", async () => {
  if (!auth.isLoggedIn()) {
    auth.redirectToLogin();
    return;
  }
  const user = auth.getUser();
  if (auth.isSellerPending()) {
    getPageMain().innerHTML = `
      <div class="container empty-state" style="padding:4rem 1rem;max-width:560px;margin:0 auto">
        <h1>Seller Application Pending</h1>
        <p style="color:var(--color-text-muted);margin:1.25rem 0">Your seller application is under review. You can use the buyer dashboard until an admin approves your account.</p>
        <a href="dashboard.html" class="btn btn-primary">Go to Buyer Dashboard</a>
      </div>`;
    return;
  }
  if (!auth.requireRole("seller", "admin")) return;

  let analytics = { products: 0, revenue: 0, orders: 0 };
  let sellerProducts = [];
  if (!API_CONFIG.USE_MOCK) {
    const aRes = await apiClient.get("/seller/analytics");
    if (aRes.success) analytics = aRes.data;
    const pRes = await apiClient.get("/seller/products");
    if (pRes.success) sellerProducts = pRes.data || [];
  }
  getPageMain().innerHTML = `
    <div class="container dashboard-layout dashboard-panel-page">
      <div class="dashboard-panel-header">
        <div>
          <h1>Seller Dashboard</h1>
          <p>${user.email || ""}</p>
        </div>
        <span class="verified-badge">✓ Verified Seller</span>
      </div>
      <aside class="dashboard-sidebar">
        <div class="dashboard-sidebar-header">
          <div class="dashboard-sidebar-avatar">${(user.firstName || user.first_name || "S").charAt(0).toUpperCase()}</div>
          <div class="dashboard-sidebar-name">${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}</div>
          <div class="dashboard-sidebar-role">Seller Account</div>
        </div>
        <nav class="dashboard-nav">
          <a href="seller-dashboard.html" class="active">Overview</a>
          <a href="shop.html">View Shop</a>
          <a href="../bid/submit.html">Submit Auction Item</a>
          <a href="../bid/seller-dashboard.html">Auction Panel</a>
          <a href="orders.html?view=seller">My Orders</a>
          <a href="dashboard.html">Buyer Panel</a>
          <a href="#" id="seller-logout">Logout</a>
        </nav>
      </aside>
      <div>
        <div class="stat-cards">
          <div class="stat-card">
            <h3>Total Revenue</h3>
            <span class="value">${formatPrice(analytics.revenue || 0)}</span>
            <span class="value-sub">All time</span>
          </div>
          <div class="stat-card">
            <h3>Orders Received</h3>
            <span class="value">${analytics.orders || 0}</span>
            <span class="value-sub">Processed</span>
          </div>
          <div class="stat-card">
            <h3>Active Products</h3>
            <span class="value">${analytics.products || sellerProducts.length}</span>
            <span class="value-sub">Listed</span>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">Sales Analytics</h3>
            <span class="dashboard-card-meta">Last 7 days</span>
          </div>
          <div class="admin-card-body">
            <div class="chart-bar">${renderSalesChart(analytics.weekly_sales || [])}</div>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">Product Management</h3>
            <button type="button" class="btn btn-primary btn-sm" id="upload-product">+ Add Product</button>
          </div>
          <div class="admin-card-body" style="padding:0">
            <div class="table-responsive">
              <table class="data-table">
                <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>${sellerProducts.length ? sellerProducts.map((p) => `
                  <tr data-product-id="${p.id}">
                    <td>${p.name}</td>
                    <td>${formatPrice(p.discountPrice || p.price)}</td>
                    <td>${p.stock}</td>
                    <td><button type="button" class="btn btn-ghost btn-sm edit-product-btn" data-id="${p.id}">Edit</button></td>
                  </tr>`).join("")
                  : `<tr><td colspan="4">No products yet. Add your first product above.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById("upload-product")?.addEventListener("click", () => openSellerProductModal());
  document.querySelectorAll(".edit-product-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = sellerProducts.find((p) => String(p.id) === String(btn.dataset.id));
      openSellerProductModal(product || { id: btn.dataset.id });
    });
  });
  document.getElementById("seller-logout")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.logoutAndRedirect("../index.html");
  });
});

registerPage("bid-history", async () => {
  let entries = [];
  if (!API_CONFIG.USE_MOCK && auth.isLoggedIn()) {
    const res = await apiClient.get("/me/auction-bids");
    if (res.success) {
      entries = res.data || [];
    }
  }
  if (!entries.length) {
    const all = Storage.get(STORAGE_KEYS.AUCTION_BIDS, {});
    entries = Object.entries(all).flatMap(([aid, bids]) => bids.map((b) => ({
      auctionId: aid,
      auctionTitle: aid,
      bidder: b.bidder,
      amount: b.amount,
      date: b.timestamp
    })));
  }
  getPageMain().innerHTML = `
    <div class="container page-hero"><h1>Bid History</h1></div>
    <div class="container card table-responsive" style="padding:1rem;margin-bottom:3rem">
      <table class="data-table"><thead><tr><th>Auction</th><th>Bidder</th><th>Amount</th><th>Time</th></tr></thead>
      <tbody>${entries.length ? entries.map((b) => `<tr><td>${b.auctionTitle || b.auctionId}</td><td>${b.bidder || "You"}</td><td>${formatPrice(b.amount)}</td><td>${new Date(b.date).toLocaleString()}</td></tr>`).join("") : "<tr><td colspan='4'>No bids yet</td></tr>"}</tbody></table>
    </div>`;
});

registerPage("bid-seller", async () => {
  if (!auth.requireRole("seller", "admin")) return;

  let liveCount = 0;
  let totalAuctions = 0;
  let earnings = 0;
  if (!API_CONFIG.USE_MOCK) {
    const [auctionRes, analyticsRes] = await Promise.all([
      apiClient.get("/seller/auctions"),
      apiClient.get("/seller/analytics")
    ]);
    if (auctionRes.success) {
      const auctions = Array.isArray(auctionRes.data) ? auctionRes.data : [];
      totalAuctions = auctions.length;
      liveCount = auctions.filter((a) => a.status === "active").length;
    }
    if (analyticsRes.success) {
      earnings = analyticsRes.data?.revenue || 0;
    }
  }

  getPageMain().innerHTML = `
    <div class="container dashboard-layout dashboard-panel-page">
      <div class="dashboard-panel-header">
        <h1>Auction Seller Panel</h1><span class="verified-badge">Seller · Bid</span>
      </div>
      <aside class="dashboard-sidebar"><nav class="dashboard-nav">
        <a href="seller-dashboard.html" class="active">Overview</a>
        <a href="index.html">Live Auctions</a>
        <a href="submit.html">Submit to Auction Item</a>
        <a href="history.html">Bid History</a>
        <a href="../pages/seller-dashboard.html">Seller Panel</a>
        <a href="../pages/dashboard.html">Buyer Panel</a>
        <a href="#" id="bid-seller-logout">Logout</a>
      </nav></aside>
      <div>
        <div class="stat-cards">
          <div class="stat-card"><h3>Live Auctions</h3><p class="value">${liveCount}</p></div>
          <div class="stat-card"><h3>Total Listings</h3><p class="value">${totalAuctions}</p></div>
          <div class="stat-card"><h3>Revenue</h3><p class="value">${formatPrice(earnings)}</p></div>
        </div>
        <div class="card" style="padding:2rem"><h3>Live Bid Monitoring</h3>
          <p style="color:var(--color-text-muted);margin:1rem 0">Monitor your active auctions in real-time.</p>
          <a href="index.html" class="btn btn-primary">View Live Auctions</a>
          <a href="submit.html" class="btn btn-outline" style="margin-left:0.5rem">Submit to Auction Item</a>
        </div>
      </div>
    </div>`;
  document.getElementById("bid-seller-logout")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.logoutAndRedirect("../index.html");
  });
});

async function openSellerProductModal(existingProduct = null) {
  if (API_CONFIG.USE_MOCK) {
    toast.info("Enable the Laravel API (USE_MOCK: false) to upload products.");
    return;
  }
  const isEdit = Boolean(existingProduct?.id);
  let product = existingProduct;
  if (isEdit && !product?.name) {
    const res = await apiClient.get(`/seller/products/${existingProduct.id}`);
    if (res.success) product = res.data;
  }
  const [categories, brands] = await Promise.all([
    dataService.getCategories(),
    dataService.getBrands()
  ]);

  const brandOptions = brands.map((b) =>
    `<option value="${b.id}">${b.name}</option>`
  ).join("");

  const brandFieldHtml = isEdit
    ? ""
    : `<div class="form-group seller-brand-field" id="seller-brand-field">
        <label class="form-label" for="brand-select">Brand</label>
        <div id="brand-select-wrap">
          <select class="form-select" name="brand_id" id="brand-select" required>
            <option value="" disabled selected>Select a brand…</option>
            ${brandOptions}
            <option value="__new__">+ Add New Brand</option>
          </select>
        </div>
        <div id="brand-new-wrap" class="seller-brand-new" hidden>
          <input class="form-input" type="text" name="brand_name" id="brand-name-input"
            placeholder="Enter your brand name" maxlength="255" autocomplete="off">
          <button type="button" class="btn btn-ghost btn-sm seller-brand-cancel" id="brand-cancel-new">← Back to brand list</button>
        </div>
      </div>`;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay active";
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header"><h2>${isEdit ? "Edit Product" : "Add Product"}</h2><button type="button" class="modal-close" data-close>✕</button></div>
      <form class="modal-body" id="seller-product-form">
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" name="name" required value="${product?.name || ""}"></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select class="form-select" name="category_id" required>${categories.map((c) => `<option value="${c.id}"${product?.category === c.slug ? " selected" : ""}>${c.name}</option>`).join("")}</select></div>
        ${brandFieldHtml}
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input" name="price" min="1" required value="${product?.price ?? ""}"></div>
          <div class="form-group"><label class="form-label">Stock</label><input type="number" class="form-input" name="stock" min="0" value="${product?.stock ?? 1}" required></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description" rows="3">${product?.description || ""}</textarea></div>
        ${isEdit ? "" : `<div class="form-group"><label class="form-label">Product image</label><input type="file" name="image" accept="image/*"></div>`}
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? "Save Changes" : "Create Product"}</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector("[data-close]")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  if (!isEdit) {
    initSellerBrandField(overlay);
  }

  overlay.querySelector("#seller-product-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get("name"),
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock")),
      description: fd.get("description") || ""
    };
    if (isEdit) {
      const res = await apiClient.put(`/seller/products/${product.id}`, payload);
      if (res.success) {
        toast.success("Product updated");
        close();
        window.location.reload();
      } else {
        toast.error(res.error || "Could not update product");
      }
      return;
    }

    const brandNewWrap = overlay.querySelector("#brand-new-wrap");
    const isNewBrand = brandNewWrap && !brandNewWrap.hidden;
    const brandName = (fd.get("brand_name") || "").toString().trim();
    const brandId = fd.get("brand_id");

    if (isNewBrand) {
      if (!brandName) {
        toast.error("Please enter a brand name");
        overlay.querySelector("#brand-name-input")?.focus();
        return;
      }
    } else if (!brandId || brandId === "__new__") {
      toast.error("Please select a brand");
      return;
    }

    const images = [];
    const file = fd.get("image");
    if (file?.size) {
      const up = await uploadImage(file, "product");
      if (!up.success) { toast.error(up.error); return; }
      images.push(up.url);
    }

    const createPayload = {
      ...payload,
      category_id: fd.get("category_id"),
      images,
      ...(isNewBrand ? { brand_name: brandName } : { brand_id: brandId })
    };

    const res = await apiClient.post("/seller/products", createPayload);
    if (res.success) {
      toast.success(isNewBrand ? "Product created with new brand" : "Product created");
      close();
      window.location.reload();
    } else {
      toast.error(res.error || "Could not create product");
    }
  });
}

function initSellerBrandField(overlay) {
  const brandSelect = overlay.querySelector("#brand-select");
  const brandSelectWrap = overlay.querySelector("#brand-select-wrap");
  const brandNewWrap = overlay.querySelector("#brand-new-wrap");
  const brandNameInput = overlay.querySelector("#brand-name-input");

  const showDropdown = () => {
    brandNewWrap.hidden = true;
    brandSelectWrap.hidden = false;
    brandSelect.disabled = false;
    brandNameInput.value = "";
    brandNameInput.removeAttribute("required");
    brandSelect.setAttribute("required", "");
    if (brandSelect.value === "__new__") {
      brandSelect.value = "";
    }
  };

  const showNewBrand = () => {
    brandSelectWrap.hidden = true;
    brandNewWrap.hidden = false;
    brandSelect.disabled = true;
    brandSelect.removeAttribute("required");
    brandNameInput.setAttribute("required", "");
    brandNameInput.focus();
  };

  brandSelect?.addEventListener("change", () => {
    if (brandSelect.value === "__new__") {
      showNewBrand();
    }
  });

  overlay.querySelector("#brand-cancel-new")?.addEventListener("click", showDropdown);
}

registerPage("404", () => {
  getPageMain().innerHTML = `
    <div class="container error-page" style="padding:4rem 0;text-align:center">
      <div class="error-code">404</div>
      <h1>Page Not Found</h1>
      <p style="color:var(--color-text-muted);margin:1.5rem 0">The page you are looking for does not exist or has been moved.</p>
      <a href="../index.html" class="btn btn-primary">Go Home</a>
    </div>`;
});
