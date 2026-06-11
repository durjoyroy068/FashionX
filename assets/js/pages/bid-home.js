import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import { renderAuctionCard, initReveal, showSkeletonGrid } from "../components/render.js";
import auctionManager from "../modules/auction.js";

function paintBidHomeShell() {
  const main = document.getElementById("main-content") || document.querySelector(".page-main");
  main.innerHTML = `
    <section class="bid-hero"><div class="container">
      <p class="section-label">FashionX Bid</p>
      <h1>Live Luxury Auctions</h1>
      <p style="color:var(--color-text-muted);max-width:560px;margin:1.5rem 0 2rem">Bid on authenticated rare fashion, watches, and collectibles from verified sellers worldwide.</p>
      <div class="hero-actions"><a href="/bid/auction.html" class="btn btn-primary">Enter Live Auction</a><a href="/bid/submit.html" class="btn btn-outline">Submit Your Item</a></div>
    </div></section>
    <section class="section"><div class="container">
      <div class="section-header"><p class="section-label">Live Now</p><h2 class="section-title">Active Auctions</h2></div>
      <div class="bid-grid" id="live-auctions"></div>
    </div></section>
    <section class="section" style="background:var(--color-bg-elevated)"><div class="container promo-banner">
      <div class="promo-banner-content"><h2>Verified Authenticity</h2><p style="color:var(--color-text-muted);margin:1rem 0">Every auction item is inspected and authenticated by FashionX specialists.</p>
      <a href="history.html" class="btn btn-outline">View Bid History</a></div>
    </div></section>`;

  showSkeletonGrid(document.getElementById("live-auctions"), 3);
}

function startCountdowns(root) {
  root.querySelectorAll("[data-countdown]").forEach((el) => {
    const end = el.dataset.countdown;
    setInterval(() => {
      const t = auctionManager.getTimeRemaining(end);
      const textEl = el.querySelector(".countdown-text");
      if (textEl) {
        textEl.textContent = t.expired ? "Ended" : `${t.hours}h ${t.minutes}m ${t.seconds}s`;
      }
    }, 1000);
  });
}

async function hydrateBidHome() {
  const auctions = await dataService.getAuctions();
  const live = auctions.filter((a) => a.status === "live" || a.status === "active");

  const heroLink = document.querySelector(".bid-hero .btn-primary");
  if (heroLink && live[0]?.id) {
    heroLink.href = `/bid/auction.html?id=${live[0].id}`;
  }

  const grid = document.getElementById("live-auctions");
  if (!grid) return;

  grid.innerHTML = live.length
    ? live.map((a) => renderAuctionCard(a)).join("")
    : `<p style="color:var(--color-text-muted);grid-column:1/-1">No live auctions right now. Check back soon.</p>`;
  initReveal(grid);
  startCountdowns(grid);
}

registerPage("bid-home", () => {
  paintBidHomeShell();
  void hydrateBidHome();
});
