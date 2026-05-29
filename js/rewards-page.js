import { bootProtected, $, $$, redeemReward, format } from "./app-core.js";

const REWARDS = [
  { icon: "🛒", title: "Amazon Voucher", pts: 1500, cat: "Gift Cards" },
  { icon: "🛍️", title: "Flipkart Gift Card", pts: 1400, cat: "Gift Cards" },
  { icon: "💳", title: "UPI Cashback", pts: 900, cat: "Cashback" },
  { icon: "🔧", title: "Plumbing Tool Kit", pts: 3200, cat: "Electronics" },
  { icon: "🚿", title: "Faucet Rewards Pack", pts: 2600, cat: "Electronics" },
  { icon: "⭐", title: "Exclusive Offer", pts: 2200, cat: "Gift Cards" },
];

let pending = null;
let filter = "all";

function render() {
  const q = ($("#reward-search")?.value || "").toLowerCase();
  const sort = $("#reward-sort")?.value || "points-asc";
  let list = REWARDS.filter((r) => filter === "all" || r.cat === filter);
  list = list.filter((r) => r.title.toLowerCase().includes(q));
  if (sort === "points-asc") list.sort((a, b) => a.pts - b.pts);
  else if (sort === "points-desc") list.sort((a, b) => b.pts - a.pts);
  else list.sort((a, b) => a.title.localeCompare(b.title));

  $("#reward-grid").innerHTML = list
    .map(
      (r) => `<article class="reward-card" data-cat="${r.cat}">
      <div class="reward-card-visual">${r.icon}</div>
      <span class="cat">${r.cat}</span>
      <h4>${r.title}</h4>
      <p class="pts">${format(r.pts)} pts</p>
      <button type="button" class="sp-btn sp-btn-primary sp-btn-sm sp-btn-full redeem-btn" data-title="${r.title}" data-points="${r.pts}">Redeem</button>
    </article>`
    )
    .join("");

  $$(".redeem-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pending = { title: btn.dataset.title, pts: Number(btn.dataset.points) };
      $("#redeem-title").textContent = `Redeem ${pending.title}?`;
      $("#redeem-text").textContent = `${format(pending.pts)} points will be deducted.`;
      $("#redeem-modal").classList.remove("hidden");
    });
  });
}

bootProtected("rewards", () => {
  render();
  $("#reward-search")?.addEventListener("input", render);
  $("#reward-sort")?.addEventListener("change", render);
  $$("#reward-filters .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#reward-filters .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filter = chip.dataset.cat;
      render();
    });
  });
  $("#cancel-redeem")?.addEventListener("click", () => {
    $("#redeem-modal").classList.add("hidden");
    pending = null;
  });
  $("#confirm-redeem")?.addEventListener("click", async () => {
    if (!pending) return;
    const ok = await redeemReward(pending.title, pending.pts);
    $("#redeem-modal").classList.add("hidden");
    pending = null;
    if (ok) render();
  });
});
