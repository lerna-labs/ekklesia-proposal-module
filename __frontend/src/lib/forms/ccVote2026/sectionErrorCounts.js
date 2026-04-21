/**
 * Error counts for ccVote2026 accordion titles — same tree shape as budget2026 Form.svelte
 * (Zod `treeifyError` output: `errors`, `properties`, `items`).
 */

/** @param {unknown} node */
export function countErrorsInTree(node) {
  if (node == null) return 0;
  let n = node.errors?.length ?? 0;
  if (node.properties) {
    for (const child of Object.values(node.properties)) {
      n += countErrorsInTree(child);
    }
  }
  if (node.items) {
    for (const item of node.items) {
      n += countErrorsInTree(item);
    }
  }
  return n;
}

/**
 * @param {unknown} tree - Root tree node (`validationErrors`)
 * @param {string[]} pathSegments - Keys under `.properties` at each level
 */
export function getNodeAtPath(tree, pathSegments) {
  if (tree == null || !pathSegments?.length) return tree;
  const next = tree.properties?.[pathSegments[0]];
  return getNodeAtPath(next, pathSegments.slice(1));
}

/** @param {number} n */
export function errorCountLabel(n) {
  return n === 1 ? "1 Error" : `${n} Errors`;
}

/**
 * Section id → list of paths (each path counted separately; no overlap between sections).
 * Paths are relative to the `validationErrors` root.
 * @type {Record<'individual' | 'organisation' | 'consortium', Record<string, string[][]>>}
 */
export const CC_VOTE_SECTION_PATHS = {
  individual: {
    "section-1": [
      ["metaData", "track"],
      ["metaData", "individual", "fullNameOrAlias"],
      ["metaData", "individual", "contactEmail"],
      ["metaData", "individual", "geographicRegion"],
      ["metaData", "individual", "poolId"],
      ["metaData", "individual", "drepId"],
      ["metaData", "individual", "xUsername"],
      ["metaData", "individual", "linkedinUsername"],
      ["metaData", "individual", "website"],
      ["metaData", "individual", "otherLinks"],
    ],
    "section-2": [
      ["metaData", "individual", "professionalBackground"],
      ["metaData", "individual", "governanceExperience"],
    ],
    "section-3": [
      ["metaData", "individual", "briefBiography"],
      ["metaData", "individual", "conflictOfInterestStatement"],
      ["metaData", "individual", "contributionsToCardano"],
      ["metaData", "individual", "motivation"],
      ["metaData", "individual", "decentralisedGovernanceImportance"],
      ["metaData", "individual", "constitutionalInterpretation"],
      ["metaData", "individual", "perspectiveYouWouldBring"],
      ["metaData", "individual", "transparencyApproach"],
    ],
    "section-4": [
      ["metaData", "coldCredentialHash"],
      ["metaData", "coldCredentialType"],
    ],
    "section-5": [
      ["metaData", "treasuryDonationTxHash"],
      ["metaData", "treasuryDonationConfirmed"],
    ],
    "section-6": [["metaData", "declarationAgreement"]],
  },
  organisation: {
    "section-1": [["metaData", "track"], ["metaData", "organisation"]],
    "section-2": [
      ["metaData", "individual", "professionalBackground"],
      ["metaData", "individual", "governanceExperience"],
    ],
    "section-3": [],
    "section-4": [
      ["metaData", "coldCredentialHash"],
      ["metaData", "coldCredentialType"],
    ],
    "section-5": [
      ["metaData", "treasuryDonationTxHash"],
      ["metaData", "treasuryDonationConfirmed"],
    ],
    "section-6": [["metaData", "declarationAgreement"]],
  },
  consortium: {
    "section-1": [["metaData", "track"], ["metaData", "consortium"]],
    "section-2": [],
    "section-3": [
      ["metaData", "coldCredentialHash"],
      ["metaData", "coldCredentialType"],
    ],
    "section-4": [],
    "section-5": [
      ["metaData", "treasuryDonationTxHash"],
      ["metaData", "treasuryDonationConfirmed"],
    ],
    "section-6": [["metaData", "declarationAgreement"]],
  },
};

/**
 * @param {unknown} validationErrors
 * @param {'individual' | 'organisation' | 'consortium'} track
 */
export function computeCcVoteSectionErrorCounts(validationErrors, track) {
  const pathsBySection = CC_VOTE_SECTION_PATHS[track];
  const root = validationErrors;
  /** @type {Record<string, number>} */
  const counts = {};
  for (const [section, paths] of Object.entries(pathsBySection)) {
    counts[section] = paths.reduce(
      (sum, path) => sum + countErrorsInTree(getNodeAtPath(root, path)),
      0,
    );
  }
  return counts;
}
