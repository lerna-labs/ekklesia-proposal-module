/**
 * Load a budget validation script by name. Scripts live in validation/budget2026/ (and similar per-budget dirs).
 * Only allows names matching ^[a-zA-Z0-9_-]+$ for safety.
 * @param {string} name - Script name (e.g. "validationBudget2026") corresponding to validation/budget2026/validationBudget2026.js
 * @returns {Promise<{ validate: (body: unknown) => { success: true, data } | { success: false, error } } | null>}
 */
export async function loadValidationScript(name) {
  if (typeof name !== "string" || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    return null;
  }
  try {
    // Script names like "validationBudget2026" live in validation/budget2026/<name>.js
    const dir = "budget2026";
    const mod = await import(`./${dir}/${name}.js`);
    if (typeof mod?.validate === "function") {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}
