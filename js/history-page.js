import { bootProtected, $, $$, format, emptyState } from "./app-core.js";
import { subscribeTransactions, formatTimestamp } from "./firestore-service.js";

let allTx = [];
let txUnsub = null;

function render(filter = "all", query = "") {
  const el = $("#history-timeline");
  if (!el) return;

  const q = query.toLowerCase();
  let list = allTx.filter((tx) => {
    if (filter === "earned" && (Number(tx.points) <= 0 || tx.type === "redemption")) return false;
    if (filter === "redeemed" && tx.type !== "redemption") return false;
    if (filter === "scanned" && tx.type !== "scan") return false;
    const desc = (tx.description || "").toLowerCase();
    const type = (tx.type || "").toLowerCase();
    return desc.includes(q) || type.includes(q);
  });

  if (!list.length) {
    el.innerHTML = emptyState(query || filter !== "all" ? "No transactions found" : "No activity yet");
    return;
  }

  el.innerHTML = list
    .map((tx) => {
      const { date, time } = formatTimestamp(tx.createdAt);
      const pts = Number(tx.points) || 0;
      const earned = pts > 0;
      const icon = tx.type === "redemption" ? "🎁" : tx.type === "scan" ? "📱" : "✨";
      return `<article class="timeline-item list-item" data-type="${earned ? "earned" : "redeemed"}">
        <div class="logo-pill">${icon}</div>
        <div class="item-meta">
          <h5>${tx.description || tx.type || "Transaction"}</h5>
          <p>${date} · ${time} · ${tx.type || "--"}</p>
        </div>
        <strong class="item-score${earned ? "" : " negative"}">${earned ? "+" : ""}${format(pts)}</strong>
      </article>`;
    })
    .join("");
}

function setActiveFilterChip(filter) {
  $$(".m-filter-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });
  const sel = $("#history-filter");
  if (sel) sel.value = filter === "scanned" ? "all" : filter;
}

bootProtected("history", (user) => {
  const el = $("#history-timeline");
  if (el) el.innerHTML = emptyState("Loading…");

  const urlFilter = new URLSearchParams(location.search).get("filter");
  let initialFilter = $("#history-filter")?.value || "all";
  if (urlFilter === "scan") initialFilter = "scanned";
  setActiveFilterChip(initialFilter);

  let activeFilter = initialFilter;

  txUnsub = subscribeTransactions(
    user.uid,
    (list) => {
      allTx = list;
      render(activeFilter, $("#history-search")?.value || $("#m-history-search")?.value || "");
    },
    () => {
      if (el) el.innerHTML = emptyState("Unable to load transactions");
    }
  );

  $("#history-search")?.addEventListener("input", (e) => {
    render($("#history-filter")?.value || "all", e.target.value);
  });
  $("#history-search-mobile")?.addEventListener("input", (e) => {
    const desktop = $("#history-search");
    if (desktop) desktop.value = e.target.value;
    render($("#history-filter")?.value || "all", e.target.value);
  });
  $("#history-filter")?.addEventListener("change", (e) => {
    const v = e.target.value;
    setActiveFilterChip(v);
    render(v, $("#history-search")?.value || $("#m-history-search")?.value || "");
  });

  $("#m-history-search")?.addEventListener("input", (e) => {
    render($("#history-filter")?.value || "all", e.target.value);
  });

  $$(".m-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter || "all";
      setActiveFilterChip(activeFilter);
      if ($("#history-filter")) $("#history-filter").value = activeFilter === "scanned" ? "all" : activeFilter;
      render(activeFilter, $("#history-search")?.value || $("#m-history-search")?.value || "");
    });
  });
});

window.addEventListener("pagehide", () => txUnsub?.());
