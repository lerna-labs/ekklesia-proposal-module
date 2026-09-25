/**
 * Shared retry policy for Mailtrap / Gmail sends (429, transient errors).
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isRetryableSendError(err) {
  if (!err || typeof err !== "object") return false;

  const msg = String(/** @type {Error} */ (err).message || "").toLowerCase();

  const status =
    /** @type {{ statusCode?: number; response?: { status?: number }; code?: string | number }} */ (
      err
    ).statusCode ?? /** @type {{ response?: { status?: number } }} */ (err).response?.status;

  if (status === 429 || status === 503) return true;
  if (
    status === 403 &&
    (msg.includes("ratelimit") ||
      msg.includes("rate limit") ||
      msg.includes("userRateLimitExceeded"))
  ) {
    return true;
  }

  const code = /** @type {{ code?: string }} */ (err).code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND") return true;
  if (
    msg.includes("429") ||
    msg.includes("ratelimit") ||
    msg.includes("rate limit") ||
    msg.includes("too many")
  ) {
    return true;
  }

  return false;
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @returns {Promise<T>}
 */
export async function sendWithRetry(operation) {
  const maxAttempts = Math.max(
    1,
    Number.parseInt(process.env.EMAIL_SEND_MAX_ATTEMPTS ?? "5", 10) || 5,
  );
  const baseMs = Math.max(
    50,
    Number.parseInt(process.env.EMAIL_SEND_RETRY_BASE_MS ?? "800", 10) || 800,
  );

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (!isRetryableSendError(err) || attempt >= maxAttempts) {
        throw err;
      }
      const cap = 30_000;
      const exp = Math.min(cap, baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
      await sleep(exp);
    }
  }
}
