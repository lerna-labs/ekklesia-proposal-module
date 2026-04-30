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

describe("CC vote poolId/drepId validation", () => {
  const validPoolId = "pool1p020rt3rq6q96a5dxugn0j9xnel68d2gdg7xqylzpaywqnwl6fv";
  const validDrepId = "drep17p0h3g2m9kuet0h9xl8zaq3qcp5vt0jygghw6flp9xk8z7cz8zm";

  it("accepts valid bech32 poolId and drepId", () => {
    const body = buildValidCcLiveBody();
    body.metaData.individual.poolId = validPoolId;
    body.metaData.individual.drepId = validDrepId;

    const result = validate(body, {});
    expect(result.success).toBe(true);
  });

  it("rejects invalid poolId when prefix is correct but value is malformed", () => {
    const body = buildValidCcLiveBody();
    body.metaData.individual.poolId = `${validPoolId.slice(0, -1)}x`;

    const result = validate(body, {});
    expect(result.success).toBe(false);

    const issue = issueForPath(result, ["metaData", "individual", "poolId"]);
    expect(issue).toBeTruthy();
    expect(issue?.message).toMatch(/valid bech32 pool identifier/i);
  });

  it("rejects invalid drepId when prefix is correct but value is malformed", () => {
    const body = buildValidCcLiveBody();
    body.metaData.individual.drepId = `${validDrepId.slice(0, -1)}x`;

    const result = validate(body, {});
    expect(result.success).toBe(false);

    const issue = issueForPath(result, ["metaData", "individual", "drepId"]);
    expect(issue).toBeTruthy();
    expect(issue?.message).toMatch(/valid bech32 drep identifier/i);
  });

  it("still allows empty poolId and drepId", () => {
    const body = buildValidCcLiveBody();
    body.metaData.individual.poolId = "";
    body.metaData.individual.drepId = "";

    const result = validate(body, {});
    expect(result.success).toBe(true);
  });
});
