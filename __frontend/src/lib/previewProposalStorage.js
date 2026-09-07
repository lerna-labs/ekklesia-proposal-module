/**
 * Shared storage helpers for the proposal preview feature.
 * Used by the form (write), the proposal view page (read + clear on navigate), and logout (clear).
 */

export const PREVIEW_STORAGE_KEY = "proposal-preview";

/**
 * Remove the preview payload from localStorage. No-op when not in browser or on error.
 */
export function clearPreviewStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch (_) {}
}

/**
 * Write a proposal payload to localStorage for the preview tab.
 * @param {string|number} proposalId
 * @param {object} proposal - Payload (same shape as form submission)
 */
export function writePreviewPayload(proposalId, proposal) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify({ proposalId, proposal }));
  } catch (_) {}
}

/**
 * Read the current preview payload from localStorage.
 * @returns {{ proposalId: string|number, proposal: object } | null}
 */
export function readPreviewPayload() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.proposal != null) return parsed;
    return null;
  } catch (_) {
    return null;
  }
}
