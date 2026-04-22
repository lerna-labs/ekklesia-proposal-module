import { projectProposalListItem as projectBudget2026 } from "../../validation/budget2026/listProjection.js";
import { projectProposalListItem as projectCcVote2026 } from "../../validation/cc-vote2026/listProjection.js";

describe("proposal list projection scripts", () => {
  it("budget2026 projection keeps only card-required metadata", () => {
    const proposal = {
      _id: "p1",
      title: "Budget proposal",
      status: "live",
      updatedAt: "2026-01-15T10:00:00.000Z",
      submittedAt: "2026-01-10T10:00:00.000Z",
      proposerId: "stake_test1abc",
      withdrawalDetails: {
        category: "Other",
        comment: "withdrawn note",
      },
      versions: [{ _id: "v1", createdAt: new Date("2026-01-01T00:00:00.000Z") }],
      commentCount: 7,
      metaData: {
        proposerDetails: {
          name: "Budget Proposer",
          email: "private@example.com",
        },
        contractingParty: {
          legalEntityType: "company",
          legalEntityName: "Private Co",
        },
        strategyFramework: {
          pillars: ["pillar-a"],
          pillarRationale: "private detail",
        },
        proposalDetails: {
          conversionRate: 0.9,
          workPackages: [{ id: "wp1" }],
        },
        totalBudget: 123456,
        privateField: "should-not-be-exposed",
      },
    };

    const projected = projectBudget2026(proposal);
    expect(projected.metaData).toEqual({
      proposerDetails: { name: "Budget Proposer" },
      contractingParty: { legalEntityType: "company" },
      strategyFramework: { pillars: ["pillar-a"] },
      conversionRate: 0.9,
      totalBudget: 123456,
    });
    expect(projected.commentCount).toBe(7);
    expect(projected.versions).toEqual(proposal.versions);
    expect(projected._id).toBe("p1");
    expect(projected.title).toBe("Budget proposal");
    expect(projected.status).toBe("live");
    expect(projected.updatedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(projected.submittedAt).toBe("2026-01-10T10:00:00.000Z");
    expect(projected.proposerId).toBe("stake_test1abc");
    expect(projected.withdrawalDetails).toEqual(proposal.withdrawalDetails);
  });

  it("ccVote2026 projection keeps track and motivation fields only", () => {
    const proposal = {
      _id: "p2",
      title: "CC candidate",
      status: "live",
      updatedAt: "2026-02-15T10:00:00.000Z",
      submittedAt: "2026-02-10T10:00:00.000Z",
      proposerId: "stake_test1xyz",
      commentCount: 3,
      versions: [],
      metaData: {
        track: "individual",
        individual: {
          motivation: "I want to serve as a constitutional committee member.",
          contactEmail: "private@example.com",
        },
        declarationAgreement: {
          termsAndConditionsAgreement: true,
        },
      },
    };

    const projected = projectCcVote2026(proposal);
    expect(projected.metaData).toEqual({
      track: "individual",
      individual: {
        motivation: "I want to serve as a constitutional committee member.",
      },
      organisation: undefined,
      consortium: undefined,
    });
    expect(projected.commentCount).toBe(3);
    expect(projected._id).toBe("p2");
    expect(projected.title).toBe("CC candidate");
    expect(projected.status).toBe("live");
    expect(projected.updatedAt).toBe("2026-02-15T10:00:00.000Z");
    expect(projected.submittedAt).toBe("2026-02-10T10:00:00.000Z");
    expect(projected.proposerId).toBe("stake_test1xyz");
  });
});
