import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();

document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

async function load() {
  try {
    const { stats } = await adminApi.getStats();
    document.getElementById("stat-users").textContent = stats.totalUsers ?? 0;
    document.getElementById("stat-qr-gen").textContent = stats.totalQrGenerated ?? 0;
    document.getElementById("stat-qr-used").textContent = stats.totalQrUsed ?? 0;
    document.getElementById("stat-points").textContent = (stats.totalPointsIssued ?? 0).toLocaleString("en-IN");
    document.getElementById("stat-pending").textContent = stats.pendingRedemptions ?? 0;

    const { transactions } = await adminApi.getTransactions();
    const el = document.getElementById("admin-recent-tx");
    if (!transactions?.length) {
      el.innerHTML = "<p class=\"muted\">No transactions yet</p>";
      return;
    }
    el.innerHTML = `<table class="admin-table"><thead><tr><th>User</th><th>Product</th><th>Points</th><th>Date</th></tr></thead><tbody>${transactions
      .slice(0, 10)
      .map(
        (t) => `<tr><td>${t.userName}</td><td>${t.product}</td><td>${t.points >= 0 ? "+" : ""}${t.points}</td><td>${t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "—"}</td></tr>`
      )
      .join("")}</tbody></table>`;
  } catch (err) {
    console.error(err);
    document.getElementById("admin-recent-tx").innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  }
}

load();
