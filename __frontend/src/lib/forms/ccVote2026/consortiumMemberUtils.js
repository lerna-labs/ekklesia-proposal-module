/**
 * Default shape for one consortium member (matches validation/cc-vote2026/validationScript.js).
 */
export function getDefaultConsortiumMember() {
  return {
    fullNameOrAlias: "",
    geographicRegion: "",
    briefBiography: "",
    professionalBackground: "",
    governanceExperience: "",
    poolId: "",
    drepId: "",
    xUsername: "",
    linkedinUsername: "",
    website: "",
    otherLinks: [],
    conflictOfInterestStatement: "",
  };
}

/**
 * @param {unknown} raw
 * @returns {ReturnType<typeof getDefaultConsortiumMember>}
 */
export function normalizeConsortiumMember(raw) {
  const m = raw && typeof raw === "object" ? raw : {};
  const links = Array.isArray(m.otherLinks) ? m.otherLinks : [];
  return {
    ...getDefaultConsortiumMember(),
    fullNameOrAlias: m.fullNameOrAlias != null ? String(m.fullNameOrAlias) : "",
    geographicRegion: m.geographicRegion != null ? String(m.geographicRegion) : "",
    briefBiography: m.briefBiography != null ? String(m.briefBiography) : "",
    professionalBackground:
      m.professionalBackground != null ? String(m.professionalBackground) : "",
    governanceExperience:
      m.governanceExperience != null ? String(m.governanceExperience) : "",
    poolId: m.poolId != null ? String(m.poolId) : "",
    drepId: m.drepId != null ? String(m.drepId) : "",
    xUsername: m.xUsername != null ? String(m.xUsername) : "",
    linkedinUsername: m.linkedinUsername != null ? String(m.linkedinUsername) : "",
    website: m.website != null ? String(m.website) : "",
    otherLinks: links,
    conflictOfInterestStatement:
      m.conflictOfInterestStatement != null
        ? String(m.conflictOfInterestStatement)
        : "",
  };
}
