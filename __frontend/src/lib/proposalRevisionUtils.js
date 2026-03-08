/**
 * Get paths where two objects differ (shallow comparison at each level; arrays/objects compared by JSON stringify).
 * @param {object} a
 * @param {object} b
 * @param {string} [prefix]
 * @returns {string[]} Paths like "title", "metaData.proposalDetails"
 */
export function getChangedPaths(a, b, prefix = "") {
  if (a == null && b == null) return [];
  if (a == null || b == null) return [prefix ? prefix : "root"].filter(Boolean);
  if (typeof a !== "object" || typeof b !== "object") {
    const aVal = a === b || (Number.isNaN(a) && Number.isNaN(b));
    return aVal ? [] : [prefix].filter(Boolean);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [prefix].filter(Boolean);
  }
  if (Array.isArray(a) || Array.isArray(b)) return [prefix].filter(Boolean);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = [];
  for (const k of keys) {
    const p = prefix ? `${prefix}.${k}` : k;
    const aVal = a[k];
    const bVal = b[k];
    if (typeof aVal === "object" && aVal !== null && typeof bVal === "object" && bVal !== null && !Array.isArray(aVal) && !Array.isArray(bVal)) {
      out.push(...getChangedPaths(aVal, bVal, p));
    } else {
      const same = JSON.stringify(aVal) === JSON.stringify(bVal);
      if (!same) out.push(p);
    }
  }
  return out;
}

/**
 * Build the comparable payload for a proposal (top-level keys only).
 * Used for diffing; metaData is passed through as-is so any vote-specific structure is compared.
 * @param {object} proposal
 * @returns {{ title: any, summary: any, metaData: any, totalBudget: any }}
 */
export function buildProposalPayload(proposal) {
  if (proposal == null) return { title: undefined, summary: undefined, metaData: undefined, totalBudget: undefined };
  return {
    title: proposal.title,
    summary: proposal.summary,
    metaData: proposal.metaData,
    totalBudget: proposal.metaData?.totalBudget ?? proposal.totalBudget,
  };
}

/**
 * Map a single path to a section label using optional prefix-based mapping.
 * Longest matching prefix wins; fallback is last path segment or the path itself.
 * @param {string} path
 * @param {Record<string, string>} [sectionMapping] Prefix → section label
 * @returns {string}
 */
export function pathToSectionLabel(path, sectionMapping) {
  if (!sectionMapping || typeof path !== "string") return path.split(".").pop() ?? path ?? "";
  const prefixes = Object.keys(sectionMapping).filter((p) => path === p || path.startsWith(p + "."));
  if (prefixes.length === 0) return path.split(".").pop() ?? path;
  const longest = prefixes.reduce((a, b) => (a.length >= b.length ? a : b));
  return sectionMapping[longest] ?? path.split(".").pop() ?? path;
}

/**
 * Reduce changed paths to unique section labels. Labels are returned in form order when sectionOrder is provided.
 * @param {string[]} paths
 * @param {{ sectionMapping?: Record<string, string>, sectionOrder?: string[] }} [options] Optional vote/form-specific mapping and sort order
 * @returns {string[]} Unique section labels (in sectionOrder order when provided, else alphabetical)
 */
export function pathsToSectionLabels(paths, options = {}) {
  const { sectionMapping, sectionOrder } = options;
  const seen = new Set();
  const labels = [];
  for (const p of paths) {
    const label = pathToSectionLabel(p, sectionMapping);
    if (typeof label === "string" && label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  if (sectionOrder && sectionOrder.length > 0) {
    return labels.sort(
      (a, b) =>
        (sectionOrder.indexOf(a) >= 0 ? sectionOrder.indexOf(a) : sectionOrder.length) -
        (sectionOrder.indexOf(b) >= 0 ? sectionOrder.indexOf(b) : sectionOrder.length),
    );
  }
  return labels.sort();
}

/**
 * Get changed section labels between two proposals. Uses comparable payload; optional vote-specific mapping.
 * @param {object} proposalA
 * @param {object} proposalB
 * @param {{ sectionMapping?: Record<string, string>, sectionOrder?: string[] }} [options] Optional vote/form-specific mapping and sort order
 * @returns {string[]} Unique section labels in form order (when sectionOrder provided)
 */
export function getChangedSectionLabels(proposalA, proposalB, options = {}) {
  const payloadA = buildProposalPayload(proposalA);
  const payloadB = buildProposalPayload(proposalB);
  const paths = getChangedPaths(payloadA, payloadB);
  return pathsToSectionLabels(paths, options);
}
