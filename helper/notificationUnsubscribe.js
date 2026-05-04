import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../schema/User.js";

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/+$/,
    "",
  );
}

/**
 * Ensure each user has a random secret so unsubscribe links can be invalidated
 * (e.g. when notification email changes).
 */
export async function ensureUnsubscribeSecret(userId) {
  const doc = await User.findById(userId).select("notification.unsubscribeSecret").lean();
  if (!doc) return null;
  let secret = doc.notification?.unsubscribeSecret;
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    await User.updateOne({ _id: userId }, { $set: { "notification.unsubscribeSecret": secret } });
  }
  return secret;
}

export function buildUnsubscribeToken(userId, unsubscribeSecret) {
  return jwt.sign(
    {
      purpose: "notification-unsubscribe",
      userId,
      v: unsubscribeSecret,
    },
    process.env.JWT_SECRET,
    { expiresIn: "365d" },
  );
}

export function buildUnsubscribeFrontendUrl(token) {
  const base = getFrontendBaseUrl();
  return `${base}/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Full mailto-link URL for footer “Unsubscribe” in notification emails. */
export async function getUnsubscribeUrlForUser(userId) {
  const fallback = `${getFrontendBaseUrl()}/dashboard`;
  try {
    const secret = await ensureUnsubscribeSecret(userId);
    if (!secret) return fallback;
    const token = buildUnsubscribeToken(userId, secret);
    return buildUnsubscribeFrontendUrl(token);
  } catch {
    return fallback;
  }
}
