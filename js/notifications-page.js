import { bootProtected, $, toast } from "./app-core.js";

const NOTIFS = [
  { type: "earn", title: "Points earned", body: "You earned 24 points from AquaFlow Mixer scan.", time: "2h ago" },
  { type: "redeem", title: "Reward redeemed", body: "UPI Cashback of 220 points processed.", time: "Yesterday" },
  { type: "offer", title: "New offer", body: "2× Points Weekend — scan this Saturday & Sunday.", time: "2 days ago" },
  { type: "system", title: "System update", body: "Shyam Points app updated with faster QR scanning.", time: "1 week ago" },
];

bootProtected("notifications", () => {
  const list = $("#notifications-list");
  if (list) {
    list.innerHTML = NOTIFS.map(
      (n) => `<article class="notif-card">
        <div class="notif-icon ${n.type}"><i class="fa-solid fa-${n.type === "earn" ? "coins" : n.type === "redeem" ? "gift" : n.type === "offer" ? "tag" : "circle-info"}"></i></div>
        <div><h4 style="margin:0 0 4px">${n.title}</h4><p style="margin:0;color:var(--sp-muted);font-size:0.875rem">${n.body}</p><small style="color:var(--sp-muted)">${n.time}</small></div>
      </article>`
    ).join("");
  }
  $("#mark-read")?.addEventListener("click", () => toast("All notifications marked as read", "success"));
});
