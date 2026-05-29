let api = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const loader = $("#loader");
const toastWrap = $("#toast-container");
const loginForm = $("#login-form");
const signupForm = $("#signup-form");
const switchLogin = $("#switch-login");
const switchSignup = $("#switch-signup");

window.addEventListener("load", () => setTimeout(() => loader.classList.add("hidden"), 900));

switchLogin.addEventListener("click", () => toggleAuthForm("login"));
switchSignup.addEventListener("click", () => toggleAuthForm("signup"));

function toggleAuthForm(type) {
  const login = type === "login";
  switchLogin.classList.toggle("active", login);
  switchSignup.classList.toggle("active", !login);
  loginForm.classList.toggle("hidden", !login);
  signupForm.classList.toggle("hidden", login);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  if (!validateEmail(email)) return toast("Enter valid email", "error");
  if (password.length < 6) return toast("Password too short", "error");
  await runButton($("#login-submit"), async () => {
    await api.loginWithEmail(email, password);
    toast("Login successful", "success");
  });
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#signup-name").value.trim();
  const email = $("#signup-email").value.trim();
  const password = $("#signup-password").value;
  const confirm = $("#signup-confirm").value;
  if (name.length < 2) return toast("Enter full name", "error");
  if (!validateEmail(email)) return toast("Enter valid email", "error");
  if (password.length < 6) return toast("Password too short", "error");
  if (password !== confirm) return toast("Passwords do not match", "error");
  await runButton($("#signup-submit"), async () => {
    await api.signupWithEmail(name, email, password);
    toast("Account created", "success");
  });
});

$("#google-auth").addEventListener("click", async (e) => {
  await runButton(e.currentTarget, async () => {
    await api.loginWithGoogle();
    toast("Google login successful", "success");
  });
});

$("#logout-btn").addEventListener("click", async () => {
  await api.logoutUser();
  toast("Logged out", "success");
});

$("#send-otp-ui").addEventListener("click", () => {
  const phone = $("#phone-number").value.trim();
  if (phone.length < 8) {
    toast("Enter valid phone number", "error");
    return;
  }
  $("#otp-ui").classList.remove("hidden");
  toast("OTP sent (UI demo)", "success");
});

$$(".otp-box").forEach((input, idx, arr) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
    if (input.value && idx < arr.length - 1) arr[idx + 1].focus();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && idx > 0) arr[idx - 1].focus();
  });
});

async function init() {
  try {
    api = await import("../firebase/firebase.js");
    api.subscribeAuth(async (user) => {
      if (!user) {
        $(".logged-in-only").classList.add("hidden");
        return;
      }
      const profile = await api.getUserProfile(user.uid);
      const points = Number(profile?.points || 0);
      const tier = api.getMembership(points);
      $("#nav-user-name").textContent = profile?.name || user.displayName || user.email;
      $("#hero-points").textContent = `${new Intl.NumberFormat("en-IN").format(points)} Points`;
      $("#hero-tier").textContent = tier;
      $("#hero-tier").className = `tier-tag ${tier.toLowerCase()}`;
      $(".logged-in-only").classList.remove("hidden");
      toast("Login session active", "success");
    });
  } catch (error) {
    toast("Firebase failed to initialize", "error");
    console.error(error);
  }
}

async function runButton(button, fn) {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = "Please wait...";
  try {
    await fn();
  } catch (error) {
    toast(error?.message || "Request failed", "error");
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(130%)";
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

init();
