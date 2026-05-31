export const ADMIN_API_BASE =
  (typeof window !== "undefined" && window.ADMIN_API_BASE) ||
  window.SP_API_BASE ||
  "http://localhost:3001";
