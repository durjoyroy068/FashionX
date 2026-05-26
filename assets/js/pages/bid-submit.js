import { registerPage } from "../core/registry.js";
import auth from "../modules/auth.js";
import { getPageMain } from "../utils/pageMain.js";
import { mapAuctionSubmitForm } from "../utils/formData.js";
import toast from "../ui/toast.js";
import { API_CONFIG } from "../config/constants.js";
import apiClient from "../api/client.js";
import uploadImage from "../utils/upload.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateImageFile(file) {
  if (!file) return "Please choose a product image";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Use JPEG, PNG, or WebP";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 5MB or smaller";
  return "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

registerPage("bid-submit", () => {
  const main = getPageMain();
  if (!main) return;

  const user = auth.getUser();
  const loginUrl = "../pages/login.html?redirect=" + encodeURIComponent(window.location.href);

  if (!auth.isLoggedIn()) {
    main.innerHTML = `
      <div class="container empty-state" style="padding:4rem 1rem">
        <h1>Sign In Required</h1>
        <p style="color:var(--color-text-muted);margin:1rem 0">Sign in with a seller account to submit an auction item.</p>
        <a href="${loginUrl}" class="btn btn-primary">Sign In</a>
      </div>`;
    return;
  }

  if (auth.isSellerPending()) {
    main.innerHTML = `
      <div class="container empty-state" style="padding:4rem 1rem">
        <h1>Seller Approval Required</h1>
        <p style="color:var(--color-text-muted);margin:1rem 0">Your seller application must be approved before listing auction items.</p>
        <a href="../pages/dashboard.html" class="btn btn-primary">Buyer Dashboard</a>
      </div>`;
    return;
  }

  if (user?.role !== "seller" && user?.role !== "admin") {
    main.innerHTML = `
      <div class="container empty-state" style="padding:4rem 1rem">
        <h1>Seller Access Only</h1>
        <p style="color:var(--color-text-muted);margin:1rem 0">Auction submissions are available to verified sellers.</p>
        <a href="${auth.getDashboardPath()}" class="btn btn-primary">Go to Dashboard</a>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div class="container page-hero"><h1>Submit Auction Item</h1>
      <p style="color:var(--color-text-muted);margin-top:0.5rem">List a product for FashionX Bid authentication and review</p></div>
    <div class="container" style="max-width:700px;padding-bottom:3rem">
      <form class="card" style="padding:2rem" id="submit-auction" enctype="multipart/form-data" novalidate>
        <div class="form-group image-upload-field">
          <label class="form-label" for="auction-image">Product Image</label>
          <input type="file" id="auction-image" name="image" class="image-upload-input"
            accept="image/jpeg,image/png,image/webp" required aria-describedby="image-hint image-error">
          <label for="auction-image" class="image-upload-trigger btn btn-outline btn-block" id="image-trigger">
            Choose Image
          </label>
          <p class="form-hint" id="image-hint">JPEG, PNG or WebP · Max 5MB · Required for auction listing</p>
          <div class="image-upload-preview" id="image-preview" hidden>
            <img id="preview-img" alt="Selected product preview">
            <p class="form-hint" id="image-file-name"></p>
            <button type="button" class="btn btn-ghost btn-sm" id="clear-image">Remove image</button>
          </div>
          <div class="form-error" id="image-error" role="alert"></div>
        </div>
        <div class="form-group"><label class="form-label" for="auction-title">Item Title</label>
          <input class="form-input" id="auction-title" name="title" required></div>
        <div class="form-group"><label class="form-label" for="auction-brand">Brand</label>
          <input class="form-input" id="auction-brand" name="brand" required></div>
        <div class="form-group"><label class="form-label" for="auction-description">Description</label>
          <textarea id="auction-description" name="description" rows="4" required class="form-textarea"></textarea></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label" for="auction-start">Starting Bid ($)</label>
            <input type="number" class="form-input" id="auction-start" name="startingBid" required min="100"></div>
          <div class="form-group"><label class="form-label" for="auction-reserve">Reserve Price ($)</label>
            <input type="number" class="form-input" id="auction-reserve" name="reserve" required></div>
        </div>
        <div class="form-group"><label class="form-label" for="auction-end">Auction End Date</label>
          <input type="datetime-local" class="form-input" id="auction-end" name="endTime" required></div>
        <button type="submit" class="btn btn-primary btn-block" id="auction-submit-btn">Submit for Review</button>
      </form>
    </div>`;

  const form = document.getElementById("submit-auction");
  const fileInput = document.getElementById("auction-image");
  const previewWrap = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const fileNameEl = document.getElementById("image-file-name");
  const imageError = document.getElementById("image-error");
  const imageTrigger = document.getElementById("image-trigger");
  let selectedImageMeta = null;

  const showPreview = (file, dataUrl) => {
    selectedImageMeta = { fileName: file.name, mimeType: file.type, size: file.size, dataUrl };
    previewImg.src = dataUrl;
    fileNameEl.textContent = file.name;
    previewWrap.hidden = false;
    imageTrigger.textContent = "Change Image";
    imageError.textContent = "";
  };

  const clearPreview = () => {
    selectedImageMeta = null;
    fileInput.value = "";
    previewImg.removeAttribute("src");
    previewWrap.hidden = true;
    fileNameEl.textContent = "";
    imageTrigger.textContent = "Choose Image";
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    const err = validateImageFile(file);
    if (err) {
      imageError.textContent = err;
      clearPreview();
      return;
    }
    try {
      showPreview(file, await readFileAsDataUrl(file));
    } catch {
      imageError.textContent = "Could not load image preview";
      clearPreview();
    }
  });

  document.getElementById("clear-image").addEventListener("click", () => {
    clearPreview();
    imageError.textContent = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = fileInput.files?.[0];
    const imageErr = validateImageFile(file);
    imageError.textContent = imageErr;
    if (imageErr) return;

    const btn = document.getElementById("auction-submit-btn");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    const fd = new FormData(form);
    const mapped = mapAuctionSubmitForm(fd, selectedImageMeta);

    if (!API_CONFIG.USE_MOCK) {
      let imageUrl = "";
      if (file) {
        const up = await uploadImage(file, "product");
        if (!up.success) {
          toast.error(up.error);
          btn.disabled = false;
          btn.textContent = "Submit for Review";
          return;
        }
        imageUrl = up.url;
      }
      const endTime = mapped.end_time;
      const res = await apiClient.post("/seller/auctions", {
        title: mapped.title,
        description: mapped.description,
        starting_bid: mapped.starting_bid,
        bid_increment: 50,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        image: imageUrl
      });
      if (res.success) {
        toast.success("Auction listed successfully");
        form.reset();
        clearPreview();
        setTimeout(() => { window.location.href = "../bid/index.html"; }, 800);
      } else {
        toast.error(res.error || "Submission failed");
      }
      btn.disabled = false;
      btn.textContent = "Submit for Review";
      return;
    }

    toast.success("Auction item saved locally (mock mode)");
    form.reset();
    clearPreview();
    btn.disabled = false;
    btn.textContent = "Submit for Review";
  });
});
