import { goto } from "$app/navigation";
import { error } from "@sveltejs/kit";
import { get, writable } from "svelte/store";
import { toast } from "svelte-sonner";
const API_URL = import.meta.env.VITE_API_URL;

// proposal-module specific function
import { clearPreviewStorage } from "$lib/previewProposalStorage.js";

// Create a writable store to manage the session
export const loggedIn = writable(false);
export const showLogin = writable(false);
export const redirectAfterLogin = writable(null);
export const user = writable(null);
export const sessionExpiresAt = writable(null);
export const sessionExpiryBannerVisible = writable(false);

export function safeRedirectPath(input, fallback = "/") {
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = new URL(input ?? fallback, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function getExpiryFromInput(expiresIn) {
  if (expiresIn == null) return null;

  // Date-like string (e.g., ISO timestamp)
  const asDateMs = new Date(expiresIn).getTime();
  if (Number.isFinite(asDateMs)) return asDateMs;

  // Numeric timestamp (seconds or milliseconds)
  const asNum = Number(expiresIn);
  if (Number.isFinite(asNum)) {
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }

  return null;
}

function clearClientSessionState({ openLogin = false, notify = false } = {}) {
  // Clear legacy JS-readable token leftovers (HttpOnly cookie is cleared by DELETE /session)
  if (typeof document !== "undefined") {
    document.cookie = "token=; path=/; max-age=0";
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    // proposal-module specific cleanup
    clearPreviewStorage();
  }

  // Clear session stores
  sessionExpiresAt.set(null);
  sessionExpiryBannerVisible.set(false);
  loggedIn.set(false);
  user.set(null);

  if (openLogin) showLogin.set(true);
  if (notify) toast.info("Your session timed out. Please connect wallet to continue.");
}

export async function expireSession() {
  let targetAfterLogin = null;
  if (typeof window !== "undefined") {
    targetAfterLogin = window.location.pathname + window.location.search + window.location.hash;
    redirectAfterLogin.set(safeRedirectPath(targetAfterLogin));
  }
  clearClientSessionState({ openLogin: true, notify: true });
  if (typeof window !== "undefined" && window.location.pathname !== "/login" && targetAfterLogin) {
    await goto("/login");
  }
}

/** Record session expiry from login / GET /session (JWT stays httpOnly-only). */
export function setSessionExpiry(expiresIn) {
  sessionExpiresAt.set(getExpiryFromInput(expiresIn));
}

// Handle connection failures gracefully
export const api = {
  fetch: async (fetch, url, options = {}) => {
    try {
      const hadAuth = Boolean(get(loggedIn));

      // Set up headers
      const headers = new Headers(options.headers || {});
      headers.set("Content-Type", "application/json");

      const response = await fetch(API_URL + url, {
        ...options,
        headers,
        credentials: "include",
      });

      // 401 with prior credentials = session expired; anonymous 401 = not logged in (no expireSession/goto/toast)
      if (response.status === 401) {
        if (hadAuth) {
          await expireSession();
        }
        throw error(401, {
          message: hadAuth ? "Token expired, please log in again" : "Unauthorized",
          code: hadAuth ? "SESSION_EXPIRED" : "UNAUTHORIZED",
        });
      }

      if (!response.ok) {
        // Parse error body safely (API may return non-JSON, e.g. HTML or plain text)
        const text = await response.text();
        let message = "An error occurred";
        let errors = undefined;
        try {
          const data = text ? JSON.parse(text) : {};
          message = data.message ?? message;
          if (data.errors != null) errors = data.errors;
        } catch {
          if (text) message = text;
        }
        const body = errors != null ? { message, errors } : { message };
        throw error(response.status, body);
      }

      return response;
    } catch (err) {
      // Properly handle the error to display the SvelteKit error page
      if (err.status && err.body?.message) {
        // If it's already a properly formatted error, just re-throw it
        // console.log('Re-throwing error:', err);
        throw err;
      } else {
        // Create a proper SvelteKit error
        throw error(500, err.message || "An error occurred connecting to the API");
      }
    }
  },
};

export const logout = async () => {
  try {
    // Call the backend logout endpoint to clear server-side session
    const response = await fetch(`${API_URL}/session`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.warn("Server logout failed, continuing with client logout");
    }
  } catch (error) {
    // Continue with client-side logout even if server request fails
    console.error("Error during server logout:", error);
  } finally {
    clearClientSessionState();
    showLogin.set(false);

    // Redirect to the home page after logout
    goto("/");
  }
};
