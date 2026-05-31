import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();
document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

adminApi
  .getRewards()
  .then(({ rewards }) => {
    const wrap = document.getElementById("rewards-wrap");
    if (!rewards?.length) {
      wrap.innerHTML = "<p class=\"muted\">No rewards in catalog</p>";
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr><th>Title</th><th>Points</th><th>Stock</th><th>Status</th></tr></thead><tbody>${rewards
      .map((r) => `<tr><td>${r.title}</td><td>${r.pointsRequired}</td><td>${r.stock}</td><td>${r.status}</td></tr>`)
      .join("")}</tbody></table>`;
  })
  .catch((err) => {
    document.getElementById("rewards-wrap").innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  });
