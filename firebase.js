import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  getStorage,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEC9Ki4rZWl86DjoClWU1zipeLZzN2GGI",
  authDomain: "shyampoints.firebaseapp.com",
  projectId: "shyampoints",
  storageBucket: "shyampoints.firebasestorage.app",
  messagingSenderId: "884009230588",
  appId: "1:884009230588:web:2f73257aecd65979fbf779",
};

export { firebaseConfig };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
const provider = new GoogleAuthProvider();

const persistenceReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Auth persistence:", err);
});

export async function ensureAuthReady() {
  await persistenceReady;
}

export function getMembership(points = 0) {
  if (points >= 5000) return "Platinum";
  if (points >= 1500) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}

function buildUserPayload(user, options = {}) {
  const {
    fullName = "",
    mobile = "",
    city = "",
    role = "Plumber",
    provider = "email",
  } = options;

  const resolvedName = fullName || user.displayName || "Shyam Member";
  const tier = "Bronze";

  return {
    uid: user.uid,
    fullName: resolvedName,
    name: resolvedName,
    email: user.email || "",
    mobile: mobile || user.phoneNumber || "",
    phone: mobile || user.phoneNumber || "",
    city: city || "",
    role: role || "Plumber",
    currentPoints: 0,
    points: 0,
    lifetimePoints: 0,
    walletBalance: 0,
    tier,
    membership: tier,
    totalScans: 0,
    productsScanned: 0,
    rewardsRedeemed: 0,
    provider,
    createdAt: serverTimestamp(),
  };
}

export async function ensureUserDocument(user, options = {}) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const existing = snap.data();
    const updates = {};

    if (options.fullName && !existing.fullName) updates.fullName = options.fullName;
    if (options.fullName && !existing.name) updates.name = options.fullName;
    if (options.mobile && !existing.mobile) updates.mobile = options.mobile;
    if (options.mobile && !existing.phone) updates.phone = options.mobile;
    if (options.city && !existing.city) updates.city = options.city;
    if (options.role && !existing.role) updates.role = options.role;
    if (options.provider && !existing.provider) updates.provider = options.provider;
    if (!existing.uid) updates.uid = user.uid;

    if (Object.keys(updates).length) {
      await setDoc(userRef, updates, { merge: true });
      return { ...existing, ...updates };
    }
    return existing;
  }

  const payload = buildUserPayload(user, options);
  await setDoc(userRef, payload);
  return payload;
}

export async function signupWithEmail(name, email, password, mobile = "", city = "", role = "Plumber") {
  await ensureAuthReady();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  const data = await ensureUserDocument(cred.user, {
    fullName: name,
    mobile,
    city,
    role,
    provider: "email",
  });
  return { user: cred.user, profile: data };
}

export async function loginWithEmail(email, password) {
  await ensureAuthReady();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const data = await ensureUserDocument(cred.user);
  return { user: cred.user, profile: data };
}

export async function loginWithGoogle() {
  await ensureAuthReady();
  const cred = await signInWithPopup(auth, provider);
  const data = await ensureUserDocument(cred.user, {
    fullName: cred.user.displayName || "",
    provider: "google",
  });
  return { user: cred.user, profile: data };
}

export async function resetPassword(email) {
  await ensureAuthReady();
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

export function subscribeAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export { app, auth, db, storage };
