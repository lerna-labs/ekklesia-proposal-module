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
	return suffixUtc ? `${text} UTC` : text;
}
