import { db, storage, auth, ensureAuthReady, firebaseConfig, getMembership } from "../firebase.js";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
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

  let progressTick = null;
  const reportProgress = (pct) => {
    if (typeof onProgress === "function") onProgress(Math.min(100, Math.max(0, pct)));
  };

  reportProgress(3);

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000",
    customMetadata: { uploadedBy: uid },
  });

  let lastPct = 3;
  progressTick = setInterval(() => {
    if (lastPct < 12) {
      lastPct += 1;
      reportProgress(lastPct);
    }
  }, 180);

  const profileImage = await new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const { bytesTransferred, totalBytes, state } = snapshot;
        const pct =
          totalBytes > 0
            ? Math.max(15, Math.round((bytesTransferred / totalBytes) * 100))
            : state === "running" ? 20 : 5;

        console.info("[Shyam Storage] Progress", {
          state,
          bytesTransferred,
          totalBytes,
          percent: pct,
        });

        lastPct = pct;
        reportProgress(pct);
      },
      (error) => {
        if (progressTick) clearInterval(progressTick);
        logStorageError("state_changed error", error);
        reject(error);
      },
      async () => {
        if (progressTick) clearInterval(progressTick);
        try {
          reportProgress(95);
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.info("[Shyam Storage] Upload complete", { downloadUrl, path: storagePath });
          reportProgress(100);
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

export function subscribeBrands(onData, onError, max = 20) {
  const q = query(collection(db, "brands"), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b) => !b.status || b.status === "active")
        .sort((a, b) => String(a.name || a.title || "").localeCompare(String(b.name || b.title || "")));
      onData(list);
    },
    onError
  );
}

export function subscribeOffers(onData, onError, max = 15) {
  const q = query(collection(db, "offers"), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => !o.status || o.status === "active")
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
      onData(list.slice(0, max));
    },
    onError
  );
}

export function subscribeAnnouncements(onData, onError, max = 10) {
  const q = query(
    collection(db, "announcements"),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribeLeaderboard(onData, onError, max = 10) {
  const q = query(collection(db, "leaderboard"), orderBy("points", "desc"), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d, i) => ({
          id: d.id,
          rank: d.data().rank ?? i + 1,
          ...d.data(),
        }))
      );
    },
    onError
  );
}

/** Aggregate positive points earned per calendar month from transactions */
export function aggregateMonthlyPoints(transactions) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      total: 0,
    });
  }

  transactions.forEach((tx) => {
    const pts = Number(tx.points) || 0;
    if (pts <= 0) return;
    const { raw } = formatTimestamp(tx.createdAt);
    if (!raw) return;
    const bucket = months.find((m) => m.year === raw.getFullYear() && m.month === raw.getMonth());
    if (bucket) bucket.total += pts;
  });

  return months;
}
