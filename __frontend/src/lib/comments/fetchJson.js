import { get } from "svelte/store";
import { loggedIn, expireSession } from "$stores/sessionManager.js";

const API_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api/v0";

/**
 * Fetches JSON from the API with cookie credentials (same auth as api.fetch).
 * Never throws; returns { ok, status, json }.
 * On 401 with prior client auth, runs expireSession() then returns soft failure.
 * @param {string} url - API path (e.g. /comments?proposal=...)
 * @param {RequestInit} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<{ ok: boolean; status: number; json: object }>}
 */
export async function fetchJson(url, options = {}) {
  const hadAuth = Boolean(get(loggedIn));

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const res = await fetch(API_BASE + url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && hadAuth) {
    await expireSession();
  }

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}
