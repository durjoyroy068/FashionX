import Storage from "../utils/storage.js";
import { API_CONFIG, STORAGE_KEYS } from "../config/constants.js";
import { generateId } from "../utils/format.js";
import apiClient from "../api/client.js";
import auth from "./auth.js";

const BID_KEY = STORAGE_KEYS.AUCTION_BIDS;
const WATCH_KEY = STORAGE_KEYS.AUCTION_WATCHLIST;

class AuctionManager {
  constructor() {
    this.activeTimers = new Map();
    this.listeners = new Set();
  }

  getBids(auctionId) {
    const all = Storage.get(BID_KEY, {});
    return all[auctionId] || [];
  }

  async placeBid(auctionId, amount, bidderName = "You") {
    if (!API_CONFIG.USE_MOCK && auth.isLoggedIn()) {
      const res = await apiClient.post(`/auctions/${auctionId}/bids`, { amount });
      if (!res.success) {
        return { success: false, message: res.error || "Bid failed" };
      }
      const bid = {
        id: res.data?.bid?.id || generateId("bid"),
        auctionId,
        bidder: bidderName,
        amount: res.data?.bid?.amount || amount,
        timestamp: new Date().toISOString()
      };
      this._notify(auctionId, bid);
      return { success: true, bid, currentBid: res.data?.currentBid };
    }

    const all = Storage.get(BID_KEY, {});
    const bids = all[auctionId] || [];
    const currentHigh = bids.length ? Math.max(...bids.map((b) => b.amount)) : 0;

    if (amount <= currentHigh) {
      return { success: false, message: `Bid must exceed ${currentHigh}` };
    }

    const bid = {
      id: generateId("bid"),
      auctionId,
      bidder: bidderName,
      amount,
      timestamp: new Date().toISOString()
    };

    bids.unshift(bid);
    all[auctionId] = bids;
    Storage.set(BID_KEY, all);
    this._notify(auctionId, bid);
    return { success: true, bid, bids };
  }

  setBidsFromApi(auctionId, bids) {
    const all = Storage.get(BID_KEY, {});
    all[auctionId] = (bids || []).map((b) => ({
      id: generateId("bid"),
      auctionId,
      bidder: b.bidder,
      amount: b.amount,
      timestamp: b.date || new Date().toISOString()
    }));
    Storage.set(BID_KEY, all);
  }

  simulateLiveBids(auctionId, startingBid, endTime) {
    if (!API_CONFIG.USE_MOCK) return;
    if (this.activeTimers.has(auctionId)) return;

    const names = ["Collector_92", "LuxBidder", "EliteBuyer", "FashionVault", "PremiumHunter"];
    const interval = setInterval(() => {
      if (new Date(endTime) <= new Date()) {
        clearInterval(interval);
        this.activeTimers.delete(auctionId);
        return;
      }

      const bids = this.getBids(auctionId);
      const high = bids.length ? Math.max(...bids.map((b) => b.amount)) : startingBid;
      const increment = Math.floor(Math.random() * 3 + 1) * 100;
      const name = names[Math.floor(Math.random() * names.length)];

      if (Math.random() > 0.6) {
        this.placeBid(auctionId, high + increment, name);
      }
    }, 4000 + Math.random() * 6000);

    this.activeTimers.set(auctionId, interval);
  }

  stopSimulation(auctionId) {
    const timer = this.activeTimers.get(auctionId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(auctionId);
    }
  }

  getHighestBid(auctionId, reserve = 0) {
    const bids = this.getBids(auctionId);
    if (!bids.length) return { amount: reserve, bidder: null };
    const highest = bids.reduce((a, b) => (b.amount > a.amount ? b : a));
    return highest;
  }

  getBidderCount(auctionId) {
    const bids = this.getBids(auctionId);
    return new Set(bids.map((b) => b.bidder)).size;
  }

  toggleWatchlist(auctionId) {
    let list = Storage.get(WATCH_KEY, []);
    if (list.includes(auctionId)) {
      list = list.filter((id) => id !== auctionId);
    } else {
      list.push(auctionId);
    }
    Storage.set(WATCH_KEY, list);
    return list;
  }

  isWatched(auctionId) {
    return Storage.get(WATCH_KEY, []).includes(auctionId);
  }

  getTimeRemaining(endTime) {
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { expired: false, days, hours, minutes, seconds, total: diff };
  }

  onBid(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(auctionId, bid) {
    this.listeners.forEach((cb) => cb(auctionId, bid));
    window.dispatchEvent(new CustomEvent("bidPlaced", { detail: { auctionId, bid } }));
  }

  recordWin(auctionId, productName, amount) {
    const wins = Storage.get(STORAGE_KEYS.AUCTION_WINS, []);
    wins.unshift({
      auctionId,
      productName,
      amount,
      wonAt: new Date().toISOString()
    });
    Storage.set(STORAGE_KEYS.AUCTION_WINS, wins.slice(0, 20));
  }
}

export const auctionManager = new AuctionManager();
export default auctionManager;
