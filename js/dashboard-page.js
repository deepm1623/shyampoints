import { bootProtected, $, format, emptyState, skeletonLines } from "./app-core.js";
import {
  subscribeTransactions,
  subscribeRewards,
  subscribeNotifications,
  formatTimestamp,
} from "./firestore-service.js";

let txUnsub = null;
let rewardsUnsub = null;
let notifUnsub = null;

function renderTransactions(list, target = "#wallet-transactions") {
  const el = $(target);
  if (!el) return;

  if (!list.length) {
    el.innerHTML = emptyState("No activity yet");
    return;
  }

  el.innerHTML = list
    .slice(0, 5)
    .map((tx) => {
      const { date, time } = formatTimestamp(tx.createdAt);
      const pts = Number(tx.points) || 0;
      const neg = pts < 0;
      const icon = tx.type === "redemption" ? "🎁" : tx.type === "scan" ? "📱" : "✨";
      return `<article class="list-item">
        <div class="logo-pill">${icon}</div>
        <div class="item-meta"><h5>${tx.description || tx.type || "Transaction"}</h5><p>${date} · ${time}</p></div>
        <strong class="item-score${neg ? " negative" : ""}">${neg ? "" : "+"}${format(Math.abs(pts))}</strong>
      </article>`;
    })
    .join("");
}

function renderRewards(list, target = "#featured-rewards", compact = false) {
  const el = $(target);
  if (!el) return;

  if (!list.length) {
    if (!compact) el.className = "featured-rewards-grid";
    el.innerHTML = emptyState("No rewards available");
    return;
  }

  if (!compact) el.className = "featured-rewards-grid";
  const html = list
    .slice(0, compact ? 3 : 3)
    .map((r) => {
      const pts = Number(r.pointsRequired);
      const img = r.image
        ? `<img src="${r.image}" alt="" class="reward-card-img" loading="lazy" />`
        : `<div class="reward-card-visual">🎁</div>`;
      if (compact) {
        return `<div class="insight-list-item"><strong>${r.title || "Reward"}</strong><br><span class="muted">${pts ? `${format(pts)} pts` : "--"}</span></div>`;
      }
      return `<article class="reward-card">
        ${img}
        <h4>${r.title || "Reward"}</h4>
        <p class="pts">${pts ? `${format(pts)} pts` : "--"}</p>
        <a href="rewards.html" class="sp-btn sp-btn-primary sp-btn-sm sp-btn-full">View</a>
      </article>`;
    })
    .join("");

  el.innerHTML = html;
}

function renderNotifications(list, target = "#dash-notifications") {
  const el = $(target);
  if (!el) return;

  if (!list.length) {
    el.innerHTML = emptyState("No notifications");
    return;
  }

  el.innerHTML = list
    .slice(0, 4)
    .map((n) => {
      const { relative } = formatTimestamp(n.createdAt);
      return `<article class="notif-card${n.read ? " read" : " unread"}">
        <div class="notif-icon ${n.type || "system"}"><i class="fa-solid fa-bell"></i></div>
        <div><h4 style="margin:0 0 4px;font-size:0.9rem">${n.title || "Notification"}</h4><p style="margin:0;color:var(--sp-muted);font-size:0.8rem">${n.body || ""}</p><small>${relative}</small></div>
      </article>`;
    })
    .join("");
}

function renderInsightsActivity(list) {
  const el = $("#insights-activity");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<p class="muted" style="margin:0;font-size:0.8125rem">No activity yet</p>`;
    return;
  }
  el.innerHTML = list
    .slice(0, 3)
    .map((tx) => {
      const pts = Number(tx.points) || 0;
      return `<div class="insight-list-item"><strong>${tx.description || tx.type}</strong><br><span class="muted">${pts >= 0 ? "+" : ""}${format(pts)} pts</span></div>`;
    })
    .join("");
}

function renderInsightsAnnouncements(list) {
  const el = $("#insights-announcements");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<p class="muted" style="margin:0;font-size:0.8125rem">No announcements</p>`;
    return;
  }
  el.innerHTML = list
    .slice(0, 2)
    .map((n) => `<div class="insight-list-item"><strong>${n.title || "Update"}</strong><br><span class="muted">${n.body || ""}</span></div>`)
    .join("");
}

function updateNotifyBadge(list) {
  const badge = $("#notify-badge");
  if (!badge) return;
  const unread = list.filter((n) => !n.read).length;
  if (unread > 0) {
    badge.textContent = String(unread);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

bootProtected("dashboard", (user) => {
  const txEl = $("#wallet-transactions");
  if (txEl) txEl.innerHTML = skeletonLines(3);
  const frEl = $("#featured-rewards");
  if (frEl) frEl.innerHTML = skeletonLines(2);
  const dnEl = $("#dash-notifications");
  if (dnEl) dnEl.innerHTML = skeletonLines(2);

  txUnsub = subscribeTransactions(
    user.uid,
    (list) => {
      renderTransactions(list);
      renderInsightsActivity(list);
    },
    () => {
      if (txEl) txEl.innerHTML = emptyState("Unable to load activity");
    },
    20
  );

  rewardsUnsub = subscribeRewards(
    (list) => {
      renderRewards(list);
      renderRewards(list, "#insights-rewards", true);
    },
    () => {
      if (frEl) frEl.innerHTML = emptyState("Unable to load rewards");
    }
  );

  notifUnsub = subscribeNotifications(
    user.uid,
    (list) => {
      renderNotifications(list);
      renderInsightsAnnouncements(list);
      updateNotifyBadge(list);
    },
    () => {
      if (dnEl) dnEl.innerHTML = emptyState("Unable to load notifications");
    },
    10
  );
});

window.addEventListener("pagehide", () => {
  txUnsub?.();
  rewardsUnsub?.();
  notifUnsub?.();
});
