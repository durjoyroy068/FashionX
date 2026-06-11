# FashionX — API Checklist

Base URL: `http://127.0.0.1:8000/api/v1` (local)  
Frontend config: `window.__FASHIONX_API_URL__` in each HTML file.

**Legend:** ✅ Backend route exists · ⚠️ Frontend calls it · 🔧 You configure externally (no Laravel route needed)

---

## 1. Health & Public (no login)

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| GET | `/health` | Dev / monitoring | ✅ |
| GET | `/products` | Shop, Home, Search, dataService | ✅ ⚠️ |
| GET | `/products/{id}` | Product page, Cart, Wishlist | ✅ ⚠️ |
| GET | `/products/{id}/reviews` | Product page reviews | ✅ ⚠️ |
| GET | `/categories` | Shop filters, Header mega-menu, Seller form | ✅ ⚠️ |
| GET | `/brands` | Shop, Seller product form | ✅ ⚠️ |
| GET | `/brands/{id}` | Brand page | ✅ |
| GET | `/sellers` | dataService | ✅ |
| GET | `/sellers/{id}` | Product page, Seller profile | ✅ |
| GET | `/auctions` | Bid home, dataService | ✅ ⚠️ |
| GET | `/auctions/{id}` | Bid auction page | ✅ ⚠️ |
| GET | `/auctions/{id}/bids` | Bid auction live bids | ✅ ⚠️ |
| GET | `/banners` | Home carousel (`banners.js`) | ✅ ⚠️ |
| GET | `/settings/public` | Site settings (`siteSettings.js`) | ✅ ⚠️ |
| POST | `/contact` | Contact page (`static-pages.js`) | ✅ ⚠️ |
| POST | `/newsletter/subscribe` | Home footer (`home.js`) | ✅ ⚠️ |
| POST | `/payments/webhook/{provider}` | Stripe / SSLCommerz webhooks | ✅ 🔧 |

---

## 2. Auth

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| POST | `/auth/register` | Register page (`auth.js`) | ✅ ⚠️ |
| POST | `/auth/login` | Login page (`auth.js`) | ✅ ⚠️ |
| POST | `/auth/logout` | Logout all panels (`auth.js`) | ✅ ⚠️ |
| GET | `/auth/me` | Session restore (`auth.js`) | ✅ ⚠️ |
| PUT | `/auth/profile` | Buyer dashboard profile form | ✅ ⚠️ |
| POST | `/auth/email/resend` | — | ✅ (not wired in UI yet) |
| POST | `/auth/forgot-password` | — | ✅ (not wired in UI yet) |
| POST | `/auth/reset-password` | — | ✅ (not wired in UI yet) |
| GET | `/auth/email/verify/{id}/{hash}` | Email verification link | ✅ |

**Register body (seller):** `first_name`, `last_name`, `email`, `password`, `role`, `business_name` (if seller)

---

## 3. Buyer — Cart, Checkout, Orders

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| GET | `/cart` | Cart page, Checkout (`cart.js`) | ✅ ⚠️ |
| POST | `/cart` | Add to cart (`cart.js`, product cards) | ✅ ⚠️ |
| PUT | `/cart/{productId}` | Update quantity (`cart.js`) | ✅ ⚠️ |
| DELETE | `/cart/{productId}` | Remove item (`cart.js`) | ✅ ⚠️ |
| POST | `/cart/sync` | Login merge / clear cart (`auth.js`, `cart.js`) | ✅ ⚠️ |
| POST | `/checkout/validate-coupon` | Cart coupon (`cart.js`) | ✅ ⚠️ |
| POST | `/checkout/cart` | Payment page place order (`payment.js`) | ✅ ⚠️ |
| GET | `/orders` | Orders page, Buyer dashboard | ✅ ⚠️ |
| GET | `/orders/{id}` | — | ✅ |
| GET | `/orders/{id}/tracking` | Tracking page | ✅ ⚠️ |
| GET | `/orders/{id}/invoice` | Orders → Invoice button | ✅ ⚠️ |
| POST | `/orders` | — | ✅ (checkout uses `/checkout/cart`) |

**Checkout body:** `shipping` (line1, city, postal_code, country_code), `payment_method`, `coupon_code?`, `card_last4?`

---

## 4. Buyer — Wishlist, Addresses, Notifications

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| GET | `/wishlist` | Wishlist page (`wishlist.js`) | ✅ ⚠️ |
| POST | `/wishlist` | Product / cards (`wishlist.js`) | ✅ ⚠️ |
| DELETE | `/wishlist/{productId}` | Wishlist remove (`wishlist.js`) | ✅ ⚠️ |
| GET | `/addresses` | Addresses page | ✅ ⚠️ |
| POST | `/addresses` | Add address form | ✅ ⚠️ |
| DELETE | `/addresses/{id}` | Address delete button | ✅ ⚠️ |
| GET | `/notifications` | Notifications page | ✅ ⚠️ |
| PATCH | `/notifications/{id}/read` | Mark one read | ✅ ⚠️ |
| POST | `/notifications/read-all` | Mark all read | ✅ ⚠️ |

---

## 5. Buyer — Reviews & Media

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| POST | `/reviews` | Product page review form | ✅ ⚠️ |
| POST | `/reviews/{id}/report` | — | ✅ (not wired in UI) |
| POST | `/media/upload` | Seller product image, Admin banner, Bid submit | ✅ ⚠️ |

**Media upload:** `multipart/form-data`, field `file`, optional `type=product`

---

## 6. Auction (Buyer / Bidder)

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| POST | `/auctions/{id}/bids` | Place bid (`auction.js`) | ✅ ⚠️ |
| GET | `/me/auction-bids` | Bid history page | ✅ ⚠️ |
| POST | `/auctions/payments/verify` | Bid payment verify page | ✅ ⚠️ |
| GET | `/auctions/payments/status` | Bid payment status | ✅ ⚠️ |
| GET | `/payments/{id}` | — | ✅ (not wired in UI) |

---

## 7. Seller Panel

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| GET | `/seller/analytics` | Seller dashboard (stats + `weekly_sales`) | ✅ ⚠️ |
| GET | `/seller/products` | Seller dashboard product table | ✅ ⚠️ |
| GET | `/seller/products/{id}` | Edit product modal | ✅ ⚠️ |
| POST | `/seller/products` | Add product (+ `brand_id` or `brand_name`) | ✅ ⚠️ |
| PUT | `/seller/products/{id}` | Edit product save | ✅ ⚠️ |
| DELETE | `/seller/products/{id}` | — | ✅ (not wired in UI) |
| GET | `/seller/orders` | Seller orders (`orders.html?view=seller`) | ✅ ⚠️ |
| GET | `/seller/auctions` | Bid seller dashboard | ✅ ⚠️ |
| POST | `/seller/auctions` | Bid submit page | ✅ ⚠️ |
| GET | `/seller/payouts/summary` | — | ✅ (not wired in UI yet) |

**Seller product create body:** `name`, `category_id`, `price`, `stock`, `description`, `images[]`, `brand_id` OR `brand_name`

---

## 8. Admin Panel (`/admin/*`, role: admin)

| Method | Endpoint | Used where | Status |
|--------|----------|------------|--------|
| GET | `/admin/dashboard` | Admin dashboard stats | ✅ ⚠️ |
| GET | `/admin/users` | Users tab | ✅ ⚠️ |
| PATCH | `/admin/users/{id}` | Enable / disable user | ✅ ⚠️ |
| GET | `/admin/sellers` | Sellers tab (pending + active) | ✅ ⚠️ |
| PATCH | `/admin/sellers/{id}/approve` | Approve seller | ✅ ⚠️ |
| PATCH | `/admin/sellers/{id}/reject` | Reject seller | ✅ ⚠️ |
| GET | `/admin/products` | Products tab | ✅ ⚠️ |
| PATCH | `/admin/products/{id}` | Feature / activate toggle | ✅ ⚠️ |
| DELETE | `/admin/products/{id}` | Delete product | ✅ ⚠️ |
| GET | `/admin/orders` | Orders tab | ✅ ⚠️ |
| PATCH | `/admin/orders/{id}/status` | Update order status | ✅ ⚠️ |
| GET/POST/PUT/DELETE | `/admin/banners` | Banners CRUD | ✅ ⚠️ |
| GET/POST/PUT/DELETE | `/admin/coupons` | Coupons CRUD | ✅ ⚠️ |
| GET | `/admin/reviews?status=pending` | Reviews moderation | ✅ ⚠️ |
| PATCH | `/admin/reviews/{id}/approve` | Approve review | ✅ ⚠️ |
| PATCH | `/admin/reviews/{id}/reject` | Reject review | ✅ ⚠️ |
| PATCH | `/admin/reviews/{id}/spam` | Mark spam | ✅ ⚠️ |
| DELETE | `/admin/reviews/{id}` | — | ✅ |
| GET | `/admin/contact-messages` | Messages tab | ✅ ⚠️ |
| PATCH | `/admin/contact-messages/{id}/read` | Mark message read | ✅ ⚠️ |
| GET | `/admin/newsletter-subscribers` | Subscribers tab | ✅ ⚠️ |
| DELETE | `/admin/newsletter-subscribers/{id}` | Remove subscriber | ✅ ⚠️ |
| GET | `/admin/settings` | Settings tab | ✅ ⚠️ |
| PUT | `/admin/settings` | Save site/seo/social settings | ✅ ⚠️ |

---

## 9. Optional APIs (frontend এখনো ব্যবহার করে না — দরকার হলে আপনি যোগ করুন)

| Suggested | Why |
|-----------|-----|
| `GET /products?search=&category=&brand=&min_price=&max_price=&sort=&page=` | Server-side search/filter (এখন সব product load করে client-side filter) |
| `PUT /addresses/{id}` | Address edit (এখন শুধু add + delete) |
| `GET /seller/payouts` + `POST /seller/payouts/request` | Seller payout UI |
| Forgot-password pages | `POST /auth/forgot-password`, `POST /auth/reset-password` (backend আছে, UI নেই) |

---

## 10. External APIs — আপনি manually configure করবেন

`.env` এ keys দিন; Laravel gateway already wired.

| Service | `.env` keys | Frontend / flow |
|---------|-------------|-----------------|
| **Stripe** | `STRIPE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Shop checkout `payment_method: card` |
| **SSLCommerz** | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `FRONTEND_URL` | Auction payment → `bid/payment-verify.html` |
| **PayPal** | `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` | Checkout PayPal option (live mode) |
| **SMTP / Mail** | `MAIL_*` | Registration verification, order emails |

`PAYMENT_MODE=sandbox` → keys ছাড়াই local test (sandbox responses).

---

## 11. Response format (সব Laravel API)

```json
{
  "success": true,
  "message": "OK",
  "data": { }
}
```

Error: `{ "success": false, "message": "...", "errors": null }`  
Auth header: `Authorization: Bearer {token}`

---

## 12. Test script

```powershell
powershell -File backend/test-panels.ps1
```

115+ panel tests + cart/checkout E2E (buyer, seller, admin).
