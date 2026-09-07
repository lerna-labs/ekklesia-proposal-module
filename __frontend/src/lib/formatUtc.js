/**
 * Single place for UTC wall-clock display of API instants (ISO strings with Z/offset, etc.).
 * Uses the browser locale for separators and month names; `timeZone: "UTC"` is always applied.
 */

/**
 * @param {Date | string | number | null | undefined} value
 * @param {Intl.DateTimeFormatOptions & { suffixUtc?: boolean }} [options] — pass `suffixUtc: false` to omit the trailing ` UTC` label
 * @returns {string}
 */
export function formatUtcInstant(value, options = {}) {
  const { suffixUtc = true, ...intlOptions } = options;
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const merged = { timeZone: "UTC", ...intlOptions };
  const text = new Intl.DateTimeFormat(undefined, merged).format(d);
  return suffixUtc ? `${text} (UTC)` : text;
}

/**
 * Full UTC wall time: long month + day + year, time to the minute (24h), then ` UTC`. No weekday.
 * @param {Date | string | number | null | undefined} value
 * @returns {string}
 */
export function formatUtcFullDateTime(value) {
  return formatUtcInstant(value, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
