import { validate } from "../../validation/cc-vote2026/validationScript.js";

function buildValidCcLiveBody() {
  return {
    voteId: "507f191e810c19729de860ea",
    status: "live",
    title: "Alice Candidate",
    summary: "",
    metaData: {
      track: "individual",
      individual: {
        fullNameOrAlias: "Alice Candidate",
        contactEmail: "alice@example.com",
        geographicRegion: "",
        poolId: "",
        drepId: "",
        xUsername: "",
        linkedinUsername: "",
        website: "",
        otherLinks: [],
        professionalBackground: "Professional background text",
        governanceExperience: "Governance experience text",
        briefBiography: "Brief biography text",
        conflictOfInterestStatement: "",
        contributionsToCardano: "Contributions text",
        motivation: "Motivation text",
        decentralisedGovernanceImportance: "Governance importance text",
        constitutionalInterpretation: "Constitution interpretation text",
        perspectiveYouWouldBring: "Perspective text",
        transparencyApproach: "Transparency text",
      },
      coldCredentialHash:
        "cc_cold1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6kflvs",
      coldCredentialType: "keyCredential",
      declarationAgreement: {
        accuracyPublicVisibilityConsent: true,
        termsAndConditionsAgreement: true,
      },
    },
  };
}

function issueForPath(result, path) {
  const needle = path.join(".");
  return (
    result?.error?.issues?.find(
      (issue) => Array.isArray(issue.path) && issue.path.join(".") === needle,
    ) ?? null
  );
}

describe("CC vote cold credential validation", () => {
  it("rejects wrong cc_cold credential format", () => {
    const body = buildValidCcLiveBody();
    body.metaData.coldCredentialHash = "cc_cold1INVALID";

    const result = validate(body, {});
    expect(result.success).toBe(false);

    const issue = issueForPath(result, ["metaData", "coldCredentialHash"]);
    expect(issue).toBeTruthy();
    expect(issue?.message).toMatch(/cip-0129|cc_cold|64/i);
  });

  it("rejects duplicate cold credential hash from validation context", () => {
    const body = buildValidCcLiveBody();

    const result = validate(body, { coldCredentialHashDuplicate: true });
    expect(result.success).toBe(false);

    const issue = issueForPath(result, ["metaData", "coldCredentialHash"]);
    expect(issue).toBeTruthy();
    expect(issue?.message).toMatch(/already used by another proposal/i);
  });
});
