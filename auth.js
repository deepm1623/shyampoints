function hideLoader() {
  document.getElementById("auth-loader")?.classList.add("hidden");
}

if (document.readyState === "complete") {
  setTimeout(hideLoader, 500);
} else {
  window.addEventListener("load", () => setTimeout(hideLoader, 500), { once: true });
  document.addEventListener("DOMContentLoaded", () => setTimeout(hideLoader, 1200), { once: true });
}

async function boot() {
  const $ = (s) => document.querySelector(s);

  let api;
  try {
    api = await import("./firebase.js");
  } catch (error) {
    console.error("Firebase failed to load:", error);
    hideLoader();
    showBootError("Could not load Firebase. Use a local server (not file://) and check your internet.");
    return;
  }

  const wrapper = $("#auth-wrapper");
  const registerLink = $(".register-link");
  const loginLink = $(".login-link");

  function setSignupMode(on) {
    if (typeof window.setAuthSignupMode === "function") {
      window.setAuthSignupMode(on);
      return;
    }
    wrapper?.classList.toggle("active", on);
    wrapper?.classList.toggle("signup-mode", on);
    document.getElementById("auth-container")?.classList.toggle("signup-mode", on);
  }

  registerLink?.addEventListener("click", (e) => {
    e.preventDefault();
    setSignupMode(true);
    history.replaceState(null, "", "login.html?mode=signup");
  });

  loginLink?.addEventListener("click", (e) => {
    e.preventDefault();
    setSignupMode(false);
    history.replaceState(null, "", "login.html");
  });

  if (new URLSearchParams(location.search).get("mode") === "signup") {
    setSignupMode(true);
  }

  api.subscribeAuth((user) => {
    if (!user) return;
    hideLoader();
    toast("Welcome to Shyam Points!", "success");
    setTimeout(() => {
      location.href = "dashboard.html";
    }, 450);
  });

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function formatPhone(countryCode, raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    const cc = countryCode.replace(/\D/g, "");
    if (countryCode === "+91" && digits.length !== 10) return null;
    return `+${cc}${digits}`;
  }

  function toast(message, type = "success") {
    const wrap = $("#toast-container");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  function friendlyAuthError(error) {
    const code = error?.code || "";
    const map = {
      "auth/email-already-in-use": "This email is already registered. Try logging in.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/wrong-password": "Incorrect password.",
      "auth/user-not-found": "No account found with this email.",
      "auth/invalid-credential": "Invalid email or password.",
      "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    };
    return map[code] || error?.message || "Something went wrong. Try again.";
  }

  async function runButton(button, fn) {
    if (!button) return;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = "Please wait...";
    try {
      await fn();
    } catch (error) {
      toast(friendlyAuthError(error), "error");
      console.error(error);
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  $("#login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#login-email")?.value.trim() || "";
    const password = $("#login-password")?.value || "";
    if (!validateEmail(email)) return toast("Enter a valid email", "error");
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");

    await runButton($("#login-submit"), async () => {
      await api.loginWithEmail(email, password);
      toast("Login successful", "success");
    });
  });

  $("#signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#signup-name")?.value.trim() || "";
    const email = $("#signup-email")?.value.trim() || "";
    const phone = formatPhone($("#signup-country")?.value, $("#signup-phone")?.value.trim() || "");
    const password = $("#signup-password")?.value || "";
    const confirm = $("#signup-confirm")?.value || "";

    if (name.length < 2) return toast("Enter your full name", "error");
    if (!validateEmail(email)) return toast("Enter a valid email", "error");
    if (!phone) return toast("Enter a valid phone number", "error");
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");
    if (password !== confirm) return toast("Passwords do not match", "error");

    await runButton($("#signup-submit"), async () => {
      await api.signupWithEmail(name, email, password, phone);
      toast("Account created successfully", "success");
    });
  });

  hideLoader();
}

function showBootError(message) {
  const wrap = document.getElementById("toast-container");
  if (!wrap) {
    alert(message);
    return;
  }
  const el = document.createElement("div");
  el.className = "toast error";
  el.textContent = message;
  wrap.appendChild(el);
}

boot().catch((error) => {
  console.error(error);
  hideLoader();
  showBootError("App failed to start. Refresh the page or run via a local server.");
});
