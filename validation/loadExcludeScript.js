/**
 * Load an exclude script by path relative to the validation folder.
 * @param {string} scriptPath - Path inside validation folder (e.g. "budget2026/excludeScript.js"). Must end in .js; no ".." allowed.
 * @returns {Promise<{ excludeNonPublicFields: (proposal: object, context: { isProposer: boolean, isAdmin: boolean }) => object } | null>}
 */
export async function loadExcludeScript(scriptPath) {
  if (
    typeof scriptPath !== "string" ||
    scriptPath.includes("..") ||
    !/^[a-zA-Z0-9/_.-]+\.js$/.test(scriptPath)
  ) {
    return null;
  }
  try {
    const mod = await import(`./${scriptPath}`);
    if (typeof mod?.excludeNonPublicFields === "function") {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}
