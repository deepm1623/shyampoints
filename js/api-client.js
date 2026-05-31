import { API_BASE } from "./api-config.js";

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
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

/**
 * POST /scan — backend QR redemption
 */
export async function scanQrViaApi(userId, qrCode) {
  const res = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, qrCode }),
  });
  const data = await parseResponse(res);
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
 * GET /dashboard/:uid
 */
export async function fetchDashboardViaApi(uid) {
  const res = await fetch(`${API_BASE}/dashboard/${encodeURIComponent(uid)}`);
  return parseResponse(res);
}
