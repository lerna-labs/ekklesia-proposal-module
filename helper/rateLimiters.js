import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * When `DISABLE_RATE_LIMIT` is `1`, `true`, or `yes` (case-insensitive), all API rate limiters no-op.
 * For local development and automated tests; do not set in production.
 */
export function isRateLimitDisabled() {
  const v = process.env.DISABLE_RATE_LIMIT;
  if (v == null || String(v).trim() === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

const skipIfDisabled = () => isRateLimitDisabled();

/**
 * Rate limiter for nonce requests (POST /session).
 * 5 requests per minute per IP.
 */
export const nonceRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  skip: skipIfDisabled,
  message: {
    status: "error",
    message: "Too many nonce requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for session verification (PUT /session).
 * 10 requests per minute per IP.
 */
export const sessionVerificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skip: skipIfDisabled,
  message: {
    status: "error",
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for public read endpoints (GET /votes, /proposals, /comments).
 * 200 requests per minute per IP (shared across all public read).
 */
export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  skip: skipIfDisabled,
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for GET /session (check session).
 * 60 requests per minute per IP.
 */
export const getSessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  skip: skipIfDisabled,
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for DELETE /session (logout).
 * 20 requests per minute per IP.
 */
export const deleteSessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  skip: skipIfDisabled,
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for authenticated write endpoints (proposals and comments).
 * 10 requests per minute per authenticated user. Must run after isAuthenticated so req.userId is set.
 */
export const authenticatedWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skip: skipIfDisabled,
  // Use express-rate-limit helper for IPv6-safe IP fallback keying.
  keyGenerator: (req) => req.userId?.toString() ?? ipKeyGenerator(req.ip),
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for comment create/update writes.
 * 5 requests per minute per authenticated user.
 */
export const commentWritePerMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  skip: skipIfDisabled,
  // Use express-rate-limit helper for IPv6-safe IP fallback keying.
  keyGenerator: (req) => req.userId?.toString() ?? ipKeyGenerator(req.ip),
  message: {
    status: "error",
    message: "Too many comment requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for comment create/update writes.
 * 20 requests per hour per authenticated user.
 */
export const commentWritePerHourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  skip: skipIfDisabled,
  // Use express-rate-limit helper for IPv6-safe IP fallback keying.
  keyGenerator: (req) => req.userId?.toString() ?? ipKeyGenerator(req.ip),
  message: {
    status: "error",
    message: "Too many comment requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
