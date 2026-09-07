/**
 * Load a validation script by path relative to the validation folder.
 * @param {string} scriptPath - Path inside validation folder (e.g. "budget2026/validationScript.js"). Must end in .js; no ".." allowed.
 * @returns {Promise<{ validate: (body: unknown, context?: { existingProposal?: { status?: string, metaData?: Record<string, unknown> }, voteDepositOptions?: { treasuryDonation?: number | null } }) => { success: true, data } | { success: false, error } } | null>}
 */
export async function loadValidationScript(scriptPath) {
  if (
    typeof scriptPath !== "string" ||
    scriptPath.includes("..") ||
    !/^[a-zA-Z0-9/_.-]+\.js$/.test(scriptPath)
  ) {
    return null;
  }
  try {
    const mod = await import(`./${scriptPath}`);
    if (typeof mod?.validate === "function") {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}
