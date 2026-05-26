import { registerPage } from "../core/registry.js";
import auth from "../modules/auth.js";
import { API_CONFIG, ROLES } from "../config/constants.js";
import { getSafeRedirectUrl } from "../utils/safeRedirect.js";
import { getPageMain } from "../utils/pageMain.js";
import toast from "../ui/toast.js";

const page = document.body.dataset.page;

registerPage(page, () => {
  document.body.classList.add("auth-page");
  const main = getPageMain();
  if (!main) return;
  const isLogin = page === "login";

  main.innerHTML = `
    <div class="auth-visual" role="img" aria-label="Luxury fashion editorial photography">
      <div class="auth-visual-content">
        <p class="section-label">FashionX</p>
        <h2>Luxury Without Compromise</h2>
        <p>Authenticated collections from the world's finest houses.</p>
      </div>
    </div>
    <div class="auth-form-panel">
      <div class="auth-form-container">
        <h1>${isLogin ? "Welcome Back" : "Create Account"}</h1>
        <p>${isLogin ? "Sign in to your panel" : "Join the FashionX exclusive community"}</p>
        <form id="auth-form" novalidate>
          ${!isLogin ? `
          <div class="grid-2">
            <div class="form-group"><label class="form-label" for="first_name">First Name</label>
              <input class="form-input" id="first_name" name="first_name" required minlength="2"></div>
            <div class="form-group"><label class="form-label" for="last_name">Last Name</label>
              <input class="form-input" id="last_name" name="last_name" required minlength="2"></div>
          </div>
          <div class="form-group"><label class="form-label" for="role">Account Type</label>
            <select class="form-select" id="role" name="role" required>
              <option value="${ROLES.BUYER}">Buyer — Shop &amp; Bid</option>
              <option value="${ROLES.SELLER}">Seller — List &amp; Sell</option>
            </select></div>` : ""}
          <div class="form-group"><label class="form-label" for="email">Email</label>
            <input type="email" class="form-input" id="email" name="email" required autocomplete="email">
            <div class="form-error" id="email-error"></div></div>
          <div class="form-group password-toggle"><label class="form-label" for="password">Password</label>
            <input type="password" class="form-input" id="password" name="password" required minlength="8" autocomplete="${isLogin ? "current-password" : "new-password"}">
            <button type="button" class="toggle-btn" id="toggle-pw" aria-label="Toggle password visibility">👁</button>
            <div class="form-error" id="pw-error"></div>
            ${!isLogin ? '<p class="form-hint">Min 8 characters with uppercase, lowercase, and number</p>' : ""}
          </div>
          ${!isLogin ? `<div class="form-group password-toggle"><label class="form-label" for="confirm_password">Confirm Password</label>
            <input type="password" class="form-input" id="confirm_password" name="confirm_password" required>
            <button type="button" class="toggle-btn" id="toggle-confirm-pw" aria-label="Toggle confirm password visibility">👁</button>
            <div class="form-error" id="confirm-error"></div></div>` : ""}
          ${isLogin ? `<div class="checkbox-group auth-remember"><input type="checkbox" id="remember" name="remember"><label for="remember">Remember me</label></div>` : ""}
          <button type="submit" class="btn btn-primary btn-block" id="submit-btn">${isLogin ? "Sign In" : "Create Account"}</button>
        </form>
        <p class="auth-switch">
          ${isLogin ? `Don't have an account? <a href="register.html">Register</a>` : `Already a member? <a href="login.html">Sign In</a>`}
        </p>
        ${isLogin && API_CONFIG.USE_MOCK ? `<div class="auth-demo-hints">
          <p class="form-hint"><strong>Demo accounts</strong> (password: FashionX1!)</p>
          <p class="form-hint">Buyer: demo@fashionx.com</p>
          <p class="form-hint">Seller: seller@fashionx.com</p>
          <p class="form-hint">Admin: admin@fashionx.com</p>
        </div>` : ""}
      </div>
    </div>`;

  const togglePassword = (inputId) => {
    const input = document.getElementById(inputId);
    if (input) input.type = input.type === "password" ? "text" : "password";
  };
  document.getElementById("toggle-pw")?.addEventListener("click", () => togglePassword("password"));
  document.getElementById("toggle-confirm-pw")?.addEventListener("click", () => togglePassword("confirm_password"));

  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const password = fd.get("password");
    let valid = true;

    document.getElementById("email-error").textContent = auth.validateEmail(email) ? "" : "Invalid email address";
    if (!auth.validateEmail(email)) valid = false;

    if (!isLogin) {
      if (!auth.validatePassword(password)) {
        document.getElementById("pw-error").textContent = "Password does not meet requirements";
        valid = false;
      } else document.getElementById("pw-error").textContent = "";
      if (password !== fd.get("confirm_password")) {
        document.getElementById("confirm-error").textContent = "Passwords do not match";
        valid = false;
      } else document.getElementById("confirm-error").textContent = "";
    } else if (!password) {
      document.getElementById("pw-error").textContent = "Password is required";
      valid = false;
    } else {
      document.getElementById("pw-error").textContent = "";
    }

    if (!valid) return;

    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.textContent = "Please wait...";

    const result = isLogin
      ? await auth.login(email, password, fd.get("remember") === "on")
      : await auth.register({
          email,
          password,
          first_name: fd.get("first_name"),
          last_name: fd.get("last_name"),
          role: fd.get("role")
        });

    if (result.success) {
      if (!isLogin && auth.isSellerPending()) {
        toast.success("Account created. Seller application is pending admin approval.");
      } else {
        toast.success(isLogin ? "Welcome back" : "Account created");
      }
      const redirect = new URLSearchParams(location.search).get("redirect");
      const target = getSafeRedirectUrl(redirect, auth.getDashboardPath(result.user.role));
      if (window.__fxNavigate) {
        window.__fxNavigate(target, { replace: true });
      } else {
        window.location.replace(target);
      }
    } else {
      toast.error(result.message);
      btn.disabled = false;
      btn.textContent = isLogin ? "Sign In" : "Create Account";
    }
  });
});
