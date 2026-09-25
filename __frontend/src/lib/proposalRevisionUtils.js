import { diff, atomizeChangeset } from "json-diff-ts";

/**
 * Build the comparable payload for a proposal (top-level keys only).
 * Used for diffing; metaData is passed through as-is so any vote-specific structure is compared.
 * @param {object} proposal
 * @returns {{ title: any, summary: any, metaData: any, totalBudget: any }}
 */
export function buildProposalPayload(proposal) {
  if (proposal == null)
    return { title: undefined, summary: undefined, metaData: undefined, totalBudget: undefined };
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
  const prefixes = Object.keys(sectionMapping).filter(
    (p) => path === p || path.startsWith(p + "."),
  );
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
 * Get changed section labels between two proposals. Uses json-diff-ts for comparison; optional vote-specific mapping.
 * @param {object} proposalA - New/current proposal (e.g. live).
 * @param {object} proposalB - Previous proposal (e.g. archived).
 * @param {{ sectionMapping?: Record<string, string>, sectionOrder?: string[] }} [options] Optional vote/form-specific mapping and sort order
 * @returns {string[]} Unique section labels in form order (when sectionOrder provided)
 */
export function getChangedSectionLabels(proposalA, proposalB, options = {}) {
  const payloadA = buildProposalPayload(proposalA);
  const payloadB = buildProposalPayload(proposalB);
  // diff(old, new) = changes to transform old into new; proposalA is "new", proposalB is "previous"
  const changeset = diff(payloadB, payloadA);
  const atomic = atomizeChangeset(changeset);
  const paths = atomic
    .map((c) => (c.path && typeof c.path === "string" ? c.path.replace(/^\$\.?/, "") : ""))
    .filter(Boolean);
  return pathsToSectionLabels(paths, options);
}

/**
 * Get raw atomic changes between two proposals (for temp/debug display).
 * @param {object} proposalA - New/current proposal.
 * @param {object} proposalB - Previous proposal.
 * @returns {{ path: string, type: string, value?: unknown, oldValue?: unknown }[]}
 */
export function getChangedDetails(proposalA, proposalB) {
  const payloadA = buildProposalPayload(proposalA);
  const payloadB = buildProposalPayload(proposalB);
  const changeset = diff(payloadB, payloadA);
  const atomic = atomizeChangeset(changeset);
  return atomic
    .map((c) => ({
      path: c.path && typeof c.path === "string" ? c.path.replace(/^\$\.?/, "") : "",
      type: c.type ?? "",
      value: c.value,
      oldValue: c.oldValue,
    }))
    .filter((c) => c.path);
}
