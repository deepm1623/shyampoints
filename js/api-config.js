/**
 * Shyam Points API configuration.
 * Set window.SP_API_BASE before this script loads, or edit the default below.
 */
export const API_BASE =
  (typeof window !== "undefined" && window.SP_API_BASE) ||
  "http://localhost:3001";

export function isApiEnabled() {
  return Boolean(API_BASE);
}
