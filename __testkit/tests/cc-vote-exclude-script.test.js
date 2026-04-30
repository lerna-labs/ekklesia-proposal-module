import { excludeNonPublicFields } from "../../validation/cc-vote2026/excludeScript.js";

describe("cc-vote2026 exclude script", () => {
  it("removes declarationAgreement for public viewers", () => {
    const proposal = {
      metaData: {
        track: "consortium",
        declarationAgreement: {
          accuracyPublicVisibilityConsent: true,
          termsAndConditionsAgreement: true,
          memberIdentityVouching: false,
        },
      },
    };

    const projected = excludeNonPublicFields(proposal, {
      isProposer: false,
      isAdmin: false,
    });

    expect(projected.metaData.declarationAgreement).toBeUndefined();
  });

  it("keeps declarationAgreement for proposer/admin", () => {
    const proposal = {
      metaData: {
        declarationAgreement: {
          accuracyPublicVisibilityConsent: true,
          termsAndConditionsAgreement: true,
          memberIdentityVouching: false,
        },
      },
    };

    const asProposer = excludeNonPublicFields(proposal, {
      isProposer: true,
      isAdmin: false,
    });
    const asAdmin = excludeNonPublicFields(proposal, {
      isProposer: false,
      isAdmin: true,
    });

    expect(asProposer.metaData.declarationAgreement).toBeDefined();
    expect(asAdmin.metaData.declarationAgreement).toBeDefined();
  });

  it("keeps consortium conflictOfInterestStatement public", () => {
    const proposal = {
      metaData: {
        consortium: {
          conflictOfInterestStatement: "No conflicts to disclose",
        },
      },
    };

    const projected = excludeNonPublicFields(proposal, {
      isProposer: false,
      isAdmin: false,
    });

    expect(projected.metaData.consortium.conflictOfInterestStatement).toBe(
      "No conflicts to disclose",
    );
  });
});
