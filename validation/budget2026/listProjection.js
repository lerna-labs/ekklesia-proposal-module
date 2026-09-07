/**
 * Budget 2026 list projection: keep list payload compact while preserving
 * fields used by public listing cards.
 *
 * @param {Record<string, any>} proposal
 * @returns {Record<string, any>}
 */
export function projectProposalListItem(proposal) {
  const { metaData, withdrawalReason, signature, userId, commentCount, versions, ...rest } =
    proposal ?? {};

  const shortenedMetaData = metaData
    ? {
        proposerDetails: metaData.proposerDetails
          ? { name: metaData.proposerDetails.name }
          : undefined,
        contractingParty: metaData.contractingParty
          ? { legalEntityType: metaData.contractingParty.legalEntityType }
          : undefined,
        strategyFramework: metaData.strategyFramework
          ? { pillars: metaData.strategyFramework.pillars }
          : undefined,
        conversionRate:
          metaData.proposalDetails?.conversionRate ??
          metaData.financialAndAdministrative?.conversionRate,
        totalBudget: metaData.totalBudget,
      }
    : null;

  return {
    ...rest,
    metaData: shortenedMetaData,
    versions,
    commentCount: commentCount ?? 0,
  };
}
