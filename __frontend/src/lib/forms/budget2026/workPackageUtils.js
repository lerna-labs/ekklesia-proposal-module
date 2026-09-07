/**
 * Shared work package normalization for prefill and form.
 * Work package shape matches backend validation (validation/budget2026/validationScript.js).
 */

/** Work package default shape for new drafts. */
export function getDefaultDraft() {
  return {
    name: "",
    summary: "",
    initiativeType: "",
    proposalType: "",
    supportingDocuments: [],
    coreObjectives: [],
    expectedValue: "",
    metric: "",
    milestones: [],
    budgetBreakdown: [],
    noMilestonesBreakdown: false,
    milestoneAlternative: "",
  };
}

/**
 * Normalize a work package from API/prefill into the shape used by the form (e.g. links as { title, url }).
 */
export function normalizeWorkPackage(pkg) {
  if (!pkg || typeof pkg !== "object") return getDefaultDraft();
  return {
    name: (pkg.name ?? "").toString(),
    summary: (pkg.summary ?? pkg.scope ?? "").toString(),
    initiativeType: (pkg.initiativeType ?? "").toString(),
    proposalType: (pkg.proposalType ?? "").toString(),
    supportingDocuments: Array.isArray(pkg.supportingDocuments)
      ? pkg.supportingDocuments.map((l) => ({
          title: (l?.title ?? "").trim(),
          url: (l?.url ?? "").trim(),
        }))
      : [],
    coreObjectives:
      Array.isArray(pkg.coreObjectives) && pkg.coreObjectives.length > 0
        ? pkg.coreObjectives.map((o) => (o ?? "").trim())
        : [],
    expectedValue: pkg.expectedValue ?? "",
    metric: pkg.metric ?? "",
    milestones: Array.isArray(pkg.milestones)
      ? pkg.milestones.map((m) => ({
          name: (m?.name ?? "").toString(),
          deliverables: (m?.deliverables ?? "").toString(),
          acceptanceCriteria: (m?.acceptanceCriteria ?? "").toString(),
          duration: (m?.duration ?? "").toString(),
        }))
      : [],
    budgetBreakdown: Array.isArray(pkg.budgetBreakdown) ? [...pkg.budgetBreakdown] : [],
    noMilestonesBreakdown: Boolean(pkg.noMilestonesBreakdown),
    milestoneAlternative: (pkg.milestoneAlternative ?? "").toString(),
  };
}
