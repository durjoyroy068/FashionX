import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import { renderProductGrid, showSkeletonGrid } from "../components/render.js";

const PER_PAGE = 8;
let currentPage = 1;
let allProducts = [];

function paintShopShell() {
  (document.getElementById("main-content") || document.querySelector(".page-main")).innerHTML = `
    <div class="container page-hero"><h1>Luxury Collection</h1><p>Curated premium fashion from verified brands</p></div>
    <div class="container shop-layout" style="padding-bottom:3rem">
      <button class="btn btn-outline filter-toggle" id="filter-toggle">Filters</button>
      <aside class="filter-sidebar" id="filter-sidebar">
        <form id="filter-form">
          <div class="filter-group"><h4 class="filter-title">Categories</h4><div id="filter-categories"></div></div>
          <div class="filter-group"><h4 class="filter-title">Brand</h4><div id="filter-brands"></div></div>
          <div class="filter-group"><h4 class="filter-title">Price Range</h4>
            <div class="price-range"><input type="number" name="minPrice" placeholder="Min" class="form-input"><span>—</span><input type="number" name="maxPrice" placeholder="Max" class="form-input"></div>
          </div>
          <div class="filter-group"><label class="filter-option"><input type="checkbox" name="instock"><span>In Stock Only</span></label></div>
          <button type="button" class="btn btn-ghost btn-block" id="clear-filters">Clear All</button>
        </form>
      </aside>
      <div>
        <div class="shop-toolbar">
          <span class="shop-results-count" id="results-count">Loading...</span>
          <select class="sort-select" id="sort-select" aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
        <div class="grid-4" id="product-grid"></div>
        <div style="text-align:center"><button class="btn btn-outline" id="load-more">Load More</button></div>
      </div>
    </div>`;
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get("category") || "",
    brand: params.get("brand") || "",
    badge: params.get("badge") || "",
    sort: params.get("sort") || "featured",
    minPrice: params.get("min") ? Number(params.get("min")) : null,
    maxPrice: params.get("max") ? Number(params.get("max")) : null,
    inStock: params.get("instock") === "1"
  };
}

function bindShopEvents(filters) {
  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    filters.sort = e.target.value;
    reload(filters);
  });

  document.getElementById("filter-form")?.addEventListener("change", () => applyFilters(filters));
  document.getElementById("filter-toggle")?.addEventListener("click", () => {
    document.getElementById("filter-sidebar")?.classList.toggle("mobile-open");
  });

  document.getElementById("load-more")?.addEventListener("click", () => {
    currentPage++;
    renderPage(true);
  });

  document.getElementById("clear-filters")?.addEventListener("click", () => {
    window.location.href = "shop.html";
  });
}

async function hydrateShop() {
  const filters = readFiltersFromUrl();
  const grid = document.getElementById("product-grid");
  const sortEl = document.getElementById("sort-select");
  if (sortEl && filters.sort) sortEl.value = filters.sort;

  const cachedCategories = dataService.peekCategories();
  const cachedBrands = dataService.peekBrands();
  if (cachedCategories?.length) {
    populateFilters(cachedCategories, cachedBrands || [], filters);
  }

  if (!dataService.peekProducts()?.length) {
    showSkeletonGrid(grid);
  }

  const [categories, brands, products] = await Promise.all([
    dataService.getCategories(),
    dataService.getBrands(),
    dataService.searchProducts("", filters)
  ]);

  populateFilters(categories, brands, filters);
  allProducts = products;
  currentPage = 1;
  renderPage();
  bindShopEvents(filters);
}

registerPage("shop", () => {
  paintShopShell();
  void hydrateShop();
});

async function reload(filters) {
  allProducts = await dataService.searchProducts("", filters);
  currentPage = 1;
  renderPage();
}

function applyFilters(filters) {
  const form = document.getElementById("filter-form");
  const fd = new FormData(form);
  const cats = fd.getAll("category");
  filters.category = cats.length ? cats[0] : "";
  filters.brand = fd.get("brand") || "";
  filters.minPrice = fd.get("minPrice") ? Number(fd.get("minPrice")) : null;
  filters.maxPrice = fd.get("maxPrice") ? Number(fd.get("maxPrice")) : null;
  filters.inStock = fd.get("instock") === "on";
  reload(filters);
}

function populateFilters(categories, brands, active) {
  const catContainer = document.getElementById("filter-categories");
  const brandContainer = document.getElementById("filter-brands");
  if (catContainer) {
    catContainer.innerHTML = categories
      .map(
        (c) => `
      <label class="filter-option">
        <input type="checkbox" name="category" value="${c.slug}" ${active.category === c.slug ? "checked" : ""}>
        <span>${c.name}</span>
      </label>`
      )
      .join("");
  }
  if (brandContainer) {
    brandContainer.innerHTML = brands
      .map(
        (b) => `
      <label class="filter-option">
        <input type="radio" name="brand" value="${b.id}" ${active.brand === b.id ? "checked" : ""}>
        <span>${b.name}</span>
      </label>`
      )
      .join("");
  }
}

function renderPage(append = false) {
  const end = currentPage * PER_PAGE;
  const slice = allProducts.slice(0, end);
  const grid = document.getElementById("product-grid");
  const countEl = document.getElementById("results-count");
  const loadMore = document.getElementById("load-more");

  if (countEl) countEl.textContent = `${allProducts.length} products`;
  renderProductGrid(slice, grid, { basePath: ".." });
  if (loadMore) loadMore.style.display = end >= allProducts.length ? "none" : "inline-flex";
}
