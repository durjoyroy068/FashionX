import { registerPage } from "../core/registry.js";
import apiClient from "../api/client.js";
import auth from "../modules/auth.js";
import { getPageMain } from "../utils/pageMain.js";
import { formatPrice, formatDate } from "../utils/format.js";
import toast from "../ui/toast.js";
import { resolveStorageUrl } from "../utils/media.js";

const adminApi = {
  get: (path) => apiClient.get(`/admin${path}`),
  post: (path, body) => apiClient.post(`/admin${path}`, body),
  put: (path, body) => apiClient.put(`/admin${path}`, body),
  patch: (path, body) => apiClient.patch(`/admin${path}`, body),
  delete: (path) => apiClient.delete(`/admin${path}`)
};

let currentSection = "dashboard";

registerPage("admin", async () => {
  if (!auth.requireRole("admin")) return;
  renderShell();
  bindNav();
  await loadSection("dashboard");
});

function adminDisplayName(user) {
  if (!user) return "Administrator";
  const first = user.firstName || user.first_name || "";
  const last = user.lastName || user.last_name || "";
  const full = `${first} ${last}`.trim();
  return full || user.email || "Administrator";
}

function renderShell() {
  const user = auth.getUser();
  getPageMain().innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-brand">
          <div class="admin-sidebar-brand-title">FashionX</div>
          <div class="admin-sidebar-brand-sub">Admin Console</div>
        </div>
        <div class="admin-sidebar-top">
          <div class="admin-nav-section-label">Overview</div>
          <button type="button" class="admin-nav-btn active" data-section="dashboard">
            <span class="nav-icon">◈</span> Dashboard
          </button>
          <div class="admin-nav-section-label">Manage</div>
          <button type="button" class="admin-nav-btn" data-section="users">
            <span class="nav-icon">◎</span> Users
          </button>
          <button type="button" class="admin-nav-btn" data-section="sellers">
            <span class="nav-icon">◇</span> Sellers
          </button>
          <button type="button" class="admin-nav-btn" data-section="products">
            <span class="nav-icon">⊞</span> Products
          </button>
          <button type="button" class="admin-nav-btn" data-section="orders">
            <span class="nav-icon">⊡</span> Orders
          </button>
          <div class="admin-nav-section-label">Content</div>
          <button type="button" class="admin-nav-btn" data-section="banners">
            <span class="nav-icon">⊟</span> Banners
          </button>
          <button type="button" class="admin-nav-btn" data-section="coupons">
            <span class="nav-icon">◈</span> Coupons
          </button>
          <button type="button" class="admin-nav-btn" data-section="reviews">
            <span class="nav-icon">◉</span> Reviews
          </button>
          <button type="button" class="admin-nav-btn" data-section="messages">
            <span class="nav-icon">◻</span> Messages
          </button>
          <button type="button" class="admin-nav-btn" data-section="subscribers">
            <span class="nav-icon">◌</span> Subscribers
          </button>
          <div class="admin-nav-section-label">System</div>
          <button type="button" class="admin-nav-btn" data-section="settings">
            <span class="nav-icon">◈</span> Settings
          </button>
          <button type="button" class="admin-nav-btn admin-nav-storefront">
            <span class="nav-icon">↗</span> View Storefront
          </button>
        </div>
        <div class="admin-sidebar-footer">
          <div class="admin-user-card">
            <div class="admin-user-avatar">${(adminDisplayName(user).charAt(0) || "A").toUpperCase()}</div>
            <div class="admin-user-info">
              <div class="admin-user-name">${adminDisplayName(user)}</div>
              <div class="admin-user-email">${user?.email || ""}</div>
              <div class="admin-user-role">Administrator</div>
            </div>
          </div>
          <a href="../pages/dashboard.html" class="admin-nav-btn admin-nav-link">
            <span class="nav-icon">◁</span> Buyer Dashboard
          </a>
          <button type="button" class="admin-nav-btn admin-logout-btn" id="admin-logout">
            <span class="nav-icon">⊗</span> Logout
          </button>
        </div>
      </aside>
      <div class="admin-main" id="admin-content">
        <div class="admin-loading">Loading…</div>
      </div>
    </div>`;

  document.querySelector(".admin-nav-storefront")?.addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  document.getElementById("admin-logout")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await auth.logoutAndRedirect("../index.html");
  });
}

function bindNav() {
  document.querySelectorAll(".admin-nav-btn[data-section]:not(.admin-nav-storefront)").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".admin-nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await loadSection(btn.dataset.section);
    });
  });
}

async function loadSection(section) {
  currentSection = section;
  const el = document.getElementById("admin-content");
  el.innerHTML = `<div class="admin-loading">Loading…</div>`;

  const loaders = {
    dashboard: loadDashboard,
    users: loadUsers,
    sellers: loadSellers,
    products: loadProducts,
    orders: loadOrders,
    banners: loadBanners,
    coupons: loadCoupons,
    reviews: loadReviews,
    messages: loadMessages,
    subscribers: loadSubscribers,
    settings: loadSettings
  };

  try {
    await (loaders[section] || loadDashboard)(el);
  } catch (err) {
    el.innerHTML = `<div class="card" style="padding:2rem"><p class="error-msg">Failed to load: ${err.message}</p>
      <p style="color:var(--color-text-muted)">Ensure Laravel is running at ${apiClient.baseUrl}</p></div>`;
  }
}

async function loadDashboard(el) {
  const res = await adminApi.get("/dashboard");
  if (!res.success) throw new Error(res.error || "API error");
  const d = res.data;
  el.innerHTML = `
    <div class="admin-toolbar">
      <h1>Dashboard</h1>
      <div class="admin-toolbar-actions">
        <span class="admin-badge">Live Data</span>
      </div>
    </div>
    <div class="admin-stat-grid">
      <div class="admin-stat-card admin-stat-card--revenue">
        <span class="admin-stat-icon">◈</span>
        <div class="admin-stat-label">Total Revenue</div>
        <div class="admin-stat-value">${formatPrice(d.revenue)}</div>
        <div class="admin-stat-sub">All time</div>
      </div>
      <div class="admin-stat-card admin-stat-card--orders">
        <span class="admin-stat-icon">⊡</span>
        <div class="admin-stat-label">Total Orders</div>
        <div class="admin-stat-value">${d.orders}</div>
        <div class="admin-stat-sub">Processed</div>
      </div>
      <div class="admin-stat-card admin-stat-card--products">
        <span class="admin-stat-icon">⊞</span>
        <div class="admin-stat-label">Products</div>
        <div class="admin-stat-value">${d.products}</div>
        <div class="admin-stat-sub">Listed</div>
      </div>
      <div class="admin-stat-card admin-stat-card--users">
        <span class="admin-stat-icon">◎</span>
        <div class="admin-stat-label">Users</div>
        <div class="admin-stat-value">${d.users}</div>
        <div class="admin-stat-sub">Registered</div>
      </div>
      <div class="admin-stat-card admin-stat-card--pending">
        <span class="admin-stat-icon">◇</span>
        <div class="admin-stat-label">Pending Sellers</div>
        <div class="admin-stat-value">${d.pending_sellers}</div>
        <div class="admin-stat-sub">Awaiting review</div>
      </div>
      <div class="admin-stat-card admin-stat-card--pending">
        <span class="admin-stat-icon">◉</span>
        <div class="admin-stat-label">Pending Reviews</div>
        <div class="admin-stat-value">${d.pending_reviews}</div>
        <div class="admin-stat-sub">To moderate</div>
      </div>
      <div class="admin-stat-card admin-stat-card--messages">
        <span class="admin-stat-icon">◻</span>
        <div class="admin-stat-label">New Messages</div>
        <div class="admin-stat-value">${d.new_contact_messages || 0}</div>
        <div class="admin-stat-sub">Unread</div>
      </div>
      <div class="admin-stat-card admin-stat-card--users">
        <span class="admin-stat-icon">◌</span>
        <div class="admin-stat-label">Subscribers</div>
        <div class="admin-stat-value">${d.newsletter_subscribers || 0}</div>
        <div class="admin-stat-sub">Newsletter</div>
      </div>
    </div>
    <div class="admin-quick-panel">
      <p>Control the storefront: manage banners, coupons, and site settings. All changes are applied live via the API.</p>
      <div class="admin-quick-actions">
        ${d.pending_sellers ? `<button type="button" class="btn btn-primary btn-sm admin-quick-link" data-section="sellers">${d.pending_sellers} seller application${d.pending_sellers === 1 ? "" : "s"} awaiting review</button>` : ""}
        ${d.pending_reviews ? `<button type="button" class="btn btn-outline btn-sm admin-quick-link" data-section="reviews">${d.pending_reviews} review${d.pending_reviews === 1 ? "" : "s"} pending moderation</button>` : ""}
      </div>
    </div>`;

  el.querySelectorAll(".admin-quick-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const section = btn.dataset.section;
      document.querySelectorAll(".admin-nav-btn[data-section]").forEach((nav) => {
        nav.classList.toggle("active", nav.dataset.section === section);
      });
      await loadSection(section);
    });
  });
}

async function loadUsers(el) {
  const res = await adminApi.get("/users");
  if (!res.success) throw new Error(res.error);
  const users = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Users</h1><span class="admin-badge">${users.length} total</span></div>
    <div class="card admin-table-wrap" style="padding:1rem">
      ${users.length ? `<table class="data-table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th><th></th></tr></thead>
      <tbody>${users.map((u) => `
        <tr><td>${u.email}</td><td>${u.first_name || ""} ${u.last_name || ""}</td><td>${u.role}</td>
        <td>${u.is_active ? "Yes" : "No"}</td>
        <td><button class="btn btn-ghost btn-sm toggle-user" data-id="${u.id}" data-active="${u.is_active}">${u.is_active ? "Disable" : "Enable"}</button></td></tr>`).join("")}</tbody></table>`
        : "<p style='padding:1rem;color:var(--color-text-muted)'>No users found.</p>"}
    </div>`;
  el.querySelectorAll(".toggle-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id.replace("user_", "");
      const r = await adminApi.patch(`/users/${id}`, { is_active: btn.dataset.active !== "true" });
      if (r.success) { toast.success("User updated"); loadUsers(el); }
      else toast.error(r.error);
    });
  });
}

async function loadSellers(el) {
  const res = await adminApi.get("/sellers");
  if (!res.success) throw new Error(res.error);
  const { sellers = [], pending = [] } = res.data;
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Sellers</h1></div>
    ${pending.length ? `<div class="card" style="padding:1rem;margin-bottom:1.5rem"><h3>Pending Approval (${pending.length})</h3>
      <table class="data-table"><thead><tr><th>Business</th><th>User</th><th></th></tr></thead>
      <tbody>${pending.map((p) => `
        <tr><td>${p.business_name}</td><td>${p.user?.email || p.user_id}</td>
        <td>
          <button class="btn btn-primary btn-sm approve-seller" data-id="${p.user?.id || p.user_id}">Approve</button>
          <button class="btn btn-ghost btn-sm reject-seller" data-id="${p.user?.id || p.user_id}">Reject</button>
        </td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="card admin-table-wrap" style="padding:1rem">
      <table class="data-table"><thead><tr><th>Store</th><th>Status</th><th>Verified</th><th>Rating</th></tr></thead>
      <tbody>${sellers.map((s) => `
        <tr><td>${s.business_name}</td><td>${s.status}</td><td>${s.verified ? "✓" : "—"}</td><td>${s.rating}</td></tr>`).join("")}</tbody></table>
    </div>`;
  el.querySelectorAll(".approve-seller").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const r = await adminApi.patch(`/sellers/${btn.dataset.id}/approve`);
      if (r.success) { toast.success("Seller approved"); loadSellers(el); }
      else toast.error(r.error);
    });
  });
  el.querySelectorAll(".reject-seller").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Reject this seller application?")) return;
      const r = await adminApi.patch(`/sellers/${btn.dataset.id}/reject`, { reason: "Not approved" });
      if (r.success) { toast.success("Application rejected"); loadSellers(el); }
      else toast.error(r.error);
    });
  });
}

async function loadProducts(el) {
  const res = await adminApi.get("/products");
  if (!res.success) throw new Error(res.error);
  const products = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Products</h1><span class="admin-badge">${products.length} items</span></div>
    <div class="card admin-table-wrap" style="padding:1rem">
      ${products.length ? `<table class="data-table"><thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Featured</th><th>Active</th><th></th></tr></thead>
      <tbody>${products.map((p) => `
        <tr><td>${p.name}</td><td>${formatPrice(p.discountPrice || p.price)}</td><td>${p.stock}</td>
        <td>${p.featured ? "Yes" : "No"}</td><td>${p.is_active !== false ? "Yes" : "No"}</td>
        <td class="admin-actions">
          <button class="btn btn-ghost btn-sm toggle-feat" data-id="${p.id}">Featured</button>
          <button class="btn btn-ghost btn-sm toggle-active" data-id="${p.id}" data-active="${p.is_active !== false}">Active</button>
          <button class="btn btn-ghost btn-sm del-prod" data-id="${p.id}">Delete</button>
        </td></tr>`).join("")}</tbody></table>`
        : "<p style='padding:1rem;color:var(--color-text-muted)'>No products in the catalog yet.</p>"}
    </div>`;
  el.querySelectorAll(".toggle-feat").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pid = btn.dataset.id.replace("prod_", "");
      const p = products.find((x) => x.id === btn.dataset.id);
      const r = await adminApi.patch(`/products/${pid}`, { featured: !p?.featured });
      if (r.success) { toast.success("Updated"); loadProducts(el); }
      else toast.error(r.error || "Update failed");
    });
  });
  el.querySelectorAll(".toggle-active").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pid = btn.dataset.id.replace("prod_", "");
      const r = await adminApi.patch(`/products/${pid}`, { is_active: btn.dataset.active !== "true" });
      if (r.success) { toast.success("Product visibility updated"); loadProducts(el); }
      else toast.error(r.error || "Update failed");
    });
  });
  el.querySelectorAll(".del-prod").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this product?")) return;
      const r = await adminApi.delete(`/products/${btn.dataset.id.replace("prod_", "")}`);
      if (r.success) { toast.success("Deleted"); loadProducts(el); }
      else toast.error(r.error || "Delete failed");
    });
  });
}

async function loadOrders(el) {
  const res = await adminApi.get("/orders");
  if (!res.success) throw new Error(res.error);
  const orders = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Orders</h1><span class="admin-badge">${orders.length} total</span></div>
    <div class="card admin-table-wrap" style="padding:1rem">
      ${orders.length ? `<table class="data-table"><thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Payment</th><th>Update</th></tr></thead>
      <tbody>${orders.map((o) => `
        <tr><td>${o.order_number}</td><td>${o.user_email || "—"}</td><td>${formatPrice(o.total)}</td>
        <td><span class="badge">${o.status}</span></td><td>${o.payment_status}</td>
        <td><select class="form-input order-status" data-id="${o.id}" style="min-width:140px;padding:0.35rem">
          ${["pending","confirmed","processing","shipped","delivered","cancelled"].map((s) =>
            `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
        </select></td></tr>`).join("")}</tbody></table>`
        : "<p style='padding:1rem;color:var(--color-text-muted)'>No orders yet.</p>"}
    </div>`;
  el.querySelectorAll(".order-status").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id.replace("ord_", "");
      const r = await adminApi.patch(`/orders/${id}/status`, { status: sel.value });
      if (r.success) toast.success("Order status updated");
      else toast.error(r.error);
    });
  });
}

async function loadBanners(el) {
  const res = await adminApi.get("/banners");
  if (!res.success) throw new Error(res.error);
  const banners = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Banners</h1>
      <button type="button" class="btn btn-primary btn-sm" id="add-banner">+ Add Banner</button></div>
    <div class="grid-2" style="gap:1rem;margin-bottom:2rem" id="banner-list">
      ${banners.map((b) => `
        <div class="card" style="padding:1rem">
          ${b.image ? `<img src="${resolveStorageUrl(b.image)}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:0.75rem">` : ""}
          <strong>${b.title}</strong><p style="color:var(--color-text-muted);font-size:0.875rem">${b.subtitle || ""}</p>
          <p style="font-size:0.75rem;margin:0.5rem 0">${b.is_active ? "Active" : "Inactive"} · ${b.position}</p>
          <button class="btn btn-ghost btn-sm del-banner" data-id="${b.id}">Delete</button>
        </div>`).join("")}
    </div>
    <form class="card admin-form-grid" style="padding:1.5rem;display:none" id="banner-form">
      <h3>New Banner</h3>
      <div class="form-group"><label class="form-label">Title</label><input class="form-input" name="title" required></div>
      <div class="form-group"><label class="form-label">Subtitle</label><input class="form-input" name="subtitle"></div>
      <div class="form-group"><label class="form-label">Image URL</label><input class="form-input" name="image" placeholder="https://..."></div>
      <div class="form-group"><label class="form-label">Or upload image</label><input type="file" class="form-input" name="file" accept="image/*"></div>
      <div class="form-group"><label class="form-label">Link</label><input class="form-input" name="link"></div>
      <div class="form-group"><label class="form-label">Position</label><input class="form-input" name="position" value="home"></div>
      <button type="submit" class="btn btn-primary">Save Banner</button>
    </form>`;

  document.getElementById("add-banner")?.addEventListener("click", () => {
    document.getElementById("banner-form").style.display = "grid";
  });
  document.getElementById("banner-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('input[name="file"]');
    let imageUrl = form.image?.value || "";
    if (fileInput?.files?.[0]) {
      const fd = new FormData();
      fd.append("file", fileInput.files[0]);
      fd.append("type", "banner");
      const up = await apiClient.upload("/media/upload", fd);
      if (!up.success) { toast.error(up.error || "Upload failed"); return; }
      imageUrl = resolveStorageUrl(up.data?.url || up.data?.path || imageUrl);
    }
    const r = await adminApi.post("/banners", {
      title: form.title.value,
      subtitle: form.subtitle.value,
      image: imageUrl,
      link: form.link.value,
      position: form.position.value || "home",
      is_active: true,
      sort_order: 0
    });
    if (r.success) { toast.success("Banner created — visible on homepage"); loadBanners(el); }
    else toast.error(r.error);
  });
  el.querySelectorAll(".del-banner").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete banner?")) return;
      const r = await adminApi.delete(`/banners/${btn.dataset.id}`);
      if (r.success) { toast.success("Deleted"); loadBanners(el); }
    });
  });
}

async function loadCoupons(el) {
  const res = await adminApi.get("/coupons");
  if (!res.success) throw new Error(res.error);
  const coupons = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Coupons</h1></div>
    <div class="card admin-table-wrap" style="padding:1rem;margin-bottom:1.5rem">
      <table class="data-table"><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Active</th><th></th></tr></thead>
      <tbody>${coupons.map((c) => `
        <tr><td><strong>${c.code}</strong></td><td>${c.type}</td><td>${c.value}</td>
        <td>${c.used_count}/${c.max_uses || "∞"}</td><td>${c.is_active ? "Yes" : "No"}</td>
        <td><button class="btn btn-ghost btn-sm del-coupon" data-id="${c.id}">Delete</button></td></tr>`).join("")}</tbody></table>
    </div>
    <form class="card admin-form-grid" style="padding:1.5rem" id="coupon-form">
      <h3>Create Coupon</h3>
      <div class="form-group"><label class="form-label">Code</label><input class="form-input" name="code" required></div>
      <div class="form-group"><label class="form-label">Type</label><select class="form-input" name="type"><option value="percent">Percent</option><option value="fixed">Fixed</option></select></div>
      <div class="form-group"><label class="form-label">Value</label><input type="number" class="form-input" name="value" required min="0"></div>
      <div class="form-group"><label class="form-label">Max Uses</label><input type="number" class="form-input" name="max_uses" value="100"></div>
      <button type="submit" class="btn btn-primary">Create</button>
    </form>`;
  document.getElementById("coupon-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const r = await adminApi.post("/coupons", { ...fd, is_active: true });
    if (r.success) { toast.success("Coupon created"); loadCoupons(el); }
    else toast.error(r.error);
  });
  el.querySelectorAll(".del-coupon").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const r = await adminApi.delete(`/coupons/${btn.dataset.id}`);
      if (r.success) { toast.success("Deleted"); loadCoupons(el); }
    });
  });
}

async function loadReviews(el) {
  const res = await adminApi.get("/reviews?status=pending");
  if (!res.success) throw new Error(res.error);
  const list = apiClient.unwrapList(res);
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Review Moderation</h1></div>
    <div class="card admin-table-wrap" style="padding:1rem">
      ${list.length ? `<table class="data-table"><thead><tr><th>Product</th><th>Rating</th><th>Body</th><th></th></tr></thead>
      <tbody>${list.map((r) => `
        <tr><td>${r.product?.name || r.product_id}</td><td>${r.rating}★</td><td>${(r.body || "").slice(0, 80)}</td>
        <td class="admin-actions">
          <button class="btn btn-primary btn-sm appr-rev" data-id="${r.id}">Approve</button>
          <button class="btn btn-ghost btn-sm rej-rev" data-id="${r.id}">Reject</button>
          <button class="btn btn-ghost btn-sm spam-rev" data-id="${r.id}">Spam</button>
        </td></tr>`).join("")}</tbody></table>` : "<p style='padding:1rem;color:var(--color-text-muted)'>No pending reviews.</p>"}
    </div>`;
  el.querySelectorAll(".appr-rev").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const r = await adminApi.patch(`/reviews/${btn.dataset.id}/approve`);
      if (r.success) { toast.success("Approved"); loadReviews(el); }
    });
  });
  el.querySelectorAll(".rej-rev").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const r = await adminApi.patch(`/reviews/${btn.dataset.id}/reject`, { reason: "Rejected" });
      if (r.success) { toast.success("Rejected"); loadReviews(el); }
    });
  });
  el.querySelectorAll(".spam-rev").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const r = await adminApi.patch(`/reviews/${btn.dataset.id}/spam`);
      if (r.success) { toast.success("Marked spam"); loadReviews(el); }
    });
  });
}

async function loadMessages(el) {
  const res = await adminApi.get("/contact-messages");
  if (!res.success) throw new Error(res.error);
  const list = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Contact Messages</h1><span class="admin-badge">${list.length}</span></div>
    <div class="card admin-table-wrap" style="padding:1rem">
      ${list.length ? `<table class="data-table"><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((m) => `
        <tr><td><strong>${m.name}</strong><br><small>${m.email}</small></td>
        <td>${m.subject}</td><td>${(m.message || "").slice(0, 120)}</td>
        <td>${m.status}</td>
        <td>${m.status === "new" ? `<button class="btn btn-ghost btn-sm mark-read" data-id="${m.id}">Mark read</button>` : "—"}</td></tr>`).join("")}</tbody></table>`
        : "<p style='padding:1rem;color:var(--color-text-muted)'>No messages yet.</p>"}
    </div>`;
  el.querySelectorAll(".mark-read").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const r = await adminApi.patch(`/contact-messages/${btn.dataset.id}/read`);
      if (r.success) {
        toast.success("Message marked as read");
        loadMessages(el);
      } else {
        toast.error(r.error || "Could not update");
      }
    });
  });
}

async function loadSubscribers(el) {
  const res = await adminApi.get("/newsletter-subscribers");
  if (!res.success) throw new Error(res.error);
  const list = res.data || [];
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Newsletter Subscribers</h1><span class="admin-badge">${list.filter((s) => s.is_active).length} active</span></div>
    <div class="card admin-table-wrap" style="padding:1rem">
      ${list.length ? `<table class="data-table"><thead><tr><th>Email</th><th>Source</th><th>Subscribed</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((s) => `
        <tr><td>${s.email}</td><td>${s.source || "—"}</td><td>${formatDate(s.subscribed_at || s.created_at)}</td>
        <td>${s.is_active ? "Active" : "Inactive"}</td>
        <td>${s.is_active ? `<button class="btn btn-ghost btn-sm deactivate-sub" data-id="${s.id}">Deactivate</button>` : "—"}</td></tr>`).join("")}</tbody></table>`
        : "<p style='padding:1rem;color:var(--color-text-muted)'>No subscribers yet.</p>"}
    </div>`;
  el.querySelectorAll(".deactivate-sub").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Deactivate this subscriber?")) return;
      const r = await adminApi.delete(`/newsletter-subscribers/${btn.dataset.id}`);
      if (r.success) {
        toast.success("Subscriber deactivated");
        loadSubscribers(el);
      } else {
        toast.error(r.error || "Could not deactivate");
      }
    });
  });
}

async function loadSettings(el) {
  const res = await adminApi.get("/settings");
  if (!res.success) throw new Error(res.error);
  const s = res.data || {};
  const site = s.site || {};
  const seo = s.seo || {};
  const social = s.social || {};
  el.innerHTML = `
    <div class="admin-toolbar"><h1>Site Settings</h1><span class="admin-badge">Controls storefront</span></div>
    <form class="card" style="padding:2rem;max-width:720px" id="settings-form">
      <h3 style="margin-bottom:1rem">General</h3>
      <div class="form-group"><label class="form-label">Site Name</label><input class="form-input" name="site_name" value="${site.name || "FashionX"}"></div>
      <div class="form-group"><label class="form-label">Tagline</label><input class="form-input" name="site_tagline" value="${site.tagline || ""}"></div>
      <div class="form-group"><label class="form-label">Contact Email</label><input class="form-input" name="contact_email" value="${site.contact_email || ""}"></div>
      <div class="form-group"><label class="form-label">Contact Phone</label><input class="form-input" name="contact_phone" value="${site.contact_phone || ""}"></div>
      <h3 style="margin:1.5rem 0 1rem">SEO</h3>
      <div class="form-group"><label class="form-label">Meta Title</label><input class="form-input" name="seo_title" value="${seo.title || ""}"></div>
      <div class="form-group"><label class="form-label">Meta Description</label><textarea class="form-textarea" name="seo_description" rows="3" style="width:100%">${seo.description || ""}</textarea></div>
      <h3 style="margin:1.5rem 0 1rem">Social Links</h3>
      <div class="form-group"><label class="form-label">Instagram</label><input class="form-input" name="social_instagram" value="${social.instagram || ""}"></div>
      <div class="form-group"><label class="form-label">Twitter</label><input class="form-input" name="social_twitter" value="${social.twitter || ""}"></div>
      <button type="submit" class="btn btn-primary" style="margin-top:1rem">Save Settings</button>
    </form>`;
  document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const r = await adminApi.put("/settings", {
      settings: {
        site: {
          name: fd.site_name,
          tagline: fd.site_tagline,
          contact_email: fd.contact_email,
          contact_phone: fd.contact_phone
        },
        seo: { title: fd.seo_title, description: fd.seo_description, keywords: seo.keywords || "" },
        social: { instagram: fd.social_instagram, twitter: fd.social_twitter, facebook: social.facebook || "" }
      }
    });
    if (r.success) {
      const { clearSiteSettingsCache } = await import("../utils/siteSettings.js");
      clearSiteSettingsCache();
      toast.success("Settings saved — refresh storefront to see changes");
    }
    else toast.error(r.error);
  });
}
