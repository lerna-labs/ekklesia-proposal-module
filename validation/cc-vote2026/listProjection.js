/**
 * CC Vote 2026 list projection for public listing card usage.
 *
 * @param {Record<string, any>} proposal
 * @returns {Record<string, any>}
 */
export function projectProposalListItem(proposal) {
  const {
    metaData,
    withdrawalReason,
    signature,
    userId,
    commentCount,
    versions,
    ...rest
  } = proposal ?? {};

  const shortenedMetaData = metaData
    ? {
      track: metaData.track,
      individual: metaData.individual
        ? { motivation: metaData.individual.motivation }
        : undefined,
      organisation: metaData.organisation
        ? { motivation: metaData.organisation.motivation }
        : undefined,
      consortium: metaData.consortium
        ? { motivation: metaData.consortium.motivation }
        : undefined,
    }
    : null;

  return {
    ...rest,
    metaData: shortenedMetaData,
    versions,
    commentCount: commentCount ?? 0,
  };
}
