# FashionX — Luxury Fashion Marketplace

Production-quality frontend-only luxury e-commerce marketplace (HTML, CSS, vanilla JavaScript).

## Quick Start

```bash
npx serve .
# or: python -m http.server 3456
```

Open via **[http://localhost:3000](http://localhost:3000)** (not `file://`) so JSON data loads correctly.

## Role Panels (3)

| Panel            | Page                          | Role     |
| ---------------- | ----------------------------- | -------- |
| **Buyer Panel**  | `pages/dashboard.html`        | `buyer`  |
| **Seller Panel** | `pages/seller-dashboard.html` | `seller` |
| **Admin Panel**  | `pages/admin-dashboard.html`  | `admin`  |

Auction seller tools: `bid/seller-dashboard.html` (seller/admin only)

## Demo Accounts (password: `FashionX1!`)

| Email                                             | Role   |
| ------------------------------------------------- | ------ |
| [demo@fashionx.com](mailto:demo@fashionx.com)     | Buyer  |
| [seller@fashionx.com](mailto:seller@fashionx.com) | Seller |
| [admin@fashionx.com](mailto:admin@fashionx.com)   | Admin  |

## Coupons

`LUXURY10` · `FASHIONX20` · `VIP15`

## Backend Integration

1. Set `API_CONFIG.USE_MOCK = false` in `assets/js/config/constants.js`
2. Point `API_CONFIG.BASE_URL` to your API (e.g. `/api/v1`)
3. Route all requests through `assets/js/api/client.js`
4. Replace `dataService` fetch with `apiClient.get('/products')` etc.
5. Auth: use JWT from login response; store in `session` key only
6. Forms use **snake_case** API field names (`first_name`, `postal_code`, `payment_method`)
7. Orders created via `cart.toOrderPayload()` — ready for `POST /orders`

### Storage keys (prefix `fashionx`\_)

See `assets/js/config/constants.js` for the full map.

**Never persist card numbers** — checkout stores only `payment_method`, `card_last4`, `payment_intent_id`.

## Project Structure

```
FashionX/
├── assets/js/api/client.js    # REST client stub
├── assets/js/config/constants.js
├── assets/data/*.json         # Mock catalog (swap for API)
├── pages/                     # Shop + panels
└── bid/                       # Auction system
```

Backend:
cd "C:\Users\DELL\Downloads\FashionX\backend"
composer install
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000

frontend :
cd "C:\Users\DELL\Downloads\FashionX"
python -m http.server 3460 --bind 127.0.0.1

Demo logins
Admin: admin@fashionx.com / FashionX1!
Seller: seller@fashionx.com / FashionX1!
Buyer: demo@fashionx.com / FashionX1!
