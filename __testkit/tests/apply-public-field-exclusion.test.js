import { applyPublicFieldExclusion } from "../../validation/applyPublicFieldExclusion.js";

describe("applyPublicFieldExclusion", () => {
  const proposal = {
    _id: "507f1f77bcf86cd799439011",
    title: "Test",
    metaData: {
      primaryContact: { email: "secret@example.com" },
      strategyFramework: { pillars: [{ title: "Public pillar" }] },
    },
  };

  it("leaves metaData unchanged when excludeScript is unset (fully public)", async () => {
    const out = await applyPublicFieldExclusion(proposal, {}, {
      isProposer: false,
      isAdmin: false,
    });
    expect(out.metaData).toEqual(proposal.metaData);
  });

  it("strips metaData when excludeScript is set but unloadable", async () => {
    const out = await applyPublicFieldExclusion(
      proposal,
      { excludeScript: "does-not-exist/excludeScript.js" },
      { isProposer: false, isAdmin: false },
    );
    expect(out.metaData).toEqual({});
    expect(out.title).toBe("Test");
  });

  it("applies budget2026 exclude script when loadable", async () => {
    const out = await applyPublicFieldExclusion(
      proposal,
      { excludeScript: "budget2026/excludeScript.js" },
      { isProposer: false, isAdmin: false },
    );
    expect(out.metaData.primaryContact).toBeUndefined();
    expect(out.metaData.strategyFramework.pillars).toEqual([
      { title: "Public pillar" },
    ]);
  });

  it("returns full proposal for proposer even when script is unloadable", async () => {
    const out = await applyPublicFieldExclusion(
      proposal,
      { excludeScript: "does-not-exist/excludeScript.js" },
      { isProposer: true, isAdmin: false },
    );
    expect(out.metaData).toEqual(proposal.metaData);
  });

  it("returns full proposal for vote admin even when script is unloadable", async () => {
    const out = await applyPublicFieldExclusion(
      proposal,
      { excludeScript: "does-not-exist/excludeScript.js" },
      { isProposer: false, isAdmin: true },
    );
    expect(out.metaData).toEqual(proposal.metaData);
  });
});
