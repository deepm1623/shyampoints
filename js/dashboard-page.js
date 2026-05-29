import { bootProtected, $, format } from "./app-core.js";

const TRANSACTIONS = [
  { icon: "🚿", brand: "AquaFlow Mixer", meta: "QR Scan Reward", points: "+24", neg: false },
  { icon: "🎁", brand: "UPI Cashback", meta: "Reward Redeemed", points: "-220", neg: true },
  { icon: "🔧", brand: "Pro Tap Kit", meta: "Box Verification", points: "+18", neg: false },
  { icon: "🏪", brand: "Retail Bonus", meta: "Campaign", points: "+30", neg: false },
];

const FEATURED = [
  { icon: "🛒", title: "Amazon Voucher", pts: 1500, cat: "Gift Cards" },
  { icon: "💳", title: "UPI Cashback", pts: 900, cat: "Cashback" },
  { icon: "🔧", title: "Tool Kit", pts: 3200, cat: "Electronics" },
];

function renderLists(points) {
  const tx = $("#wallet-transactions");
  if (tx) {
    tx.innerHTML = TRANSACTIONS.map(
      (item) => `<article class="list-item">
        <div class="logo-pill">${item.icon}</div>
        <div class="item-meta"><h5>${item.brand}</h5><p>${item.meta}</p></div>
        <strong class="item-score${item.neg ? " negative" : ""}">${item.points}</strong>
      </article>`
    ).join("");
  }

  const fr = $("#featured-rewards");
  if (fr) {
    fr.className = "reward-grid rewards-grid";
    fr.innerHTML = FEATURED.map(
      (r) => `<article class="reward-card">
        <div class="reward-card-visual">${r.icon}</div>
        <span class="cat">${r.cat}</span>
        <h4>${r.title}</h4>
        <p class="pts">${format(r.pts)} pts</p>
        <a href="rewards.html" class="sp-btn sp-btn-primary sp-btn-sm sp-btn-full">View</a>
      </article>`
    ).join("");
  }
}

bootProtected("dashboard", (_user, profile) => {
  renderLists(Number(profile?.points || 0));
});
