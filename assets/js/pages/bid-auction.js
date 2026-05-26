import { registerPage } from "../core/registry.js";
import dataService from "../api/dataService.js";
import auctionManager from "../modules/auction.js";
import { formatPrice } from "../utils/format.js";
import { getAuctionImage, imageFallbackAttr } from "../utils/media.js";
import toast from "../ui/toast.js";
import apiClient from "../api/client.js";
import { API_CONFIG } from "../config/constants.js";

registerPage("bid-auction", async () => {
  const id = new URLSearchParams(location.search).get("id");
  let auction = await dataService.getAuctionById(id);
  let apiBids = [];
  if (!API_CONFIG.USE_MOCK) {
    const detail = await apiClient.get(`/auctions/${id}`);
    if (detail.success) {
      auction = { ...auction, ...detail.data, currentBid: detail.data.currentBid ?? auction?.currentBid };
      apiBids = detail.data.bids || [];
    }
    if (!apiBids.length) {
      const bidsRes = await apiClient.get(`/auctions/${id}/bids`);
      if (bidsRes.success) apiBids = bidsRes.data || [];
    }
    auctionManager.setBidsFromApi(id, apiBids);
  }
  const main = document.getElementById("main-content") || document.querySelector(".page-main");

  if (!auction) {
    main.innerHTML = `<div class="container error-page"><h1>Auction Not Found</h1><a href="index.html" class="btn btn-primary">Back to Bid</a></div>`;
    return;
  }

  const remaining = auctionManager.getTimeRemaining(auction.endTime);
  if (remaining.expired || auction.status === "expired") {
    window.location.href = `expired.html?id=${id}`;
    return;
  }

  const apiHigh = apiBids.length ? apiBids.reduce((a, b) => (b.amount > a.amount ? b : a), apiBids[0]) : null;
  const highest = apiHigh
    ? { amount: apiHigh.amount, bidder: apiHigh.bidder }
    : auctionManager.getHighestBid(id, auction.currentBid || auction.startingBid);

  main.innerHTML = `
    <div class="container" style="padding:2rem 0">
      <nav class="breadcrumb"><a href="index.html">FashionX Bid</a><span>/</span><span aria-current="page">${auction.title}</span></nav>
      <div class="auction-detail-grid">
        <div>
          <img src="${getAuctionImage(auction)}" alt="${auction.title}" class="auction-detail-image" ${imageFallbackAttr()}>
          <p style="color:var(--color-text-muted);margin-top:1.5rem;line-height:1.8">${auction.description}</p>
          <div class="auction-progress" style="margin-top:2rem"><div class="auction-progress-bar" id="auction-progress" style="width:60%"></div></div>
        </div>
        <div class="bid-panel">
          <span class="live-pulse">Live Auction</span>
          <h1 style="font-size:1.5rem;margin:1rem 0">${auction.title}</h1>
          <p class="product-card__brand">${auction.brand}</p>
          <div class="current-bid-display" id="bid-display">
            <p style="font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-text-muted)">Current Highest Bid</p>
            <p class="amount" id="current-bid">${formatPrice(highest.amount)}</p>
            <p id="high-bidder" style="color:var(--color-text-muted);margin-top:0.5rem">${highest.bidder ? "Leader: " + highest.bidder : "No bids yet"}</p>
          </div>
          <div class="auction-countdown" id="countdown"></div>
          <p style="text-align:center;margin:1rem 0;color:var(--color-text-muted)"><span id="bidder-count">${auctionManager.getBidderCount(id)}</span> bidders · Min increment ${formatPrice(auction.bidIncrement)}</p>
          <div class="bid-input-group">
            <input type="number" id="bid-amount" value="${highest.amount + auction.bidIncrement}" min="${highest.amount + auction.bidIncrement}" step="${auction.bidIncrement}">
            <button class="btn btn-primary" id="place-bid">Place Bid</button>
          </div>
          <button class="btn btn-outline btn-block" id="watch-auction" style="margin-top:0.5rem">${auctionManager.isWatched(id) ? "Watching" : "Watch Auction"}</button>
        </div>
      </div>
      <section style="margin-top:3rem">
        <h2 class="section-title">Live Leaderboard</h2>
        <div class="card table-responsive">
          <table class="bid-leaderboard data-table" id="leaderboard"><tbody></tbody></table>
        </div>
      </section>
      <section style="margin-top:2rem"><h3>Bid History</h3><div id="bid-history" class="card" style="padding:1rem;max-height:300px;overflow-y:auto"></div></section>
    </div>
    <div class="modal-overlay" id="win-modal" aria-hidden="true">
      <div class="modal" style="max-width:480px;text-align:center;padding:2rem">
        <h2 style="color:var(--color-gold)">You're Winning!</h2>
        <p style="margin:1rem 0;color:var(--color-text-muted)">You are currently the highest bidder.</p>
        <button class="btn btn-primary" data-modal-close>Continue</button>
      </div>
    </div>`;

  updateLeaderboard(id);
  updateHistory(id);
  startCountdown(auction.endTime, id, auction.startingBid);
  auctionManager.simulateLiveBids(id, auction.startingBid, auction.endTime);

  auctionManager.onBid((aucId) => {
    if (aucId === id) {
      updateLeaderboard(id);
      updateHistory(id);
      const h = auctionManager.getHighestBid(id, auction.startingBid);
      document.getElementById("current-bid").textContent = formatPrice(h.amount);
      document.getElementById("high-bidder").textContent = h.bidder ? "Leader: " + h.bidder : "";
      document.getElementById("bidder-count").textContent = auctionManager.getBidderCount(id);
      document.getElementById("bid-amount").value = h.amount + auction.bidIncrement;
      document.getElementById("bid-amount").min = h.amount + auction.bidIncrement;
    }
  });

  document.getElementById("place-bid").addEventListener("click", async () => {
    const amount = Number(document.getElementById("bid-amount").value);
    const result = await auctionManager.placeBid(id, amount, "You");
    if (result.success) {
      toast.success(`Bid placed: ${formatPrice(amount)}`);
      winModal.classList.add("active");
      winModal.setAttribute("aria-hidden", "false");
      updateLeaderboard(id);
      updateHistory(id);
      const h = auctionManager.getHighestBid(id, auction.startingBid);
      document.getElementById("current-bid").textContent = formatPrice(h.amount);
      document.getElementById("high-bidder").textContent = "Leader: You";
    } else toast.error(result.message);
  });

  const winModal = document.getElementById("win-modal");
  const closeWinModal = () => {
    winModal?.classList.remove("active");
    winModal?.setAttribute("aria-hidden", "true");
  };
  winModal?.querySelector("[data-modal-close]")?.addEventListener("click", closeWinModal);
  winModal?.addEventListener("click", (e) => {
    if (e.target === winModal) closeWinModal();
  });

  document.getElementById("watch-auction").addEventListener("click", function () {
    auctionManager.toggleWatchlist(id);
    this.textContent = auctionManager.isWatched(id) ? "Watching" : "Watch Auction";
    toast.info(auctionManager.isWatched(id) ? "Added to watchlist" : "Removed from watchlist");
  });
});

function updateLeaderboard(auctionId) {
  const bids = auctionManager.getBids(auctionId).slice(0, 10);
  document.querySelector("#leaderboard tbody").innerHTML = bids.length
    ? bids.map((b, i) => `<tr class="${i === 0 ? "bid-flash" : ""}"><td>#${i + 1}</td><td>${b.bidder}</td><td>${formatPrice(b.amount)}</td><td>${new Date(b.timestamp).toLocaleTimeString()}</td></tr>`).join("")
    : "<tr><td colspan='4'>No bids yet</td></tr>";
}

function updateHistory(auctionId) {
  const bids = auctionManager.getBids(auctionId);
  document.getElementById("bid-history").innerHTML = bids.length
    ? bids.map((b) => `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--color-border)"><span>${b.bidder}</span><strong>${formatPrice(b.amount)}</strong></div>`).join("")
    : "<p style='color:var(--color-text-muted)'>Be the first to bid</p>";
}

function startCountdown(endTime, auctionId, startingBid = 0) {
  const el = document.getElementById("countdown");
  const tick = () => {
    const t = auctionManager.getTimeRemaining(endTime);
    if (t.expired) {
      auctionManager.stopSimulation(auctionId);
      const h = auctionManager.getHighestBid(auctionId, startingBid);
      if (h.bidder === "You") {
        auctionManager.recordWin(auctionId, "", h.amount);
        window.location.href = `winning.html?id=${auctionId}`;
      } else {
        window.location.href = `expired.html?id=${auctionId}`;
      }
      return;
    }
    el.innerHTML = `
      <div class="countdown-unit"><span>${t.days}</span><label>Days</label></div>
      <div class="countdown-unit"><span>${String(t.hours).padStart(2,"0")}</span><label>Hrs</label></div>
      <div class="countdown-unit"><span>${String(t.minutes).padStart(2,"0")}</span><label>Min</label></div>
      <div class="countdown-unit"><span>${String(t.seconds).padStart(2,"0")}</span><label>Sec</label></div>`;
  };
  tick();
  setInterval(tick, 1000);
}
