const API_URL = import.meta.env.VITE_API_URL || "/api/v0";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url }) {
  const token = (url.searchParams.get("token") || "").trim();
  if (!token) {
    return {
      token: null,
      state: "invalid",
      message: "Missing unsubscribe token.",
    };
  }

  try {
    const res = await fetch(`${API_URL}/notifications/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        token,
        state: "invalid",
        message: payload?.message ?? "This unsubscribe link is invalid or expired.",
      };
    }

    return {
      token,
      state: "success",
      message: payload?.message ?? "You have been unsubscribed from notification emails.",
    };
  } catch (_error) {
    return {
      token,
      state: "error",
      message: "Could not complete unsubscribe at this time. Please try again.",
    };
  }
}
