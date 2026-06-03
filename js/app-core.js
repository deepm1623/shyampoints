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

export function formatCount(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "0";
  return format(n);
}

export function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "SP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ensureAvatarWrap(img) {
  if (!img || img.dataset.avatarWrapped) return img.parentElement?.querySelector(".sp-avatar-fallback");
  const wrap = document.createElement("span");
  wrap.className = "sp-avatar-wrap";
  img.parentNode.insertBefore(wrap, img);
  wrap.appendChild(img);
  const fallback = document.createElement("span");
  fallback.className = "sp-avatar-fallback";
  fallback.setAttribute("aria-hidden", "true");
  wrap.appendChild(fallback);
  img.dataset.avatarWrapped = "1";
  return fallback;
}

export function applyAvatar(img, url, name) {
  if (!img) return;
  const fallback = ensureAvatarWrap(img);
  const initials = getInitials(name);
  if (fallback) fallback.textContent = initials;

  img.onerror = () => {
    img.hidden = true;
    img.removeAttribute("src");
    if (fallback) fallback.hidden = false;
  };

  if (url) {
    img.hidden = false;
    if (fallback) fallback.hidden = true;
    img.classList.remove("avatar-placeholder");
    img.src = url;
  } else {
    img.hidden = true;
    img.removeAttribute("src");
    img.classList.add("avatar-placeholder");
    if (fallback) fallback.hidden = false;
  }
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

function memberIdFromUid(uid) {
  return `SP-${String(uid || "").slice(0, 8).toUpperCase()}`;
}

function ensureTopbarLayout() {
  const left = $(".sp-topbar-left");
  if (!left || left.dataset.builtTopbar) return;
  left.dataset.builtTopbar = "1";
  if (document.body.dataset.page === "dashboard") return;
  left.innerHTML = `
    <p class="sp-greeting">Hello, <span id="welcome-name">Member</span> 👋</p>
    <p class="sp-topbar-member"><span class="sp-member-label">Member ID:</span> <span id="hero-id">--</span></p>
    <p class="sp-topbar-tier-row"><span data-tier class="sp-pill">--</span></p>`;
}

export function renderUserChrome(user, profile) {
  ensureTopbarLayout();

  const hasProfile = profile !== null && profile !== undefined;
  const p = normalizeProfile(profile || {});
  const name = p.fullName || user.displayName || "";
  const currentPoints = hasProfile ? (p.currentPoints ?? 0) : null;
  const lifetimePoints = hasProfile ? (p.lifetimePoints ?? 0) : null;
  const walletBalance = hasProfile ? (p.walletBalance ?? 0) : null;
  const tier =
    p.tier || (hasProfile && currentPoints !== null ? getMembership(currentPoints) : null);
  const avatar = p.profileImage || p.photoURL || p.avatarUrl || user.photoURL || "";
  const memberId = p.memberId || memberIdFromUid(user.uid);

  setText("welcome-name", name || "Member");
  setText("header-user-name", name || "Member");
  setText("profile-name", name || "—");

  setText("hero-id", memberId);
  setText("profile-id", memberId);

  const pts = (n) => (hasProfile ? `${formatCount(n)} pts` : "0 pts");
  setText("hero-points", pts(currentPoints));
  setText("wallet-points", pts(walletBalance));
  setText("lifetime-points", pts(lifetimePoints));
  setText("sidebar-points", pts(walletBalance));
  setText("profile-points", pts(currentPoints));
  setText("profile-lifetime", pts(lifetimePoints));
  setText("profile-wallet", pts(walletBalance));

  setText("profile-email", displayValue(p.email || user.email, null, "—"));
  setText("profile-phone", displayValue(p.mobile, null, "—"));
  setText("profile-city", displayValue(p.city, null, "—"));
  setText("profile-role", displayValue(p.role, null, "—"));

  setText("dash-role", displayValue(p.role, null, "—"));
  setText("dash-city", displayValue(p.city, null, "—"));
  setText("header-points-badge", pts(currentPoints));
  setText("dash-tier-label", tier ? `${tier} Member` : "Member");

  ["avatar", "profile-avatar", "header-avatar", "dash-header-avatar"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) applyAvatar(el, avatar, name || user.email);
  });

  const settingsPreview = document.getElementById("settings-photo-preview");
  if (settingsPreview) applyAvatar(settingsPreview, avatar, name || user.email);

  $$("[data-tier]").forEach((el) => {
    if (el.id === "dash-tier-label") return;
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
  const onDashboard = document.body.dataset.page === "dashboard";
  if (!onDashboard) {
    const bar = $("#tier-progress-bar");
    if (bar) bar.style.width = progress;
    const nextText = tier ? prog.next : "No tier data available";
    setText("next-tier-text", nextText);
  }

  if (typeof window.__dashUpdateStats === "function" && hasProfile) {
    window.__dashUpdateStats({
      wallet: walletBalance ?? 0,
      lifetime: lifetimePoints ?? 0,
      scans: p.totalScans ?? 0,
      redeemed: p.rewardsRedeemed ?? 0,
      currentPoints: currentPoints ?? 0,
      tier,
    });
  }

  if (typeof window.__dashUpdateTier === "function" && hasProfile) {
    window.__dashUpdateTier(currentPoints ?? 0, tier);
  }

  const settingsRole = document.getElementById("settings-role");
  if (settingsRole) settingsRole.value = p.role || "";

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
    { id: "rewards", href: "rewards.html", icon: "fa-gift", label: "Rewards" },
    { id: "scanner", href: "scanner.html", icon: "fa-qrcode", label: "Scan", scan: true },
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
  if (bottom && !bottom.dataset.builtV5) {
    bottom.dataset.builtV5 = "1";
    bottom.innerHTML = bottomNav
      .map((n) => {
        if (n.scan) {
          return `<a href="${n.href}" class="sp-bottom-scan${n.id === pageId ? " active" : ""}" data-nav="${n.id}" aria-label="Scan QR">
            <i class="fa-solid ${n.icon}" aria-hidden="true"></i>
            <span>${n.label}</span>
          </a>`;
        }
        return `<a href="${n.href}" class="sp-bottom-link${n.id === pageId ? " active" : ""}" data-nav="${n.id}">
          <i class="fa-solid ${n.icon}" aria-hidden="true"></i><span>${n.label}</span></a>`;
      })
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
  ensureTopbarLayout();
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
