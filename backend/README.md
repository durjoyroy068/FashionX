# FashionX Laravel API

Production REST API for the FashionX multi-vendor luxury marketplace.

## Requirements

- PHP 8.2+ (`pdo_mysql`, `mbstring`, `openssl`, `zip`)
- Composer
- MySQL (XAMPP)
- Mail driver (log or SMTP for password reset / verification)

## Setup (XAMPP)

1. Start **Apache** + **MySQL** in XAMPP.
2. Create database `fashionx` in phpMyAdmin.
3. Configure `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fashionx
DB_USERNAME=root
DB_PASSWORD=

APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:3456

MAIL_MAILER=log
# Or SMTP for real emails:
# MAIL_MAILER=smtp
# MAIL_HOST=smtp.mailtrap.io
# MAIL_PORT=2525
# MAIL_USERNAME=
# MAIL_PASSWORD=

PAYMENT_MODE=sandbox
STRIPE_KEY=
STRIPE_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
```

4. Install & migrate:

```powershell
cd backend
php ../composer.phar install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

5. Frontend:

```powershell
cd ..
python -m http.server 3456
```

Open http://127.0.0.1:3456 — `assets/js/config/constants.js` should have `USE_MOCK: false`.

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Buyer | demo@fashionx.com | FashionX1! |
| Buyer | buyer@fashionx.com | FashionX1! |
| Buyer (alt) | demo@fashionx.com | FashionX1! |
| Seller | seller@fashionx.com | FashionX1! |
| Admin | admin@fashionx.com | FashionX1! |

## API overview

### Auth
- `POST /auth/register`, `/auth/login`, `/auth/logout`
- `POST /auth/forgot-password`, `/auth/reset-password`
- `GET /auth/email/verify/{id}/{hash}` (signed)
- `POST /auth/email/resend` (authenticated)
- `GET /auth/me`, `PUT /auth/profile`

### Commerce
- `GET/POST /cart`, `POST /cart/sync`, `PUT/DELETE /cart/{productId}`
- `POST /checkout/cart` — atomic checkout from DB cart
- `POST /checkout/validate-coupon`
- `GET/POST /orders`, `GET /orders/{id}/invoice`
- `GET/POST /wishlist`

### Auctions
- `GET /auctions`, `GET /auctions/{id}/bids`
- `POST /auctions/{id}/bids` (authenticated)

### Payments
- `GET /payments/{id}`
- `POST /payments/webhook/{provider}` — stripe, paypal, sslcommerz

### Media
- `POST /media/upload` — multipart `file` + `type` (product|banner|avatar|seller)

### Admin Panel (frontend)
Open **http://127.0.0.1:3456/pages/admin-dashboard.html** as `admin@fashionx.com`.

Sections: Dashboard, Users, Sellers, Products, Orders, Banners, Coupons, Reviews, Settings — all wired to `/api/v1/admin/*`.

### Admin API (`role:admin`)
- `GET /admin/dashboard`, `/admin/users`, `PATCH /admin/users/{id}`
- `GET /admin/sellers`, `PATCH /admin/sellers/{id}/approve`
- `GET /admin/orders`, `PATCH /admin/orders/{id}/status`
- `GET/PATCH/DELETE /admin/products`
- `apiResource /admin/banners`, `/admin/coupons`
- `GET/PUT /admin/settings`
- `GET /admin/reviews`, `PATCH approve/reject/spam`, `DELETE`

### Customer APIs
- `GET/POST /addresses`, `DELETE /addresses/{id}`
- `GET /notifications`, `PATCH read`, `POST read-all`
- `GET /sellers`, `/sellers/{id}`

### Seller (`role:seller`)
- `apiResource /seller/products`, `/seller/auctions`
- `GET /seller/orders`, `/seller/analytics`

## Architecture

```
app/
  Http/Controllers/Api/V1/   # REST controllers
  Services/                  # Checkout, Payment, Auction, Media, Coupon
  Models/                    # Eloquent + relationships
  Notifications/             # Email verification & password reset
```

- **Sanctum** token auth
- **Spatie Permission** roles
- **DB transactions** for checkout & bids
- **Rate limiting** 120 req/min per IP/user
- **Activity logs** for orders and bids

## Payment gateways

Modular adapters in `app/Services/Payment/`:
- `StripeGateway` (also used for `card`)
- `PayPalGateway`
- `SSLCommerzGateway`

Sandbox mode completes payments locally when API keys are empty. Add real keys in `.env` for production.

## Scheduled tasks (optional)

Finalize ended auctions:

```php
// routes/console.php
Schedule::call(fn () => app(\App\Services\AuctionService::class)->finalizeEndedAuctions())->everyMinute();
```
