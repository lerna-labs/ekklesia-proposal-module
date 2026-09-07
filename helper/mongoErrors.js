/**
 * True when Mongo/Mongoose rejected a write due to a unique index (E11000).
 * @param {unknown} error
 * @returns {boolean}
 */
export function isDuplicateKeyError(error) {
  if (!error || typeof error !== "object") return false;
  const code =
    /** @type {{ code?: number, cause?: { code?: number } }} */ (error).code ??
    /** @type {{ cause?: { code?: number } }} */ (error).cause?.code;
  return code === 11000;
}
