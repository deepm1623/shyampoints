import { guardAdminPage } from "./admin-auth.js";
import { adminApi } from "./admin-api.js";
import { logoutUser } from "../../firebase.js";

guardAdminPage();
document.getElementById("admin-logout")?.addEventListener("click", async () => {
  await logoutUser();
  location.href = "admin-login.html";
});

adminApi
  .getUsers()
  .then(({ users }) => {
    const wrap = document.getElementById("users-table-wrap");
    if (!users?.length) {
      wrap.innerHTML = "<p class=\"muted\">No users found</p>";
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr><th>Name</th><th>Phone</th><th>Points</th><th>Scans</th><th>Role</th></tr></thead><tbody>${users
      .map(
        (u) =>
          `<tr><td>${u.name}</td><td>${u.phone}</td><td>${u.points}</td><td>${u.scans}</td><td>${u.role}</td></tr>`
      )
      .join("")}</tbody></table>`;
  })
  .catch((err) => {
    document.getElementById("users-table-wrap").innerHTML = `<p class="admin-login-error">${err.message}</p>`;
  });
