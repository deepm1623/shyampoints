function hideLoader() {
  document.getElementById("auth-loader")?.classList.add("hidden");
}

if (document.readyState === "complete") {
  setTimeout(hideLoader, 400);
} else {
  window.addEventListener("load", () => setTimeout(hideLoader, 400), { once: true });
}

async function boot() {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let api;
  try {
    api = await import("./firebase.js");
  } catch (error) {
    console.error("Firebase failed to load:", error);
    hideLoader();
    showBootError("Could not load Firebase. Use a local server (not file://) and check your internet.");
    return;
  }

  if (location.pathname.endsWith("index.html")) {
    location.replace("login.html");
    return;
  }

  const remembered = localStorage.getItem("sp-remember-email");
  if (remembered && $("#login-email")) $("#login-email").value = remembered;

  api.subscribeAuth((user) => {
    if (!user) return;
    hideLoader();
    toast("Welcome to Shyam Points!", "success");
    setTimeout(() => {
      location.href = "dashboard.html";
    }, 400);
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
    const colors = ["#ef4444", "#f59e0b", "#eab308", "#14b86a", "#2563ff"];
    bar.style.width = `${widths[Math.min(score, 4)]}%`;
    bar.style.background = colors[Math.min(score, 4)];
    if (label) label.textContent = pw ? levels[Math.min(score, 4)] : "";
  }

  $("#signup-password")?.addEventListener("input", (e) => updateStrengthUI(e.target.value));

  $("#forgot-password")?.addEventListener("click", (e) => {
    e.preventDefault();
    toast("Contact support@shyamsanitaries.com for password reset.", "error");
  });

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
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    };
    return map[code] || error?.message || "Something went wrong. Try again.";
  }

  async function runButton(button, fn) {
    if (!button) return;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = "Please wait…";
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
    const email = $("#login-email")?.value.trim() || "";
    const password = $("#login-password")?.value || "";
    if (!validateEmail(email)) return toast("Enter a valid email", "error");
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");
    if ($("#remember-me")?.checked) localStorage.setItem("sp-remember-email", email);
    else localStorage.removeItem("sp-remember-email");

    await runButton($("#login-submit"), async () => {
      await api.loginWithEmail(email, password);
      toast("Login successful", "success");
    });
  });

  $("#signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#signup-name")?.value.trim() || "";
    const email = $("#signup-email")?.value.trim() || "";
    const city = $("#signup-city")?.value.trim() || "";
    const phone = formatPhone($("#signup-country")?.value || "+91", $("#signup-phone")?.value.trim() || "");
    const password = $("#signup-password")?.value || "";
    const confirm = $("#signup-confirm")?.value || "";

    if (name.length < 2) return toast("Enter your full name", "error");
    if (!validateEmail(email)) return toast("Enter a valid email", "error");
    if (!phone) return toast("Enter a valid phone number", "error");
    if (!city || city.length < 2) return toast("Enter your city", "error");
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");
    if (password !== confirm) return toast("Passwords do not match", "error");
    if (!$("#terms-check")?.checked) return toast("Please accept the terms and conditions", "error");

    await runButton($("#signup-submit"), async () => {
      await api.signupWithEmail(name, email, password, phone, city);
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
  showBootError("App failed to start. Refresh or use a local server.");
});
