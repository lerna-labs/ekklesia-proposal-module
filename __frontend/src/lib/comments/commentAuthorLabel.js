import { shortenString } from "$lib/utils.js";

/**
 * Display label for a comment author: "Name (shortId)", shortened id only, or "—".
 * Id uses the same middle-ellipsis shortening as elsewhere (12 chars max).
 */
export function commentAuthorLabel(c) {
  const a = c?.author;
  const name = a?.name && String(a.name).trim();
  const id = String(a?._id ?? a?.id ?? "").trim();
  const idShort = shortenString(id, 12, true);
  if (name) return idShort ? `${name} (${idShort})` : name;
  return idShort || "—";
}
