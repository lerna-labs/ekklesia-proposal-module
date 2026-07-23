/**
 * Escape special regex characters for safe use in MongoDB `$regex` / `RegExp`.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
