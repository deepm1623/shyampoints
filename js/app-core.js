import {
  subscribeAuth,
  getUserProfile,
  logoutUser,
  getMembership,
} from "../firebase.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEC9Ki4rZWl86DjoClWU1zipeLZzN2GGI",
  authDomain: "shyampoints.firebaseapp.com",
  projectId: "shyampoints",
  storageBucket: "shyampoints.firebasestorage.app",
  messagingSenderId: "884009230588",
  appId: "1:884009230588:web:2f73257aecd65979fbf779",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export let currentUser = null;
export let currentProfile = null;

const PROTECTED = new Set([
  "dashboard", "profile", "rewards", "history", "scanner", "notifications", "settings",
]);

export function format(n) {
  return new Intl.NumberFormat("en-IN").format(Math.round(Number(n) || 0));
}

export function membershipProgress(points, tier) {
  if (tier === "Platinum") return { percent: 100, next: "Top tier unlocked" };
  if (tier === "Gold") return { percent: ((points - 1500) / 3500) * 100, next: `${format(5000 - points)} pts to Platinum` };
  if (tier === "Silver") return { percent: ((points - 500) / 1000) * 100, next: `${format(1500 - points)} pts to Gold` };
  return { percent: (points / 500) * 100, next: `${format(500 - points)} pts to Silver` };
}

export function toast(message, type = "success") {
  const wrap = $("#toast-wrap") || $("#toast-container");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = `app-toast ${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(120%)";
    setTimeout(() => el.remove(), 280);
  }, 2800);
}

export function animateCounter(el, target, suffix = "") {
  if (!el) return;
  const duration = 900;
  const t0 = performance.now();
  function frame(t) {
    const p = Math.min((t - t0) / duration, 1);
    const v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = format(v) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function hideLoader() {
  $("#sp-loader")?.classList.add("hidden");
}

export function applyTheme() {
  const theme = localStorage.getItem("sp-theme") || "light";
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

export function renderUserChrome(user, profile) {
  const points = Number(profile?.points || 0);
  const tier = getMembership(points);
  const name = profile?.name || user.displayName || "Shyam Member";
  const avatar =
    user.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563ff&color=fff`;

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  const setSrc = (id, src) => {
    const el = document.getElementById(id);
    if (el) el.src = src;
  };

  setText("welcome-name", name.split(" ")[0]);
  setText("header-user-name", name);
  setText("hero-id", `ID · SP-${user.uid.slice(0, 8).toUpperCase()}`);
  setText("hero-points", `${format(points)} pts`);
  setText("wallet-points", `${format(points)} pts`);
  setText("lifetime-points", `${format(points + Number(profile?.rewardsRedeemed || 0) * 120)} pts`);
  setText("sidebar-points", `${format(points)} pts`);
  setText("profile-name", name);
  setText("profile-email", profile?.email || user.email || "—");
  setText("profile-phone", profile?.phone || "—");
  setText("profile-city", profile?.city || "—");
  setText("profile-role", profile?.role || "Plumber");
  setText("profile-points", `${format(points)} pts`);
  setText("lb-you", `${format(points)} pts`);

  ["avatar", "profile-avatar", "header-avatar"].forEach((id) => setSrc(id, avatar));

  $$("[data-tier]").forEach((el) => {
    el.textContent = tier;
    el.className = `sp-badge ${tier.toLowerCase()} ${el.classList.contains("tier-lg") ? "tier-lg" : ""}`.trim();
  });

  const prog = membershipProgress(points, tier);
  const bar = $("#hero-progress");
  if (bar) bar.style.width = `${Math.min(100, prog.percent)}%`;
  setText("next-tier-text", prog.next);

  animateCounter($("#stat-points"), points);
  animateCounter($("#stat-scans"), Number(profile?.productsScanned || 12));
  animateCounter($("#stat-redeemed"), Number(profile?.rewardsRedeemed || 0));
  animateCounter($("#stat-today"), Math.min(points, 48));
  const rankEl = $("#stat-rank");
  if (rankEl) rankEl.textContent = `#${Math.max(1, 500 - Math.floor(points / 10))}`;

  return { points, tier, name };
}

export async function redeemReward(reward, pts) {
  if (!currentUser) return false;
  const points = Number(currentProfile?.points || 0);
  if (points < pts) {
    toast("Not enough points for this reward", "error");
    return false;
  }
  await updateDoc(doc(db, "users", currentUser.uid), {
    points: points - pts,
    rewardsRedeemed: increment(1),
    membership: getMembership(points - pts),
  });
  currentProfile = await getUserProfile(currentUser.uid);
  renderUserChrome(currentUser, currentProfile);
  toast(`${reward} redeemed successfully`, "success");
  return true;
}

export async function creditScanPoints(amount) {
  if (!currentUser || !amount) return;
  const base = Number(currentProfile?.points || 0);
  await updateDoc(doc(db, "users", currentUser.uid), {
    points: increment(amount),
    productsScanned: increment(1),
    membership: getMembership(base + amount),
  });
  currentProfile = await getUserProfile(currentUser.uid);
  renderUserChrome(currentUser, currentProfile);
}

export function initAppShell(pageId) {
  applyTheme();
  const body = document.body;
  body.dataset.page = pageId;

  const navItems = [
    { id: "dashboard", href: "dashboard.html", icon: "fa-house", label: "Home" },
    { id: "rewards", href: "rewards.html", icon: "fa-gift", label: "Rewards" },
    { id: "scanner", href: "scanner.html", icon: "fa-qrcode", label: "Scan", scan: true },
    { id: "history", href: "history.html", icon: "fa-clock-rotate-left", label: "History" },
    { id: "profile", href: "profile.html", icon: "fa-user", label: "Profile" },
  ];

  const sidebar = $("#app-sidebar");
  if (sidebar && !sidebar.dataset.built) {
    sidebar.dataset.built = "1";
    sidebar.innerHTML = `
      <a class="sidebar-brand" href="dashboard.html">
        <img src="shyam points logo.png" alt="" width="40" height="40" />
        <div><strong>Shyam Points</strong><small>Shyam Sanitaries</small></div>
      </a>
      <nav class="sidebar-nav" aria-label="Main">
        ${navItems
          .map(
            (n) => `<a href="${n.href}" class="sidebar-link${n.id === pageId ? " active" : ""}" data-nav="${n.id}">
          <i class="fa-solid ${n.icon}" aria-hidden="true"></i><span>${n.label}</span></a>`
          )
          .join("")}
      </nav>
      <div class="sidebar-foot">
        <p class="sidebar-points-label">Wallet</p>
        <p id="sidebar-points" class="sidebar-points-val">0 pts</p>
        <a href="settings.html" class="sidebar-link"><i class="fa-solid fa-gear"></i><span>Settings</span></a>
      </div>`;
  }

  const bottom = $("#app-bottom-nav");
  if (bottom && !bottom.dataset.built) {
    bottom.dataset.built = "1";
    bottom.innerHTML = navItems
      .map(
        (n) => `<a href="${n.href}" class="bottom-link${n.scan ? " bottom-scan" : ""}${n.id === pageId ? " active" : ""}" data-nav="${n.id}">
        <i class="fa-solid ${n.icon}" aria-hidden="true"></i><span>${n.label}</span></a>`
      )
      .join("");
  }

  $("#header-notify")?.addEventListener("click", () => {
    location.href = "notifications.html";
  });
  $("#header-settings")?.addEventListener("click", () => {
    location.href = "settings.html";
  });
}

export function bootProtected(pageId, onReady) {
  initAppShell(pageId);
  window.addEventListener("load", () => setTimeout(hideLoader, 600));

  subscribeAuth(async (user) => {
    if (!user) {
      if (PROTECTED.has(pageId)) location.href = "login.html";
      return;
    }
    currentUser = user;
    try {
      currentProfile = await getUserProfile(user.uid);
      renderUserChrome(user, currentProfile);
      if (typeof onReady === "function") onReady(user, currentProfile);
    } catch (err) {
      console.error(err);
      toast("Unable to load profile", "error");
    }
  });
}

export async function confirmLogout() {
  try {
    await logoutUser();
    location.href = "login.html";
  } catch {
    toast("Logout failed", "error");
  }
}
