/**
 * Map Cardano provider failures during treasury deposit verification to an
 * "unable to verify" result (HTTP 503), distinct from genuine validation errors.
 */
import {
  ProviderError,
  ProviderAuthError,
  ProviderRateLimitError,
} from "@lerna-labs/ekklesia-helpers/cardano";

/** Client-facing message when verification cannot be performed (never provider text). */
export const TREASURY_VERIFY_UNAVAILABLE_MESSAGE =
  "Unable to verify treasury donation right now. Please retry shortly.";

/**
 * @param {unknown} err
 * @returns {{ ok: false, unavailable: true, retryAfterSeconds?: number, alert?: "auth" } | null}
 */
export function mapTreasuryProviderError(err) {
  if (!(err instanceof ProviderError)) return null;
  /** @type {{ ok: false, unavailable: true, retryAfterSeconds?: number, alert?: "auth" }} */
  const out = { ok: false, unavailable: true };
  if (
    err instanceof ProviderRateLimitError &&
    err.retryAfterSeconds != null &&
    Number.isFinite(err.retryAfterSeconds) &&
    err.retryAfterSeconds >= 0
  ) {
    out.retryAfterSeconds = err.retryAfterSeconds;
  }
  if (err instanceof ProviderAuthError) {
    out.alert = "auth";
  }
  return out;
}

/**
 * Operational alert for credential rejection (will not clear on retry alone).
 * @param {Error} err
 */
export function alertTreasuryProviderAuthFailure(err) {
  console.error(
    "[treasury-verify] Provider credentials rejected; deposit verification cannot proceed:",
    err.message,
  );
}
