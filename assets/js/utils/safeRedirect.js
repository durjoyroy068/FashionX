/** Only allow same-origin redirects after login (backend-ready). */
export function getSafeRedirectUrl(redirectParam, fallbackUrl) {
  if (!redirectParam) return fallbackUrl;
  try {
    const target = new URL(redirectParam, window.location.origin);
    if (target.origin === window.location.origin) {
      return target.href;
    }
  } catch {
    /* invalid URL */
  }
  return fallbackUrl;
}
