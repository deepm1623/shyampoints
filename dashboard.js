/**
 * Shyam Points — Premium Dashboard
 */
import { bootProtected, $, format } from "./js/app-core.js";
import {
  subscribeTransactions,
  subscribeRewards,
  subscribeNotifications,
  subscribeAnnouncements,
  subscribeLeaderboard,
  formatTimestamp,
  aggregateMonthlyPoints,
  getMembership,
} from "./js/firestore-service.js";

let txUnsub = null;
let rewardsUnsub = null;
let notifUnsub = null;
let announceUnsub = null;
let leaderboardUnsub = null;
let pointsChart = null;
let latestTx = [];
let latestNotif = [];

const TIERS = [
  { name: "Bronze", min: 0, next: "Silver", nextMin: 500 },
  { name: "Silver", min: 500, next: "Gold", nextMin: 1500 },
  { name: "Gold", min: 1500, next: "Platinum", nextMin: 5000 },
  { name: "Platinum", min: 5000, next: null, nextMin: null },
];

function animateCounter(el, target) {
  if (!el) return;
  const end = Math.max(0, Math.round(Number(target) || 0));
  const start = Number(el.dataset.count) || 0;
  if (start === end) {
    el.textContent = format(end);
    return;
  }
  const duration = 700;
  const t0 = performance.now();
  function frame(t) {
    const p = Math.min((t - t0) / duration, 1);
    const val = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
    el.textContent = format(val);
    if (p < 1) requestAnimationFrame(frame);
    else {
      el.dataset.count = String(end);
      el.textContent = format(end);
    }
  }
  requestAnimationFrame(frame);
}

window.__dashUpdateStats = ({ wallet, lifetime, scans, redeemed }) => {
  animateCounter($("#stat-wallet"), wallet);
  animateCounter($("#stat-lifetime"), lifetime);
  animateCounter($("#stat-scans"), scans);
  animateCounter($("#stat-redeemed"), redeemed);
};

window.__dashUpdateTier = (points, tierName) => {
  const tier = tierName || getMembership(points);
  const idx = Math.max(0, TIERS.findIndex((t) => t.name === tier));
  const current = TIERS[idx];
  const next = TIERS[idx + 1];

  const fromEl = $("#tier-from");
  const toEl = $("#tier-to");
  if (fromEl) {
    fromEl.textContent = current.name;
    fromEl.className = `dash-tier-badge ${current.name.toLowerCase()}`;
  }
  if (toEl) {
    toEl.textContent = next ? next.name : "Max";
    toEl.className = `dash-tier-badge ${(next ? next.name : "Platinum").toLowerCase()}`;
  }

  setText("tier-current-val", `${format(points)} pts`);
  if (next) {
    setText("tier-required-val", `${format(next.nextMin)} pts`);
    setText("next-tier-text", `${format(Math.max(0, next.nextMin - points))} more points needed for ${next.name}`);
    const pct = Math.min(100, ((points - current.min) / (next.nextMin - current.min)) * 100);
    const bar = $("#tier-progress-bar");
    if (bar) bar.style.width = `${pct}%`;
  } else {
    setText("tier-required-val", "—");
    setText("next-tier-text", "Top tier unlocked — keep earning!");
    const bar = $("#tier-progress-bar");
    if (bar) bar.style.width = "100%";
  }
};

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dashEmpty(msg) {
  return `<div class="dash-empty" role="status"><i class="fa-solid fa-inbox"></i><p>${msg}</p></div>`;
}

function productName(tx) {
  if (tx.product) return tx.product;
  const d = tx.description || "";
  const m = d.match(/QR scan · (.+)/i);
  return m ? m[1] : d.replace(/^QR scan · /i, "") || "QR Scan";
}

function renderRecentScans(list) {
  const el = $("#recent-scans-list");
  if (!el) return;
  const scans = list.filter((t) => t.type === "scan");
  if (!scans.length) {
    el.innerHTML = dashEmpty("No QR scans yet");
    return;
  }
  el.innerHTML = scans
    .slice(0, 5)
    .map((tx) => {
      const { date, time } = formatTimestamp(tx.createdAt);
      const pts = Number(tx.points) || 0;
      return `<article class="dash-scan-item">
        <div class="dash-scan-icon"><i class="fa-solid fa-qrcode"></i></div>
        <div class="dash-scan-meta">
          <h4>${esc(productName(tx))}</h4>
          <p>${esc(tx.qrCode || tx.qrId || "—")} · ${date} · ${time}</p>
        </div>
        <span class="dash-scan-pts">+${format(pts)} pts</span>
      </article>`;
    })
    .join("");
}

function renderRewards(list) {
  const el = $("#featured-rewards");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = dashEmpty("No rewards available");
    return;
  }
  el.innerHTML = list
    .slice(0, 4)
    .map((r) => {
      const pts = Number(r.pointsRequired) || 0;
      const img = r.image
        ? `<img src="${esc(r.image)}" alt="" loading="lazy" />`
        : `<div class="dash-reward-placeholder">🎁</div>`;
      return `<article class="dash-reward-mini">${img}<h4>${esc(r.title || "Reward")}</h4><p>${format(pts)} pts</p></article>`;
    })
    .join("");
}

function renderChart(transactions) {
  const canvas = document.getElementById("points-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const months = aggregateMonthlyPoints(transactions);
  if (pointsChart) {
    pointsChart.data.labels = months.map((m) => m.label);
    pointsChart.data.datasets[0].data = months.map((m) => m.total);
    pointsChart.update("active");
    return;
  }
  pointsChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: months.map((m) => m.label),
      datasets: [{
        data: months.map((m) => m.total),
        backgroundColor: "rgba(37, 99, 235, 0.75)",
        hoverBackgroundColor: "#2563eb",
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (v) => format(v) } },
      },
    },
  });
}

function renderLeaderboard(list, uid) {
  const el = $("#leaderboard-list");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = dashEmpty("Leaderboard updates soon");
    return;
  }
  el.innerHTML = list
    .slice(0, 10)
    .map((e, i) => {
      const you = e.userId === uid;
      return `<div class="dash-lb-row${you ? " is-you" : ""}">
        <span class="dash-lb-rank">${e.rank ?? i + 1}</span>
        <span class="dash-lb-name">${esc(e.name || e.fullName || "Member")}${you ? " (You)" : ""}</span>
        <span class="dash-lb-pts">${format(Number(e.points) || 0)} pts</span>
      </div>`;
    })
    .join("");
}

function renderAnnouncements(list) {
  const el = $("#announcements-list");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = dashEmpty("No announcements");
    return;
  }
  el.innerHTML = list
    .map(
      (a) => `<article class="dash-announce-item"><h4>${esc(a.title || "Update")}</h4><p>${esc(a.body || a.message || "")}</p></article>`
    )
    .join("");
}

function renderActivityFeed(transactions, notifications) {
  const el = $("#activity-feed");
  if (!el) return;
  const items = [];

  transactions.forEach((tx) => {
    const { relative } = formatTimestamp(tx.createdAt);
    const pts = Number(tx.points) || 0;
    let text = tx.description || "Activity";
    if (tx.type === "scan" && pts > 0) text = `You earned ${format(pts)} points`;
    if (tx.type === "redemption") text = `Reward redeemed (${format(Math.abs(pts))} pts)`;
    items.push({ ts: tx.createdAt, text, time: relative, kind: tx.type === "redemption" ? "redeem" : "earn" });
  });

  notifications.slice(0, 8).forEach((n) => {
    const { relative } = formatTimestamp(n.createdAt);
    items.push({
      ts: n.createdAt,
      text: n.title ? `${n.title}${n.body ? ` — ${n.body}` : ""}` : n.body || "Notification",
      time: relative,
      kind: n.type || "system",
    });
  });

  items.sort((a, b) => {
    const da = a.ts?.toDate ? a.ts.toDate().getTime() : 0;
    const db = b.ts?.toDate ? b.ts.toDate().getTime() : 0;
    return db - da;
  });

  if (!items.length) {
    el.innerHTML = dashEmpty("No activity yet");
    return;
  }

  el.innerHTML = items
    .slice(0, 8)
    .map(
      (item) => `<article class="dash-feed-item">
        <span class="dash-feed-dot ${item.kind === "redeem" ? "redeem" : "earn"}"></span>
        <div class="dash-feed-body"><p>${esc(item.text)}</p><small>${esc(item.time)}</small></div>
      </article>`
    )
    .join("");
}

function updateNotifyBadge(list) {
  const badge = $("#notify-badge");
  if (!badge) return;
  const unread = list.filter((n) => !n.read).length;
  badge.hidden = unread <= 0;
  if (unread > 0) badge.textContent = String(unread);
}

bootProtected("dashboard", (user) => {
  $("#dash-avatar-btn")?.addEventListener("click", () => {
    location.href = "profile.html";
  });

  txUnsub = subscribeTransactions(
    user.uid,
    (list) => {
      latestTx = list;
      renderRecentScans(list);
      renderChart(list);
      renderActivityFeed(list, latestNotif);
    },
    () => {
      const el = $("#recent-scans-list");
      if (el) el.innerHTML = dashEmpty("Unable to load scans");
    },
    50
  );

  rewardsUnsub = subscribeRewards(
    (list) => renderRewards(list),
    () => {
      const el = $("#featured-rewards");
      if (el) el.innerHTML = dashEmpty("Unable to load rewards");
    }
  );

  notifUnsub = subscribeNotifications(
    user.uid,
    (list) => {
      latestNotif = list;
      updateNotifyBadge(list);
      renderActivityFeed(latestTx, list);
    },
    () => {},
    20
  );

  announceUnsub = subscribeAnnouncements(
    (list) => renderAnnouncements(list),
    () => {
      const el = $("#announcements-list");
      if (el) el.innerHTML = dashEmpty("Unable to load announcements");
    }
  );

  leaderboardUnsub = subscribeLeaderboard(
    (list) => renderLeaderboard(list, user.uid),
    () => {
      const el = $("#leaderboard-list");
      if (el) el.innerHTML = dashEmpty("Leaderboard unavailable");
    }
  );
});

window.addEventListener("pagehide", () => {
  txUnsub?.();
  rewardsUnsub?.();
  notifUnsub?.();
  announceUnsub?.();
  leaderboardUnsub?.();
  pointsChart?.destroy();
});
