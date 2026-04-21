/**
 * CC Vote 2026: strip non-public proposal fields from JSON for unauthenticated viewers
 * (and anyone who is neither the proposer nor a vote admin).
 *
 * @param {Object} proposal - Full proposal document (plain object)
 * @param {{ isProposer: boolean, isAdmin: boolean }} context - Whether requester is proposer or vote admin
 * @returns {Object}
 */
export function excludeNonPublicFields(proposal, { isProposer, isAdmin }) {
  if (isProposer || isAdmin) {
    return proposal;
  }

  const paths = ["metaData.individual.contactEmail"];

  const result = JSON.parse(JSON.stringify(proposal));

  for (const path of paths) {
    const parts = path.split(".");
    const last = parts.pop();
    let parent = result;
    for (const key of parts) {
      if (parent == null || typeof parent !== "object") break;
      parent = parent[key];
    }
    if (parent != null && typeof parent === "object" && last in parent) {
      delete parent[last];
    }
  }

  return result;
}
