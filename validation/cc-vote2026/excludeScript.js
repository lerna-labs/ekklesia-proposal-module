/**
 * CC Vote 2026: no vote-specific fields to strip from public proposal responses yet.
 * @param {Object} proposal - Full proposal document (plain object)
 * @param {{ isProposer: boolean, isAdmin: boolean }} _context - Whether requester is proposer or vote admin
 * @returns {Object}
 */
export function excludeNonPublicFields(proposal, _context) {
  return proposal;
}
