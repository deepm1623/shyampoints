document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".auth-toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-target"));
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      }
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
});
