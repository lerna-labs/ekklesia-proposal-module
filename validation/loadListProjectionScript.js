/**
 * Load a list projection script by path relative to the validation folder.
 * @param {string} scriptPath - Path inside validation folder (e.g. "budget2026/listProjection.js"). Must end in .js; no ".." allowed.
 * @returns {Promise<{ projectProposalListItem: (proposal: object, context?: { vote?: Record<string, unknown>, isProposer?: boolean, isAdmin?: boolean }) => object } | null>}
 */
export async function loadListProjectionScript(scriptPath) {
  if (
    typeof scriptPath !== "string" ||
    scriptPath.includes("..") ||
    !/^[a-zA-Z0-9/_.-]+\.js$/.test(scriptPath)
  ) {
    return null;
  }
  try {
    const mod = await import(`./${scriptPath}`);
    if (typeof mod?.projectProposalListItem === "function") {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}
