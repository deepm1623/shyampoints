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
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEC9Ki4rZWl86DjoClWU1zipeLZzN2GGI",
  authDomain: "shyampoints.firebaseapp.com",
  projectId: "shyampoints",
  storageBucket: "shyampoints.firebasestorage.app",
  messagingSenderId: "884009230588",
  appId: "1:884009230588:web:2f73257aecd65979fbf779",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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

export async function ensureUserDocument(user, preferredName = "", preferredPhone = "") {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const existing = snap.data();
    const updates = {};
    if (preferredName && preferredName !== existing.name) updates.name = preferredName;
    if (preferredPhone && preferredPhone !== existing.phone) updates.phone = preferredPhone;
    if (Object.keys(updates).length) {
      await setDoc(userRef, updates, { merge: true });
      return { ...existing, ...updates };
    }
    return existing;
  }

  const payload = {
    name: preferredName || user.displayName || "Shyam Member",
    email: user.email || "",
    phone: preferredPhone || user.phoneNumber || "",
    points: 0,
    membership: "Bronze",
    rewardsRedeemed: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, payload, { merge: true });
  return payload;
}

export async function signupWithEmail(name, email, password, phone = "") {
  await ensureAuthReady();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  const data = await ensureUserDocument(cred.user, name, phone);
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
  const data = await ensureUserDocument(cred.user);
  return { user: cred.user, profile: data };
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
