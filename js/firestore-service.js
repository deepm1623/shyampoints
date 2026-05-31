import { db, storage, auth, ensureAuthReady, firebaseConfig, getMembership } from "../firebase.js";
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
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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
    data.tier || data.membership || (currentPoints !== null ? getMembership(currentPoints) : "Bronze");

  const profileImage = data.profileImage || data.photoURL || data.avatarUrl || "";

  return {
    ...data,
    fullName: data.fullName || data.name || "",
    name: data.fullName || data.name || "",
    mobile: data.mobile || data.phone || "",
    phone: data.mobile || data.phone || "",
    profileImage,
    photoURL: profileImage,
    avatarUrl: profileImage,
    memberId: data.memberId || "",
    currentPoints: currentPoints ?? 0,
    points: currentPoints ?? 0,
    lifetimePoints: lifetimePoints ?? 0,
    walletBalance: walletBalance ?? 0,
    tier,
    membership: tier,
    totalScans: Number(data.totalScans ?? data.productsScanned ?? 0),
    rewardsRedeemed: Number(data.rewardsRedeemed ?? 0),
  };
}

export function displayValue(value, formatter, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
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

function logStorageError(phase, error) {
  console.error(`[Shyam Storage] ${phase}`, {
    code: error?.code,
    message: error?.message,
    name: error?.name,
    serverResponse: error?.customData?.serverResponse,
    status: error?.status_,
    stack: error?.stack,
  });
}

export function storageErrorMessage(error) {
  logStorageError("Upload failed", error);
  const code = error?.code || "";
  if (code === "storage/unauthorized") {
    return "Upload denied. Check Firebase Storage rules for profile-images/{uid}.";
  }
  if (code === "storage/unauthenticated") {
    return "You must be signed in to upload a photo.";
  }
  if (code === "storage/canceled") {
    return "Upload was canceled.";
  }
  if (code === "storage/quota-exceeded") {
    return "Storage quota exceeded.";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "Upload timed out. Please try again.";
  }
  return error?.message || "Upload failed. Enable Firebase Storage in the console.";
}

export async function uploadProfilePhoto(uid, file, callbacks = {}) {
  validateProfilePhoto(file);

  const onProgress = typeof callbacks === "function" ? callbacks : callbacks?.onProgress;
  const onSuccess = typeof callbacks === "object" && callbacks ? callbacks.onSuccess : undefined;

  await ensureAuthReady();

  const currentUser = auth.currentUser;
  if (!currentUser) {
    const err = new Error("You must be signed in to upload a photo.");
    err.code = "storage/unauthenticated";
    throw err;
  }
  if (currentUser.uid !== uid) {
    const err = new Error("Upload user mismatch.");
    err.code = "storage/unauthorized";
    throw err;
  }

  const ext = photoExtension(file);
  const storagePath = `profile-images/${uid}.${ext}`;

  console.info("[Shyam Storage] Starting upload", {
    uid,
    path: storagePath,
    bucket: firebaseConfig.storageBucket,
    gsBucket: `gs://${firebaseConfig.storageBucket}`,
    fileSize: file.size,
    fileType: file.type,
  });

  if (typeof onProgress === "function") onProgress(0);

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000",
    customMetadata: { uploadedBy: uid },
  });

  const profileImage = await new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const { bytesTransferred, totalBytes, state } = snapshot;
        const pct = totalBytes > 0 ? Math.round((bytesTransferred / totalBytes) * 100) : 0;

        console.info("[Shyam Storage] Progress", {
          state,
          bytesTransferred,
          totalBytes,
          percent: pct,
        });

        if (typeof onProgress === "function") onProgress(pct);
      },
      (error) => {
        logStorageError("state_changed error", error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.info("[Shyam Storage] Upload complete", { downloadUrl, path: storagePath });
          if (typeof onProgress === "function") onProgress(100);
          resolve(downloadUrl);
        } catch (error) {
          logStorageError("getDownloadURL", error);
          reject(error);
        }
      }
    );
  });

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { profileImage });
  console.info("[Shyam Storage] Firestore updated", { uid, field: "profileImage" });

  try {
    await updateProfile(currentUser, { photoURL: profileImage });
  } catch (error) {
    console.warn("[Shyam Storage] Auth profile photoURL update failed (Firestore saved)", error);
  }

  if (typeof onSuccess === "function") {
    onSuccess(profileImage);
  }

  return profileImage;
}

export async function removeProfilePhoto(uid) {
  await ensureAuthReady();

  const paths = [
    `profile-images/${uid}`,
    ...["jpg", "jpeg", "png", "webp"].map((ext) => `profile-images/${uid}.${ext}`),
    ...["jpg", "jpeg", "png", "webp"].map((ext) => `profile-photos/${uid}.${ext}`),
  ];

  for (const storagePath of paths) {
    try {
      await deleteObject(ref(storage, storagePath));
      console.info("[Shyam Storage] Deleted", storagePath);
    } catch (error) {
      if (error?.code !== "storage/object-not-found") {
        console.warn("[Shyam Storage] Delete skipped", storagePath, error?.code);
      }
    }
  }

  await updateDoc(doc(db, "users", uid), { profileImage: "" });
  if (auth.currentUser?.uid === uid) {
    try {
      await updateProfile(auth.currentUser, { photoURL: null });
    } catch (error) {
      console.warn("[Shyam Storage] Auth photoURL clear failed", error);
    }
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
