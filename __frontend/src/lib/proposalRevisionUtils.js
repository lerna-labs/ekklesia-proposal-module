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

/** Map proposal paths to human-readable section labels (top-level section for grouping). */
const PATH_TO_SECTION = {
  title: "Title",
  summary: "Summary",
  "metaData.trackRecord": "Track record",
  "metaData.estimatedDuration": "Estimated duration",
  "metaData.strategyFramework": "Strategy framework",
  "metaData.proposalDetails": "Proposal details",
  "metaData.executionRoadmap": "Execution roadmap",
  "metaData.financialAndAdministrative": "Financial & administrative",
  "metaData.contractingParty": "Contracting party",
  "metaData.primaryContact": "Primary contact",
  "metaData.signatoryContact": "Signatory contact",
  "metaData.proposerDetails": "Proposer details",
  "metaData.kycInfo": "KYC info",
  "metaData.legalDeclarations": "Legal declarations",
  "metaData.supportingInfoLinks": "Supporting info",
  "metaData.administrator": "Budget administration",
  "metaData.intersectAdministratorFeeConsent": "Budget administration",
  "metaData.otherAdministrator": "Budget administration",
  "metaData.independentAudits": "Budget administration",
  "metaData.treasuryRepayment": "Treasury repayment",
  "metaData.treasuryRepaymentCircumstances": "Treasury repayment",
  "metaData.priorFunding": "Prior funding",
  "metaData.totalBudget": "Budget summary",
};

/**
 * Reduce changed paths to unique section labels (using PATH_TO_SECTION; unknown paths use first matching prefix or last segment).
 * @param {string[]} paths
 * @returns {string[]} Sorted unique section labels
 */
export function pathsToSectionLabels(paths) {
  const labels = new Set();
  for (const p of paths) {
    let label = PATH_TO_SECTION[p];
    if (label == null && p.startsWith("metaData.")) {
      const two = p.split(".").slice(0, 2).join(".");
      label = PATH_TO_SECTION[two];
    }
    if (label == null) label = p.split(".").pop() ?? p;
    if (typeof label === "string") labels.add(label);
  }
  return [...labels].sort();
}
