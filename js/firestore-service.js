import { db, getMembership } from "../firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export { getMembership };

export function normalizeProfile(data = {}) {
  const currentPoints =
    data.currentPoints !== undefined && data.currentPoints !== null
      ? Number(data.currentPoints)
      : data.points !== undefined && data.points !== null
        ? Number(data.points)
        : null;

  const lifetimePoints =
    data.lifetimePoints !== undefined && data.lifetimePoints !== null
      ? Number(data.lifetimePoints)
      : currentPoints;

  const walletBalance =
    data.walletBalance !== undefined && data.walletBalance !== null
      ? Number(data.walletBalance)
      : currentPoints;

  const tier =
    data.tier || data.membership || (currentPoints !== null ? getMembership(currentPoints) : null);

  return {
    ...data,
    fullName: data.fullName || data.name || "",
    name: data.fullName || data.name || "",
    mobile: data.mobile || data.phone || "",
    phone: data.mobile || data.phone || "",
    currentPoints,
    points: currentPoints,
    lifetimePoints,
    walletBalance,
    tier,
    membership: tier,
    totalScans: Number(data.totalScans ?? data.productsScanned ?? 0),
    rewardsRedeemed: Number(data.rewardsRedeemed ?? 0),
  };
}

export function displayValue(value, formatter) {
  if (value === null || value === undefined || value === "") return "--";
  return formatter ? formatter(value) : String(value);
}

export function formatTimestamp(ts) {
  if (!ts) return { date: "--", time: "--", relative: "--" };
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return { date: "--", time: "--", relative: "--" };
  return {
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    relative: d.toLocaleString("en-IN"),
    raw: d,
  };
}

export function subscribeUserProfile(uid, onData, onError) {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => onData(snap.exists() ? normalizeProfile(snap.data()) : null),
    onError
  );
}

export function subscribeTransactions(uid, onData, onError, max = 50) {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    },
    onError
  );
}

export function subscribeRewards(onData, onError) {
  const q = query(collection(db, "rewards"), where("status", "==", "active"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribeNotifications(uid, onData, onError, max = 40) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function updateUserProfile(uid, fields) {
  const payload = { ...fields };
  if (payload.fullName) payload.name = payload.fullName;
  if (payload.mobile) payload.phone = payload.mobile;
  await updateDoc(doc(db, "users", uid), payload);
}

const PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function photoExtension(file) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] || "jpg";
}

export function validateProfilePhoto(file) {
  if (!file) {
    const err = new Error("No file selected");
    err.code = "photo-missing";
    throw err;
  }
  if (!PHOTO_TYPES.has(file.type)) {
    const err = new Error("Use JPG, PNG, or WEBP");
    err.code = "photo-type";
    throw err;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    const err = new Error("Image must be 5 MB or smaller");
    err.code = "photo-size";
    throw err;
  }
}

export async function uploadProfilePhoto(uid, file) {
  validateProfilePhoto(file);
  const { storage, auth } = await import("../firebase.js");
  const { ref, uploadBytes, getDownloadURL } = await import(
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js"
  );
  const { updateProfile } = await import(
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"
  );

  const ext = photoExtension(file);
  const storageRef = ref(storage, `profile-photos/${uid}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const photoURL = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", uid), { photoURL, avatarUrl: photoURL });
  if (auth.currentUser?.uid === uid) {
    await updateProfile(auth.currentUser, { photoURL });
  }

  return photoURL;
}

export async function removeProfilePhoto(uid) {
  const { storage, auth } = await import("../firebase.js");
  const { ref, deleteObject } = await import(
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js"
  );
  const { updateProfile } = await import(
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"
  );

  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    try {
      await deleteObject(ref(storage, `profile-photos/${uid}.${ext}`));
    } catch {
      /* file may not exist */
    }
  }

  await updateDoc(doc(db, "users", uid), { photoURL: "", avatarUrl: "" });
  if (auth.currentUser?.uid === uid) {
    await updateProfile(auth.currentUser, { photoURL: null });
  }
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
}

export async function markAllNotificationsRead(uid) {
  const q = query(collection(db, "notifications"), where("userId", "==", uid));
  const snap = await getDocs(q);
  const unread = snap.docs.filter((d) => !d.data().read);
  await Promise.all(unread.map((d) => updateDoc(d.ref, { read: true })));
}

export async function processQrScan(userId, qrIdRaw) {
  const qrId = String(qrIdRaw || "").trim();
  if (!qrId) {
    const err = new Error("Invalid QR Code");
    err.code = "qr-invalid";
    throw err;
  }

  const userRef = doc(db, "users", userId);
  const qrRef = doc(db, "qr_codes", qrId);

  return runTransaction(db, async (transaction) => {
    const qrSnap = await transaction.get(qrRef);
    if (!qrSnap.exists()) {
      const err = new Error("Invalid QR Code");
      err.code = "qr-invalid";
      throw err;
    }

    const qr = qrSnap.data();
    if (qr.status === "used") {
      const err = new Error("QR already redeemed");
      err.code = "qr-used";
      throw err;
    }

    const points = Number(qr.points) || 0;
    const userSnap = await transaction.get(userRef);
    const user = userSnap.exists() ? userSnap.data() : {};
    const current = Number(user.currentPoints ?? user.points ?? 0);
    const lifetime = Number(user.lifetimePoints ?? current);
    const wallet = Number(user.walletBalance ?? current);
    const newCurrent = current + points;
    const newLifetime = lifetime + points;
    const newWallet = wallet + points;
    const tier = getMembership(newCurrent);
    const totalScans = Number(user.totalScans ?? user.productsScanned ?? 0) + 1;

    transaction.update(qrRef, {
      status: "used",
      usedBy: userId,
      usedAt: serverTimestamp(),
    });

    transaction.set(
      userRef,
      {
        uid: userId,
        currentPoints: newCurrent,
        points: newCurrent,
        lifetimePoints: newLifetime,
        walletBalance: newWallet,
        tier,
        membership: tier,
        totalScans,
        productsScanned: totalScans,
      },
      { merge: true }
    );

    const txRef = doc(collection(db, "transactions"));
    transaction.set(txRef, {
      userId,
      type: "scan",
      points,
      description: `QR scan · ${points} pts`,
      qrId,
      createdAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, "notifications"));
    transaction.set(notifRef, {
      userId,
      title: "Points earned",
      body: `You earned ${points} points from a verified QR scan.`,
      type: "earn",
      read: false,
      createdAt: serverTimestamp(),
    });

    return { points, qrId };
  });
}

export async function redeemRewardItem(userId, reward) {
  const pointsRequired = Number(reward.pointsRequired) || 0;
  const userRef = doc(db, "users", userId);
  const rewardRef = doc(db, "rewards", reward.id);

  return runTransaction(db, async (transaction) => {
    const rewardSnap = await transaction.get(rewardRef);
    if (!rewardSnap.exists() || rewardSnap.data().status !== "active") {
      const err = new Error("Reward is no longer available");
      err.code = "reward-unavailable";
      throw err;
    }

    const rewardData = rewardSnap.data();
    const stock = Number(rewardData.stock ?? 0);
    if (stock <= 0) {
      const err = new Error("Reward out of stock");
      err.code = "reward-stock";
      throw err;
    }

    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      const err = new Error("User profile not found");
      throw err;
    }

    const user = userSnap.data();
    const current = Number(user.currentPoints ?? user.points ?? 0);
    if (current < pointsRequired) {
      const err = new Error("Not enough points");
      err.code = "insufficient-points";
      throw err;
    }

    const newCurrent = current - pointsRequired;
    const wallet = Number(user.walletBalance ?? current);
    const newWallet = Math.max(0, wallet - pointsRequired);
    const tier = getMembership(newCurrent);
    const redeemed = Number(user.rewardsRedeemed ?? 0) + 1;

    transaction.update(rewardRef, { stock: increment(-1) });

    transaction.set(
      userRef,
      {
        currentPoints: newCurrent,
        points: newCurrent,
        walletBalance: newWallet,
        tier,
        membership: tier,
        rewardsRedeemed: redeemed,
      },
      { merge: true }
    );

    const txRef = doc(collection(db, "transactions"));
    transaction.set(txRef, {
      userId,
      type: "redemption",
      points: -pointsRequired,
      description: `Redeemed · ${rewardData.title || "Reward"}`,
      rewardId: reward.id,
      createdAt: serverTimestamp(),
    });

    const redemptionRef = doc(collection(db, "redemptions"));
    transaction.set(redemptionRef, {
      userId,
      rewardId: reward.id,
      rewardTitle: rewardData.title || "",
      pointsUsed: pointsRequired,
      status: "completed",
      createdAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, "notifications"));
    transaction.set(notifRef, {
      userId,
      title: "Reward redeemed",
      body: `You redeemed ${rewardData.title || "a reward"} for ${pointsRequired} points.`,
      type: "redeem",
      read: false,
      createdAt: serverTimestamp(),
    });

    return { pointsUsed: pointsRequired };
  });
}

export function sumPointsToday(transactions) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return transactions.reduce((sum, tx) => {
    if (tx.points <= 0) return sum;
    const { raw } = formatTimestamp(tx.createdAt);
    if (!raw || raw < start) return sum;
    return sum + Number(tx.points);
  }, 0);
}
