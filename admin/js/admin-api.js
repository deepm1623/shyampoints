import { ADMIN_API_BASE } from "./admin-config.js";
import { auth } from "../../firebase.js";

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function adminFetch(path, options = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const adminApi = {
  getStats: () => adminFetch("/admin/stats"),
  getUsers: () => adminFetch("/users"),
  getTransactions: () => adminFetch("/admin/transactions"),
  getQrcodes: () => adminFetch("/admin/qrcodes"),
  getRewards: () => adminFetch("/admin/rewards"),
  generateQr: (body) =>
    adminFetch("/generate-qr", { method: "POST", body: JSON.stringify(body) }),
};
