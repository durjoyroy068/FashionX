# FashionX Security Guide

This document maps common web attack categories to what FashionX implements, what you must configure in production, and how to verify defenses.

## Quick verification

```powershell
# Terminal 1 — API
cd backend
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2 — security smoke tests
powershell -File backend/test-security.ps1

# Full functional regression
powershell -File backend/test-panels.ps1
```

---

## Attack coverage matrix

| Category | Attack | Status | Implementation |
|----------|--------|--------|----------------|
| **1. Injection** | SQL Injection | ✅ Protected | Eloquent / parameterized queries only; no raw user input in SQL |
| | NoSQL Injection | N/A | MySQL backend |
| | Command Injection | ✅ Protected | No shell execution from user input |
| | LDAP / XML Injection | N/A | Not used |
| **2. Cross-Site** | XSS (Stored/Reflected/DOM) | ⚠️ Hardened | `escape.js` + output encoding in cards, search, toasts; audit remaining `innerHTML` |
| | CSRF | ✅ Low risk | Bearer token API (not cookie-auth); enable Sanctum CSRF if switching to cookies |
| **3. Authentication** | Brute Force | ✅ Protected | Login throttle (5 fails / 15 min per email+IP); route throttles on auth |
| | Credential Stuffing | ⚠️ Mitigated | Strong password rules; monitor failed logins |
| | Session Hijacking | ⚠️ Mitigated | Sanctum token expiry (7 days default); logout revokes token |
| | Session Fixation | ✅ Protected | New token issued on login; old tokens deleted |
| **4. Access Control** | Broken Access Control | ✅ Protected | `auth:sanctum` + `role` middleware; user-scoped order/cart queries |
| | Privilege Escalation | ✅ Protected | Register always `customer`; `role`/`is_active` not mass-assignable |
| **5. File / Upload** | Malicious Upload | ✅ Hardened | MIME via `finfo`, `getimagesize`, extension from MIME, 5MB cap |
| | LFI / RFI / Path Traversal | ✅ Protected | UUID filenames; no user-controlled paths |
| **6. Network** | MITM / SSL Stripping | ⚠️ Deploy | **You must** use HTTPS + HSTS in production (`SecurityHeaders` middleware) |
| | DNS / ARP Spoofing | ⚠️ Infra | Use trusted DNS, VPN, certificate pinning for mobile |
| **7. DoS** | HTTP Flood / Slowloris | ⚠️ Partial | API throttle 120/min; route throttles; use Cloudflare/nginx rate limits |
| **8. Logic** | Business Logic Abuse | ⚠️ Review | Checkout validates stock; auction bids validated server-side |
| | Parameter Tampering | ✅ Protected | Server-side price/stock from DB, not client |
| **9. Disclosure** | Error Leaks | ✅ Hardened | Production API errors generic; health no longer exposes `env` |
| | Directory Listing | ⚠️ Server | Disable in nginx/Apache config |
| **10. API** | Broken Auth | ✅ Protected | Sanctum on protected routes |
| | Mass Assignment | ✅ Hardened | User `role`/`is_active` via `forceFill` admin-only |
| | Webhook Forgery | ✅ Hardened | Stripe signature verify; SSLCommerz `val_id` validation |
| | Rate Limit Abuse | ✅ Protected | Global + per-route throttles |
| **11. Malware** | Web Shell Upload | ✅ Mitigated | Images only; validated MIME; store on `public` disk (no PHP execution) |
| **12. Advanced** | Clickjacking | ✅ Protected | `X-Frame-Options: DENY` |
| | Host Header Injection | ⚠️ Deploy | Set `APP_URL` correctly; configure trusted proxies |
| | SSRF / XXE | N/A | No user-controlled server-side HTTP/XML parsing |

**Legend:** ✅ Implemented | ⚠️ Requires deployment / ongoing monitoring | N/A Not applicable

---

## Production checklist

### Environment (`.env`)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com

SESSION_ENCRYPT=true
SANCTUM_TOKEN_EXPIRATION=10080
PAYMENT_MODE=production

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SSLCOMMERZ_STORE_ID=...
SSLCOMMERZ_STORE_PASSWORD=...
```

### Web server (nginx example)

```nginx
# Frontend static files
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://api.yourdomain.com; frame-ancestors 'none';" always;

# Laravel public — block PHP execution in storage
location ^~ /storage/ {
    location ~ \.php$ { deny all; }
}
```

### Database

- Use least-privilege DB user (no `SUPER`, no `FILE`)
- Regular backups; encrypt backups at rest

### Payments

- **Never** use `PAYMENT_MODE=sandbox` in production
- Configure `STRIPE_WEBHOOK_SECRET` and verify signatures
- SSLCommerz webhooks must include `val_id` for server-side validation
- Manual auction payment verification is **disabled** outside local/testing

---

## Frontend security notes

1. **XSS** — Use `escapeHtml()` / `escapeAttr()` from `assets/js/utils/escape.js` for any API data in HTML.
2. **Tokens** — Bearer tokens in `localStorage` are XSS-sensitive; CSP + escaping reduces risk. For maximum security, migrate to httpOnly cookie auth (Sanctum SPA mode).
3. **Mock mode** — Set `window.__FASHIONX_USE_MOCK__ = false` in all production HTML files.
4. **Demo credentials** — Remove demo account hints from login page before go-live.

---

## Reporting vulnerabilities

Email security issues to your operations contact. Do not disclose publicly until patched.

---

## Files changed for security hardening

| Area | Files |
|------|-------|
| API errors | `backend/app/Support/ApiMessage.php`, `bootstrap/app.php` |
| Headers | `backend/app/Http/Middleware/SecurityHeaders.php` |
| Payments | `PaymentController`, `PaymentManager`, `*Gateway.php` |
| Auth | `AuthController.php` (login lockout), `config/sanctum.php` |
| Uploads | `MediaUploadService.php` |
| Mass assignment | `User.php`, admin controllers |
| XSS | `assets/js/utils/escape.js`, `render.js`, `toast.js`, `static-pages.js` |
| Tests | `backend/test-security.ps1` |
