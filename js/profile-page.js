import { bootProtected, $, confirmLogout, toast } from "./app-core.js";

bootProtected("profile", (user) => {
  const idEl = $("#profile-id");
  if (idEl) idEl.textContent = `SP-${user.uid.slice(0, 8).toUpperCase()}`;

  $("#edit-profile-btn")?.addEventListener("click", () => {
    toast("Profile edit coming soon — update via support.", "success");
  });

  $("#logout-btn")?.addEventListener("click", () => $("#logout-modal")?.classList.remove("hidden"));
  $("#cancel-logout")?.addEventListener("click", () => $("#logout-modal")?.classList.add("hidden"));
  $("#confirm-logout")?.addEventListener("click", confirmLogout);
});
