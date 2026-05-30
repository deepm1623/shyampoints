import { bootProtected, $, $$, toast, emptyState } from "./app-core.js";
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  formatTimestamp,
} from "./firestore-service.js";

let notifUnsub = null;

function iconFor(type) {
  if (type === "earn") return "coins";
  if (type === "redeem") return "gift";
  if (type === "offer") return "tag";
  return "circle-info";
}

function render(list) {
  const el = $("#notifications-list");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = emptyState("No notifications");
    return;
  }

  el.innerHTML = list
    .map(
      (n) => `<article class="notif-card${n.read ? " read" : " unread"}" data-id="${n.id}">
        <div class="notif-icon ${n.type || "system"}"><i class="fa-solid fa-${iconFor(n.type)}"></i></div>
        <div class="notif-body">
          <h4>${n.title || "Notification"}</h4>
          <p>${n.body || ""}</p>
          <small>${formatTimestamp(n.createdAt).relative}</small>
        </div>
        ${n.read ? "" : '<span class="unread-dot" aria-label="Unread"></span>'}
      </article>`
    )
    .join("");

  $$(".notif-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const id = card.dataset.id;
      if (!id || card.classList.contains("read")) return;
      try {
        await markNotificationRead(id);
        card.classList.remove("unread");
        card.querySelector(".unread-dot")?.remove();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

bootProtected("notifications", (user) => {
  const el = $("#notifications-list");
  if (el) el.innerHTML = emptyState("Loading…");

  notifUnsub = subscribeNotifications(
    user.uid,
    render,
    () => {
      if (el) el.innerHTML = emptyState("Unable to load notifications");
    }
  );

  $("#mark-read")?.addEventListener("click", async () => {
    try {
      await markAllNotificationsRead(user.uid);
      toast("All notifications marked as read", "success");
    } catch (err) {
      console.error(err);
      toast("Could not update notifications", "error");
    }
  });
});

window.addEventListener("pagehide", () => notifUnsub?.());
