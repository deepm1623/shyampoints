import { subscribeAuth } from "../../firebase.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { app } from "../../firebase.js";

const db = getFirestore(app);

export async function requireAdminRole() {
  return new Promise((resolve, reject) => {
    const unsub = subscribeAuth(async (user) => {
      unsub();
      if (!user) {
        reject(new Error("not-authenticated"));
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        reject(new Error("no-profile"));
        return;
      }
      const role = String(snap.data().role || "").toLowerCase();
      if (role !== "admin") {
        reject(new Error("not-admin"));
        return;
      }
      resolve(user);
    });
  });
}

export function guardAdminPage(loginPath = "admin-login.html") {
  requireAdminRole().catch((err) => {
    console.warn("[Admin] Access denied:", err.message);
    location.href = loginPath;
  });
}
