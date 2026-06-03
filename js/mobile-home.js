/**
 * Mobile dashboard home (≤768px) — Firestore data only.
 */
import { $, format, applyAvatar } from "./app-core.js";
import {
  subscribeBrands,
  subscribeOffers,
  getMembership,
} from "./firestore-service.js";

let brandsUnsub = null;
let offersUnsub = null;

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function mEmpty(msg) {
  return `<div class="m-empty" role="status"><i class="fa-solid fa-inbox"></i><p>${esc(msg)}</p></div>`;
}

const TIERS = [
  { name: "Bronze", min: 0, next: "Silver", nextMin: 500 },
  { name: "Silver", min: 500, next: "Gold", nextMin: 1500 },
  { name: "Gold", min: 1500, next: "Platinum", nextMin: 5000 },
  { name: "Platinum", min: 5000, next: null, nextMin: null },
];

export function updateMobileWallet(profile, user) {
  if (!profile || !document.getElementById("m-wallet-card")) return;

  const p = profile;
  const tier = p.tier || getMembership(p.currentPoints ?? 0);
  const idx = Math.max(0, TIERS.findIndex((t) => t.name === tier));
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const points = Number(p.currentPoints) || 0;

  setText("m-welcome-name", p.fullName || user?.displayName || "Member");
  setText("m-member-id", p.memberId || "--");
  setText("m-tier-badge", `${tier} Member`);
  setText("m-current-pts", format(points));
  setText("m-lifetime-pts", format(p.lifetimePoints ?? 0));
  setText("m-wallet-pts", format(p.walletBalance ?? 0));
  setText("m-role", p.role || "—");
  setText("m-city", p.city || "—");

  const badge = $("#m-tier-pill");
  if (badge) {
    badge.textContent = tier;
    badge.className = `m-tier-pill ${tier.toLowerCase()}`;
  }

  const avatar = p.profileImage || p.photoURL || user?.photoURL || "";
  const av = $("#m-header-avatar");
  if (av) applyAvatar(av, avatar, p.fullName || user?.email);

  if (next) {
    setText("m-next-tier", `${format(Math.max(0, next.nextMin - points))} pts to ${next.name}`);
    const pct = Math.min(100, ((points - current.min) / (next.nextMin - current.min)) * 100);
    const bar = $("#m-tier-progress");
    if (bar) bar.style.width = `${pct}%`;
    setText("m-tier-from", current.name);
    setText("m-tier-to", next.name);
  } else {
    setText("m-next-tier", "Top tier unlocked");
    const bar = $("#m-tier-progress");
    if (bar) bar.style.width = "100%";
    setText("m-tier-from", current.name);
    setText("m-tier-to", "Max");
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderBrands(list) {
  const el = $("#m-brands-scroll");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = mEmpty("No brands yet");
    return;
  }
  const items = list
    .slice(0, 12)
    .map(
      (b) => `<article class="m-brand-chip">
      ${b.logo ? `<img src="${esc(b.logo)}" alt="" loading="lazy" width="48" height="48" />` : `<span class="m-brand-icon"><i class="fa-solid fa-building"></i></span>`}
      <span>${esc(b.name || b.title || "Brand")}</span>
    </article>`
    )
    .join("");
  el.innerHTML = `${items}<a href="rewards.html" class="m-brand-more">View more</a>`;
}

function renderOffers(list) {
  const el = $("#m-offers-scroll");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = mEmpty("No offers available");
    return;
  }
  el.innerHTML = list
    .slice(0, 10)
    .map((o) => {
      const exp = o.expiresAt?.toDate
        ? o.expiresAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : o.expiry || o.expiryDate || "";
      const img = o.image
        ? `<img src="${esc(o.image)}" alt="" loading="lazy" />`
        : `<div class="m-offer-placeholder"><i class="fa-solid fa-tags"></i></div>`;
      return `<article class="m-offer-card">
        ${img}
        <div class="m-offer-body">
          <h4>${esc(o.title || o.name || "Offer")}</h4>
          <p>${esc(o.description || o.body || "")}</p>
          <div class="m-offer-foot">
            <span class="m-offer-pts">+${format(Number(o.pointsReward || o.points || 0))} pts</span>
            ${exp ? `<span class="m-offer-exp">Till ${esc(exp)}</span>` : ""}
          </div>
        </div>
      </article>`;
    })
    .join("");
}

export function initMobileHome(user) {
  if (!document.getElementById("m-home")) return;

  $("#m-header-notify")?.addEventListener("click", () => {
    location.href = "notifications.html";
  });
  $("#m-header-avatar-btn")?.addEventListener("click", () => {
    location.href = "profile.html";
  });

  brandsUnsub?.();
  brandsUnsub = subscribeBrands(
    renderBrands,
    () => {
      const el = $("#m-brands-scroll");
      if (el) el.innerHTML = mEmpty("Unable to load brands");
    }
  );

  offersUnsub?.();
  offersUnsub = subscribeOffers(
    renderOffers,
    () => {
      const el = $("#m-offers-scroll");
      if (el) el.innerHTML = mEmpty("Unable to load offers");
    }
  );
}

export function teardownMobileHome() {
  brandsUnsub?.();
  offersUnsub?.();
  brandsUnsub = null;
  offersUnsub = null;
}
