import { loadExcludeScript } from "./loadExcludeScript.js";

/**
 * Apply vote excludeScript for public proposal API responses.
 *
 * - No excludeScript → proposal unchanged (fully public).
 * - Script loads → excludeNonPublicFields (proposer/admin see full doc).
 * - Script set but unloadable / throws → fail closed: metaData = {} for public viewers.
 *
 * @param {object} proposal
 * @param {{ excludeScript?: string | null } | null | undefined} voteDoc
 * @param {{ isProposer: boolean, isAdmin: boolean }} context
 * @returns {Promise<object>}
 */
export async function applyPublicFieldExclusion(proposal, voteDoc, { isProposer, isAdmin }) {
  if (isProposer || isAdmin) {
    return proposal;
  }

  const scriptPath = typeof voteDoc?.excludeScript === "string" ? voteDoc.excludeScript.trim() : "";
  if (!scriptPath) {
    return proposal;
  }

  try {
    const excludeMod = await loadExcludeScript(scriptPath);
    if (typeof excludeMod?.excludeNonPublicFields === "function") {
      return excludeMod.excludeNonPublicFields(proposal, { isProposer, isAdmin });
    }
  } catch (err) {
    console.warn(
      "excludeNonPublicFields failed; stripping metaData for public response",
      proposal?._id,
      err?.message ?? err,
    );
  }

  // Fail closed: configured exclusion could not be applied
  return { ...proposal, metaData: {} };
}

/**
 * Log unloadable Vote.excludeScript values at startup (does not throw).
 * @returns {Promise<void>}
 */
export async function warnUnloadableExcludeScripts() {
  const { Vote } = await import("../schema/Vote.js");
  const votes = await Vote.find({
    excludeScript: { $exists: true, $nin: [null, ""] },
  })
    .select("_id slug excludeScript")
    .lean();

  for (const vote of votes) {
    const path = typeof vote.excludeScript === "string" ? vote.excludeScript.trim() : "";
    if (!path) continue;
    const mod = await loadExcludeScript(path);
    if (!mod?.excludeNonPublicFields) {
      console.error(
        `Vote excludeScript failed to load (public API will strip metaData): voteId=${vote._id} slug=${vote.slug ?? ""} path=${path}`,
      );
    }
  }
}
