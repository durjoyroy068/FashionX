import auth from "../modules/auth.js";
import { ROLES } from "../config/constants.js";

export function requireAuth() {
  if (!auth.isLoggedIn()) {
    auth.redirectToLogin();
    return false;
  }
  return true;
}

export function requireRole(...roles) {
  if (!requireAuth()) return false;
  const user = auth.getUser();
  const userRole = (user?.role || "").toLowerCase();
  if (!roles.map((r) => r.toLowerCase()).includes(userRole)) {
    window.location.href = auth.getDashboardPath(user?.role);
    return false;
  }
  return true;
}

export function requireBuyer() {
  return requireRole(ROLES.BUYER, ROLES.ADMIN);
}

export function requireSeller() {
  return requireRole(ROLES.SELLER, ROLES.ADMIN);
}

export function requireAdmin() {
  return requireRole(ROLES.ADMIN);
}
