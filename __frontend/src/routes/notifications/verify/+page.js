const API_URL = import.meta.env.VITE_API_URL;

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url }) {
  const token = (url.searchParams.get("token") || "").trim();
  if (!token) {
    return {
      token: null,
      state: "invalid",
      message: "Missing verification token.",
    };
  }

  try {
    const res = await fetch(`${API_URL}/notifications/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ token }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        token,
        state: "invalid",
        message: payload?.message ?? "Verification link is invalid or expired.",
      };
    }

    return {
      token,
      state: "success",
      message: payload?.message ?? "Email verified successfully.",
    };
  } catch (_error) {
    return {
      token,
      state: "error",
      message: "Could not verify email at this time. Please try again.",
    };
  }
}
