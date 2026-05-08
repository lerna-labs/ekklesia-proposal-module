/** @param {unknown} value */
export function toText(value) {
  return value == null ? "" : String(value).trim();
}

/** @param {unknown} value */
export function hasText(value) {
  return toText(value).length > 0;
}

/** @param {unknown} raw */
function normalizeXUsername(raw) {
  let t = toText(raw);
  t = t.replace(/^@+/, "");
  t = t.replace(/^https?:\/\/(www\.)?x\.com\//i, "");
  t = t.replace(/^https?:\/\/(www\.)?twitter\.com\//i, "");
  t = t.replace(/^\/+/, "");
  const q = t.indexOf("?");
  if (q >= 0) t = t.slice(0, q);
  return t.trim();
}

/** @param {unknown} raw */
function normalizeLinkedinUsername(raw) {
  let t = toText(raw);
  t = t.replace(/^@+/, "");
  t = t.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "");
  t = t.replace(/^\/+/, "");
  const q = t.indexOf("?");
  if (q >= 0) t = t.slice(0, q);
  t = t.replace(/\/+$/, "");
  return t.trim();
}

/** @param {unknown} proposal */
export function getTrackPayload(proposal) {
  if (!proposal?.metaData || typeof proposal.metaData !== "object") {
    return null;
  }
  const track = toText(proposal.metaData.track);
  if (!track) return null;
  const payload = proposal.metaData[track];
  return payload && typeof payload === "object" ? payload : null;
}

/** @param {unknown} payload */
export function buildSocialRows(payload) {
  if (!payload || typeof payload !== "object") return [];

  /** @type {{ key: string; label: string; url: string }[]} */
  const rows = [];
  const x = normalizeXUsername(payload.xUsername);
  if (x) {
    rows.push({ key: `x:${x}`, label: "X (Twitter)", url: `https://x.com/${x}` });
  }

  const li = normalizeLinkedinUsername(payload.linkedinUsername);
  if (li) {
    rows.push({
      key: `li:${li}`,
      label: "LinkedIn",
      url: `https://www.linkedin.com/in/${li}/`,
    });
  }

  const website = toText(payload.website);
  if (website) {
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    rows.push({ key: `web:${url}`, label: "Website", url });
  }

  const other = Array.isArray(payload.otherLinks) ? payload.otherLinks : [];
  for (const entry of other) {
    if (!entry || typeof entry !== "object") continue;
    const url = toText(entry.url);
    if (!url) continue;
    const label = toText(entry.title) || url;
    rows.push({ key: `other:${url}:${label}`, label, url });
  }

  return rows;
}
