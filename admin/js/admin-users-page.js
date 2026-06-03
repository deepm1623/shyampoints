import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();

document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

const searchInput = document.getElementById("users-search");
const wrap = document.getElementById("users-table-wrap");

async function load(search = "") {
  try {
    const { users } = await adminApi.getUsers(search);
    if (!users?.length) {
      wrap.innerHTML = '<p class="muted">No users found</p>';
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Points</th><th>Scans</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${users
      .map(
        (u) => `<tr>
          <td>${u.name || "—"}</td>
          <td>${u.email || "—"}</td>
          <td>${u.phone || "—"}</td>
          <td>${u.points}</td>
          <td>${u.scans}</td>
          <td>${u.role || "—"}</td>
          <td>${u.suspended ? '<span class="badge-danger">Suspended</span>' : "Active"}</td>
          <td><button type="button" class="sp-btn sp-btn-soft sp-btn-sm" data-edit="${u.id}">Edit</button></td>
        </tr>`
      )
      .join("")}</tbody></table>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openEdit(users.find((x) => x.id === btn.dataset.edit)));
    });
  } catch (err) {
    wrap.innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  }
}

function openEdit(user) {
  if (!user) return;
  const name = prompt("Full name", user.name || "");
  if (name === null) return;
  const role = prompt("Role", user.role || "Plumber");
  if (role === null) return;
  const suspended = confirm(`Suspend ${user.name}? OK = suspended, Cancel = active`);
  adminApi
    .updateUser(user.id, { fullName: name, role, suspended })
    .then(() => load(searchInput?.value || ""))
    .catch((err) => alert(err.message));
}

searchInput?.addEventListener("input", () => load(searchInput.value));
load();
