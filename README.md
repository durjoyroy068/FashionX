# FashionX — Luxury Fashion Marketplace

Decoupled SPA frontend (vanilla HTML/CSS/JS) + Laravel 11 REST API + MySQL.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for production setup.

## Local Development

### 1. Database (XAMPP)

Start **MySQL** in XAMPP. Create database `fashionx` (or use existing).

### 2. Backend

```powershell
cd backend
composer install
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

In a second terminal, run the queue worker for emails:

```powershell
cd backend
php artisan queue:work
```

### 3. Frontend

```powershell
cd FashionX
python -m http.server 3460 --bind 127.0.0.1
```

| Service    | URL                                              |
| ---------- | ------------------------------------------------ |
| Storefront | http://127.0.0.1:3460                            |
| Admin      | http://127.0.0.1:3460/pages/admin-dashboard.html |
| API        | http://127.0.0.1:8000/api/v1                     |
| Health     | http://127.0.0.1:8000/api/v1/health              |

## Environment Configuration

API settings are injected in each HTML file (change once per environment):

```html
<script>
  window.__FASHIONX_API_URL__ = "http://127.0.0.1:8000/api/v1";
  window.__FASHIONX_USE_MOCK__ = false;
</script>
```

Fallback defaults live in `assets/js/config/constants.js`.

### Key backend `.env` variables

| Variable                                            | Purpose                                    |
| --------------------------------------------------- | ------------------------------------------ |
| `APP_DEBUG`                                         | `false` in production                      |
| `DB_*`                                              | MySQL connection                           |
| `ALLOWED_ORIGINS`                                   | CORS origins (comma-separated)             |
| `PAYMENT_MODE`                                      | `sandbox` or `production`                  |
| `STRIPE_SECRET_KEY`                                 | Stripe live/test secret                    |
| `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD` | BDT payments                               |
| `MAIL_*`                                            | SMTP / Mailgun for verification emails     |
| `QUEUE_CONNECTION`                                  | `database` (local) or `redis` (production) |
| `FRONTEND_URL`                                      | Used for payment return URLs               |

## Demo Accounts (API mode — seeded in MySQL)

Password for all: `FashionX1!`

| Email               | Role   |
| ------------------- | ------ |
| buyer@fashionx.com  | Buyer  |
| demo@fashionx.com   | Buyer  |
| seller@fashionx.com | Seller |
| admin@fashionx.com  | Admin  |

These accounts exist in the **Laravel database** when `USE_MOCK` is `false`.
Mock-mode demo logins in `auth.js` only apply when `USE_MOCK` is `true`.

## Role Panels

| Panel          | Page                          |
| -------------- | ----------------------------- |
| Buyer          | `pages/dashboard.html`        |
| Seller         | `pages/seller-dashboard.html` |
| Admin          | `pages/admin-dashboard.html`  |
| Auction seller | `bid/seller-dashboard.html`   |

## Architecture

- Frontend calls REST API at `/api/v1` via `assets/js/api/client.js`
- Auth: Laravel Sanctum token stored in `fashionx_session` (localStorage)
- Payments: Stripe + SSLCommerz (sandbox without keys; real keys in production)
- Auctions: 5-second polling for live bids (no WebSocket)

## Known Limitations

- Real-time auction updates use **5s HTTP polling**, not WebSockets
- Seller payouts are summarized only; manual payout processing
- Reviews require a **delivered** order for the product
- `composer require stripe/stripe-php` needed for live Stripe charges

### Manual external API setup (production)

These are **third-party credentials** you configure in `backend/.env` — the Laravel routes already exist:

| Service | `.env` keys | Used for |
| ------- | ----------- | -------- |
| **SSLCommerz** | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_RETURN_URL` (or `FRONTEND_URL`) | Auction payment return → `bid/payment-verify.html`; server validates via SSLCommerz Validation API when `val_id` is present |
| **Stripe** | `STRIPE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Shop checkout card payments (live mode) |
| **PayPal** | `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_RETURN_URL` | Checkout PayPal option (live mode) |

**Auction payment endpoints (already in API — run `php artisan migrate`):**

- `POST /api/v1/auctions/payments/verify` — manual ref + amount, or SSLCommerz callback payload
- `GET /api/v1/auctions/payments/status?auction_id=auc_001` — check if user paid

**Seller analytics** — no external API; `GET /api/v1/seller/analytics` now includes `weekly_sales` (last 7 days).

**Checkout cards** — Amex 15-digit + Luhn validation is frontend-only; no API keys needed.

After adding SSLCommerz keys, set `PAYMENT_MODE=production` and point `FRONTEND_URL` to your live frontend (e.g. `http://127.0.0.1:3460`).

## Coupons (seeded)

`LUXURY10` · `FASHIONX20` · `VIP15`

Run manually (every session)
Terminal 1 — API
cd C:\Users\DELL\Downloads\FashionX\backend
php artisan serve --host=127.0.0.1 --port=8000
Terminal 2 — Queue worker (emails, etc.)
cd C:\Users\DELL\Downloads\FashionX\backend
php artisan queue:work
Terminal 3 — Frontend
cd C:\Users\DELL\Downloads\FashionX
python -m http.server 3460 --bind 127.0.0.1
