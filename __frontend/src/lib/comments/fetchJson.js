import { get } from "svelte/store";
import { jwt } from "$stores/sessionManager.js";

const API_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api/v0";

/**
 * Fetches JSON from the API with auth headers. Never throws; returns { ok, status, json }.
 * @param {string} url - API path (e.g. /comments?proposal=...)
 * @param {RequestInit} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<{ ok: boolean; status: number; json: object }>}
 */
export async function fetchJson(url, options = {}) {
  const token = get(jwt);
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(API_BASE + url, {
    ...options,
    headers,
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}
