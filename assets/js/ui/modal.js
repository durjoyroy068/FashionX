class ModalManager {
  open(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      const focusable = overlay.querySelector("button, input, a");
      focusable?.focus();
    }
  }

  close(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  closeAll() {
    document.querySelectorAll(".modal-overlay.active").forEach((el) => {
      el.classList.remove("active");
      el.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "";
  }

  init() {
    document.querySelectorAll("[data-modal-open]").forEach((btn) => {
      btn.addEventListener("click", () => this.open(btn.dataset.modalOpen));
    });

    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const overlay = btn.closest(".modal-overlay");
        if (overlay) this.close(overlay.id);
      });
    });

    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.close(overlay.id);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeAll();
    });
  }
}

export const modal = new ModalManager();
export default modal;
