import { subscribeAuth, logoutUser } from "../firebase.js";
import {
  subscribeUserProfile,
  normalizeProfile,
  displayValue,
  getMembership,
} from "./firestore-service.js";

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export let currentUser = null;
export let currentProfile = null;

let profileUnsub = null;

const PROTECTED = new Set([
  "dashboard",
  "profile",
  "rewards",
  "history",
  "scanner",
  "notifications",
  "settings",
]);

export function format(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "--";
  return new Intl.NumberFormat("en-IN").format(Math.round(Number(n)));
}

export function membershipProgress(points, tier) {
  if (points === null || tier === null) return { percent: 0, next: "No tier data available" };
  if (tier === "Platinum") return { percent: 100, next: "Top tier unlocked" };
  if (tier === "Gold")
    return { percent: Math.min(100, ((points - 1500) / 3500) * 100), next: `${format(Math.max(0, 5000 - points))} pts to Platinum` };
  if (tier === "Silver")
    return { percent: Math.min(100, ((points - 500) / 1000) * 100), next: `${format(Math.max(0, 1500 - points))} pts to Gold` };
  return { percent: Math.min(100, (points / 500) * 100), next: `${format(Math.max(0, 500 - points))} pts to Silver` };
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

export function hideLoader() {
  $("#sp-loader")?.classList.add("hidden");
}

export function applyTheme() {
  const theme = localStorage.getItem("sp-theme") || "light";
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

export function emptyState(message = "No data available") {
  return `<div class="empty-state" role="status"><i class="fa-solid fa-inbox" aria-hidden="true"></i><p>${message}</p></div>`;
}

export function skeletonLines(n = 3) {
  return `<div class="skeleton-block" aria-hidden="true">${Array.from({ length: n })
    .map(() => '<div class="skeleton-line"></div>')
    .join("")}</div>`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setSrc(id, src) {
  const el = document.getElementById(id);
  if (!el) return;
  if (src) {
    el.src = src;
    el.classList.remove("avatar-placeholder");
  } else {
    el.removeAttribute("src");
    el.classList.add("avatar-placeholder");
  }
}

export function renderUserChrome(user, profile) {
  const p = normalizeProfile(profile || {});
  const name = p.fullName || user.displayName || null;
  const currentPoints = p.currentPoints;
  const lifetimePoints = p.lifetimePoints;
  const walletBalance = p.walletBalance;
  const tier = p.tier || (currentPoints !== null ? getMembership(currentPoints) : null);
  const avatar = user.photoURL || "";

  if (name) {
    setText("welcome-name", name.split(" ")[0]);
    setText("header-user-name", name);
    setText("profile-name", name);
  } else {
    setText("welcome-name", "--");
    setText("header-user-name", "--");
    setText("profile-name", "--");
  }

  setText("hero-id", `Member ID · SP-${user.uid.slice(0, 8).toUpperCase()}`);
  setText("profile-id", `SP-${user.uid.slice(0, 8).toUpperCase()}`);

  setText("hero-points", currentPoints !== null ? `${format(currentPoints)} pts` : "--");
  setText("wallet-points", walletBalance !== null ? `${format(walletBalance)} pts` : "--");
  setText("lifetime-points", lifetimePoints !== null ? `${format(lifetimePoints)} pts` : "--");
  setText("sidebar-points", walletBalance !== null ? `${format(walletBalance)} pts` : currentPoints !== null ? `${format(currentPoints)} pts` : "--");
  setText("profile-points", currentPoints !== null ? `${format(currentPoints)} pts` : "--");
  setText("profile-lifetime", lifetimePoints !== null ? `${format(lifetimePoints)} pts` : "--");
  setText("profile-wallet", walletBalance !== null ? `${format(walletBalance)} pts` : "--");

  setText("profile-email", displayValue(p.email || user.email));
  setText("profile-phone", displayValue(p.mobile));
  setText("profile-city", displayValue(p.city));
  setText("profile-role", displayValue(p.role));

  setText("dash-role", displayValue(p.role));
  setText("dash-city", displayValue(p.city));
  setText("dash-wallet", walletBalance !== null ? `${format(walletBalance)} pts` : "--");
  setText("dash-current-points", currentPoints !== null ? `${format(currentPoints)} pts` : "--");
  setText("dash-lifetime-points", lifetimePoints !== null ? `${format(lifetimePoints)} pts` : "--");
  setText("stat-current", currentPoints !== null ? format(currentPoints) : "--");
  setText("stat-lifetime", lifetimePoints !== null ? format(lifetimePoints) : "--");
  setText("header-points-badge", currentPoints !== null ? `${format(currentPoints)} pts` : "--");
  setText("insights-wallet", walletBalance !== null ? `${format(walletBalance)} pts` : "--");
  setText("insights-rank", "--");

  ["avatar", "profile-avatar", "header-avatar"].forEach((id) => setSrc(id, avatar));

  $$("[data-tier]").forEach((el) => {
    if (tier) {
      el.textContent = tier;
      const t = tier.toLowerCase();
      if (el.classList.contains("sp-pill")) el.className = `sp-pill ${t}`;
      else el.className = `sp-badge ${t}${el.classList.contains("tier-lg") ? " tier-lg" : ""}`.trim();
      el.hidden = false;
    } else {
      el.textContent = "--";
      el.hidden = false;
    }
  });

  const prog = membershipProgress(currentPoints ?? 0, tier);
  const progress = currentPoints !== null && tier ? `${Math.min(100, prog.percent)}%` : "0%";
  const bar = $("#hero-progress");
  if (bar) bar.style.width = progress;
  const insightsBar = $("#insights-progress");
  if (insightsBar) insightsBar.style.width = progress;
  const nextText = tier ? prog.next : "No tier data available";
  setText("next-tier-text", nextText);
  setText("insights-next-tier", nextText);

  setText(
    "stat-scans",
    p.totalScans !== undefined && p.totalScans !== null ? format(p.totalScans) : "--"
  );
  setText(
    "stat-redeemed",
    p.rewardsRedeemed !== undefined && p.rewardsRedeemed !== null ? format(p.rewardsRedeemed) : "--"
  );

  return { ...p, tier, name };
}

export function initAppShell(pageId) {
  applyTheme();
  document.body.dataset.page = pageId;

  const navItems = [
    { id: "dashboard", href: "dashboard.html", icon: "fa-house", label: "Dashboard" },
    { id: "scanner", href: "scanner.html", icon: "fa-qrcode", label: "Scan QR", scan: true },
    { id: "rewards", href: "rewards.html", icon: "fa-gift", label: "Rewards" },
    { id: "history", href: "history.html", icon: "fa-arrow-right-arrow-left", label: "Transactions" },
    { id: "notifications", href: "notifications.html", icon: "fa-bell", label: "Notifications" },
    { id: "profile", href: "profile.html", icon: "fa-user", label: "Profile" },
    { id: "settings", href: "settings.html", icon: "fa-gear", label: "Settings" },
  ];

  const bottomNav = [
    { id: "dashboard", href: "dashboard.html", icon: "fa-house", label: "Home" },
    { id: "scanner", href: "scanner.html", icon: "fa-qrcode", label: "Scan", scan: true },
    { id: "rewards", href: "rewards.html", icon: "fa-gift", label: "Rewards" },
    { id: "history", href: "history.html", icon: "fa-clock-rotate-left", label: "History" },
    { id: "profile", href: "profile.html", icon: "fa-user", label: "Profile" },
  ];

  const sidebar = $("#app-sidebar");
  if (sidebar && !sidebar.dataset.builtV2) {
    sidebar.dataset.builtV2 = "1";
    sidebar.innerHTML = `
      <a class="sp-sidebar-brand" href="dashboard.html">
        <img src="shyam points logo.png" alt="Shyam Points" width="44" height="44" />
        <div class="sp-sidebar-brand-text">
          <strong>Shyam Points</strong>
          <small>BY SHYAM SANITARIES</small>
        </div>
      </a>
      <nav class="sp-sidebar-nav" aria-label="Main navigation">
        ${navItems
          .map(
            (n) => `<a href="${n.href}" class="sp-nav-link${n.id === pageId ? " active" : ""}" data-nav="${n.id}">
          <span class="sp-nav-icon"><i class="fa-solid ${n.icon}" aria-hidden="true"></i></span>
          <span>${n.label}</span></a>`
          )
          .join("")}
      </nav>
      <div class="sp-sidebar-foot">
        <div class="sp-wallet-chip">
          <small>Wallet balance</small>
          <strong id="sidebar-points">--</strong>
        </div>
        <button type="button" class="sp-nav-link sp-nav-logout" id="sidebar-logout">
          <span class="sp-nav-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
          <span>Logout</span>
        </button>
      </div>`;
    $("#sidebar-logout")?.addEventListener("click", () => confirmLogout());
  }

  const bottom = $("#app-bottom-nav");
  if (bottom && !bottom.dataset.builtV2) {
    bottom.dataset.builtV2 = "1";
    bottom.innerHTML = bottomNav
      .map(
        (n) => `<a href="${n.href}" class="sp-bottom-link${n.scan ? " sp-bottom-scan" : ""}${n.id === pageId ? " active" : ""}" data-nav="${n.id}">
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
  $("#header-avatar")?.addEventListener("click", () => {
    location.href = "profile.html";
  });
}

export function bootProtected(pageId, onReady) {
  initAppShell(pageId);
  window.addEventListener("load", () => setTimeout(hideLoader, 500));

  const unsubAuth = subscribeAuth(async (user) => {
    if (!user) {
      profileUnsub?.();
      profileUnsub = null;
      currentUser = null;
      currentProfile = null;
      if (PROTECTED.has(pageId)) location.href = "login.html";
      return;
    }

    currentUser = user;

    profileUnsub?.();
    profileUnsub = subscribeUserProfile(
      user.uid,
      (profile) => {
        currentProfile = profile;
        renderUserChrome(user, profile);
        if (typeof onReady === "function") onReady(user, profile);
        hideLoader();
      },
      (err) => {
        console.error(err);
        toast("Unable to load profile", "error");
        hideLoader();
      }
    );
  });

  return () => {
    unsubAuth();
    profileUnsub?.();
  };
}

export async function confirmLogout() {
  try {
    profileUnsub?.();
    await logoutUser();
    location.href = "login.html";
  } catch {
    toast("Logout failed", "error");
  }
}
