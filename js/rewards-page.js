import { bootProtected, $, $$, format, emptyState, toast } from "./app-core.js";
import { subscribeRewards } from "./firestore-service.js";
import { redeemViaApi, ApiError } from "./api-client.js";

let pending = null;
let allRewards = [];
let rewardsUnsub = null;

function render() {
  const grid = $("#reward-grid");
  if (!grid) return;

  const q = ($("#reward-search")?.value || $("#reward-search-mobile")?.value || "").toLowerCase();
  const sort = $("#reward-sort")?.value || "points-asc";

  let list = [...allRewards];
  list = list.filter((r) => {
    const title = (r.title || "").toLowerCase();
    const desc = (r.description || "").toLowerCase();
    return title.includes(q) || desc.includes(q);
  });

  if (sort === "points-asc") list.sort((a, b) => Number(a.pointsRequired) - Number(b.pointsRequired));
  else if (sort === "points-desc") list.sort((a, b) => Number(b.pointsRequired) - Number(a.pointsRequired));
  else list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  if (!list.length) {
    grid.innerHTML = emptyState("No rewards available");
    return;
  }

  grid.innerHTML = list
    .map((r) => {
      const pts = Number(r.pointsRequired);
      const stock = Number(r.stock ?? 0);
      const out = stock <= 0;
      const visual = r.image
        ? `<img src="${r.image}" alt="" class="reward-card-img" loading="lazy" />`
        : `<div class="reward-card-visual">🎁</div>`;
      return `<article class="reward-card">
        ${visual}
        <h4>${r.title || "Reward"}</h4>
        <p class="muted reward-desc">${r.description || ""}</p>
        <p class="pts">${pts ? `${format(pts)} pts` : "--"}</p>
        <p class="muted" style="font-size:0.75rem">Stock: ${stock > 0 ? format(stock) : "Out of stock"}</p>
        <button type="button" class="sp-btn sp-btn-primary sp-btn-sm sp-btn-full redeem-btn" data-id="${r.id}" ${out ? "disabled" : ""}>Redeem</button>
      </article>`;
    })
    .join("");

  $$(".redeem-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const reward = allRewards.find((r) => r.id === btn.dataset.id);
      if (!reward) return;
      pending = reward;
      const pts = Number(reward.pointsRequired) || 0;
      $("#redeem-title").textContent = `Redeem ${reward.title || "reward"}?`;
      $("#redeem-text").textContent = pts ? `${format(pts)} points will be deducted.` : "Confirm redemption.";
      $("#redeem-modal")?.classList.remove("hidden");
    });
  });
}

bootProtected("rewards", (user) => {
  const grid = $("#reward-grid");
  if (grid) grid.innerHTML = emptyState("Loading rewards…");

  rewardsUnsub = subscribeRewards(
    (list) => {
      allRewards = list;
      render();
    },
    () => {
      if (grid) grid.innerHTML = emptyState("Unable to load rewards");
    }
  );

  $("#reward-search")?.addEventListener("input", render);
  $("#reward-search-mobile")?.addEventListener("input", (e) => {
    const desktop = $("#reward-search");
    if (desktop) desktop.value = e.target.value;
    render();
  });
  $("#reward-sort")?.addEventListener("change", render);

  $("#cancel-redeem")?.addEventListener("click", () => {
    $("#redeem-modal")?.classList.add("hidden");
    pending = null;
  });

  $("#confirm-redeem")?.addEventListener("click", async () => {
    if (!pending) return;
    const btn = $("#confirm-redeem");
    btn.disabled = true;
    try {
      await redeemViaApi(pending.id);
      toast("Reward redeemed successfully", "success");
      $("#redeem-modal")?.classList.add("hidden");
      pending = null;
    } catch (err) {
      if (err?.code === "insufficient-points" || err instanceof ApiError && err.code === "insufficient-points") {
        toast("Not enough points", "error");
      } else if (err?.message?.includes("Failed to fetch")) {
        toast("Server unavailable. Start the backend API.", "error");
      } else {
        toast(err?.message || "Redemption failed", "error");
      }
    } finally {
      btn.disabled = false;
    }
  });
});

window.addEventListener("pagehide", () => rewardsUnsub?.());
