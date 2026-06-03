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

  getUsers: (search = "") =>

    adminFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  updateUser: (userId, body) =>

    adminFetch(`/admin/users/${encodeURIComponent(userId)}`, {

      method: "PATCH",

      body: JSON.stringify(body),

    }),

  getTransactions: (params = {}) => {

    const q = new URLSearchParams();

    if (params.type) q.set("type", params.type);

    if (params.search) q.set("search", params.search);

    if (params.limit) q.set("limit", String(params.limit));

    const qs = q.toString();

    return adminFetch(`/admin/transactions${qs ? `?${qs}` : ""}`);

  },

  getQrcodes: () => adminFetch("/admin/qrcodes"),

  exportQrcodesCsvUrl: () => `${ADMIN_API_BASE}/admin/qrcodes/export`,

  getRewards: () => adminFetch("/admin/rewards"),

  createReward: (body) =>

    adminFetch("/admin/rewards", { method: "POST", body: JSON.stringify(body) }),

  updateReward: (id, body) =>

    adminFetch(`/admin/rewards/${encodeURIComponent(id)}`, {

      method: "PATCH",

      body: JSON.stringify(body),

    }),

  deleteReward: (id) =>

    adminFetch(`/admin/rewards/${encodeURIComponent(id)}`, { method: "DELETE" }),

  generateQr: (body) =>

    adminFetch("/generate-qr", { method: "POST", body: JSON.stringify(body) }),

};



export async function downloadQrcodesCsv() {

  const headers = await getAuthHeaders();

  const res = await fetch(`${ADMIN_API_BASE}/admin/qrcodes/export`, { headers });

  if (!res.ok) throw new Error("CSV export failed");

  const blob = await res.blob();

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = "shyam-qrcodes.csv";

  a.click();

  URL.revokeObjectURL(url);

}

