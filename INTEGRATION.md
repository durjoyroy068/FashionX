# FashionX — Full Stack Integration Guide

## Architecture

```
┌─────────────────┐     REST API (JSON)      ┌──────────────────┐
│  Frontend       │ ◄──────────────────────► │  Laravel API     │
│  (port 3456)    │   Bearer Sanctum token   │  (port 8000)     │
│  Static HTML/JS │                          │  backend/        │
└─────────────────┘                          └────────┬─────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │  MySQL (XAMPP)   │
                                           │  database:       │
                                           │  fashionx        │
                                           └──────────────────┘
```

## Start everything

1. **XAMPP:** Start MySQL (and Apache optional).
2. **Backend:**
   ```powershell
   cd backend
   php artisan serve
   ```
3. **Frontend:**
   ```powershell
   cd FashionX
   python -m http.server 3456
   ```

## URLs

| App | URL |
|-----|-----|
| Storefront | http://127.0.0.1:3456 |
| Admin Panel | http://127.0.0.1:3456/pages/admin-dashboard.html |
| API | http://127.0.0.1:8000/api/v1 |

## Admin controls storefront

| Admin section | API | Storefront effect |
|---------------|-----|-------------------|
| Banners | `POST/DELETE /admin/banners` | Homepage hero & promo (`GET /banners`) |
| Settings | `PUT /admin/settings` | Site name, contact, SEO (`GET /settings/public`) |
| Coupons | `POST /admin/coupons` | Checkout discount validation |
| Products | `PATCH /admin/products/{id}` | Featured, active, stock |
| Reviews | `PATCH approve/reject` | Product page reviews |
| Orders | `PATCH status` | Buyer notifications & tracking |
| Contact inbox | `GET /admin/contact-messages` | Support form monitoring |
| Newsletter | `GET /admin/newsletter-subscribers` | Marketing audience control |

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fashionx.com | FashionX1! |
| Buyer | demo@fashionx.com | FashionX1! |
| Seller | seller@fashionx.com | FashionX1! |

## Connected frontend modules

- **Auth** → login, register, profile, session sync
- **Cart / Wishlist** → API when logged in; merges guest cart on login
- **Checkout / Payment** → `POST /checkout/cart`
- **Orders** → `GET /orders`, invoice
- **Catalog** → products, brands, categories, sellers
- **Auctions** → list, detail, live bids
- **Reviews** → load + submit (moderated by admin)
- **Admin panel** → full CRUD for platform control

## Additional live integrations

- `POST /contact` receives the storefront contact form and stores messages in `contact_messages`.
- `POST /newsletter/subscribe` stores/updates subscribers in `newsletter_subscribers`.
- `GET /auctions/my-bids` powers the bid-history page for logged-in users.

## Images (Laravel storage)

Uploaded files live under `backend/storage/app/public`. Serve them with:

```powershell
cd backend
php artisan storage:link
```

The storefront runs on a different port than the API. Frontend helpers rewrite `/storage/...` URLs to `http://127.0.0.1:8000` via `resolveStorageUrl()` in `assets/js/utils/media.js`. Uploads use `POST /media/upload` with types: `product`, `banner` (admin), `avatar`, `seller`.

## Seller registration flow

1. User registers with role **seller** → stays `customer` until approved; API sets `seller_pending: true`.
2. Admin → Sellers → Approve (`PATCH /admin/sellers/{user_id}/approve`) or Reject (`PATCH .../reject`).
3. After approval, seller can use `POST /seller/products` and `POST /seller/auctions` (middleware: `seller.approved`).

Category/brand IDs from the API use prefixed form (`cat_001`, `br_001`); the backend normalizes them to numeric IDs.

## Config

`assets/js/config/constants.js`:

```js
BASE_URL: "http://127.0.0.1:8000/api/v1",
USE_MOCK: false
```

Set `USE_MOCK: true` only for offline demo without Laravel.
