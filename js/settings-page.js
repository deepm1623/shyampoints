import { bootProtected, $, applyTheme, confirmLogout, toast } from "./app-core.js";

function syncToggle(btn, key, onClass = "on") {
  if (!btn) return;
  const val = localStorage.getItem(key);
  if (val === "1" || (key === "sp-notifications" && val !== "0")) btn.classList.add(onClass);
  btn.addEventListener("click", () => {
    btn.classList.toggle(onClass);
    localStorage.setItem(key, btn.classList.contains(onClass) ? "1" : "0");
    if (key === "sp-theme") {
      localStorage.setItem("sp-theme", btn.classList.contains(onClass) ? "dark" : "light");
      applyTheme();
    }
    toast("Settings saved", "success");
  });
}

bootProtected("settings", () => {
  const themeBtn = $("#theme-toggle");
  if (themeBtn && (localStorage.getItem("sp-theme") || "") === "dark") themeBtn.classList.add("on");

  themeBtn?.addEventListener("click", () => {
    themeBtn.classList.toggle("on");
    localStorage.setItem("sp-theme", themeBtn.classList.contains("on") ? "dark" : "light");
    applyTheme();
    toast("Theme updated", "success");
  });

  syncToggle($("#notif-toggle"), "sp-notifications");
  syncToggle($("#email-toggle"), "sp-email-alerts");

  $("#language-select")?.addEventListener("change", (e) => {
    localStorage.setItem("sp-lang", e.target.value);
    toast("Language preference saved", "success");
  });
  const lang = localStorage.getItem("sp-lang");
  if (lang && $("#language-select")) $("#language-select").value = lang;

  $("#settings-logout")?.addEventListener("click", confirmLogout);
});
