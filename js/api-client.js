import { API_BASE } from "./api-config.js";
import { auth } from "../firebase.js";

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    const err = new ApiError("You must be signed in", "unauthenticated", 401);
    throw err;
  }
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new ApiError(
      data.message || res.statusText || "Request failed",
      data.code || "api-error",
      res.status
    );
  }
  return data;
}

async function apiPost(path, body) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

/**
 * POST /scan — backend-only QR redemption
 */
export async function scanQrViaApi(qrCode) {
  const data = await apiPost("/scan", { qrCode });
  return {
    points: data.points,
    qrId: data.qrCode,
    product: data.product,
    newBalance: data.newBalance,
    totalScans: data.totalScans,
    tier: data.tier,
  };
}

/**
 * POST /redeem — backend-only reward redemption
 */
export async function redeemViaApi(rewardId) {
  const data = await apiPost("/redeem", { rewardId });
  return data;
}
