import {
  subscribeAuth,
  getUserProfile,
  logoutUser,
  getMembership,
} from "./firebase.js";
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
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let currentUser = null;
let currentProfile = null;
let pendingRedeem = null;
let pendingScanPoints = 0;

window.addEventListener("load", () => setTimeout(() => $("#loader").classList.add("hidden"), 700));
$("#scan-now").addEventListener("click", () => activateScreen("scan-screen", "Scan"));

subscribeAuth(async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  currentUser = user;
  try {
    currentProfile = await getUserProfile(user.uid);
    renderDashboard(user, currentProfile);
  } catch (error) {
    toast("Unable to load dashboard data", "error");
    console.error(error);
  }
});

function renderDashboard(user, profile) {
  const points = Number(profile?.points || 0);
  const redeemed = Number(profile?.rewardsRedeemed || 0);
  const tier = getMembership(points);
  const name = profile?.name || user.displayName || "Shyam Member";
  const scans = Number(profile?.productsScanned || (redeemed * 3 + 9));

  $("#welcome-name").textContent = name;
  $("#hero-id").textContent = `Loyalty ID: SP-${user.uid.slice(0, 8).toUpperCase()}`;
  $("#hero-points").textContent = `${format(points)} Points`;
  $("#wallet-points").textContent = `${format(points)} Points`;
  $("#top-tier").textContent = tier;
  $("#top-tier").className = `tier-badge ${tier.toLowerCase()}`;
  $("#hero-tier").textContent = tier;
  $("#hero-tier").className = `tier-badge ${tier.toLowerCase()}`;
  $("#avatar").src =
    user.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f8cff&color=fff`;
  $("#profile-avatar").src = $("#avatar").src;
  $("#profile-name").textContent = name;
  $("#profile-tier").textContent = tier;
  $("#profile-scans").textContent = format(scans);

  animateValue($("#stat-points"), points);
  animateValue($("#stat-redeemed"), redeemed);
  animateValue($("#stat-scans"), scans);

  const lbYou = $("#lb-you");
  if (lbYou) lbYou.textContent = `${format(points)} pts`;
  const profileEarned = $("#profile-points-earned");
  if (profileEarned) profileEarned.textContent = format(points);

  const prog = membershipProgress(points, tier);
  $("#hero-progress").style.width = `${prog.percent}%`;
  $("#next-tier-text").textContent = prog.next;
  renderTransactions(points, scans);
  renderHistory(points);
}

function membershipProgress(points, tier) {
  if (tier === "Platinum") return { percent: 100, next: "Top tier unlocked." };
  if (tier === "Gold") return { percent: ((points - 1500) / 3500) * 100, next: `${5000 - points} points to Platinum` };
  if (tier === "Silver") return { percent: ((points - 500) / 1000) * 100, next: `${1500 - points} points to Gold` };
  return { percent: (points / 500) * 100, next: `${500 - points} points to Silver` };
}

function renderTransactions(points, scans) {
  const list = [
    { icon: "🚿", brand: "AquaFlow Mixer", meta: "QR Scan Reward", points: `+${Math.max(12, Math.round(points / 100))}` },
    { icon: "🎁", brand: "UPI Cashback", meta: "Reward Redeemed", points: "-220" },
    { icon: "🔧", brand: "Pro Tap Kit", meta: "Box Verification", points: `+${Math.max(6, Math.round(scans / 2))}` },
    { icon: "🏪", brand: "Retail Purchase", meta: "Bonus Campaign", points: "+30" },
  ];
  $("#wallet-transactions").innerHTML = list
    .map(
      (item) =>
        `<article class="list-item"><div class="logo-pill">${item.icon}</div><div class="item-meta"><h5>${item.brand}</h5><p>${item.meta}</p></div><strong class="item-score">${item.points}</strong></article>`
    )
    .join("");
}

function renderHistory(points) {
  const products = [
    { icon: "🚿", name: "Smart Faucet X2", date: "Today, 10:35 AM", pts: `+${Math.max(4, Math.round(points / 120))}` },
    { icon: "🧰", name: "Pipe Connector Set", date: "Yesterday, 04:10 PM", pts: "+14" },
    { icon: "🔩", name: "Valve Pro Series", date: "May 26, 11:22 AM", pts: "+22" },
    { icon: "🚰", name: "Kitchen Mixer Classic", date: "May 24, 02:03 PM", pts: "+18" },
  ];
  $("#history-list").innerHTML = products
    .map(
      (item) =>
        `<article class="list-item"><div class="logo-pill">${item.icon}</div><div class="item-meta"><h5>${item.name}</h5><p>${item.date}</p></div><strong class="item-score">${item.pts}</strong></article>`
    )
    .join("");
}

$$(".nav-item").forEach((item) =>
  item.addEventListener("click", () => activateScreen(item.dataset.screen, item.textContent.trim()))
);
$$(".action-btn").forEach((btn) =>
  btn.addEventListener("click", () => activateScreen(btn.dataset.nav, btn.textContent.trim()))
);

function activateScreen(screenId, label = "") {
  $$(".screen").forEach((screen) => screen.classList.remove("active-screen"));
  $$(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById(screenId)?.classList.add("active-screen");
  const nav = $(`.nav-item[data-screen="${screenId}"]`);
  if (nav) nav.classList.add("active");
  if (label) toast(`${label} opened`, "success");
}

$$(".redeem").forEach((btn) =>
  btn.addEventListener("click", () => {
    const reward = btn.dataset.title;
    const pts = Number(btn.dataset.points);
    pendingRedeem = { reward, pts };
    $("#redeem-title").textContent = `Redeem ${reward}?`;
    $("#redeem-text").textContent = `${format(pts)} points will be deducted from your wallet.`;
    $("#redeem-modal").classList.remove("hidden");
  })
);

$("#cancel-redeem").addEventListener("click", () => ($("#redeem-modal").classList.add("hidden"), (pendingRedeem = null)));
$("#confirm-redeem").addEventListener("click", async () => {
  if (!pendingRedeem || !currentUser) return;
  const points = Number(currentProfile?.points || 0);
  if (points < pendingRedeem.pts) {
    toast("Not enough points for this reward", "error");
    return;
  }
  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      points: points - pendingRedeem.pts,
      rewardsRedeemed: increment(1),
      membership: getMembership(points - pendingRedeem.pts),
    });
    currentProfile = await getUserProfile(currentUser.uid);
    renderDashboard(currentUser, currentProfile);
    toast(`${pendingRedeem.reward} redeemed successfully`, "success");
  } catch (error) {
    toast("Redeem failed. Try again.", "error");
    console.error(error);
  } finally {
    $("#redeem-modal").classList.add("hidden");
    pendingRedeem = null;
  }
});

$("#simulate-scan").addEventListener("click", async () => {
  if (!currentUser) return;
  pendingScanPoints = Math.floor(Math.random() * 80) + 1;
  $("#scan-points-number").textContent = pendingScanPoints;
  $("#scan-points-text").textContent = `You won ${pendingScanPoints} points!`;
  $("#scan-success-modal").classList.remove("hidden");
});

$("#scan-ok").addEventListener("click", async () => {
  if (!currentUser || !pendingScanPoints) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      points: increment(pendingScanPoints),
      productsScanned: increment(1),
      membership: getMembership(Number(currentProfile?.points || 0) + pendingScanPoints),
    });
    currentProfile = await getUserProfile(currentUser.uid);
    renderDashboard(currentUser, currentProfile);
    toast(`+${pendingScanPoints} points added`, "success");
  } catch (error) {
    toast("Scan reward update failed", "error");
    console.error(error);
  } finally {
    pendingScanPoints = 0;
    $("#scan-success-modal").classList.add("hidden");
    activateScreen("home-screen", "Home");
  }
});

$("#history-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  $$("#history-list .list-item").forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "grid" : "none";
  });
});

$("#logout").addEventListener("click", () => $("#logout-modal").classList.remove("hidden"));
$("#cancel-logout").addEventListener("click", () => $("#logout-modal").classList.add("hidden"));
$("#confirm-logout").addEventListener("click", async () => {
  try {
    await logoutUser();
    location.href = "login.html";
  } catch {
    toast("Logout failed", "error");
  }
});

function animateValue(el, target) {
  const start = 0;
  const duration = 900;
  const t0 = performance.now();
  function frame(t) {
    const p = Math.min((t - t0) / duration, 1);
    const v = Math.floor(start + (target - start) * (1 - Math.pow(1 - p, 3)));
    el.textContent = format(v);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function format(n) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("#toast-wrap").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(130%)";
    setTimeout(() => el.remove(), 280);
  }, 2600);
}

window.addEventListener("load", () => {
  setTimeout(() => $("#loader").classList.add("hidden"), 1000);
});
