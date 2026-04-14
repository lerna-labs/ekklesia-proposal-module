/**
 * Seed/perf proposals in Mongo can drift vs budget2026 Zod limits. Clamp strings and
 * durations so draft→live and live re-submit PUT bodies pass validation.
 * @param {object | null | undefined} meta
 * @returns {object}
 */
export function sanitizeMetaDataForLiveSubmit(meta) {
  const m = structuredClone(meta ?? {});
  if (typeof m.estimatedDuration === "number" && m.estimatedDuration >= 60) {
    m.estimatedDuration = 12;
  }
  if (m.proposerDetails && typeof m.proposerDetails.name === "string") {
    m.proposerDetails.name = m.proposerDetails.name.slice(0, 60);
  }
  if (m.strategyFramework) {
    const sf = m.strategyFramework;
    if (typeof sf.pillarRationale === "string" && sf.pillarRationale.length > 10000) {
      sf.pillarRationale = sf.pillarRationale.slice(0, 10000);
    }
    if (typeof sf.kpiAlignment === "string" && sf.kpiAlignment.length > 10000) {
      sf.kpiAlignment = sf.kpiAlignment.slice(0, 10000);
    }
  }
  if (m.proposalDetails && Array.isArray(m.proposalDetails.workPackages)) {
    for (const wp of m.proposalDetails.workPackages) {
      if (typeof wp.summary === "string" && wp.summary.length > 2000) {
        wp.summary = wp.summary.slice(0, 2000);
      }
      if (Array.isArray(wp.milestones)) {
        for (const ms of wp.milestones) {
          if (typeof ms.duration === "number" && ms.duration > 240) {
            ms.duration = 240;
          }
        }
      }
    }
  }
  return m;
}
