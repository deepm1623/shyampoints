import { bootProtected, $, applyTheme, confirmLogout, toast } from "./app-core.js";
import { updateUserProfile } from "./firestore-service.js";

bootProtected("settings", (user, profile) => {
  const nameInput = $("#settings-name");
  const phoneInput = $("#settings-phone");
  const cityInput = $("#settings-city");

  if (nameInput) nameInput.value = profile?.fullName || profile?.name || "";
  if (phoneInput) phoneInput.value = profile?.mobile || profile?.phone || "";
  if (cityInput) cityInput.value = profile?.city || "";

  const themeBtn = $("#theme-toggle");
  if (themeBtn && (localStorage.getItem("sp-theme") || "") === "dark") themeBtn.classList.add("on");

  themeBtn?.addEventListener("click", () => {
    themeBtn.classList.toggle("on");
    localStorage.setItem("sp-theme", themeBtn.classList.contains("on") ? "dark" : "light");
    applyTheme();
    toast("Theme updated", "success");
  });

  $("#save-settings")?.addEventListener("click", async () => {
    const fullName = nameInput?.value.trim() || "";
    const mobile = phoneInput?.value.trim() || "";
    const city = cityInput?.value.trim() || "";

    try {
      await updateUserProfile(user.uid, {
        ...(fullName ? { fullName } : {}),
        mobile,
        city,
      });
      toast("Settings saved", "success");
    } catch (err) {
      console.error(err);
      toast("Could not save settings", "error");
    }
  });

  $("#settings-logout")?.addEventListener("click", confirmLogout);
});
