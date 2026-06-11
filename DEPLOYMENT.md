# FashionX — Deployment Guide

## Prerequisites

- PHP 8.2+
- MySQL 8.0+
- Composer
- A mail provider (Mailgun / SES / Resend)
- Stripe account (for payments)
- SSLCommerz account (for BDT payments, optional)

## Backend Setup

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.production.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Required .env Values for Production

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

DB_HOST=your-db-host
DB_DATABASE=fashionx
DB_USERNAME=fashionx_user
DB_PASSWORD=STRONG_PASSWORD_HERE

MAIL_MAILER=mailgun
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_SECRET=key-xxxx

STRIPE_SECRET_KEY=sk_live_xxxx
PAYMENT_MODE=production

ALLOWED_ORIGINS=https://yourdomain.com

SESSION_ENCRYPT=true
QUEUE_CONNECTION=database
```

## Frontend Deployment

In every HTML file (or your build template), update the config block before script tags:

```html
<script>
  window.__FASHIONX_API_URL__ = "https://yourdomain.com/api/v1";
  window.__FASHIONX_USE_MOCK__ = false;
</script>
```

Deploy frontend files to any static host (Cloudflare Pages, Vercel, Nginx).
Point your web server to serve `index.html` from the root.

## Queue Worker (Required for emails)

```bash
php artisan queue:work --daemon
```

Use Supervisor to keep the worker running in production.

## Redis (Recommended for production cache/queue)

```
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Health Check

Verify deployment: `GET /api/v1/health` should return `database: connected`.
