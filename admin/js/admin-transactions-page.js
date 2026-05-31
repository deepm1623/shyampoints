import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();
document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

adminApi
  .getTransactions()
  .then(({ transactions }) => {
    const wrap = document.getElementById("tx-table-wrap");
    if (!transactions?.length) {
      wrap.innerHTML = "<p class=\"muted\">No transactions yet</p>";
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr><th>User</th><th>Product</th><th>Points</th><th>Date</th></tr></thead><tbody>${transactions
      .map(
        (t) =>
          `<tr><td>${t.userName}</td><td>${t.product}</td><td>${t.points >= 0 ? "+" : ""}${t.points}</td><td>${t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "—"}</td></tr>`
      )
      .join("")}</tbody></table>`;
  })
  .catch((err) => {
    document.getElementById("tx-table-wrap").innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  });
