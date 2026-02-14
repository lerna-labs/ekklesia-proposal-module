import { clsx, } from "clsx";
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
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: "—";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any