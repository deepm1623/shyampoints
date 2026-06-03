import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();
document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

const wrap = document.getElementById("rewards-wrap");

async function load() {
  try {
    const { rewards } = await adminApi.getRewards();
    wrap.innerHTML = `
      <form id="reward-create" class="admin-form">
        <h4>Create reward</h4>
        <label>Title<input type="text" id="new-title" required /></label>
        <label>Description<input type="text" id="new-desc" /></label>
        <label>Points<input type="number" id="new-points" min="1" required /></label>
        <label>Stock<input type="number" id="new-stock" min="0" value="10" /></label>
        <button type="submit" class="sp-btn sp-btn-primary sp-btn-sm">Add reward</button>
      </form>
      <div style="margin-top:24px">
        ${
          rewards?.length
            ? `<table class="admin-table"><thead><tr><th>Title</th><th>Points</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>${rewards
                .map(
                  (r) => `<tr>
                    <td>${r.title}</td>
                    <td>${r.pointsRequired}</td>
                    <td>${r.stock}</td>
                    <td>${r.status}</td>
                    <td>
                      <button type="button" class="sp-btn sp-btn-ghost sp-btn-sm" data-del="${r.id}">Delete</button>
                    </td>
                  </tr>`
                )
                .join("")}</tbody></table>`
            : '<p class="muted">No rewards in catalog</p>'
        }
      </div>`;

    document.getElementById("reward-create")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await adminApi.createReward({
          title: document.getElementById("new-title").value.trim(),
          description: document.getElementById("new-desc").value.trim(),
          pointsRequired: Number(document.getElementById("new-points").value),
          stock: Number(document.getElementById("new-stock").value),
          status: "active",
        });
        load();
      } catch (err) {
        alert(err.message);
      }
    });

    wrap.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this reward?")) return;
        try {
          await adminApi.deleteReward(btn.dataset.del);
          load();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    wrap.innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  }
}

load();
