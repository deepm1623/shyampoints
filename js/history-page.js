import { bootProtected, $ } from "./app-core.js";

const ITEMS = [
  { icon: "🚿", name: "Smart Faucet X2", date: "Today, 10:35 AM", pts: "+24", type: "earned", detail: "QR scan · 24 pts" },
  { icon: "🎁", name: "UPI Cashback", date: "Yesterday, 4:10 PM", pts: "-220", type: "redeemed", detail: "Reward redemption" },
  { icon: "🧰", name: "Pipe Connector Set", date: "May 26, 11:22 AM", pts: "+14", type: "earned", detail: "Product verification" },
  { icon: "🔩", name: "Valve Pro Series", date: "May 24, 2:03 PM", pts: "+22", type: "earned", detail: "QR scan · 22 pts" },
];

function render(filter = "all", query = "") {
  const el = $("#history-timeline");
  if (!el) return;
  const q = query.toLowerCase();
  const list = ITEMS.filter((i) => {
    if (filter !== "all" && i.type !== filter) return false;
    return i.name.toLowerCase().includes(q) || i.detail.toLowerCase().includes(q);
  });
  el.innerHTML = list
    .map(
      (item) => `<article class="timeline-item list-item" data-type="${item.type}">
      <div class="logo-pill">${item.icon}</div>
      <div class="item-meta"><h5>${item.name}</h5><p>${item.date} · ${item.detail}</p></div>
      <strong class="item-score${item.type === "redeemed" ? " negative" : ""}">${item.pts}</strong>
    </article>`
    )
    .join("") || '<p class="muted">No transactions found.</p>';
}

bootProtected("history", () => {
  render();
  $("#history-search")?.addEventListener("input", (e) => {
    render($("#history-filter")?.value || "all", e.target.value);
  });
  $("#history-filter")?.addEventListener("change", (e) => {
    render(e.target.value, $("#history-search")?.value || "");
  });
});
