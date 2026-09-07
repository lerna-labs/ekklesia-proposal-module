import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format a number as ADA (0–2 decimal places). Returns "—" for null/undefined/NaN. */
export function formatAda(n) {
  return n != null && Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : "—";
}

/** Format a number as USD (2 decimal places). Returns "—" for null/undefined/NaN. */
export function formatUsd(n) {
  return n != null && Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : "—";
}

/**
 * Build query string with literal commas for given param keys (no %2C).
 * Use for list URLs so status/category stay readable.
 * @param {URLSearchParams} searchParams
 * @param {string[]} [keys=['status', 'category']]
 * @returns {string}
 */
export function queryStringWithLiteralCommas(searchParams, keys = ["status", "category"]) {
  let qs = searchParams.toString();
  for (const key of keys) {
    const m = qs.match(new RegExp(`\\b${key}=([^&]*)`));
    if (m) qs = qs.replace(new RegExp(`\\b${key}=[^&]*`), key + "=" + decodeURIComponent(m[1]));
  }
  return qs;
}

// shorten a string to a specified length
export function shortenString(str, maxLength = 20, middle = false) {
  if (!str) return "";
  if (middle) {
    const half = Math.floor(maxLength / 2);
    return str.length > maxLength ? str.slice(0, half) + "..." + str.slice(-half) : str;
  }
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
