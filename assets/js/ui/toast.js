class ToastManager {
  constructor() {
    this.container = null;
  }

  _ensureContainer() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      this.container.setAttribute("role", "alert");
      this.container.setAttribute("aria-live", "polite");
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message, type = "info", duration = 4000) {
    const container = this._ensureContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✕" : "◆"}</span>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(msg) { this.show(msg, "success"); }
  error(msg) { this.show(msg, "error"); }
  info(msg) { this.show(msg, "info"); }
}

export const toast = new ToastManager();
export default toast;
