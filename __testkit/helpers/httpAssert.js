/**
 * Assertions that embed HTTP response bodies in Error messages so Jest/CI reports show API errors.
 */

/**
 * @param {number} actual
 * @param {number} expected
 * @param {string} [bodyText]
 * @param {string} [context] - Label for the failing check (e.g. test step name)
 */
export function expectHttpStatus(actual, expected, bodyText = "", context = "") {
  if (actual !== expected) {
    const prefix = context ? `${context}\n` : "";
    const body = bodyText === undefined || bodyText === null ? "" : String(bodyText);
    throw new Error(
      `${prefix}Expected HTTP ${expected}, received ${actual}.\nResponse body:\n${body || "(empty)"}`
    );
  }
}

/**
 * @param {string} bodyText
 * @param {RegExp} expectedRegex
 * @param {string} [context]
 */
export function expectBodyMatches(bodyText, expectedRegex, context = "") {
  const lower = (bodyText || "").toLowerCase();
  if (!expectedRegex.test(lower)) {
    const prefix = context ? `${context}\n` : "";
    throw new Error(
      `${prefix}Response body did not match ${expectedRegex}.\nBody:\n${bodyText || "(empty)"}`
    );
  }
}
