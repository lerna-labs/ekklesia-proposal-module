/**
 * Exclude non-public form fields from proposal API responses.
 * Fields are defined in __frontend/docs/non-public-form-fields.json (Administrative & Verification section).
 * These fields are only returned when the proposal belongs to the authenticated user
 * or when the authenticated user is an admin on the budget (vote).
 *
 * @param {Object} proposal - Full proposal document (plain object)
 * @param {{ isProposer: boolean, isAdmin: boolean }} context - Whether requester is proposer or vote admin
 * @returns {Object} Proposal with non-public fields removed when context denies access
 */
export function excludeNonPublicFields(proposal, { isProposer, isAdmin }) {
  if (isProposer || isAdmin) {
    return proposal;
  }

  const paths = [
    "metaData.financialAndAdministrative.otherAdministrators",
    "metaData.contractingParty.legalEntityAddress",
    "metaData.contractingParty.legalEntityCountry",
    "metaData.contractingParty.legalEntityRegistrationNumber",
    "metaData.contractingParty.fullResidentialAddress",
    "metaData.contractingParty.countryOfResidence",
    "metaData.contractingParty.govtIssuedIdNumber",
    "metaData.primaryContact.email",
    "metaData.signatoryContact.title",
    "metaData.signatoryContact.name",
    "metaData.signatoryContact.email",
    "metaData.signatoryContact.authorization",
    "metaData.kycInfo.submitted",
    "metaData.kycInfo.email",
    "metaData.kycInfo.totalProposalsSubmitted",
  ];

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
