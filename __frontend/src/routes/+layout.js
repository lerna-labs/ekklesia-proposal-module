import { loggedIn, user, sessionExpiresAt } from "$stores/sessionManager.js";
const VITE_SERVER_STATUS = import.meta.env.VITE_SERVER_STATUS;
const API_URL = import.meta.env.VITE_API_URL;
import { error } from "@sveltejs/kit";

export const csr = true; // Client-side rendering only
export const ssr = false; // Disable server-side rendering

export async function load({ fetch }) {
  let serverStatus;
  try {
    serverStatus = await fetch(VITE_SERVER_STATUS);
    if (!serverStatus.ok) {
      throw error(503, {
        message: "Server not available",
        code: "SERVER_STATUS_NOT_AVAILABLE",
      });
    }
  } catch (err) {
    if (err?.status) {
      throw err;
    }
    throw error(503, {
      message: "Server not available",
      code: "SERVER_STATUS_FETCH_FAILED",
    });
  }

  // Session probe: plain fetch only — do not use api.fetch (401 there can run expireSession/goto).
  try {
    const sessionRes = await fetch(`${API_URL}/session`, { credentials: "include" });
    if (sessionRes.ok) {
      const sessionData = await sessionRes.json();
      user.set(sessionData);
      loggedIn.set(true);
      if (sessionData.expiresIn != null) {
        const expiresAt = new Date(sessionData.expiresIn).getTime();
        sessionExpiresAt.set(Number.isFinite(expiresAt) ? expiresAt : null);
      }
    } else {
      loggedIn.set(false);
      sessionExpiresAt.set(null);
    }
  } catch (err) {
    console.error("Error validating session:", err);
    loggedIn.set(false);
    sessionExpiresAt.set(null);
  }

  return {
    serverStatus: await serverStatus.json(),
  };
}
