function hideLoader() {
  document.getElementById("auth-loader")?.classList.add("hidden");
}

if (document.readyState === "complete") {
  setTimeout(hideLoader, 400);
} else {
  window.addEventListener("load", () => setTimeout(hideLoader, 400), { once: true });
  document.addEventListener("DOMContentLoaded", () => setTimeout(hideLoader, 900), { once: true });
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function toast(message, type = "success") {
  const wrap = $("#toast-container");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
    setTimeout(() => el.remove(), 280);
  }, 3200);
}

function showBootError(message) {
  const wrap = $("#toast-container");
  if (!wrap) {
    alert(message);
    return;
  }
  const el = document.createElement("div");
  el.className = "toast error";
  el.textContent = message;
  wrap.appendChild(el);
}

function setFieldError(fieldKey, message) {
  const field = document.querySelector(`[data-field="${fieldKey}"]`);
  const errorEl = document.getElementById(`${fieldKey}-error`);
  if (field) field.classList.toggle("is-invalid", Boolean(message));
  if (field) field.classList.toggle("is-valid", !message && field.querySelector("input, select")?.value);
  if (errorEl) errorEl.textContent = message || "";
}

function clearFieldErrors() {
  $$(".field.is-invalid, .field.is-valid").forEach((el) => {
    el.classList.remove("is-invalid", "is-valid");
  });
  $$(".field-error").forEach((el) => {
    el.textContent = "";
  });
}

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

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function updateStrengthUI(pw) {
  const bar = $("#pw-strength-bar");
  const label = $("#pw-strength-label");
  if (!bar) return;
  const score = passwordStrength(pw);
  const levels = ["Weak", "Fair", "Good", "Strong", "Excellent"];
  const widths = [20, 40, 60, 80, 100];
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#2563eb"];
  bar.style.width = `${widths[Math.min(score, 4)]}%`;
  bar.style.background = colors[Math.min(score, 4)];
  if (label) label.textContent = pw ? levels[Math.min(score, 4)] : "";
}

function updateMatchUI(password, confirm) {
  const hint = $("#pw-match-hint");
  if (!hint) return;
  if (!confirm) {
    hint.textContent = "";
    hint.className = "field-hint match-hint";
    return;
  }
  if (password === confirm) {
    hint.textContent = "Passwords match";
    hint.className = "field-hint match-hint match-ok";
  } else {
    hint.textContent = "Passwords do not match";
    hint.className = "field-hint match-hint match-bad";
  }
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
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/account-exists-with-different-credential": "An account already exists with this email.",
  };
  return map[code] || error?.message || "Something went wrong. Try again.";
}

async function runButton(button, fn) {
  if (!button) return;
  button.disabled = true;
  button.classList.add("is-loading");
  try {
    await fn();
  } catch (error) {
    toast(friendlyAuthError(error), "error");
    console.error(error);
  } finally {
    button.disabled = false;
    button.classList.remove("is-loading");
  }
}

function initPasswordToggles() {
  $$(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-target"));
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      const icon = btn.querySelector("i");
      if (icon) icon.className = show ? "bx bx-hide" : "bx bx-show";
    });
  });
}

function initLiveValidation() {
  $("#signup-email")?.addEventListener("blur", (e) => {
    const v = e.target.value.trim();
    if (!v) return setFieldError("signup-email", "");
    setFieldError("signup-email", validateEmail(v) ? "" : "Enter a valid email address");
  });

  $("#signup-phone")?.addEventListener("blur", (e) => {
    const phone = formatPhone($("#signup-country")?.value || "+91", e.target.value.trim());
    setFieldError("signup-phone", phone ? "" : "Enter a valid 10-digit mobile number");
  });

  $("#signup-city")?.addEventListener("blur", (e) => {
    const v = e.target.value.trim();
    if (!v) return setFieldError("signup-city", "");
    setFieldError("signup-city", v.length >= 2 ? "" : "City must be at least 2 characters");
  });

  const pw = $("#signup-password");
  const cf = $("#signup-confirm");

  pw?.addEventListener("input", (e) => {
    updateStrengthUI(e.target.value);
    updateMatchUI(e.target.value, cf?.value || "");
  });

  cf?.addEventListener("input", (e) => {
    updateMatchUI(pw?.value || "", e.target.value);
  });
}

async function boot() {
  let api;
  try {
    api = await import("./firebase.js");
  } catch (error) {
    console.error("Firebase failed to load:", error);
    hideLoader();
    showBootError("Could not load Firebase. Use a local server (not file://) and check your internet.");
    return;
  }

  initPasswordToggles();
  initLiveValidation();

  const remembered = localStorage.getItem("sp-remember-email");
  if (remembered && $("#login-email")) $("#login-email").value = remembered;

  api.subscribeAuth((user) => {
    if (!user) return;
    hideLoader();
    toast("Welcome to Shyam Points!", "success");
    setTimeout(() => {
      location.href = "dashboard.html";
    }, 500);
  });

  $("#forgot-password")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = $("#login-email")?.value.trim() || "";
    if (!validateEmail(email)) {
      setFieldError("login-email", "Enter your email above to reset password");
      toast("Enter a valid email address first", "error");
      return;
    }
    try {
      await api.resetPassword(email);
      toast("Password reset link sent to your email", "success");
    } catch (error) {
      toast(friendlyAuthError(error), "error");
    }
  });

  $$(".google-auth").forEach((btn) => {
    btn.addEventListener("click", () =>
      runButton(btn, async () => {
        await api.loginWithGoogle();
        toast("Signed in with Google", "success");
      })
    );
  });

  $("#login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors();

    const email = $("#login-email")?.value.trim() || "";
    const password = $("#login-password")?.value || "";
    let valid = true;

    if (!validateEmail(email)) {
      setFieldError("login-email", "Enter a valid email address");
      valid = false;
    }
    if (password.length < 6) {
      setFieldError("login-password", "Password must be at least 6 characters");
      valid = false;
    }
    if (!valid) return toast("Please fix the errors below", "error");

    if ($("#remember-me")?.checked) localStorage.setItem("sp-remember-email", email);
    else localStorage.removeItem("sp-remember-email");

    await runButton($("#login-submit"), async () => {
      await api.loginWithEmail(email, password);
      toast("Login successful", "success");
    });
  });

  $("#signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors();

    const name = $("#signup-name")?.value.trim() || "";
    const email = $("#signup-email")?.value.trim() || "";
    const city = $("#signup-city")?.value.trim() || "";
    const role = $("#signup-role")?.value || "";
    const phone = formatPhone($("#signup-country")?.value || "+91", $("#signup-phone")?.value.trim() || "");
    const password = $("#signup-password")?.value || "";
    const confirm = $("#signup-confirm")?.value || "";
    let valid = true;

    if (name.length < 2) {
      setFieldError("signup-name", "Enter your full name");
      valid = false;
    }
    if (!validateEmail(email)) {
      setFieldError("signup-email", "Enter a valid email address");
      valid = false;
    }
    if (!phone) {
      setFieldError("signup-phone", "Enter a valid 10-digit mobile number");
      valid = false;
    }
    if (!city || city.length < 2) {
      setFieldError("signup-city", "Enter your city");
      valid = false;
    }
    if (!role) {
      setFieldError("signup-role", "Select your role");
      valid = false;
    }
    if (password.length < 6) {
      setFieldError("signup-password", "Password must be at least 6 characters");
      valid = false;
    }
    if (password !== confirm) {
      setFieldError("signup-confirm", "Passwords do not match");
      valid = false;
    }
    if (!valid) return toast("Please fix the errors below", "error");

    await runButton($("#signup-submit"), async () => {
      await api.signupWithEmail(name, email, password, phone, city, role);
      toast("Account created successfully", "success");
    });
  });

  hideLoader();
}

boot().catch((error) => {
  console.error(error);
  hideLoader();
  showBootError("App failed to start. Refresh the page or run via a local server.");
});
